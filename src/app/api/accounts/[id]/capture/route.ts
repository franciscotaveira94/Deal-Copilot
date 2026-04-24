import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { structureTimelineEntry, detectBackend } from "@/lib/ai";
import { detectParties, detectDirection } from "@/lib/party-detect";
import { getSettings } from "@/lib/settings";
import { dueAtFromSla, slaHoursForRole } from "@/lib/followup";

/**
 * Parse From/To/Cc email headers and ensure the matching Organisations + DealParties
 * exist. Returns the list of orgs that were touched so the caller can dedupe LLM
 * suggestions against them.
 */
async function upsertOrgsFromHeaders(
  content: string,
  accountId: string,
  activityAt: Date
): Promise<Array<{ id: string; name: string; domain: string | null }>> {
  const COMMON_FREE = new Set([
    "gmail.com",
    "googlemail.com",
    "outlook.com",
    "hotmail.com",
    "yahoo.com",
    "icloud.com",
  ]);
  const top = content.slice(0, 3000);
  const headerLines = top.match(/^(From|To|Cc|Bcc):\s*[^\r\n]+/gim) || [];
  const addresses = headerLines
    .flatMap((l) => l.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])
    .map((a) => a.toLowerCase());
  const domains = Array.from(
    new Set(
      addresses
        .map((a) => a.split("@")[1])
        .filter((d) => !!d && !d.endsWith("cloudflare.com") && !COMMON_FREE.has(d))
    )
  );

  const created: Array<{ id: string; name: string; domain: string | null }> = [];
  for (const domain of domains) {
    const baseName = domain.split(".")[0] || domain;
    const name = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    try {
      // First: does an org already exist with this domain?
      let org = await prisma.organisation.findFirst({ where: { domain } });
      if (!org) {
        // Or with this name (same name, domain not yet set)?
        const byName = await prisma.organisation.findUnique({ where: { name } });
        if (byName) {
          org = await prisma.organisation.update({
            where: { id: byName.id },
            data: { domain },
          });
        } else {
          org = await prisma.organisation.create({
            data: { name, domain, kind: "unknown" },
          });
        }
      }

      await prisma.dealParty.upsert({
        where: {
          accountId_organisationId: {
            accountId,
            organisationId: org.id,
          },
        },
        create: {
          accountId,
          organisationId: org.id,
          role: "other",
          lastActivityAt: activityAt,
        },
        update: { lastActivityAt: activityAt },
      });
      created.push({ id: org.id, name: org.name, domain: org.domain });
    } catch (e) {
      console.warn("header upsert failed for", domain, e);
    }
  }
  return created;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { content, title, kind, useAI } = body as {
    content: string;
    title?: string;
    kind?: string;
    useAI?: boolean;
  };

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      parties: { include: { organisation: true } },
    },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  let finalKind = kind || "note";
  let finalTitle = title?.trim() || "Untitled";
  let summary: string | null = null;
  let sentiment: string | null = null;
  let occurredAt = new Date();
  let cleaned = content;
  let source = "manual";

  if (useAI) {
    const backend = await detectBackend();
    if (backend !== "none") {
      try {
        const structured = await structureTimelineEntry(content, { accountName: account.name });
        if (!title?.trim()) finalTitle = structured.title;
        if (!kind) finalKind = structured.kind;
        summary = structured.summary;
        sentiment = structured.sentiment;
        if (structured.occurredAt) {
          const parsed = new Date(structured.occurredAt);
          if (!isNaN(parsed.getTime())) occurredAt = parsed;
        }
        cleaned = structured.cleaned || content;
        source = `ai-${backend}`;
      } catch (e) {
        console.error("AI structuring failed:", e);
      }
    }
  }

  // --- Party handling (non-blocking for core save) ---
  let detectedParties: Array<{ name: string; role: string; domain: string | null }> = [];
  let detectedDirection: "outbound" | "inbound" | null = null;
  let awaitingOrgId: string | null = null;
  let awaitingDueAt: Date | null = null;

  // -------------------------------------------------------------
  // Parse email headers deterministically from the ORIGINAL raw content
  // (not `cleaned`, which has headers stripped by the AI). This is the
  // source of truth for who the email went to/from when headers are present.
  // -------------------------------------------------------------
  const headerOrgs = await upsertOrgsFromHeaders(content, id, occurredAt);

  if (useAI) {
    try {
      const detected = await detectParties(
        cleaned,
        account.parties.map((p) => ({
          name: p.organisation.name,
          domain: p.organisation.domain,
          role: p.role,
        })),
        account.name
      );

      for (const d of detected) {
        if (!d.name?.trim()) continue;
        const name = d.name.trim();

        // Skip if the LLM's name matches (case-insensitive) a domain we already linked via headers.
        // Avoids typo duplicates like "Natilek" next to header-derived "Natilik".
        const headerMatch = headerOrgs.find(
          (h) =>
            h.name.toLowerCase() === name.toLowerCase() ||
            (d.domain && h.domain?.toLowerCase() === d.domain.toLowerCase())
        );
        if (headerMatch) {
          // Upgrade the role if the LLM has stronger signal (it's better at role inference than domain parsing)
          try {
            await prisma.dealParty.update({
              where: {
                accountId_organisationId: {
                  accountId: id,
                  organisationId: headerMatch.id,
                },
              },
              data: { role: d.role },
            });
            // Keep the canonical header name; update org kind to match role
            if (d.role !== "other") {
              await prisma.organisation.update({
                where: { id: headerMatch.id },
                data: { kind: d.role },
              });
            }
          } catch {}
          detectedParties.push({
            name: headerMatch.name,
            role: d.role,
            domain: headerMatch.domain,
          });
          continue;
        }

        detectedParties.push({ name, role: d.role, domain: d.domain });
        try {
          const org = await prisma.organisation.upsert({
            where: { name },
            create: {
              name,
              domain: d.domain || null,
              kind:
                d.role === "customer"
                  ? "customer"
                  : d.role === "distributor"
                  ? "distributor"
                  : d.role === "partner"
                  ? "partner"
                  : "unknown",
            },
            update: {
              ...(d.domain ? { domain: d.domain } : {}),
            },
          });

          await prisma.dealParty.upsert({
            where: {
              accountId_organisationId: {
                accountId: id,
                organisationId: org.id,
              },
            },
            create: {
              accountId: id,
              organisationId: org.id,
              role: d.role,
              lastActivityAt: occurredAt,
            },
            update: { lastActivityAt: occurredAt },
          });
        } catch (e) {
          console.warn("Party upsert failed for", d.name, e);
        }
      }
    } catch (e) {
      console.warn("Party detection failed:", e);
    }

    // --- Direction + awaiting-party ---
    try {
      const refreshedParties = await prisma.dealParty.findMany({
        where: { accountId: id },
        include: { organisation: true },
      });
      const partiesForPrompt = refreshedParties.map((p) => ({
        name: p.organisation.name,
        domain: p.organisation.domain,
        role: p.role,
      }));

      // Use raw content for direction detection too — headers are the signal
      const dir = await detectDirection(content, partiesForPrompt);
      detectedDirection = dir.direction;

      if (dir.direction === "outbound" && dir.awaitingReplyFromOrgName) {
        // Prefer the first NON-Cloudflare org picked up from headers — that's
        // the most reliable "who we're waiting on" signal.
        // (headerOrgs excludes @cloudflare.com and free-mail.)
        const firstHeaderOrg = headerOrgs[0];

        let target: (typeof refreshedParties)[number] | undefined;
        if (firstHeaderOrg) {
          target = refreshedParties.find(
            (p) => p.organisationId === firstHeaderOrg.id
          );
          // If the party wasn't refreshed because we created it just now, find it directly
          if (!target) {
            const dbParty = await prisma.dealParty.findFirst({
              where: { accountId: id, organisationId: firstHeaderOrg.id },
              include: { organisation: true },
            });
            if (dbParty) target = dbParty;
          }
        }
        // Fallback to LLM's named org
        if (!target) {
          target = refreshedParties.find(
            (p) =>
              p.organisation.name.toLowerCase() ===
              dir.awaitingReplyFromOrgName!.toLowerCase()
          );
        }

        if (target) {
          const settings = await getSettings();
          const slaHours =
            target.organisation.slaHours ??
            slaHoursForRole(target.role, settings);
          awaitingOrgId = target.organisationId;
          awaitingDueAt = dueAtFromSla(occurredAt, slaHours);
        }
      }

      // If inbound: resolve any awaiting-entry from the From: domain.
      if (dir.direction === "inbound") {
        // Pull the From: domain from the raw content for robust matching
        const fromLine = content.match(/^\s*From:\s*([^\r\n]+)/mi)?.[1] || "";
        const fromEmail = fromLine.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0];
        const fromDomain = fromEmail?.split("@")[1]?.toLowerCase();

        let senderOrg = null;
        if (fromDomain) {
          senderOrg = await prisma.organisation.findFirst({
            where: { domain: fromDomain },
          });
        }
        // Fallback: take first detected non-cloudflare party
        if (!senderOrg) {
          const sp = detectedParties.find((p) => p.role !== "cloudflare");
          if (sp) {
            senderOrg = await prisma.organisation.findUnique({ where: { name: sp.name } });
          }
        }

        if (senderOrg) {
          await prisma.timelineEntry.updateMany({
            where: {
              accountId: id,
              awaitingReplyFromId: senderOrg.id,
              awaitedReplyResolvedAt: null,
            },
            data: { awaitedReplyResolvedAt: occurredAt },
          });
        }
      }
    } catch (e) {
      console.warn("Direction detection failed:", e);
    }
  }

  // Create the entry with the inferred fields
  const entry = await prisma.timelineEntry.create({
    data: {
      accountId: id,
      kind: finalKind,
      title: finalTitle,
      summary,
      sentiment,
      occurredAt,
      content: cleaned,
      source,
      direction: detectedDirection,
      awaitingReplyFromId: awaitingOrgId,
      awaitingReplyDueAt: awaitingDueAt,
    },
  });

  await prisma.account.update({
    where: { id },
    data: { lastTouch: new Date() },
  });

  return NextResponse.json({
    ok: true,
    entry,
    detectedParties,
    detectedDirection,
    awaitingOrgId,
    awaitingDueAt,
  });
}
