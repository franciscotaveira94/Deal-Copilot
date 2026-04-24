import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "domain", "kind", "notes"]) {
    if (k in body) data[k] = body[k];
  }
  const org = await prisma.organisation.update({ where: { id }, data });
  return NextResponse.json({ ok: true, org });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.organisation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
