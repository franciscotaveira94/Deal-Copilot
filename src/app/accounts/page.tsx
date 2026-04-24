import Link from "next/link";
import { prisma } from "@/lib/db";
import { relative, stageStyle, priorityStyle, formatArr, initials } from "@/lib/utils";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    orderBy: { lastTouch: "desc" },
    include: {
      _count: {
        select: { timeline: true, actions: { where: { done: false } } },
      },
    },
  });

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-10">
      <header className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
            Accounts
          </div>
          <h1 className="text-[34px] font-semibold tracking-[-0.02em] leading-none text-[var(--ink)]">
            All accounts
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-2">
            {accounts.length} total · active pipeline in{" "}
            <Link href="/pipeline" className="text-[var(--accent-ink)] underline">
              Pipeline view
            </Link>
          </p>
        </div>
        <Link href="/accounts/new" className="btn btn-primary btn-lg">
          <Plus className="w-4 h-4" />
          New account
        </Link>
      </header>

      {accounts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-[15px] font-medium">No accounts yet</div>
          <div className="text-[13px] text-[var(--muted)] mt-1 mb-5">
            Add your first account to start tracking your pipeline.
          </div>
          <Link href="/accounts/new" className="btn btn-accent btn-lg">
            <Plus className="w-4 h-4" />
            New account
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="border-b border-[var(--line-2)] bg-[var(--bg-subtle)]/50">
              <tr className="text-left text-[10.5px] uppercase tracking-wider text-[var(--muted)] font-semibold">
                <th className="px-5 py-2.5">Account</th>
                <th className="px-5 py-2.5">Stage</th>
                <th className="px-5 py-2.5">Priority</th>
                <th className="px-5 py-2.5">ARR</th>
                <th className="px-5 py-2.5">Next action</th>
                <th className="px-5 py-2.5">Last touch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-2)]">
              {accounts.map((a) => {
                const st = stageStyle(a.stage);
                return (
                  <tr key={a.id} className="hover:bg-[var(--bg-hover)] transition group">
                    <td className="px-5 py-3">
                      <Link href={`/accounts/${a.id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 shrink-0 rounded-[7px] bg-[var(--bg-subtle)] border border-[var(--line-2)] flex items-center justify-center text-[11px] font-semibold text-[var(--ink-3)]">
                          {initials(a.name)}
                        </div>
                        <div>
                          <div className="font-medium text-[13.5px] text-[var(--ink)]">
                            {a.name}
                          </div>
                          {a.domain && (
                            <div className="text-[11.5px] text-[var(--muted)] mt-0.5">
                              {a.domain}
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`tag ${st.tag}`}>
                        <span className={`tag-dot ${st.dot}`} />
                        {a.stage}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-[11px] px-2 py-[3px] rounded-[5px] border font-medium ${priorityStyle(
                          a.priority
                        )}`}
                      >
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--ink-3)] tabular-nums">
                      {formatArr(a.arr)}
                    </td>
                    <td className="px-5 py-3 max-w-[260px]">
                      {a.nextAction ? (
                        <div>
                          <div className="truncate-1 text-[var(--ink-3)]">{a.nextAction}</div>
                          {a.nextActionDue && (
                            <div className="text-[10.5px] text-[var(--muted)] mt-0.5">
                              {relative(a.nextActionDue)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--muted-2)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[var(--muted)] whitespace-nowrap">
                      {relative(a.lastTouch)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
