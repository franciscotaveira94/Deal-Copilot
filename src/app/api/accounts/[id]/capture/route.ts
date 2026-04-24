import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { structureTimelineEntry, detectBackend } from "@/lib/ai";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { content, title, kind, useAI } = body as {
    content: string;
    title?: string;
    kind?: string;
    useAI?: boolean;
  };

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  let finalKind = kind || "note";
  let finalTitle = title?.trim() || "Untitled";
  let summary: string | null = null;
  let sentiment: string | null = null;
  let occurredAt = new Date();
  let cleaned = content;
  let source = "manual";

  if (useAI) {
    const backend = await detectBackend();
    if (backend !== "none") {
      try {
        const structured = await structureTimelineEntry(content, { accountName: account.name });
        if (!title?.trim()) finalTitle = structured.title;
        if (!kind) finalKind = structured.kind;
        summary = structured.summary;
        sentiment = structured.sentiment;
        if (structured.occurredAt) {
          const parsed = new Date(structured.occurredAt);
          if (!isNaN(parsed.getTime())) occurredAt = parsed;
        }
        cleaned = structured.cleaned || content;
        source = `ai-${backend}`;
      } catch (e) {
        console.error("AI structuring failed:", e);
        // fall through with raw
      }
    }
  }

  const entry = await prisma.timelineEntry.create({
    data: {
      accountId: id,
      kind: finalKind,
      title: finalTitle,
      summary,
      sentiment,
      occurredAt,
      content: cleaned,
      source,
    },
  });

  await prisma.account.update({
    where: { id },
    data: { lastTouch: new Date() },
  });

  return NextResponse.json({ ok: true, entry });
}
