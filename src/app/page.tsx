import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  relative,
  tinyDate,
  stageStyle,
  daysAgo,
  formatArr,
  kindMeta,
  initials,
} from "@/lib/utils";
import { AlertTriangle, Clock, Snowflake, Calendar, TrendingUp, MailQuestion } from "lucide-react";
import { ToggleAction } from "@/components/toggle-action";
import { formatTimeTo } from "@/lib/followup";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const now = new Date();
  const [overdue, dueSoon, stale, upcoming, recentEntries, pipelineGroups, overdueReplies] =
    await Promise.all([
    prisma.action.findMany({
      where: { done: false, dueAt: { lt: now } },
      include: { account: true },
      orderBy: { dueAt: "asc" },
      take: 20,
    }),
    prisma.action.findMany({
      where: {
        done: false,
        dueAt: { gte: now, lt: new Date(now.getTime() + 7 * 24 * 3600 * 1000) },
      },
      include: { account: true },
      orderBy: { dueAt: "asc" },
      take: 20,
    }),
    prisma.account.findMany({
      where: {
        status: "active",
        stage: { in: ["discovery", "qualified", "proposal", "negotiation"] },
      },
      orderBy: { lastTouch: "asc" },
      take: 20,
    }),
    prisma.timelineEntry.findMany({
      where: {
        kind: "meeting",
        occurredAt: { gte: now, lt: new Date(now.getTime() + 14 * 24 * 3600 * 1000) },
      },
      include: { account: true },
      orderBy: { occurredAt: "asc" },
      take: 10,
    }),
    prisma.timelineEntry.findMany({
      include: { account: true },
      orderBy: { createdAt: "desc" },
      take: 8,
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
      take: 20,
    }),
  ]);

  const staleAccounts = stale.filter((a) => daysAgo(a.lastTouch) >= 14).slice(0, 8);
  const pipelineArr = pipelineGroups.reduce((s, g) => s + (g._sum.arr || 0), 0);
  const pipelineCount = pipelineGroups.reduce((s, c) => s + c._count, 0);
  const needsAttention = overdue.length + staleAccounts.length + overdueReplies.length;

  return (
    <div className="max-w-[1200px] mx-auto px-10 py-10">
      {/* Hero */}
      <header className="mb-10">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-3">
          {now.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
        <h1 className="text-[40px] font-semibold tracking-[-0.03em] leading-[1.1] text-[var(--ink)]">
          {needsAttention > 0
            ? "What needs your attention."
            : "Nothing's on fire."}
        </h1>
        <p className="mt-3 text-[15px] text-[var(--muted)] leading-relaxed">
          {needsAttention > 0 ? (
            <>
              {overdue.length > 0 && (
                <>
                  <strong className="text-[var(--neg)]">{overdue.length} overdue</strong>
                </>
              )}
              {overdue.length > 0 && staleAccounts.length > 0 && " · "}
              {staleAccounts.length > 0 && (
                <>
                  <strong className="text-[var(--risk)]">
                    {staleAccounts.length} going cold
                  </strong>
                </>
              )}
              {dueSoon.length > 0 && (
                <>
                  {" · "}
                  <span>{dueSoon.length} due this week</span>
                </>
              )}
            </>
          ) : (
            "All clear. Quiet is a feature."
          )}
        </p>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-5 gap-3 mb-10">
        <StatCard
          label="Open pipeline"
          value={formatArr(pipelineArr, { compact: true })}
          sub={`${pipelineCount} deal${pipelineCount === 1 ? "" : "s"}`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Overdue replies"
          value={String(overdueReplies.length)}
          sub="awaiting counterparty"
          danger={overdueReplies.length > 0}
          icon={<MailQuestion className="w-4 h-4" />}
        />
        <StatCard
          label="Overdue actions"
          value={String(overdue.length)}
          sub={`action${overdue.length === 1 ? "" : "s"}`}
          danger={overdue.length > 0}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <StatCard
          label="Due this week"
          value={String(dueSoon.length)}
          sub={`action${dueSoon.length === 1 ? "" : "s"}`}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Cold"
          value={String(staleAccounts.length)}
          sub="no touch 14d+"
          warn={staleAccounts.length > 0}
          icon={<Snowflake className="w-4 h-4" />}
        />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-[1fr_380px] gap-6">
        {/* Left column — action feed */}
        <div className="space-y-6">
          {overdueReplies.length > 0 && (
            <Section title="Overdue replies" accent="danger">
              <div className="divide-y divide-[var(--line-2)]">
                {overdueReplies.map((e) => (
                  <Link
                    key={e.id}
                    href={`/accounts/${e.account.id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition"
                  >
                    <div className="w-7 h-7 shrink-0 rounded-md bg-rose-50 border border-rose-100 flex items-center justify-center">
                      <MailQuestion className="w-3.5 h-3.5 text-[var(--neg)]" strokeWidth={2.4} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] text-[var(--ink)]">
                        <strong>{e.awaitingReplyFrom?.name}</strong> hasn&apos;t replied on{" "}
                        <strong>{e.account.name}</strong>
                      </div>
                      <div className="text-[11.5px] text-[var(--muted)] truncate mt-0.5">
                        &ldquo;{e.title}&rdquo; — sent {relative(e.occurredAt)}
                      </div>
                      <div className="text-[11px] text-[var(--neg)] font-medium mt-0.5">
                        {formatTimeTo(e.awaitingReplyDueAt)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {overdue.length > 0 && (
            <Section title="Overdue actions" accent="danger">
              <div className="divide-y divide-[var(--line-2)]">
                {overdue.map((a) => (
                  <ActionRow key={a.id} action={a} />
                ))}
              </div>
            </Section>
          )}

          {dueSoon.length > 0 && (
            <Section title="Due this week" accent="warn">
              <div className="divide-y divide-[var(--line-2)]">
                {dueSoon.map((a) => (
                  <ActionRow key={a.id} action={a} />
                ))}
              </div>
            </Section>
          )}

          {staleAccounts.length > 0 && (
            <Section title="Going cold" accent="warn">
              <div className="divide-y divide-[var(--line-2)]">
                {staleAccounts.map((a) => {
                  const st = stageStyle(a.stage);
                  return (
                    <Link
                      key={a.id}
                      href={`/accounts/${a.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition"
                    >
                      <div className="w-8 h-8 rounded-md bg-[var(--bg-subtle)] border border-[var(--line-2)] flex items-center justify-center text-[11px] font-semibold text-[var(--ink-3)]">
                        {initials(a.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[14px] truncate">{a.name}</div>
                        <div className="text-[12px] text-[var(--muted)] mt-0.5">
                          Last touched {relative(a.lastTouch)}
                        </div>
                      </div>
                      <span className={`tag ${st.tag}`}>
                        <span className={`tag-dot ${st.dot}`} />
                        {a.stage}
                      </span>
                      {a.arr != null && a.arr > 0 && (
                        <span className="text-[12px] font-medium tabular-nums text-[var(--ink-3)] w-16 text-right">
                          {formatArr(a.arr, { compact: true })}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </Section>
          )}

          {overdue.length + dueSoon.length + staleAccounts.length === 0 && (
            <div className="card p-10 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[var(--accent-bg)] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div className="text-[15px] font-medium text-[var(--ink)]">
                All accounts are on track.
              </div>
              <div className="text-[13px] text-[var(--muted)] mt-1">
                Enjoy the quiet — or{" "}
                <Link href="/accounts/new" className="text-[var(--accent-ink)] underline">
                  add a new account
                </Link>
                .
              </div>
            </div>
          )}
        </div>

        {/* Right column — upcoming + recent activity */}
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <Section title="Upcoming" muted>
              <div className="divide-y divide-[var(--line-2)]">
                {upcoming.map((e) => (
                  <Link
                    key={e.id}
                    href={`/accounts/${e.accountId}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition"
                  >
                    <div className="shrink-0 w-10 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold">
                        {new Date(e.occurredAt).toLocaleDateString("en-GB", { weekday: "short" })}
                      </div>
                      <div className="text-[15px] font-semibold tabular-nums text-[var(--ink)]">
                        {new Date(e.occurredAt).getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="font-medium text-[13px] truncate">{e.title}</div>
                      {e.account && (
                        <div className="text-[11.5px] text-[var(--muted)] mt-0.5 truncate">
                          {e.account.name}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          <Section title="Recent activity" muted>
            {recentEntries.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-[var(--muted)]">
                No activity yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--line-2)]">
                {recentEntries.map((e) => {
                  const km = kindMeta(e.kind);
                  return (
                    <Link
                      key={e.id}
                      href={`/accounts/${e.accountId}`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition"
                    >
                      <div className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${km.tint} text-[13px]`}>
                        {km.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[13px] truncate">{e.title}</div>
                        {e.account && (
                          <div className="text-[11.5px] text-[var(--muted)] mt-0.5 truncate">
                            {e.account.name} · {relative(e.createdAt)}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  danger,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  danger?: boolean;
  warn?: boolean;
}) {
  const iconColor = danger
    ? "text-[var(--neg)] bg-rose-50"
    : warn
    ? "text-[var(--risk)] bg-amber-50"
    : "text-[var(--muted)] bg-[var(--bg-subtle)]";
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <div className={`w-6 h-6 rounded-[5px] flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums leading-none">
        {value}
      </div>
      {sub && <div className="mt-1 text-[11.5px] text-[var(--muted)]">{sub}</div>}
    </div>
  );
}

function Section({
  title,
  children,
  accent,
  muted,
}: {
  title: string;
  children: React.ReactNode;
  accent?: "danger" | "warn";
  muted?: boolean;
}) {
  const dotColor =
    accent === "danger"
      ? "bg-[var(--neg)]"
      : accent === "warn"
      ? "bg-[var(--risk)]"
      : "bg-[var(--muted-2)]";
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-[10px] border-b border-[var(--line-2)]">
        {!muted && <span className={`tag-dot ${dotColor}`} />}
        <h2 className="label">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ActionRow({
  action,
}: {
  action: {
    id: string;
    title: string;
    detail: string | null;
    dueAt: Date | null;
    done: boolean;
    account: { id: string; name: string } | null;
  };
}) {
  const overdue = !action.done && action.dueAt && new Date(action.dueAt) < new Date();
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition group">
      <ToggleAction actionId={action.id} done={action.done} />
      <div className="flex-1 min-w-0">
        <Link
          href={action.account ? `/accounts/${action.account.id}` : "#"}
          className="block"
        >
          <div className="font-medium text-[14px] truncate">{action.title}</div>
          {action.detail && (
            <div className="text-[12px] text-[var(--muted)] truncate mt-0.5">
              {action.detail}
            </div>
          )}
          <div className="text-[11.5px] mt-1 flex items-center gap-2">
            {action.account && (
              <>
                <span className="text-[var(--muted)]">{action.account.name}</span>
                <span className="text-[var(--line)]">•</span>
              </>
            )}
            <span className={overdue ? "text-[var(--neg)] font-medium" : "text-[var(--muted)]"}>
              {overdue ? "overdue" : "due"} {relative(action.dueAt)}
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
