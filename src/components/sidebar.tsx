import Link from "next/link";
import { prisma } from "@/lib/db";
import { ActiveLink } from "./active-link";
import {
  Home,
  Kanban,
  CheckCircle2,
  Plus,
  Building2,
  Settings as SettingsIcon,
  MailQuestion,
  LayoutGrid,
} from "lucide-react";
import { stageStyle, formatArr } from "@/lib/utils";

export async function Sidebar() {
  const now = new Date();
  const [accounts, openActions, pipelineSummary, orgCount, overdueRepliesCount] =
    await Promise.all([
      prisma.account.findMany({
        where: { status: "active" },
        orderBy: { lastTouch: "desc" },
        select: { id: true, name: true, stage: true, arr: true },
        take: 12,
      }),
      prisma.action.count({ where: { done: false } }),
      prisma.account.groupBy({
        by: ["stage"],
        where: {
          status: "active",
          stage: { in: ["discovery", "qualified", "proposal", "negotiation"] },
        },
        _sum: { arr: true },
        _count: true,
      }),
      prisma.organisation.count(),
      prisma.timelineEntry.count({
        where: {
          awaitingReplyDueAt: { lt: now },
          awaitedReplyResolvedAt: null,
          awaitingReplyFromId: { not: null },
        },
      }),
    ]);

  const pipelineArr = pipelineSummary.reduce((s, g) => s + (g._sum.arr || 0), 0);
  const pipelineCount = pipelineSummary.reduce((s, c) => s + c._count, 0);

  return (
    <aside className="w-[248px] shrink-0 border-r border-[var(--rule-2)] bg-[var(--paper)] flex flex-col h-screen sticky top-0 z-20">
      {/* Brand — editorial mark */}
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-baseline gap-2 group">
          <span
            className="font-serif italic text-[22px] leading-none text-[var(--ink)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Copilot
          </span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted-2)]">
            Deal
          </span>
        </Link>
      </div>

      {/* Primary nav — typographic, not icon-heavy */}
      <nav className="px-3 pb-2">
        <ActiveLink href="/" exact>
          <Home className="w-[13px] h-[13px]" strokeWidth={1.7} />
          <span>Brief</span>
        </ActiveLink>
        <ActiveLink href="/pipeline">
          <Kanban className="w-[13px] h-[13px]" strokeWidth={1.7} />
          <span>Pipeline</span>
          {pipelineCount > 0 && (
            <span className="ml-auto text-[10.5px] text-[var(--muted-2)] font-medium tabular-nums">
              {pipelineCount}
            </span>
          )}
        </ActiveLink>
        <ActiveLink href="/accounts">
          <LayoutGrid className="w-[13px] h-[13px]" strokeWidth={1.7} />
          <span>Ledger</span>
        </ActiveLink>
        <ActiveLink href="/orgs">
          <Building2 className="w-[13px] h-[13px]" strokeWidth={1.7} />
          <span>Parties</span>
          {orgCount > 0 && (
            <span className="ml-auto text-[10.5px] text-[var(--muted-2)] font-medium tabular-nums">
              {orgCount}
            </span>
          )}
        </ActiveLink>
        <ActiveLink href="/actions">
          <CheckCircle2 className="w-[13px] h-[13px]" strokeWidth={1.7} />
          <span>Tasks</span>
          {openActions > 0 && (
            <span className="ml-auto text-[10.5px] text-[var(--muted-2)] font-medium tabular-nums">
              {openActions}
            </span>
          )}
        </ActiveLink>

        {overdueRepliesCount > 0 && (
          <ActiveLink href="/">
            <MailQuestion className="w-[13px] h-[13px] text-[var(--rust)]" strokeWidth={1.7} />
            <span className="text-[var(--rust)]">Silent threads</span>
            <span className="ml-auto text-[10px] text-white bg-[var(--rust)] font-semibold rounded-full w-[15px] h-[15px] flex items-center justify-center tabular-nums">
              {overdueRepliesCount}
            </span>
          </ActiveLink>
        )}
      </nav>

      <div className="px-5 my-2">
        <hr className="hairline" />
      </div>

      {/* Pipeline figure — small, restrained */}
      <div className="px-5 pb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="label text-[9.5px]">Open pipeline</span>
          <span className="text-[10.5px] text-[var(--muted)] tabular-nums">
            {pipelineCount}
          </span>
        </div>
        <div
          className="text-[22px] font-serif tabular-nums text-[var(--ink)] leading-none"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {formatArr(pipelineArr)}
        </div>
      </div>

      <div className="px-5 my-1">
        <hr className="hairline" />
      </div>

      {/* Deals — quiet list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        <div className="flex items-center justify-between px-2 py-1.5 mb-0.5">
          <span className="label text-[9.5px]">Recent</span>
          <Link
            href="/accounts/new"
            className="text-[var(--muted-2)] hover:text-[var(--ink)] transition"
            title="New deal  ⌘K"
          >
            <Plus className="w-[12px] h-[12px]" strokeWidth={1.7} />
          </Link>
        </div>
        <div className="space-y-px">
          {accounts.length === 0 ? (
            <Link
              href="/accounts/new"
              className="block mx-1 px-2.5 py-2 text-[12px] text-[var(--muted)] hover:text-[var(--ink)] transition"
            >
              <span className="italic font-serif">First deal…</span>
            </Link>
          ) : (
            accounts.map((a) => {
              const st = stageStyle(a.stage);
              return (
                <ActiveLink key={a.id} href={`/accounts/${a.id}`}>
                  <span className={`tag-dot ${st.dot} shrink-0`} />
                  <span className="flex-1 truncate text-[12.5px]">{a.name}</span>
                </ActiveLink>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[var(--rule-2)]">
        <Link
          href="/settings"
          className="flex items-center gap-2 text-[11px] text-[var(--muted)] hover:text-[var(--ink)] mb-2 transition"
        >
          <SettingsIcon className="w-[11px] h-[11px]" strokeWidth={1.7} />
          Settings
        </Link>
        <div className="flex items-center justify-between text-[10px] text-[var(--muted-2)]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] pulse-soft" />
            Local
          </span>
          <span className="flex items-center gap-1">
            <kbd>⌘</kbd>
            <kbd>K</kbd>
          </span>
        </div>
      </div>
    </aside>
  );
}
