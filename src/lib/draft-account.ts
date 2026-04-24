/**
 * Given unstructured text (email thread, meeting notes, anything), produce a
 * structured account draft the user can review and save.
 */

import { backendMeta, anthropic, MODEL } from "./ai";
import { ALL_STAGES, PRIORITIES } from "./utils";

export type AccountDraft = {
  name: string;
  domain: string | null;
  industry: string | null;
  stage: string; // one of ALL_STAGES
  priority: string; // one of PRIORITIES
  arrUsd: number | null; // dollars (converted to cents at save time)
  summary: string | null;
  nextAction: string | null;
  parties: Array<{
    name: string;
    domain: string | null;
    role: string; // customer | distributor | partner | other
    reasoning: string;
  }>;
  confidence: number; // 0-100 self-assessment
  reasoning: string;
};

const SYS = `You are structuring unstructured text pasted by an account executive who is creating a new deal in their CRM.

The text could be: an email thread, meeting notes, a partner intro, a Slack message, a pasted Salesforce record, a voice-to-text memo — anything.

Read carefully. Produce a strict JSON object with these fields:

- name: the CUSTOMER company name (the org who would be paying). Not the partner or distributor. If unclear, use the most likely candidate.
- domain: the customer's email domain if present (e.g. "monument.tech"). Null if unknown.
- industry: short industry description (e.g. "Legal / Professional services"). Null if unknown.
- stage: one of "discovery" | "qualified" | "proposal" | "negotiation" | "won" | "lost" | "dormant". Default "discovery" if unclear.
- priority: one of "low" | "medium" | "high" | "critical". Default "medium".
- arrUsd: estimated annual run-rate in US dollars (a number, not a string). Null if no pricing is mentioned.
- summary: 2-3 plain-English sentences capturing where this deal is RIGHT NOW (not the full history).
- nextAction: one concrete next step the AE should take. Null if none obvious.
- parties: array of organisations mentioned, each with:
    - name
    - domain (or null)
    - role: "customer" | "distributor" | "partner" | "other"
    - reasoning: 1 short sentence

Important rules:
- Don't include Cloudflare as a party.
- Distributors like Infinigate, E92, Exclusive, Westcon, Arrow are "distributor".
- Named channel partners like Natilik, Softcat, Global Dots, SoftwareONE, CDS, Computacenter are "partner".
- If you cannot find a customer name, use your best guess from context and set confidence low.

- confidence: 0-100 self-assessment of how well-grounded your draft is.
- reasoning: 1 short sentence explaining your read on the situation.

Return ONLY the JSON object.`;

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

async function ollamaJson(sys: string, user: string): Promise<unknown> {
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      system: sys,
      prompt: user,
      stream: false,
      format: "json",
      options: { temperature: 0.1, num_ctx: 8192 },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = (await res.json()) as { response: string };
  try {
    return JSON.parse(data.response);
  } catch {
    const m = data.response.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    return JSON.parse(m[0]);
  }
}

async function anthropicJson(sys: string, user: string): Promise<unknown> {
  const c = anthropic();
  const r = await c.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: sys,
    messages: [{ role: "user", content: user }],
  });
  const text = r.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    return JSON.parse(m[0]);
  }
}

export async function draftAccountFromText(content: string): Promise<AccountDraft | null> {
  const meta = await backendMeta();
  if (meta.backend === "none") return null;

  const user = `Input:\n"""\n${content.slice(0, 24000)}\n"""`;

  let raw: unknown;
  try {
    raw = meta.backend === "anthropic" ? await anthropicJson(SYS, user) : await ollamaJson(SYS, user);
  } catch (e) {
    console.warn("draftAccountFromText failed:", e);
    return null;
  }

  const r = raw as Record<string, unknown>;

  const stage =
    typeof r.stage === "string" && (ALL_STAGES as readonly string[]).includes(r.stage)
      ? r.stage
      : "discovery";
  const priority =
    typeof r.priority === "string" && (PRIORITIES as readonly string[]).includes(r.priority)
      ? r.priority
      : "medium";

  const partiesRaw = Array.isArray(r.parties) ? (r.parties as Array<Record<string, unknown>>) : [];
  const parties = partiesRaw
    .filter((p) => typeof p.name === "string" && p.name && p.role !== "cloudflare")
    .map((p) => ({
      name: String(p.name).trim(),
      domain: typeof p.domain === "string" && p.domain ? p.domain : null,
      role:
        p.role === "customer" || p.role === "distributor" || p.role === "partner"
          ? (p.role as string)
          : "other",
      reasoning: typeof p.reasoning === "string" ? p.reasoning : "",
    }));

  return {
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : "",
    domain: typeof r.domain === "string" && r.domain ? r.domain : null,
    industry: typeof r.industry === "string" && r.industry ? r.industry : null,
    stage,
    priority,
    arrUsd: typeof r.arrUsd === "number" && Number.isFinite(r.arrUsd) ? r.arrUsd : null,
    summary: typeof r.summary === "string" && r.summary ? r.summary : null,
    nextAction: typeof r.nextAction === "string" && r.nextAction ? r.nextAction : null,
    parties,
    confidence:
      typeof r.confidence === "number" && Number.isFinite(r.confidence)
        ? Math.max(0, Math.min(100, r.confidence))
        : 50,
    reasoning: typeof r.reasoning === "string" ? r.reasoning : "",
  };
}
