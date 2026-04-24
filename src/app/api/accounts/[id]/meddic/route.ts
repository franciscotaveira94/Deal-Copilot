import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractMeddic, timelineToText } from "@/lib/ai-extract";

/** PATCH: save user-edited MEDDIC fields */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const fields: Record<string, string | null> = {};
  for (const k of [
    "meddicMetrics",
    "meddicEconomicBuyer",
    "meddicDecisionCriteria",
    "meddicDecisionProcess",
    "meddicPainIdentified",
    "meddicChampion",
  ]) {
    if (k in body) fields[k] = body[k] || null;
  }
  const account = await prisma.account.update({
    where: { id },
    data: fields,
  });
  return NextResponse.json({ ok: true, account });
}

/** POST: ask the AI to extract/refine MEDDIC from timeline */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      timeline: { orderBy: { occurredAt: "desc" }, take: 40 },
      contacts: true,
    },
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const timelineText = timelineToText(account.timeline);

  try {
    const extracted = await extractMeddic(
      account.name,
      account.summary,
      timelineText,
      account.contacts.map((c) => ({
        name: c.name,
        role: c.role,
        persona: c.persona,
      })),
      {
        metrics: account.meddicMetrics,
        economicBuyer: account.meddicEconomicBuyer,
        decisionCriteria: account.meddicDecisionCriteria,
        decisionProcess: account.meddicDecisionProcess,
        painIdentified: account.meddicPainIdentified,
        champion: account.meddicChampion,
      }
    );
    const saved = await prisma.account.update({
      where: { id },
      data: {
        meddicMetrics: extracted.metrics,
        meddicEconomicBuyer: extracted.economicBuyer,
        meddicDecisionCriteria: extracted.decisionCriteria,
        meddicDecisionProcess: extracted.decisionProcess,
        meddicPainIdentified: extracted.painIdentified,
        meddicChampion: extracted.champion,
      },
    });
    return NextResponse.json({ ok: true, account: saved });
  } catch (e: unknown) {
    console.error("MEDDIC extraction failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
