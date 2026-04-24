import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ArrowLeft, Building2, ExternalLink } from "lucide-react";
import {
  formatArr,
  relative,
  stageStyle,
  priorityStyle,
  daysAgo,
} from "@/lib/utils";
import { PARTY_LABELS, partyStyle } from "@/lib/orgs";

export const dynamic = "force-dynamic";

export default async function OrgDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await prisma.organisation.findUnique({
    where: { id },
    include: {
      parties: {
        include: {
          account: true,
        },
        orderBy: [{ lastActivityAt: "desc" }],
      },
      contacts: {
        include: { account: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!org) notFound();

  const totalPipeline = org.parties.reduce(
    (s, p) => s + (p.account.arr || 0),
    0
  );
  const activeDeals = org.parties.filter(
    (p) => !["won", "lost", "dormant"].includes(p.account.stage)
  );
  const initials = org.name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-10">
      <Link
        href="/orgs"
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--ink)] mb-5 transition"
      >
        <ArrowLeft className="w-3 h-3" />
        All organisations
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 shrink-0 rounded-[11px] bg-gradient-to-br from-[var(--bg-subtle)] to-[#EBEBE8] border border-[var(--line-2)] flex items-center justify-center text-[16px] font-semibold text-[var(--ink-3)]">
          {initials || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-[30px] font-semibold tracking-[-0.02em] leading-tight text-[var(--ink)]">
              {org.name}
            </h1>
            <span
              className={`text-[10px] px-2 py-[3px] rounded-[5px] border font-medium uppercase tracking-wider ${
                kindPillStyle(org.kind)
              }`}
            >
              {org.kind}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[13px] text-[var(--muted)]">
            {org.domain && <span>{org.domain}</span>}
            {org.domain && <span className="text-[var(--line)]">•</span>}
            <span>
              {org.parties.length} deal{org.parties.length === 1 ? "" : "s"}
            </span>
            {totalPipeline > 0 && (
              <>
                <span className="text-[var(--line)]">•</span>
                <span className="tabular-nums font-medium text-[var(--ink-3)]">
                  {formatArr(totalPipeline)} pipeline
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Deals list */}
      <section className="mb-8">
        <h2 className="label mb-3">
          Deals ·{" "}
          <span className="normal-case font-normal text-[var(--muted)] tracking-normal">
            {activeDeals.length} active
          </span>
        </h2>
        {org.parties.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-[13px] text-[var(--muted)]">
              Not on any deals yet.
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="border-b border-[var(--line-2)] bg-[var(--bg-subtle)]/50">
                <tr className="text-left text-[10.5px] uppercase tracking-wider text-[var(--muted)] font-semibold">
                  <th className="px-5 py-2.5">Deal</th>
                  <th className="px-5 py-2.5">Stage</th>
                  <th className="px-5 py-2.5">Their role</th>
                  <th className="px-5 py-2.5">ARR</th>
                  <th className="px-5 py-2.5">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line-2)]">
                {org.parties.map((p) => {
                  const st = stageStyle(p.account.stage);
                  const quietDays = p.lastActivityAt
                    ? daysAgo(p.lastActivityAt)
                    : null;
                  const quiet = quietDays != null && quietDays >= 14;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[var(--bg-hover)] transition"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/accounts/${p.account.id}`}
                          className="font-medium text-[13.5px] text-[var(--ink)] hover:text-[var(--accent-ink)] flex items-center gap-1.5 group/link"
                        >
                          {p.account.name}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100" />
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`tag ${st.tag}`}>
                          <span className={`tag-dot ${st.dot}`} />
                          {p.account.stage}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-[11px] px-2 py-[2px] rounded-[5px] border font-medium ${partyStyle(
                            p.role
                          )}`}
                        >
                          {PARTY_LABELS[p.role]}
                        </span>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-[var(--ink-3)]">
                        {formatArr(p.account.arr)}
                      </td>
                      <td className="px-5 py-3 text-[var(--muted)] whitespace-nowrap">
                        {p.lastActivityAt ? (
                          <span className={quiet ? "text-[var(--risk)] font-medium" : ""}>
                            {relative(p.lastActivityAt)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Contacts */}
      {org.contacts.length > 0 && (
        <section>
          <h2 className="label mb-3">
            People ·{" "}
            <span className="normal-case font-normal text-[var(--muted)] tracking-normal">
              {org.contacts.length}
            </span>
          </h2>
          <div className="card overflow-hidden">
            <div className="divide-y divide-[var(--line-2)]">
              {org.contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-hover)] transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium">{c.name}</div>
                    <div className="text-[11.5px] text-[var(--muted)]">
                      {[c.role, c.email].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <Link
                    href={`/accounts/${c.account.id}`}
                    className="text-[11.5px] text-[var(--muted)] hover:text-[var(--accent-ink)]"
                  >
                    {c.account.name} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function kindPillStyle(kind: string): string {
  switch (kind) {
    case "partner":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "distributor":
      return "bg-violet-50 text-violet-700 border-violet-100";
    case "customer":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "cloudflare":
      return "bg-orange-50 text-orange-700 border-orange-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-100";
  }
}
