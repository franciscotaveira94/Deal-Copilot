import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type CreateBody = {
  name: string;
  domain?: string | null;
  industry?: string | null;
  stage?: string;
  priority?: string;
  arrUsd?: number | null;
  summary?: string | null;
  nextAction?: string | null;
  parties?: Array<{
    name: string;
    domain: string | null;
    role: string;
  }>;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateBody;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const arrCents = typeof body.arrUsd === "number" ? Math.round(body.arrUsd * 100) : null;

  const account = await prisma.account.create({
    data: {
      name: body.name.trim(),
      domain: body.domain || null,
      industry: body.industry || null,
      stage: body.stage || "discovery",
      priority: body.priority || "medium",
      arr: arrCents,
      summary: body.summary || null,
      nextAction: body.nextAction || null,
    },
  });

  // Upsert parties
  for (const p of body.parties || []) {
    if (!p.name?.trim()) continue;
    const name = p.name.trim();
    const role = ["customer", "distributor", "partner", "cloudflare", "other"].includes(p.role)
      ? p.role
      : "other";
    if (role === "cloudflare") continue;
    try {
      const org = await prisma.organisation.upsert({
        where: { name },
        create: {
          name,
          domain: p.domain || null,
          kind: role === "other" ? "unknown" : role,
        },
        update: {
          ...(p.domain ? { domain: p.domain } : {}),
        },
      });
      await prisma.dealParty.upsert({
        where: {
          accountId_organisationId: {
            accountId: account.id,
            organisationId: org.id,
          },
        },
        create: {
          accountId: account.id,
          organisationId: org.id,
          role,
          lastActivityAt: new Date(),
        },
        update: { role },
      });
    } catch (e) {
      console.warn("party upsert failed for", name, e);
    }
  }

  return NextResponse.json({ ok: true, account });
}
