import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  relative,
  shortDate,
  stageStyle,
  priorityStyle,
  formatArr,
  initials,
  ALL_STAGES,
} from "@/lib/utils";
import { scoreAccount } from "@/lib/health";
import { ArrowLeft } from "lucide-react";
import { PasteZone } from "@/components/paste-zone";
import { ChatPanel } from "@/components/chat-panel";
import { TimelineEntryRow } from "@/components/timeline-entry-row";
import { AccountQuickEdit } from "@/components/account-quick-edit";
import { ActionsPanel } from "@/components/actions-panel";
import { StageSelector } from "@/components/stage-selector";
import { PrepBrief as PrepBriefCmp } from "@/components/prep-brief";
import { MeddicPanel } from "@/components/meddic-panel";
import { ContactsPanel } from "@/components/contacts-panel";
import { HealthPanel } from "@/components/health-panel";
import { PartiesPanel } from "@/components/parties-panel";
import { HealthRing } from "@/components/health-ring";
import { backendMeta } from "@/lib/ai";
import type { PrepBrief as PB } from "@/lib/ai-extract";

export const dynamic = "force-dynamic";

export default async function AccountDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      timeline: { orderBy: { occurredAt: "desc" } },
      actions: { orderBy: [{ done: "asc" }, { dueAt: "asc" }] },
      contacts: { orderBy: { createdAt: "asc" } },
      chats: { orderBy: { createdAt: "asc" } },
      parties: {
        include: { organisation: true },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!account) notFound();

  const ai = await backendMeta();
  const hasAI = ai.backend !== "none";

  const health = scoreAccount({
    stage: account.stage,
    stageChangedAt: account.stageChangedAt,
    lastTouch: account.lastTouch,
    nextAction: account.nextAction,
    nextActionDue: account.nextActionDue,
    meddicMetrics: account.meddicMetrics,
    meddicEconomicBuyer: account.meddicEconomicBuyer,
    meddicDecisionCriteria: account.meddicDecisionCriteria,
    meddicDecisionProcess: account.meddicDecisionProcess,
    meddicPainIdentified: account.meddicPainIdentified,
    meddicChampion: account.meddicChampion,
    contacts: account.contacts.map((c) => ({ persona: c.persona })),
    timeline: account.timeline.map((e) => ({
      sentiment: e.sentiment,
      occurredAt: e.occurredAt,
    })),
    parties: account.parties.map((p) => ({
      role: p.role,
      lastActivityAt: p.lastActivityAt,
      organisationName: p.organisation.name,
    })),
  });

  const brief: PB | null = account.briefContent
    ? (JSON.parse(account.briefContent) as PB)
    : null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="px-8 pt-5 pb-4 border-b border-[var(--line-2)] bg-white">
          <Link
            href="/pipeline"
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--ink)] mb-3 transition"
          >
            <ArrowLeft className="w-3 h-3" />
            Pipeline
          </Link>

          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className="w-11 h-11 shrink-0 rounded-[9px] bg-gradient-to-br from-[var(--bg-subtle)] to-[#EBEBE8] border border-[var(--line-2)] flex items-center justify-center text-[13px] font-semibold text-[var(--ink-3)]">
                {initials(account.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-[24px] font-semibold tracking-[-0.02em] leading-tight text-[var(--ink)] truncate">
                  {account.name}
                </h1>
                <div className="flex items-center gap-2.5 mt-1.5 text-[12.5px] text-[var(--muted)]">
                  {account.domain && <span>{account.domain}</span>}
                  {account.industry && (
                    <>
                      <span className="text-[var(--line)]">•</span>
                      <span>{account.industry}</span>
                    </>
                  )}
                  {account.arr != null && (
                    <>
                      <span className="text-[var(--line)]">•</span>
                      <span className="text-[var(--ink-3)] font-medium tabular-nums">
                        {formatArr(account.arr)}
                      </span>
                    </>
                  )}
                  <span className="text-[var(--line)]">•</span>
                  <span>Last touch {relative(account.lastTouch)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <HealthRing health={health} size="md" />
              <div className="w-px h-7 bg-[var(--line)] mx-1" />
              <StageSelector
                accountId={account.id}
                currentStage={account.stage}
                stages={[...ALL_STAGES]}
              />
              <span
                className={`text-[11px] px-2 py-[3px] rounded-[5px] border font-medium ${priorityStyle(
                  account.priority
                )}`}
              >
                {account.priority}
              </span>
              <AccountQuickEdit account={account} stages={[...ALL_STAGES]} />
            </div>
          </div>
        </div>

        {/* Scroll area — two-column layout */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg)]">
          <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6 px-8 py-6 max-w-[1280px] mx-auto">
            {/* Left column — core workflow */}
            <div className="space-y-5 min-w-0">
              {/* PASTE ZONE */}
              <PasteZone
                accountId={account.id}
                accountName={account.name}
                aiEnabled={hasAI}
                backend={ai.backend}
                model={ai.model}
                local={ai.local}
              />

              {/* Pre-call brief */}
              <PrepBriefCmp
                accountId={account.id}
                initialBrief={brief}
                initialGeneratedAt={account.briefGeneratedAt}
                aiEnabled={hasAI}
              />

              {/* Summary + next action */}
              <div className="grid grid-cols-2 gap-3">
                <InfoTile label="Where is this deal at?">
                  {account.summary || (
                    <span className="italic text-[var(--muted-2)]">
                      No summary yet.
                    </span>
                  )}
                </InfoTile>
                <InfoTile label="Next action">
                  {account.nextAction ? (
                    <div>
                      <div className="text-[13px] text-[var(--ink)]">{account.nextAction}</div>
                      {account.nextActionDue && (
                        <div className="text-[11.5px] text-[var(--muted)] mt-1.5">
                          due {relative(account.nextActionDue)} · {shortDate(account.nextActionDue)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="italic text-[var(--muted-2)]">None set.</span>
                  )}
                </InfoTile>
              </div>

              <ActionsPanel accountId={account.id} actions={account.actions} />

              {/* Timeline */}
              <section>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="label">
                    Timeline · {account.timeline.length}{" "}
                    {account.timeline.length === 1 ? "entry" : "entries"}
                  </h2>
                </div>

                {account.timeline.length === 0 ? (
                  <div className="card px-6 py-10 text-center">
                    <div className="text-[13.5px] text-[var(--muted)] leading-relaxed">
                      Paste anything into the box above — an email thread, a meeting transcript, a
                      voice note, scribbled notes — and it&apos;ll land here, structured.
                    </div>
                  </div>
                ) : (
                  <div className="relative pl-[22px]">
                    <div className="absolute left-[8px] top-[10px] bottom-[10px] w-px bg-[var(--line-2)]" />
                    <div className="space-y-3">
                      {account.timeline.map((e) => (
                        <TimelineEntryRow key={e.id} entry={e} />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right column — qualification */}
            <div className="space-y-5 min-w-0">
              <HealthPanel health={health} />
              <PartiesPanel accountId={account.id} parties={account.parties} />
              <ContactsPanel accountId={account.id} contacts={account.contacts} />
              <MeddicPanel
                accountId={account.id}
                aiEnabled={hasAI}
                values={{
                  meddicMetrics: account.meddicMetrics,
                  meddicEconomicBuyer: account.meddicEconomicBuyer,
                  meddicDecisionCriteria: account.meddicDecisionCriteria,
                  meddicDecisionProcess: account.meddicDecisionProcess,
                  meddicPainIdentified: account.meddicPainIdentified,
                  meddicChampion: account.meddicChampion,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Chat */}
      <div className="w-[380px] shrink-0 border-l border-[var(--line-2)] bg-white flex flex-col">
        <ChatPanel
          accountId={account.id}
          accountName={account.name}
          initial={account.chats}
          aiEnabled={hasAI}
          backend={ai.backend}
          model={ai.model}
          local={ai.local}
        />
      </div>
    </div>
  );
}

function InfoTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="label mb-2">{label}</div>
      <div className="text-[13px] text-[var(--ink)] leading-relaxed">{children}</div>
    </div>
  );
}
