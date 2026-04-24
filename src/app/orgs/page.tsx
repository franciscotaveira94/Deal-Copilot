import Link from "next/link";
import { prisma } from "@/lib/db";
import { PARTY_LABELS, partyStyle } from "@/lib/orgs";
import { Building2, Plus } from "lucide-react";
import { relative, formatArr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrgsIndexPage() {
  const orgs = await prisma.organisation.findMany({
    orderBy: { name: "asc" },
    include: {
      parties: {
        include: {
          account: {
            select: {
              id: true,
              name: true,
              stage: true,
              arr: true,
              lastTouch: true,
            },
          },
        },
      },
      _count: { select: { contacts: true } },
    },
  });

  // Group by kind for a cleaner landing
  const byKind: Record<string, typeof orgs> = {};
  for (const o of orgs) {
    const k = o.kind || "unknown";
    byKind[k] = byKind[k] || [];
    byKind[k].push(o);
  }

  // Display order
  const kindOrder = ["partner", "distributor", "customer", "cloudflare", "other", "unknown"];

  const totalDeals = orgs.reduce((sum, o) => sum + o.parties.length, 0);

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-10">
      <header className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
            Organisations
          </div>
          <h1 className="text-[34px] font-semibold tracking-[-0.02em] leading-none text-[var(--ink)]">
            Partners, distributors, customers
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-2">
            {orgs.length} organisation{orgs.length === 1 ? "" : "s"} across {totalDeals} deal
            {totalDeals === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {orgs.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-6 h-6 mx-auto mb-3 text-[var(--muted-2)]" />
          <div className="text-[15px] font-medium">No organisations yet</div>
          <div className="text-[13px] text-[var(--muted)] mt-1">
            When you add parties to a deal or the AI detects them in a pasted email, they&apos;ll
            appear here.
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {kindOrder.map((k) => {
            const list = byKind[k];
            if (!list || list.length === 0) return null;
            return (
              <section key={k}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="label">{prettyKind(k)}</span>
                  <span className="text-[11.5px] text-[var(--muted-2)] tabular-nums">
                    {list.length}
                  </span>
                </div>
                <div className="card overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead className="border-b border-[var(--line-2)] bg-[var(--bg-subtle)]/50">
                      <tr className="text-left text-[10.5px] uppercase tracking-wider text-[var(--muted)] font-semibold">
                        <th className="px-5 py-2.5">Name</th>
                        <th className="px-5 py-2.5">Domain</th>
                        <th className="px-5 py-2.5">Deals</th>
                        <th className="px-5 py-2.5">Total pipeline</th>
                        <th className="px-5 py-2.5">Contacts</th>
                        <th className="px-5 py-2.5">Last touch (any deal)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line-2)]">
                      {list.map((o) => {
                        const dealCount = o.parties.length;
                        const totalArr = o.parties.reduce(
                          (s, p) => s + (p.account.arr || 0),
                          0
                        );
                        const lastTouch = o.parties
                          .map((p) => new Date(p.account.lastTouch).getTime())
                          .sort((a, b) => b - a)[0];
                        return (
                          <tr
                            key={o.id}
                            className="hover:bg-[var(--bg-hover)] transition"
                          >
                            <td className="px-5 py-3">
                              <Link
                                href={`/orgs/${o.id}`}
                                className="flex items-center gap-3"
                              >
                                <OrgBadge name={o.name} />
                                <div>
                                  <div className="font-medium text-[13.5px] text-[var(--ink)]">
                                    {o.name}
                                  </div>
                                </div>
                              </Link>
                            </td>
                            <td className="px-5 py-3 text-[var(--muted)] text-[12px]">
                              {o.domain || "—"}
                            </td>
                            <td className="px-5 py-3 tabular-nums">{dealCount}</td>
                            <td className="px-5 py-3 tabular-nums text-[var(--ink-3)]">
                              {totalArr > 0 ? formatArr(totalArr) : "—"}
                            </td>
                            <td className="px-5 py-3 text-[var(--muted)] tabular-nums">
                              {o._count.contacts}
                            </td>
                            <td className="px-5 py-3 text-[var(--muted)] whitespace-nowrap">
                              {lastTouch ? relative(new Date(lastTouch)) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function prettyKind(k: string): string {
  switch (k) {
    case "partner":
      return "Partners";
    case "distributor":
      return "Distributors";
    case "customer":
      return "Customers";
    case "cloudflare":
      return "Cloudflare";
    case "other":
      return "Other";
    default:
      return "Unclassified";
  }
}

function OrgBadge({ name }: { name: string }) {
  const initials = name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <div className="w-8 h-8 shrink-0 rounded-[7px] bg-[var(--bg-subtle)] border border-[var(--line-2)] flex items-center justify-center text-[11px] font-semibold text-[var(--ink-3)]">
      {initials || "?"}
    </div>
  );
}
