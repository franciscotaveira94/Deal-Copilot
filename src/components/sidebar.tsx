import Link from "next/link";
import { prisma } from "@/lib/db";
import { ActiveLink } from "./active-link";
import { SidebarSearch } from "./sidebar-search";
import { Kanban, LayoutGrid, CheckCircle2, Plus, Sparkles, Home } from "lucide-react";
import { stageStyle, STAGE_LABELS, formatArr, initials } from "@/lib/utils";

export async function Sidebar() {
  const [accounts, openActions, pipelineSummary] = await Promise.all([
    prisma.account.findMany({
      where: { status: "active" },
      orderBy: { lastTouch: "desc" },
      select: { id: true, name: true, stage: true, priority: true, arr: true },
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
  ]);

  const pipelineArr = pipelineSummary.reduce((sum, g) => sum + (g._sum.arr || 0), 0);
  const pipelineCount = pipelineSummary.reduce((sum, g) => sum + g._count, 0);

  return (
    <aside className="w-[272px] shrink-0 border-r border-[var(--line-2)] bg-white flex flex-col h-screen sticky top-0 z-20">
      {/* Brand */}
      <div className="px-4 pt-4 pb-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-[30px] h-[30px] rounded-[7px] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-ink)] flex items-center justify-center shadow-[0_2px_6px_rgba(243,128,32,0.25)]">
            <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.6} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-semibold text-[14px] tracking-tight text-[var(--ink)]">
              Deal Copilot
            </span>
            <span className="text-[11px] text-[var(--muted)] mt-0.5">
              Personal AE workspace
            </span>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <SidebarSearch accounts={accounts} />
      </div>

      {/* Primary nav */}
      <nav className="px-2 pb-2">
        <ActiveLink href="/" exact>
          <Home className="w-[14px] h-[14px]" />
          <span>Today</span>
        </ActiveLink>
        <ActiveLink href="/pipeline">
          <Kanban className="w-[14px] h-[14px]" />
          <span>Pipeline</span>
          {pipelineCount > 0 && (
            <span className="ml-auto text-[10.5px] text-[var(--muted)] font-medium tabular-nums">
              {pipelineCount}
            </span>
          )}
        </ActiveLink>
        <ActiveLink href="/accounts">
          <LayoutGrid className="w-[14px] h-[14px]" />
          <span>All accounts</span>
        </ActiveLink>
        <ActiveLink href="/actions">
          <CheckCircle2 className="w-[14px] h-[14px]" />
          <span>Actions</span>
          {openActions > 0 && (
            <span className="ml-auto text-[10.5px] text-[var(--muted)] font-medium tabular-nums">
              {openActions}
            </span>
          )}
        </ActiveLink>
      </nav>

      {/* Pipeline stat block */}
      <div className="mx-3 mb-2 px-3 py-2.5 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--line-2)]">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-semibold tracking-[0.06em] uppercase text-[var(--muted)]">
            Open pipeline
          </span>
          <span className="text-[11px] text-[var(--muted)] font-medium tabular-nums">
            {pipelineCount} deal{pipelineCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-1 text-[17px] font-semibold tabular-nums text-[var(--ink)]">
          {formatArr(pipelineArr)}
        </div>
      </div>

      {/* Accounts list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 min-h-0">
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <span className="text-[10.5px] font-semibold tracking-[0.06em] uppercase text-[var(--muted)]">
            Accounts
          </span>
          <Link
            href="/accounts/new"
            className="text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-hover)] rounded-[4px] p-0.5 transition"
            title="New account"
          >
            <Plus className="w-[13px] h-[13px]" strokeWidth={2.4} />
          </Link>
        </div>
        <div className="space-y-px">
          {accounts.length === 0 ? (
            <Link
              href="/accounts/new"
              className="block mx-1 px-2.5 py-1.5 text-[12.5px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-hover)] rounded-[5px]"
            >
              + New account
            </Link>
          ) : (
            accounts.map((a) => {
              const style = stageStyle(a.stage);
              return (
                <ActiveLink key={a.id} href={`/accounts/${a.id}`}>
                  <span className={`tag-dot ${style.dot} shrink-0`} />
                  <span className="flex-1 truncate text-[13px]">{a.name}</span>
                  {a.arr != null && a.arr > 0 && (
                    <span className="text-[10.5px] text-[var(--muted-2)] tabular-nums shrink-0">
                      {formatArr(a.arr, { compact: true })}
                    </span>
                  )}
                </ActiveLink>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--line-2)] text-[10.5px] text-[var(--muted-2)]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--pos)]" />
          Local · No data leaves your Mac
        </div>
      </div>
    </aside>
  );
}
