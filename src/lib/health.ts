/**
 * Deal health scoring.
 *
 * Computes a 0–100 score from real deal signals. No magic — deterministic rules
 * so the user understands *why* a deal is scored the way it is.
 *
 * Returns both a score and a list of human-readable flags explaining it.
 */

import { daysAgo } from "./utils";

export type HealthFlag = {
  id: string;
  level: "positive" | "neutral" | "warning" | "critical";
  label: string;
  detail?: string;
};

export type Health = {
  score: number; // 0–100
  band: "healthy" | "watch" | "at-risk" | "critical";
  flags: HealthFlag[];
  filledMeddic: number; // 0–6
};

type AccountInput = {
  stage: string;
  stageChangedAt?: Date | string | null;
  lastTouch: Date | string;
  nextAction: string | null;
  nextActionDue: Date | string | null;
  meddicMetrics: string | null;
  meddicEconomicBuyer: string | null;
  meddicDecisionCriteria: string | null;
  meddicDecisionProcess: string | null;
  meddicPainIdentified: string | null;
  meddicChampion: string | null;
  contacts: Array<{ persona: string }>;
  timeline: Array<{ sentiment: string | null; occurredAt: Date | string }>;
};

// Stage-specific "time in stage should be below X days" ceilings
const STAGE_MAX_DAYS: Record<string, number> = {
  discovery: 30,
  qualified: 45,
  proposal: 30,
  negotiation: 21,
  won: 9999,
  lost: 9999,
  dormant: 9999,
};

