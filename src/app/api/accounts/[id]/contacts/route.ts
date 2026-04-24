import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name: string;
    role?: string | null;
    persona?: string;
    email?: string | null;
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const contact = await prisma.contact.create({
    data: {
      accountId: id,
      name: body.name.trim(),
      role: body.role || null,
      persona: body.persona || "unknown",
      email: body.email || null,
    },
  });
  return NextResponse.json({ ok: true, contact });
}
