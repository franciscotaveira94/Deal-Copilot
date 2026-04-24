import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const e = await prisma.timelineEntry.update({
    where: { id },
    data: { awaitedReplyResolvedAt: new Date() },
  });
  return NextResponse.json({ ok: true, entry: e });
}
