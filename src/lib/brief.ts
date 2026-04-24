/**
 * The morning brief — a short editorial-style piece of writing that summarises
 * what needs your attention today, across the whole portfolio.
 *
 * This is generated deterministically (template + real data) rather than via
 * AI, so it's fast and free. AI narration is optional and layered on.
 */

import { prisma } from "./db";
import { daysAgo } from "./utils";

export type BriefSignal = {
  kind:
    | "overdue-reply"
    | "overdue-action"
    | "stale"
    | "action-due"
    | "upcoming"
    | "quiet";
  accountId: string;
  accountName: string;
  orgName?: string;
  title?: string;
  meta?: string;
  severity: "low" | "medium" | "high";
  daysElapsed?: number;
};

export type BriefData = {
  date: Date;
  signals: BriefSignal[];
  counts: {
    overdueReplies: number;
    overdueActions: number;
    staleAccounts: number;
    dueSoon: number;
    upcomingMeetings: number;
    pipelineArr: number;
    pipelineCount: number;
  };
};

export async function buildBrief(): Promise<BriefData> {
  const now = new Date();
  const [overdueReplies, overdueActions, staleAccounts, dueSoon, upcomingMeetings, pipelineGroups] =
    await Promise.all([
      prisma.timelineEntry.findMany({
        where: {
          awaitingReplyDueAt: { lt: now },
          awaitedReplyResolvedAt: null,
          awaitingReplyFromId: { not: null },
        },
        include: {
          account: { select: { id: true, name: true } },
          awaitingReplyFrom: { select: { id: true, name: true } },
        },
        orderBy: { awaitingReplyDueAt: "asc" },
        take: 12,
      }),
      prisma.action.findMany({
        where: { done: false, dueAt: { lt: now } },
        include: { account: { select: { id: true, name: true } } },
        orderBy: { dueAt: "asc" },
        take: 12,
      }),
      prisma.account.findMany({
        where: {
          status: "active",
          stage: { in: ["discovery", "qualified", "proposal", "negotiation"] },
        },
        orderBy: { lastTouch: "asc" },
        take: 10,
      }),
      prisma.action.findMany({
        where: {
          done: false,
          dueAt: {
            gte: now,
            lt: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
          },
        },
        include: { account: { select: { id: true, name: true } } },
        orderBy: { dueAt: "asc" },
        take: 20,
      }),
      prisma.timelineEntry.findMany({
        where: {
          kind: "meeting",
          occurredAt: {
            gte: now,
            lt: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
          },
        },
        include: { account: { select: { id: true, name: true } } },
        orderBy: { occurredAt: "asc" },
        take: 10,
      }),
      prisma.account.groupBy({
        by: ["stage"],
        where: {
          status: "active",
          stage: { in: ["discovery", "qualified", "proposal", "negotiation"] },
        },
        _sum: { arr: true },
        _count: true,
      }),
    ]);

  const signals: BriefSignal[] = [];

  for (const e of overdueReplies) {
    const hrs = Math.floor(
      (now.getTime() - new Date(e.awaitingReplyDueAt!).getTime()) / (3600 * 1000)
    );
    signals.push({
      kind: "overdue-reply",
      accountId: e.account.id,
      accountName: e.account.name,
      orgName: e.awaitingReplyFrom?.name || "someone",
      title: e.title,
      meta: hrs < 24 ? `${hrs}h overdue` : `${Math.floor(hrs / 24)}d overdue`,
      severity: hrs > 48 ? "high" : hrs > 8 ? "medium" : "low",
      daysElapsed: Math.floor(hrs / 24),
    });
  }

  for (const a of overdueActions) {
    const d = daysAgo(a.dueAt);
    signals.push({
      kind: "overdue-action",
      accountId: a.account?.id || "",
      accountName: a.account?.name || "—",
      title: a.title,
      meta: d < 1 ? "due today" : `${d}d overdue`,
      severity: d > 3 ? "high" : "medium",
      daysElapsed: d,
    });
  }

  const staleFiltered = staleAccounts
    .filter((a) => daysAgo(a.lastTouch) >= 14)
    .slice(0, 8);

  for (const a of staleFiltered) {
    const d = daysAgo(a.lastTouch);
    signals.push({
      kind: "stale",
      accountId: a.id,
      accountName: a.name,
      meta: `no touch in ${d}d`,
      severity: d > 30 ? "high" : "medium",
      daysElapsed: d,
    });
  }

  for (const a of dueSoon) {
    signals.push({
      kind: "action-due",
      accountId: a.account?.id || "",
      accountName: a.account?.name || "—",
      title: a.title,
      meta: a.dueAt ? relativeDay(a.dueAt, now) : "",
      severity: "low",
    });
  }

  for (const e of upcomingMeetings) {
    signals.push({
      kind: "upcoming",
      accountId: e.account.id,
      accountName: e.account.name,
      title: e.title,
      meta: relativeDay(e.occurredAt, now),
      severity: "low",
    });
  }

  const pipelineArr = pipelineGroups.reduce((s, g) => s + (g._sum.arr || 0), 0);
  const pipelineCount = pipelineGroups.reduce((s, c) => s + c._count, 0);

  return {
    date: now,
    signals,
    counts: {
      overdueReplies: overdueReplies.length,
      overdueActions: overdueActions.length,
      staleAccounts: staleFiltered.length,
      dueSoon: dueSoon.length,
      upcomingMeetings: upcomingMeetings.length,
      pipelineArr,
      pipelineCount,
    },
  };
}

function relativeDay(d: Date | string, now: Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diffDays = Math.floor(
    (date.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      (24 * 3600 * 1000)
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays > 0 && diffDays < 7) {
    return date.toLocaleDateString("en-GB", { weekday: "long" });
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Produce the editorial prose for the top of the brief. Prefers AI if available,
 * falls back to a deterministic template.
 */
export async function narrateBrief(data: BriefData): Promise<string> {
  const { counts } = data;

  // Deterministic fallback — always works
  const parts: string[] = [];

  if (counts.overdueReplies === 0 && counts.overdueActions === 0 && counts.staleAccounts === 0) {
    parts.push("Nothing is on fire. The pipeline is quiet.");
  } else {
    if (counts.overdueReplies > 0) {
      parts.push(
        counts.overdueReplies === 1
          ? "One thread is past its reply window."
          : `${counts.overdueReplies} threads are past their reply window.`
      );
    }
    if (counts.overdueActions > 0) {
      parts.push(
        counts.overdueActions === 1
          ? "One task is overdue."
          : `${counts.overdueActions} tasks are overdue.`
      );
    }
    if (counts.staleAccounts > 0) {
      parts.push(
        counts.staleAccounts === 1
          ? "One deal has gone quiet."
          : `${counts.staleAccounts} deals have gone quiet.`
      );
    }
  }

  if (counts.dueSoon > 0) {
    parts.push(
      counts.dueSoon === 1
        ? "One action is due this week."
        : `${counts.dueSoon} actions are due this week.`
    );
  }
  if (counts.upcomingMeetings > 0) {
    parts.push(
      counts.upcomingMeetings === 1
        ? "One meeting on the calendar."
        : `${counts.upcomingMeetings} meetings on the calendar.`
    );
  }

  return parts.join(" ");
}
