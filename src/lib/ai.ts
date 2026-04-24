/**
 * AI layer. Supports two backends:
 *   1. Ollama (local, default, free) — set OLLAMA_HOST + OLLAMA_MODEL in .env (defaults work out of the box)
 *   2. Anthropic Claude (optional, paid) — set ANTHROPIC_API_KEY in .env to override
 *
 * If Anthropic key is set, we use Claude (higher quality).
 * Otherwise we try Ollama.
 * If neither is reachable, callers catch the error and fall back to "save raw".
 */

import Anthropic from "@anthropic-ai/sdk";

// =============================================================
// CONFIG
// =============================================================
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

export type AIBackend = "anthropic" | "ollama" | "none";

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10);
}

/**
 * Best-effort check that Ollama is running.
 * Cached per-process for 30s so we don't hammer the endpoint.
 */
let _ollamaCache: { ok: boolean; ts: number } | null = null;
export async function ollamaAvailable(): Promise<boolean> {
  if (_ollamaCache && Date.now() - _ollamaCache.ts < 30_000) {
    return _ollamaCache.ok;
  }
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/version`, {
      signal: AbortSignal.timeout(800),
    });
    const ok = res.ok;
    _ollamaCache = { ok, ts: Date.now() };
    return ok;
  } catch {
    _ollamaCache = { ok: false, ts: Date.now() };
    return false;
  }
}

export async function detectBackend(): Promise<AIBackend> {
  if (hasAnthropicKey()) return "anthropic";
  if (await ollamaAvailable()) return "ollama";
  return "none";
}

/**
 * Synchronous "is any AI configured?" - used for UI gates where awaiting
 * is impractical. It errs on the side of saying yes if Ollama env points somewhere;
 * actual calls are defensively wrapped.
 */
export function hasAIKey(): boolean {
  // Kept for backward-compat with older components using this name.
  return hasAnthropicKey();
}

// =============================================================
// ANTHROPIC
// =============================================================
let _anthropic: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!hasAnthropicKey()) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

export const MODEL = ANTHROPIC_MODEL;

// =============================================================
// OLLAMA HELPERS
// =============================================================

/**
 * One-shot completion. Uses /api/generate, non-streaming.
 * `format: "json"` asks Ollama for strict JSON output.
 */
async function ollamaGenerate(
  prompt: string,
  opts: { json?: boolean; system?: string; timeout?: number } = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    model: OLLAMA_MODEL,
    prompt,
    stream: false,
    options: {
      temperature: 0.2,
      num_ctx: 8192,
    },
  };
  if (opts.system) body.system = opts.system;
  if (opts.json) body.format = "json";

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeout ?? 90_000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Ollama error: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as { response: string };
  return data.response;
}

/** Multi-turn chat via /api/chat */
async function ollamaChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts: { timeout?: number } = {}
): Promise<string> {
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature: 0.3,
        num_ctx: 8192,
      },
    }),
    signal: AbortSignal.timeout(opts.timeout ?? 180_000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Ollama chat error: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

// =============================================================
// STRUCTURED TIMELINE ENTRY (shared interface)
// =============================================================
export type StructuredEntry = {
  kind: string;
  title: string;
  summary: string;
  sentiment: string;
  occurredAt: string | null;
  cleaned: string;
};

const STRUCTURE_SYSTEM = `You are structuring a piece of raw text pasted by an account executive into their personal deal-tracking tool. The text may be a meeting transcript, an email thread, call notes, or a freeform note.

Return a strict JSON object with these fields:
- kind: one of "meeting" | "call" | "email" | "note" | "decision" | "milestone"
- title: 3-8 word title describing this entry
- summary: 2-4 sentence plain-English summary capturing what matters (decisions, next steps, concerns, stakeholders)
- sentiment: one of "positive" | "neutral" | "negative" | "at-risk"
- occurredAt: ISO date string if a clear date is present, else null
- cleaned: the original text lightly cleaned (preserve substance; trim signatures, disclaimers, tracking pixels, boilerplate)

Return ONLY the JSON object, no prose.`;

function safeParseJson(text: string): Record<string, unknown> {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Look for first {...} block
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object in response");
    return JSON.parse(match[0]);
  }
}

export async function structureTimelineEntry(
  raw: string,
  hint?: { accountName?: string }
): Promise<StructuredEntry> {
  const userMsg = `${hint?.accountName ? `Account: ${hint.accountName}\n\n` : ""}Raw text:\n"""\n${raw.slice(0, 24000)}\n"""`;

  if (hasAnthropicKey()) {
    const response = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: STRUCTURE_SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = response.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const parsed = safeParseJson(text);
    return toStructured(parsed, raw);
  }

  // Fallback: Ollama
  if (!(await ollamaAvailable())) {
    throw new Error(
      "No AI backend available. Install Ollama (brew install ollama && brew services start ollama) or set ANTHROPIC_API_KEY."
    );
  }
  const text = await ollamaGenerate(userMsg, {
    system: STRUCTURE_SYSTEM,
    json: true,
  });
  const parsed = safeParseJson(text);
  return toStructured(parsed, raw);
}

function toStructured(p: Record<string, unknown>, raw: string): StructuredEntry {
  const allowedKinds = ["meeting", "call", "email", "note", "decision", "milestone"];
  const allowedSentiments = ["positive", "neutral", "negative", "at-risk"];
  const kind = typeof p.kind === "string" && allowedKinds.includes(p.kind) ? p.kind : "note";
  const sentiment =
    typeof p.sentiment === "string" && allowedSentiments.includes(p.sentiment) ? p.sentiment : "neutral";
  return {
    kind,
    title: String(p.title || "Untitled").slice(0, 140),
    summary: String(p.summary || ""),
    sentiment,
    occurredAt: typeof p.occurredAt === "string" ? p.occurredAt : null,
    cleaned: typeof p.cleaned === "string" && p.cleaned.length > 0 ? p.cleaned : raw,
  };
}

// =============================================================
// CHAT (used by /api/accounts/[id]/chat)
// =============================================================
export async function aiChat(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  if (hasAnthropicKey()) {
    const response = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages,
    });
    return response.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  }

  if (!(await ollamaAvailable())) {
    throw new Error(
      "No AI backend available. Install Ollama (brew install ollama && brew services start ollama) or set ANTHROPIC_API_KEY."
    );
  }
  return ollamaChat([{ role: "system", content: system }, ...messages]);
}

// =============================================================
// Backend meta (for UI "which AI am I using" pills)
// =============================================================
export async function backendMeta(): Promise<{
  backend: AIBackend;
  model: string;
  local: boolean;
}> {
  if (hasAnthropicKey()) {
    return { backend: "anthropic", model: ANTHROPIC_MODEL, local: false };
  }
  if (await ollamaAvailable()) {
    return { backend: "ollama", model: OLLAMA_MODEL, local: true };
  }
  return { backend: "none", model: "", local: false };
}
