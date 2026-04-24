/**
 * Detect organisations + their role in a pasted email thread or transcript.
 * Uses the same AI backend as everything else.
 */

import { backendMeta, anthropic, MODEL } from "./ai";
import { PARTY_ROLES } from "./orgs";

export type DetectedParty = {
  name: string;
  domain: string | null;
  role: string; // customer | distributor | partner | cloudflare | other
  peopleSeen: string[]; // names or emails spotted
  reasoning: string; // short explanation so the user can trust/reject
};

const SYS = `You analyse pasted content (usually an email thread) and extract the organisations involved in the deal.

For each organisation you identify, return:
- name: the org's name (as it appears in the content; "Natilik", "Infinigate", "Cloudflare", "Hibernia Line")
- domain: the org's email domain if present (e.g. "natilik.com"), else null
- role: one of "customer", "distributor", "partner", "cloudflare", "other"
- peopleSeen: array of person names or email addresses associated with that org in this content
- reasoning: 1 short sentence on why you inferred this role

Rules:
- Cloudflare is almost always "cloudflare"
- Distributors like Infinigate, E92, Exclusive, Westcon, Arrow are "distributor"
- Named channel partners like Natilik, Softcat, Global Dots, SoftwareONE, CDS, Computacenter are "partner"
- The end-user company buying the solution is "customer"
- If you can't tell, "other"
- Free-mail domains (gmail, outlook, hotmail, yahoo) should NOT become their own org — associate those people with the nearest corporate org if possible, otherwise skip them

Return strict JSON:
{ "parties": [ { name, domain, role, peopleSeen, reasoning }, ... ] }`;

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
    signal: AbortSignal.timeout(90_000),
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
    max_tokens: 2000,
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

export async function detectParties(
  content: string,
  existing: Array<{ name: string; domain: string | null; role: string }>,
  accountName: string
): Promise<DetectedParty[]> {
  const meta = await backendMeta();
  if (meta.backend === "none") return [];

  const existingBlock =
    existing.length > 0
      ? `\nAlready on this deal (use these if you see them; don't duplicate):\n${existing
          .map(
            (e) =>
              `- ${e.name}${e.domain ? ` (${e.domain})` : ""} as ${e.role}`
          )
          .join("\n")}`
      : "";

  const user = `Deal: ${accountName}${existingBlock}

Content:
"""
${content.slice(0, 16000)}
"""`;

  let raw: unknown;
  try {
    raw =
      meta.backend === "anthropic"
        ? await anthropicJson(SYS, user)
        : await ollamaJson(SYS, user);
  } catch (e) {
    console.warn("detectParties failed:", e);
    return [];
  }

  const parties =
    (raw as { parties?: DetectedParty[] })?.parties?.filter((p) =>
      PARTY_ROLES.includes(p.role as (typeof PARTY_ROLES)[number])
    ) ?? [];

  // Filter out "Cloudflare" with role=cloudflare since we never need to create it as a party on your own deals
  return parties.filter((p) => !(p.role === "cloudflare"));
}
