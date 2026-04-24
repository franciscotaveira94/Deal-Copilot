import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "role", "persona", "email", "phone", "notes"]) {
    if (k in body) data[k] = body[k];
  }
  const contact = await prisma.contact.update({ where: { id }, data });
  return NextResponse.json({ ok: true, contact });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