export function scoreAccount(a: AccountInput): Health {
  const flags: HealthFlag[] = [];
  let score = 100;

  // --- 1. Recency of touch ---
  const d = daysAgo(a.lastTouch);
  if (d >= 21) {
    flags.push({
      id: "cold",
      level: "critical",
      label: "Going cold",
      detail: `No activity in ${d} days`,
    });
    score -= 25;
  } else if (d >= 14) {
    flags.push({
      id: "stale",
      level: "warning",
      label: "Stale",
      detail: `No activity in ${d} days`,
    });
    score -= 12;
  } else if (d <= 3 && a.stage !== "dormant") {
    flags.push({ id: "active", level: "positive", label: "Recently active" });
  }

  // --- 2. Next action ---
  if (!a.nextAction) {
    flags.push({
      id: "no-next-action",
      level: "warning",
      label: "No next action",
      detail: "You haven't decided what to do next",
    });
    score -= 10;
  } else if (a.nextActionDue && new Date(a.nextActionDue) < new Date()) {
    flags.push({
      id: "overdue-action",
      level: "critical",
      label: "Overdue next action",
      detail: `"${a.nextAction.slice(0, 60)}" was due ${daysAgo(a.nextActionDue)}d ago`,
    });
    score -= 15;
  }

  // --- 3. Stage duration anomaly ---
  if (a.stageChangedAt) {
    const stageDays = daysAgo(a.stageChangedAt);
    const max = STAGE_MAX_DAYS[a.stage] ?? 9999;
    if (stageDays > max) {
      flags.push({
        id: "stage-stuck",
        level: "warning",
        label: `Stuck in ${a.stage}`,
        detail: `${stageDays}d in this stage (typical: <${max}d)`,
      });
      score -= 15;
    }
  }

  // --- 4. Stakeholder multithreading ---
  const stakeholders = a.contacts.length;
  const hasChampion = a.contacts.some((c) => c.persona === "champion");
  const hasEB = a.contacts.some((c) => c.persona === "economic-buyer");

  if (stakeholders === 0) {
    flags.push({
      id: "no-contacts",
      level: "warning",
      label: "No contacts yet",
      detail: "Add at least one stakeholder",
    });
    score -= 10;
  } else if (stakeholders === 1 && a.stage !== "discovery") {
    flags.push({
      id: "single-threaded",
      level: "warning",
      label: "Single-threaded",
      detail: "Only 1 contact on this deal — high risk if they leave or go dark",
    });
    score -= 12;
  }
  if (!hasEB && ["proposal", "negotiation"].includes(a.stage)) {
    flags.push({
      id: "no-economic-buyer",
      level: "critical",
      label: "No economic buyer engaged",
      detail: "Can't close without someone who signs",
    });
    score -= 15;
  }
  if (!hasChampion && a.stage !== "discovery") {
    flags.push({
      id: "no-champion",
      level: "warning",
      label: "No champion identified",
      detail: "Who is selling this internally for you?",
    });
    score -= 8;
  }

  // --- 5. Sentiment trend ---
  const recent = (a.timeline || []).slice(0, 5);
  const negative = recent.filter(
    (e) => e.sentiment === "at-risk" || e.sentiment === "negative"
  ).length;
  const positive = recent.filter((e) => e.sentiment === "positive").length;
  if (recent.length >= 3 && negative >= 2) {
    flags.push({
      id: "negative-trend",
      level: "critical",
      label: "Sentiment trending negative",
      detail: `${negative} of last ${recent.length} entries flagged negative or at-risk`,
    });
    score -= 15;
  } else if (recent.length >= 3 && positive >= 2 && negative === 0) {
    flags.push({
      id: "positive-trend",
      level: "positive",
      label: "Sentiment trending positive",
    });
    score += 5;
  }

  // --- 6. MEDDIC completion ---
  const meddicFields = [
    a.meddicMetrics,
    a.meddicEconomicBuyer,
    a.meddicDecisionCriteria,
    a.meddicDecisionProcess,
    a.meddicPainIdentified,
    a.meddicChampion,
  ];
  const filledMeddic = meddicFields.filter(
    (v) => v && v.trim().length >= 3
  ).length;
  if (["proposal", "negotiation"].includes(a.stage) && filledMeddic < 3) {
    flags.push({
      id: "meddic-thin",
      level: "warning",
      label: "Qualification is thin",
      detail: `Only ${filledMeddic} of 6 MEDDIC fields filled in`,
    });
    score -= 10;
  } else if (filledMeddic >= 5) {
    flags.push({
      id: "well-qualified",
      level: "positive",
      label: "Well qualified",
      detail: `${filledMeddic}/6 MEDDIC fields filled`,
    });
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  const band: Health["band"] =
    score >= 75
      ? "healthy"
      : score >= 55
      ? "watch"
      : score >= 35
      ? "at-risk"
      : "critical";

  // Sort flags: critical → warning → neutral → positive
  const order = { critical: 0, warning: 1, neutral: 2, positive: 3 } as const;
  flags.sort((a, b) => order[a.level] - order[b.level]);

  return { score, band, flags, filledMeddic };
}

export function bandLabel(band: Health["band"]): string {
  return {
    healthy: "Healthy",
    watch: "Watch",
    "at-risk": "At risk",
    critical: "Critical",
  }[band];
}

export function bandStyle(band: Health["band"]): {
  ring: string;
  text: string;
  bg: string;
  dot: string;
} {
  switch (band) {
    case "healthy":
      return {
        ring: "stroke-emerald-500",
        text: "text-emerald-700",
        bg: "bg-emerald-50",
        dot: "bg-emerald-500",
      };
    case "watch":
      return {
        ring: "stroke-blue-500",
        text: "text-blue-700",
        bg: "bg-blue-50",
        dot: "bg-blue-500",
      };
    case "at-risk":
      return {
        ring: "stroke-amber-500",
        text: "text-amber-800",
        bg: "bg-amber-50",
        dot: "bg-amber-500",
      };
    case "critical":
      return {
        ring: "stroke-rose-500",
        text: "text-rose-700",
        bg: "bg-rose-50",
        dot: "bg-rose-500",
      };
  }
}

export const PERSONA_LABELS: Record<string, string> = {
  champion: "Champion",
  "economic-buyer": "Economic buyer",
  influencer: "Influencer",
  blocker: "Blocker",
  user: "User",
  unknown: "Unknown",
};

export function personaStyle(persona: string): string {
  switch (persona) {
    case "champion":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "economic-buyer":
      return "bg-violet-50 text-violet-700 border-violet-100";
    case "influencer":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "blocker":
      return "bg-rose-50 text-rose-700 border-rose-100";
    case "user":
      return "bg-slate-50 text-slate-700 border-slate-100";
    default:
      return "bg-slate-50 text-slate-500 border-slate-100";
  }
}
