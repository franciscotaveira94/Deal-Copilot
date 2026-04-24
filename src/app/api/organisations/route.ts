import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const orgs = await prisma.organisation.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { parties: true, contacts: true } },
    },
  });
  return NextResponse.json({ orgs });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  try {
    const org = await prisma.organisation.upsert({
      where: { name },
      create: {
        name,
        domain: body.domain || null,
        kind: body.kind || "unknown",
      },
      update: {},
    });
    return NextResponse.json({ ok: true, org });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
