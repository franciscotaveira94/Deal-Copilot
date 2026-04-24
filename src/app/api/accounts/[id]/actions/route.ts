import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { title, detail, dueAt, priority } = (await req.json()) as {
    title: string;
    detail?: string;
    dueAt?: string | null;
    priority?: string;
  };
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const action = await prisma.action.create({
    data: {
      accountId: id,
      title: title.trim(),
      detail: detail || null,
      dueAt: dueAt ? new Date(dueAt) : null,
      priority: priority || "medium",
    },
  });
  return NextResponse.json({ ok: true, action });
}
