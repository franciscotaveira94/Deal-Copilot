/**
 * AI extractors for structured deal data.
 *
 * Separate from lib/ai.ts because these are purpose-built prompts for specific
 * data shapes (MEDDIC, pre-call brief). They use the same backend detection.
 */

import { aiChat, anthropic, hasAnthropicKey, ollamaAvailable, backendMeta, MODEL } from "./ai";

// ---------- Ollama JSON helper ----------
async function ollamaJson<T>(system: string, user: string): Promise<T> {
  const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      system,
      prompt: user,
      stream: false,
      format: "json",
      options: { temperature: 0.2, num_ctx: 8192 },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = (await res.json()) as { response: string };
  // safeParse
  try {
    return JSON.parse(data.response) as T;
  } catch {
    const m = data.response.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Invalid JSON response");
    return JSON.parse(m[0]) as T;
  }
}

async function anthropicJson<T>(system: string, user: string): Promise<T> {
  const c = anthropic();
  const r = await c.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = r.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Invalid JSON response");
    return JSON.parse(m[0]) as T;
  }
}

// ============================================================
// MEDDIC extractor
// ============================================================
export type MeddicExtraction = {
  metrics: string | null;
  economicBuyer: string | null;
  decisionCriteria: string | null;
  decisionProcess: string | null;
  painIdentified: string | null;
  champion: string | null;
};

const MEDDIC_SYSTEM = `You are extracting MEDDIC qualification data from the timeline of a sales deal.

MEDDIC stands for:
- Metrics: What measurable outcome does the buyer want? (ROI, time saved, incidents prevented, etc.)
- Economic Buyer: Who has the budget / signs the contract?
- Decision Criteria: What must be true for the buyer to say yes?
- Decision Process: How will they make the decision? (steps, approvers, timeline)
- Pain Identified: What compelling event is driving this? (threats, compliance, business risk)
- Champion: Who is actively selling this internally on the buyer's side?

Read the timeline carefully. For each field, write 1-3 concise sentences of what you know from the actual evidence. If nothing in the timeline addresses it, set to null.

Return strict JSON with these fields:
{
  "metrics": string | null,
  "economicBuyer": string | null,
  "decisionCriteria": string | null,
  "decisionProcess": string | null,
  "painIdentified": string | null,
  "champion": string | null
}

Be honest: if the timeline doesn't say something, don't make it up. Null is better than speculation.`;

export async function extractMeddic(
  accountName: string,
  summary: string | null,
  timelineText: string,
  contacts: Array<{ name: string; role: string | null; persona: string }>,
  existing: MeddicExtraction
): Promise<MeddicExtraction> {
  const meta = await backendMeta();
  if (meta.backend === "none") throw new Error("No AI backend available");

  const contactBlock =
    contacts.length > 0
      ? `\nKnown contacts:\n${contacts
          .map(
            (c) =>
              `- ${c.name}${c.role ? ` (${c.role})` : ""} — persona: ${c.persona}`
          )
          .join("\n")}`
      : "";

  const existingBlock = Object.entries(existing)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const user = `Account: ${accountName}
${summary ? `Current summary: ${summary}\n` : ""}${contactBlock}
${existingBlock ? `\nExisting MEDDIC notes (refine rather than overwrite):\n${existingBlock}\n` : ""}
Timeline (most recent first):
"""
${timelineText.slice(0, 20000)}
"""`;

  if (meta.backend === "anthropic") {
    return anthropicJson<MeddicExtraction>(MEDDIC_SYSTEM, user);
  }
  return ollamaJson<MeddicExtraction>(MEDDIC_SYSTEM, user);
}

// ============================================================
// Pre-call prep brief
// ============================================================
export type PrepBrief = {
  oneLine: string; // one-sentence status
  context: string; // 2-3 sentence context block
  keyPoints: string[]; // 3-6 bullet points — wins, open threads, risks
  openQuestions: string[]; // things the AE should ask or clarify
  risks: string[]; // what could go wrong
  suggestedAgenda: string[]; // proposed agenda items for the call
};

const BRIEF_SYSTEM = `You are preparing an account executive for an upcoming call or interaction with a customer. You have access to the full deal context, timeline, open actions, and contacts.

Produce a tight, practical pre-call brief. This is for the AE's eyes only — be direct, not polished. No preamble, no flattery.

Return strict JSON:
{
  "oneLine": "one-sentence status ('Where are we?')",
  "context": "2-3 sentences: stage, deal size if known, what's just happened, what's at stake now",
  "keyPoints": ["bullet 1", "bullet 2", ...] (3-6 bullets covering wins, commitments made by either side, decisions pending),
  "openQuestions": ["question 1", ...] (things the AE should probe or confirm on this call),
  "risks": ["risk 1", ...] (things that could derail the deal or the call),
  "suggestedAgenda": ["item 1", ...] (3-5 concrete agenda items the AE could propose)
}

Ground everything in the actual timeline. If there's not enough info for a field, return a short empty array [].`;

export async function generateBrief(
  accountName: string,
  stage: string,
  arr: number | null,
  summary: string | null,
  nextAction: string | null,
  meddic: MeddicExtraction,
  contacts: Array<{ name: string; role: string | null; persona: string }>,
  timelineText: string
): Promise<PrepBrief> {
  const meta = await backendMeta();
  if (meta.backend === "none") throw new Error("No AI backend available");

  const arrLine = arr != null ? `ARR: $${(arr / 100).toLocaleString()}` : "";
  const meddicLines = Object.entries(meddic)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  const contactBlock =
    contacts.length > 0
      ? `\nContacts:\n${contacts
          .map(
            (c) =>
              `- ${c.name}${c.role ? ` (${c.role})` : ""} — ${c.persona}`
          )
          .join("\n")}`
      : "";

  const user = `Account: ${accountName}
Stage: ${stage}
${arrLine}

${summary ? `Summary: ${summary}` : ""}
${nextAction ? `Next action: ${nextAction}` : ""}
${meddicLines ? `\nMEDDIC:\n${meddicLines}` : ""}
${contactBlock}

Recent timeline (most recent first):
"""
${timelineText.slice(0, 18000)}
"""

Today: ${new Date().toDateString()}

Produce the brief.`;

  if (meta.backend === "anthropic") {
    return anthropicJson<PrepBrief>(BRIEF_SYSTEM, user);
  }
  return ollamaJson<PrepBrief>(BRIEF_SYSTEM, user);
}

// Helper: format timeline entries into plain text for prompts
export function timelineToText(
  entries: Array<{
    kind: string;
    title: string;
    occurredAt: Date | string;
    summary: string | null;
    sentiment: string | null;
    content: string;
  }>
): string {
  return entries
    .slice(0, 30)
    .map((e) => {
      const date = typeof e.occurredAt === "string"
        ? e.occurredAt.slice(0, 10)
        : e.occurredAt.toISOString().slice(0, 10);
      const parts = [
        `### [${date}] ${e.kind.toUpperCase()}: ${e.title}`,
        e.sentiment && e.sentiment !== "neutral" ? `sentiment: ${e.sentiment}` : null,
        e.summary ? `summary: ${e.summary}` : null,
        `content: ${e.content.slice(0, 2500)}`,
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n");
}
