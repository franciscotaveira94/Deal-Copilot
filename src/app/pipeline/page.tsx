import { prisma } from "@/lib/db";
import { PIPELINE_STAGES } from "@/lib/utils";
import { Kanban } from "@/components/kanban";
import { scoreAccount } from "@/lib/health";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const accountsRaw = await prisma.account.findMany({
    where: {
      status: "active",
      stage: { in: [...PIPELINE_STAGES, "won", "lost"] },
    },
    orderBy: [{ priority: "desc" }, { lastTouch: "desc" }],
    include: {
      _count: { select: { actions: { where: { done: false } } } },
      contacts: { select: { persona: true } },
      timeline: {
        select: { sentiment: true, occurredAt: true },
        orderBy: { occurredAt: "desc" },
        take: 5,
      },
      parties: {
        select: {
          role: true,
          lastActivityAt: true,
          organisation: { select: { name: true } },
        },
      },
    },
  });

  const accounts = accountsRaw.map((a) => ({
    ...a,
    health: scoreAccount({
      stage: a.stage,
      stageChangedAt: a.stageChangedAt,
      lastTouch: a.lastTouch,
      nextAction: a.nextAction,
      nextActionDue: a.nextActionDue,
      meddicMetrics: a.meddicMetrics,
      meddicEconomicBuyer: a.meddicEconomicBuyer,
      meddicDecisionCriteria: a.meddicDecisionCriteria,
      meddicDecisionProcess: a.meddicDecisionProcess,
      meddicPainIdentified: a.meddicPainIdentified,
      meddicChampion: a.meddicChampion,
      contacts: a.contacts,
      timeline: a.timeline,
      parties: a.parties.map((p) => ({
        role: p.role,
        lastActivityAt: p.lastActivityAt,
        organisationName: p.organisation.name,
      })),
    }),
  }));

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-8 py-6 border-b border-[var(--line-2)] bg-white">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1">
            Pipeline
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] leading-none text-[var(--ink)]">
            All deals by stage
          </h1>
        </div>
        <Link href="/accounts/new" className="btn btn-primary btn-lg">
          <Plus className="w-4 h-4" />
          New deal
        </Link>
      </header>

      <Kanban accounts={accounts} />
    </div>
  );
}
