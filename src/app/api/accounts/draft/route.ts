import { NextRequest, NextResponse } from "next/server";
import { draftAccountFromText } from "@/lib/draft-account";
import { detectBackend } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const backend = await detectBackend();
  if (backend === "none") {
    return NextResponse.json(
      { error: "AI backend not available. Start Ollama or set ANTHROPIC_API_KEY." },
      { status: 400 }
    );
  }

  const { content } = (await req.json()) as { content: string };
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const draft = await draftAccountFromText(content);
  if (!draft) {
    return NextResponse.json({ error: "Could not draft from content" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, draft });
}
