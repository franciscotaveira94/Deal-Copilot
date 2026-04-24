import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const data = await req.json();

  const update: Record<string, unknown> = {};
  for (const key of [
    "name",
    "domain",
    "industry",
    "stage",
    "priority",
    "arr",
    "summary",
    "nextAction",
    "notes",
  ]) {
    if (key in data) update[key] = data[key];
  }
  if ("nextActionDue" in data) {
    update.nextActionDue = data.nextActionDue ? new Date(data.nextActionDue) : null;
  }

  // Track stage change timestamp
  if ("stage" in data) {
    const existing = await prisma.account.findUnique({
      where: { id },
      select: { stage: true },
    });
    if (existing && existing.stage !== data.stage) {
      update.stageChangedAt = new Date();
    }
  }

  const account = await prisma.account.update({ where: { id }, data: update });
  return NextResponse.json({ ok: true, account });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
