import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateBrief, timelineToText, PrepBrief } from "@/lib/ai-extract";

/** GET cached brief (lightweight) */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const account = await prisma.account.findUnique({
    where: { id },
    select: { briefContent: true, briefGeneratedAt: true },
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    brief: account.briefContent ? (JSON.parse(account.briefContent) as PrepBrief) : null,
    generatedAt: account.briefGeneratedAt,
  });
}

/** POST to regenerate */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      timeline: { orderBy: { occurredAt: "desc" }, take: 30 },
      contacts: true,
    },
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const timelineText = timelineToText(account.timeline);
  try {
    const brief = await generateBrief(
      account.name,
      account.stage,
      account.arr,
      account.summary,
      account.nextAction,
      {
        metrics: account.meddicMetrics,
        economicBuyer: account.meddicEconomicBuyer,
        decisionCriteria: account.meddicDecisionCriteria,
        decisionProcess: account.meddicDecisionProcess,
        painIdentified: account.meddicPainIdentified,
        champion: account.meddicChampion,
      },
      account.contacts.map((c) => ({
        name: c.name,
        role: c.role,
        persona: c.persona,
      })),
      timelineText
    );
    await prisma.account.update({
      where: { id },
      data: {
        briefContent: JSON.stringify(brief),
        briefGeneratedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, brief });
  } catch (e: unknown) {
    console.error("Brief generation failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Brief generation failed" },
      { status: 500 }
    );
  }
}
