import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const current = await prisma.action.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const done = !current.done;
  const action = await prisma.action.update({
    where: { id },
    data: { done, doneAt: done ? new Date() : null },
  });
  return NextResponse.json({ ok: true, action });
}
