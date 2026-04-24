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

export type DetectedDirection = {
  direction: "outbound" | "inbound" | null;
  // If outbound: the org name we're waiting on (should match one of the parties). Null if ambiguous.
  awaitingReplyFromOrgName: string | null;
  reasoning: string;
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

// ============================================================
// Direction + awaiting-party detection
// ============================================================
const DIR_SYS = `You analyse a pasted email thread or note. The user is an account executive at Cloudflare.

Look at the FIRST (top-most) message in the thread — that's what you're classifying.

Determine:

1. direction:
   - "outbound" if the FROM address of the top message is @cloudflare.com OR the content was clearly composed by the user
   - "inbound" if the FROM address of the top message is NOT @cloudflare.com
   - null ONLY if there's no clear email header and the text is just a note/transcript/decision

2. awaitingReplyFromOrgName:
   - Only fill if direction is "outbound"
   - The ORGANISATION NAME the user is now waiting to hear from, typically the FIRST To: recipient who is expected to act
   - If the To: field contains an address like sales@infinigate.co.uk, the org is "Infinigate" (infer from domain if no explicit name)
   - Prefer a name from the provided parties list if one matches; otherwise use a capitalised version of the domain's second-level name
   - null only if direction is not outbound OR there's clearly no reply expected

Return strict JSON:
{ "direction": "outbound" | "inbound" | null, "awaitingReplyFromOrgName": string | null, "reasoning": "1 short sentence" }`;

/**
 * Deterministic pre-pass: if we can confidently parse `From:` and `To:` headers
 * from the top of the content, we don't need the LLM. The LLM's only job is
 * the cases where headers aren't present (pasted transcripts, partial snippets).
 */
function deterministicDirection(
  content: string
): { direction: "outbound" | "inbound" | null; toDomains: string[] } {
  // Grab the first block of the content (stop at common reply separators)
  const top = content
    .split(/^\s*(?:On\s.+\s+wrote:|-+Original Message-+|>>>+|From: )/m)[0]
    .slice(0, 2000);

  const fromMatch = top.match(/^\s*From:\s*([^\r\n]+)/mi);
  const toMatch = top.match(/^\s*To:\s*([^\r\n]+)/mi);
  const ccMatch = top.match(/^\s*C[Cc]:\s*([^\r\n]+)/mi);

  const fromEmails = extractEmails(fromMatch?.[1] || "");
  const toLine = (toMatch?.[1] || "") + " " + (ccMatch?.[1] || "");
  const toEmails = extractEmails(toLine);

  let direction: "outbound" | "inbound" | null = null;
  if (fromEmails.length > 0) {
    const fromIsUser = fromEmails.some((e) => /@cloudflare\.com$/i.test(e));
    direction = fromIsUser ? "outbound" : "inbound";
  }

  const toDomains = Array.from(
    new Set(
      toEmails
        .map((e) => e.split("@")[1]?.toLowerCase())
        .filter((d): d is string => !!d && !/^cloudflare\.com$/i.test(d))
        .filter((d) => !COMMON_FREE_MAIL.has(d))
    )
  );

  return { direction, toDomains };
}

const COMMON_FREE_MAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
]);

function extractEmails(s: string): string[] {
  return s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
}

function titleFromDomain(domain: string): string {
  const core = domain.split(".")[0] || domain;
  return core.charAt(0).toUpperCase() + core.slice(1);
}

export async function detectDirection(
  content: string,
  parties: Array<{ name: string; domain: string | null; role: string }>
): Promise<DetectedDirection> {
  // 1. Try deterministic header parsing first — cheap and reliable.
  const det = deterministicDirection(content);

  if (det.direction) {
    let awaitingName: string | null = null;
    if (det.direction === "outbound" && det.toDomains.length > 0) {
      // Prefer a party whose domain matches the first to-domain
      const firstDom = det.toDomains[0];
      const matchByDomain = parties.find(
        (p) => p.domain && p.domain.toLowerCase() === firstDom
      );
      if (matchByDomain) {
        awaitingName = matchByDomain.name;
      } else {
        // Guess name from domain ("infinigate.co.uk" -> "Infinigate")
        awaitingName = titleFromDomain(firstDom);
      }
    }
    return {
      direction: det.direction,
      awaitingReplyFromOrgName: awaitingName,
      reasoning: "Parsed from email headers",
    };
  }

  // 2. Fall back to LLM for notes/transcripts without clear headers.
  const meta = await backendMeta();
  if (meta.backend === "none") {
    return { direction: null, awaitingReplyFromOrgName: null, reasoning: "" };
  }

  const partiesBlock =
    parties.length > 0
      ? `Parties on this deal:\n${parties
          .map((p) => `- ${p.name}${p.domain ? ` (${p.domain})` : ""} [${p.role}]`)
          .join("\n")}\n\n`
      : "";

  const user = `${partiesBlock}Content:\n"""\n${content.slice(0, 12000)}\n"""`;

  try {
    const raw =
      meta.backend === "anthropic"
        ? await anthropicJson(DIR_SYS, user)
        : await ollamaJson(DIR_SYS, user);
    const r = raw as Record<string, unknown>;
    const direction =
      r.direction === "outbound" || r.direction === "inbound" ? r.direction : null;
    const awaitingName =
      typeof r.awaitingReplyFromOrgName === "string" && r.awaitingReplyFromOrgName.trim()
        ? r.awaitingReplyFromOrgName.trim()
        : null;
    return {
      direction,
      awaitingReplyFromOrgName: awaitingName,
      reasoning: typeof r.reasoning === "string" ? r.reasoning : "",
    };
  } catch (e) {
    console.warn("detectDirection failed:", e);
    return { direction: null, awaitingReplyFromOrgName: null, reasoning: "" };
  }
}
