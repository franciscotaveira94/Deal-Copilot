import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aiChat, detectBackend } from "@/lib/ai";
import { shortDate } from "@/lib/utils";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const backend = await detectBackend();
  if (backend === "none") {
    return NextResponse.json(
      {
        error:
          "No AI backend available. Start Ollama (`brew services start ollama`) or set ANTHROPIC_API_KEY in .env.",
      },
      { status: 400 }
    );
  }

  const { message } = (await req.json()) as { message: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      timeline: { orderBy: { occurredAt: "desc" }, take: 30 },
      actions: { where: { done: false }, orderBy: { dueAt: "asc" } },
      contacts: true,
      chats: { orderBy: { createdAt: "asc" }, take: 20 },
    },
  });

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  await prisma.chatMessage.create({
    data: { accountId: id, role: "user", content: message },
  });

  const contextBlocks = [
    `# Account: ${account.name}`,
    account.domain ? `Domain: ${account.domain}` : null,
    account.industry ? `Industry: ${account.industry}` : null,
    `Stage: ${account.stage} | Priority: ${account.priority}`,
    account.arr != null ? `ARR: $${(account.arr / 100).toLocaleString()}` : null,
    account.summary ? `\n## Current summary\n${account.summary}` : null,
    account.nextAction
      ? `\n## Next action\n${account.nextAction}${
          account.nextActionDue ? ` (due ${shortDate(account.nextActionDue)})` : ""
        }`
      : null,
    account.notes ? `\n## Notes\n${account.notes}` : null,
    account.contacts.length > 0
      ? `\n## Contacts\n${account.contacts
          .map((c) => `- ${c.name}${c.role ? ` (${c.role})` : ""}${c.email ? ` — ${c.email}` : ""}`)
          .join("\n")}`
      : null,
    account.actions.length > 0
      ? `\n## Open actions\n${account.actions
          .map(
            (a) =>
              `- ${a.title}${a.dueAt ? ` [due ${shortDate(a.dueAt)}]` : ""}${
                a.detail ? `\n  ${a.detail}` : ""
              }`
          )
          .join("\n")}`
      : null,
    account.timeline.length > 0
      ? `\n## Timeline (most recent first)\n${account.timeline
          .map((e) => {
            const parts = [
              `### ${shortDate(e.occurredAt)} — ${e.kind.toUpperCase()}: ${e.title}`,
              e.sentiment && e.sentiment !== "neutral" ? `[sentiment: ${e.sentiment}]` : null,
              e.summary ? `Summary: ${e.summary}` : null,
              e.content ? `Content:\n${e.content.slice(0, 2500)}` : null,
            ].filter(Boolean);
            return parts.join("\n");
          })
          .join("\n\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const system = `You are the personal sales copilot for an account executive at Cloudflare.
You help them manage their deals with clear, honest, strategic thinking.

You have full context for this account below. When the user asks a question, answer grounded in what's actually in the timeline, actions, and notes — not generic sales advice.

Be direct about risks, gaps, and what the AE should do next. Don't flatter. Don't restate what they already know.

If the user asks you to draft something (email, note, summary), produce it clean and ready to copy/paste.

Keep answers concise by default (3-6 sentences) unless they ask for depth or a drafted artefact.

Today is ${new Date().toDateString()}.

===== ACCOUNT CONTEXT =====
${contextBlocks}
===== END CONTEXT =====`;

  const priorMessages = account.chats.map((c) => ({
    role: c.role as "user" | "assistant",
    content: c.content,
  }));

  try {
    const reply = await aiChat(system, [...priorMessages, { role: "user", content: message }]);

    await prisma.chatMessage.create({
      data: { accountId: id, role: "assistant", content: reply },
    });

    return NextResponse.json({ reply, backend });
  } catch (e: unknown) {
    console.error("Chat error:", e);
    const msg = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.chatMessage.deleteMany({ where: { accountId: id } });
  return NextResponse.json({ ok: true });
}
