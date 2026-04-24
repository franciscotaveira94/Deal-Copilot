/** Deal party roles + styling */

export const PARTY_ROLES = [
  "customer",
  "distributor",
  "partner",
  "cloudflare",
  "other",
] as const;

export type PartyRole = (typeof PARTY_ROLES)[number];

export const PARTY_LABELS: Record<string, string> = {
  customer: "Customer",
  distributor: "Distributor",
  partner: "Partner",
  cloudflare: "Cloudflare",
  other: "Other",
};

export function partyStyle(role: string): string {
  switch (role) {
    case "customer":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "distributor":
      return "bg-violet-50 text-violet-700 border-violet-100";
    case "partner":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "cloudflare":
      return "bg-orange-50 text-orange-700 border-orange-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-100";
  }
}

export const ORG_KINDS = [
  "customer",
  "partner",
  "distributor",
  "cloudflare",
  "other",
  "unknown",
] as const;

/** Common email/domain → org inference */
export function domainFromEmail(email: string): string | null {
  const m = email.match(/@([^>\s]+)$/);
  if (!m) return null;
  const dom = m[1].toLowerCase().trim();
  // skip common free providers — they're not corporate orgs
  if (["gmail.com", "googlemail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"].includes(dom)) {
    return null;
  }
  return dom;
}

/** Rough org name from domain (e.g. "natilik.com" → "Natilik") */
export function guessNameFromDomain(domain: string): string {
  const base = domain.split(".")[0] || domain;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
