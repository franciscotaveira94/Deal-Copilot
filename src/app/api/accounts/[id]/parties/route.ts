import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET parties for an account */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parties = await prisma.dealParty.findMany({
    where: { accountId: id },
    include: { organisation: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ parties });
}

/** POST add a party. Accepts either organisationId or (name + kind) to create+link. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();

  let organisationId: string = body.organisationId;
  const role = String(body.role || "partner");

  // create-org-if-missing path
  if (!organisationId && body.name) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const org = await prisma.organisation.upsert({
      where: { name },
      create: {
        name,
        domain: body.domain || null,
        kind: body.kind || roleToKind(role),
      },
      update: {},
    });
    organisationId = org.id;
  }

  if (!organisationId) {
    return NextResponse.json({ error: "organisationId or name required" }, { status: 400 });
  }

  try {
    const party = await prisma.dealParty.upsert({
      where: { accountId_organisationId: { accountId: id, organisationId } },
      create: {
        accountId: id,
        organisationId,
        role,
        lastActivityAt: new Date(),
      },
      update: { role },
      include: { organisation: true },
    });
    return NextResponse.json({ ok: true, party });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

function roleToKind(role: string): string {
  if (role === "customer") return "customer";
  if (role === "distributor") return "distributor";
  if (role === "partner") return "partner";
  if (role === "cloudflare") return "cloudflare";
  return "other";
}
