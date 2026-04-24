import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function relative(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return formatDistanceToNow(date, { addSuffix: true });
}

export function shortDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "d MMM yyyy");
}

export function tinyDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "d MMM");
}

export function isoDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "yyyy-MM-dd");
}

export function daysAgo(d: Date | string | null | undefined): number {
  if (!d) return Infinity;
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/** Active pipeline stages (excludes won/lost/dormant) */
export const PIPELINE_STAGES = ["discovery", "qualified", "proposal", "negotiation"] as const;
export const ALL_STAGES = [
  "discovery",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
  "dormant",
] as const;

export type Stage = (typeof ALL_STAGES)[number];

export const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovery",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  dormant: "Dormant",
};

export function stageStyle(stage: string) {
  const key = stage.replace(/[^a-z]/gi, "");
  return {
    dot: `bg-[var(--stage-${key})]`,
    tag: `bg-[var(--stage-${key}-bg)] text-[var(--stage-${key})] border-[var(--stage-${key}-bg)]`,
  };
}

export const PRIORITIES = ["low", "medium", "high", "critical"] as const;

export function priorityStyle(p: string) {
  switch (p) {
    case "critical":
      return "bg-rose-50 text-rose-700 border-rose-100";
    case "high":
      return "bg-orange-50 text-orange-700 border-orange-100";
    case "medium":
      return "bg-slate-50 text-slate-600 border-slate-100";
    case "low":
      return "bg-slate-50 text-slate-500 border-slate-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-100";
  }
}

export const KINDS = ["meeting", "call", "email", "note", "decision", "milestone"] as const;
export type Kind = (typeof KINDS)[number];

export function kindMeta(kind: string): { label: string; emoji: string; tint: string } {
  const map: Record<string, { label: string; emoji: string; tint: string }> = {
    meeting: { label: "Meeting", emoji: "👥", tint: "bg-blue-50 text-blue-700" },
    call: { label: "Call", emoji: "📞", tint: "bg-indigo-50 text-indigo-700" },
    email: { label: "Email", emoji: "✉️", tint: "bg-slate-50 text-slate-700" },
    note: { label: "Note", emoji: "✎", tint: "bg-amber-50 text-amber-800" },
    decision: { label: "Decision", emoji: "◆", tint: "bg-violet-50 text-violet-700" },
    milestone: { label: "Milestone", emoji: "★", tint: "bg-emerald-50 text-emerald-700" },
  };
  return map[kind] || { label: kind, emoji: "•", tint: "bg-slate-50 text-slate-600" };
}

export function sentimentStyle(s: string | null | undefined) {
  switch (s) {
    case "positive":
      return "text-[var(--pos)]";
    case "negative":
      return "text-[var(--neg)]";
    case "at-risk":
      return "text-[var(--risk)]";
    default:
      return "text-[var(--muted)]";
  }
}

/** ARR stored as cents; display as USD */
export function formatArr(arr: number | null | undefined, opts?: { compact?: boolean }): string {
  if (arr == null) return "—";
  const dollars = arr / 100;
  if (opts?.compact) {
    if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
    if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}k`;
    return `$${Math.round(dollars)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

export function initials(name: string): string {
  const parts = name
    .replace(/(Ltd|Limited|LLP|Inc|Corp|Corporation|GmbH|AG|SAS|SA|Tech|Technology)\.?/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
