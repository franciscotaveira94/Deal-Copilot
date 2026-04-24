import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("role" in body) data.role = body.role;
  if ("notes" in body) data.notes = body.notes;
  const party = await prisma.dealParty.update({ where: { id }, data });
  return NextResponse.json({ ok: true, party });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.dealParty.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
