import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { structureTimelineEntry, detectBackend } from "@/lib/ai";
import { detectParties } from "@/lib/party-detect";

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
    },
  });

  await prisma.account.update({
    where: { id },
    data: { lastTouch: new Date() },
  });

  // --- Party handling (non-blocking for core save) ---
  let detectedParties: Array<{ name: string; role: string; domain: string | null }> = [];

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
      detectedParties = detected.map((d) => ({
        name: d.name,
        role: d.role,
        domain: d.domain,
      }));

      // For each detected party: upsert org + upsert dealparty + bump lastActivity
      for (const d of detected) {
        if (!d.name?.trim()) continue;
        const name = d.name.trim();
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
              // Fill domain if not already set
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
            update: {
              // Don't overwrite role if user set it differently; only bump activity
              lastActivityAt: occurredAt,
            },
          });
        } catch (e) {
          console.warn("Party upsert failed for", d.name, e);
        }
      }
    } catch (e) {
      console.warn("Party detection failed:", e);
    }
  }

  // Also bump lastActivityAt on any existing parties that weren't detected but should be
  // active simply because an entry happened on this account — we skip this to keep signals honest.
  // (If nothing mentioned them in the paste, their silence should stay visible.)

  return NextResponse.json({ ok: true, entry, detectedParties });
}
