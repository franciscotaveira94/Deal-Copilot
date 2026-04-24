import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  relative,
  stageStyle,
  formatArr,
  initials,
  ALL_STAGES,
  STAGE_LABELS,
  shortDate,
} from "@/lib/utils";
import { scoreAccount, bandLabel, bandStyle } from "@/lib/health";
import { ArrowLeft } from "lucide-react";
import { PasteZone } from "@/components/paste-zone";
import { ChatPanel } from "@/components/chat-panel";
import { TimelineEntryRow } from "@/components/timeline-entry-row";
import { AccountQuickEdit } from "@/components/account-quick-edit";
import { ActionsPanel } from "@/components/actions-panel";
import { StageSelector } from "@/components/stage-selector";
import { PrepBrief as PrepBriefCmp } from "@/components/prep-brief";
import { MeddicPanel } from "@/components/meddic-panel";
import { PartiesPanel } from "@/components/parties-panel";
import { CastDiagram } from "@/components/cast-diagram";
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
      timeline: {
        orderBy: { occurredAt: "desc" },
        include: { awaitingReplyFrom: { select: { id: true, name: true } } },
      },
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
  const st = stageStyle(account.stage);

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
    overdueReplies: account.timeline.filter(
      (e) =>
        e.awaitingReplyFromId &&
        !e.awaitedReplyResolvedAt &&
        e.awaitingReplyDueAt &&
        new Date(e.awaitingReplyDueAt) < new Date()
    ).length,
  });

  const brief: PB | null = account.briefContent
    ? (JSON.parse(account.briefContent) as PB)
    : null;

  const bandStyleObj = bandStyle(health.band);

  // Derive a short written "situation" from the top timeline entry for the subtitle
  const latest = account.timeline[0];
  const situationLine = latest?.summary?.slice(0, 200) || account.summary?.slice(0, 200) || null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main column — scroll-as-story */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <article className="max-w-[760px] mx-auto px-12 pt-12 pb-24">
            {/* Back */}
            <Link
              href="/pipeline"
              className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--muted)] hover:text-[var(--ink)] mb-8 transition font-serif italic"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              <ArrowLeft className="w-3 h-3" />
              Back to the pipeline
            </Link>

            {/* Masthead — date line + health + stage */}
            <header className="pb-6 border-b border-[var(--ink)] mb-10 animate-fade">
              <div className="flex items-baseline justify-between mb-4">
                <div
                  className="text-[11px] italic text-[var(--muted)] font-serif"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {account.industry || "A deal in the making"}
                  {account.domain && <> · {account.domain}</>}
                </div>
                <div
                  className="flex items-center gap-3 text-[11px] italic text-[var(--muted)] font-serif tabular-nums"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {account.arr != null && <span>{formatArr(account.arr)} arr</span>}
                  <span className={`${bandStyleObj.text}`}>
                    {bandLabel(health.band)} · {health.score}/100
                  </span>
                </div>
              </div>

              <h1
                className="display mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {account.name}.
              </h1>

              {situationLine && (
                <p
                  className="narrative italic max-w-[640px]"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  “{situationLine}”
                </p>
              )}

              {/* Stage as a timeline */}
              <div className="mt-8">
                <StageTimeline current={account.stage} accountId={account.id} />
              </div>
            </header>

            {/* Cast of characters */}
            {(account.parties.length > 0 || account.contacts.length > 0) && (
              <section className="mb-12 animate-rise">
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="headline" style={{ fontFamily: "var(--font-serif)" }}>
                    The cast.
                  </h2>
                  <span
                    className="italic text-[var(--muted)] text-[13px] font-serif"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Who&apos;s in the room, and who&apos;s gone quiet.
                  </span>
                </div>
                <div className="card p-5">
                  <CastDiagram
                    parties={account.parties}
                    stakeholders={account.contacts}
                  />
                </div>
              </section>
            )}

            {/* Where we are */}
            {(account.summary || account.nextAction) && (
              <section className="mb-12 animate-rise">
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="headline" style={{ fontFamily: "var(--font-serif)" }}>
                    Where we are.
                  </h2>
                </div>
                <div className="grid grid-cols-[1fr_260px] gap-6">
                  <div className="card p-5">
                    <div className="eyebrow text-[9.5px] mb-2">State of play</div>
                    <p
                      className="narrative"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {account.summary || (
                        <span className="italic text-[var(--muted-2)]">
                          No written summary yet. Paste an update below and it&apos;ll distill one.
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="card p-5">
                    <div className="eyebrow text-[9.5px] mb-2">Next move</div>
                    {account.nextAction ? (
                      <>
                        <div className="text-[14px] text-[var(--ink)] leading-snug">
                          {account.nextAction}
                        </div>
                        {account.nextActionDue && (
                          <div
                            className="text-[11.5px] italic text-[var(--muted)] mt-2 font-serif"
                            style={{ fontFamily: "var(--font-serif)" }}
                          >
                            {relative(account.nextActionDue)} · {shortDate(account.nextActionDue)}
                          </div>
                        )}
                      </>
                    ) : (
                      <span
                        className="italic text-[var(--muted-2)] font-serif"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        Nothing scheduled.
                      </span>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Capture — the paste zone, kept prominent */}
            <section className="mb-12 animate-rise">
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="headline" style={{ fontFamily: "var(--font-serif)" }}>
                  Add to the record.
                </h2>
                <span
                  className="italic text-[var(--muted)] text-[13px] font-serif"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Paste anything. It&apos;ll find its place.
                </span>
              </div>
              <PasteZone
                accountId={account.id}
                accountName={account.name}
                aiEnabled={hasAI}
                backend={ai.backend}
                model={ai.model}
                local={ai.local}
              />
            </section>

            {/* Pre-call brief */}
            <section className="mb-12 animate-rise">
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="headline" style={{ fontFamily: "var(--font-serif)" }}>
                  Before the next call.
                </h2>
                <span
                  className="italic text-[var(--muted)] text-[13px] font-serif"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  A written prep, generated from the record.
                </span>
              </div>
              <PrepBriefCmp
                accountId={account.id}
                initialBrief={brief}
                initialGeneratedAt={account.briefGeneratedAt}
                aiEnabled={hasAI}
              />
            </section>

            {/* Tasks */}
            {(account.actions.length > 0 ||
              account.actions.filter((a) => !a.done).length > 0) && (
              <section className="mb-12 animate-rise">
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="headline" style={{ fontFamily: "var(--font-serif)" }}>
                    On your plate.
                  </h2>
                </div>
                <ActionsPanel accountId={account.id} actions={account.actions} />
              </section>
            )}

            {/* MEDDIC — kept but subordinated, below the fold */}
            <section className="mb-12 animate-rise">
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="headline" style={{ fontFamily: "var(--font-serif)" }}>
                  The shape of the deal.
                </h2>
                <span
                  className="italic text-[var(--muted)] text-[13px] font-serif"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Qualification, six quick answers.
                </span>
              </div>
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
            </section>

            {/* Parties panel (full control vs. the diagram above) */}
            <section className="mb-12 animate-rise">
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="headline" style={{ fontFamily: "var(--font-serif)" }}>
                  Parties.
                </h2>
                <span
                  className="italic text-[var(--muted)] text-[13px] font-serif"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Roles, domains, last activity.
                </span>
              </div>
              <PartiesPanel accountId={account.id} parties={account.parties} />
            </section>

            {/* The story — timeline */}
            <section className="mb-12 animate-rise">
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="headline" style={{ fontFamily: "var(--font-serif)" }}>
                  The story so far.
                </h2>
                <span
                  className="italic text-[var(--muted)] text-[13px] font-serif"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {account.timeline.length}{" "}
                  {account.timeline.length === 1 ? "entry" : "entries"}, most recent first.
                </span>
              </div>

              {account.timeline.length === 0 ? (
                <div className="card px-6 py-14 text-center">
                  <p
                    className="narrative italic text-[var(--muted)] max-w-[460px] mx-auto"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Nothing here yet. Paste an email thread or transcript above and the
                    first entry will write itself.
                  </p>
                </div>
              ) : (
                <div className="relative pl-[22px]">
                  <div className="absolute left-[8px] top-[10px] bottom-[10px] w-px bg-[var(--rule-2)]" />
                  <div className="space-y-3">
                    {account.timeline.map((e) => (
                      <TimelineEntryRow key={e.id} entry={e} />
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Health (below the fold but quietly present) */}
            {health.flags.length > 0 && (
              <section className="mb-4 animate-rise">
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="headline" style={{ fontFamily: "var(--font-serif)" }}>
                    Signals.
                  </h2>
                  <span
                    className="italic text-[var(--muted)] text-[13px] font-serif"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    What the scoring is picking up.
                  </span>
                </div>
                <div className="card p-5">
                  <div className="space-y-2.5">
                    {health.flags.map((f) => {
                      const dotColor =
                        f.level === "critical"
                          ? "bg-[var(--rust)]"
                          : f.level === "warning"
                          ? "bg-[var(--ochre)]"
                          : f.level === "positive"
                          ? "bg-[var(--teal)]"
                          : "bg-[var(--muted-2)]";
                      return (
                        <div key={f.id} className="flex items-start gap-3">
                          <span className={`tag-dot ${dotColor} mt-[7px]`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] text-[var(--ink)]">
                              {f.label}
                            </div>
                            {f.detail && (
                              <div
                                className="text-[12px] italic text-[var(--muted)] font-serif"
                                style={{ fontFamily: "var(--font-serif)" }}
                              >
                                {f.detail}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Footer — edit / delete */}
            <div className="flex items-center justify-between pt-8 border-t border-[var(--rule-2)]">
              <div
                className="text-[11px] italic text-[var(--muted-2)] font-serif"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Last touched {relative(account.lastTouch)}.
              </div>
              <AccountQuickEdit account={account} stages={[...ALL_STAGES]} />
            </div>
          </article>
        </div>
      </div>

      {/* Copilot panel (unchanged structurally, picks up new typography) */}
      <div className="w-[360px] shrink-0 border-l border-[var(--rule-2)] bg-[var(--elev)] flex flex-col">
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

function StageTimeline({
  current,
  accountId,
}: {
  current: string;
  accountId: string;
}) {
  const pipeline = ["discovery", "qualified", "proposal", "negotiation", "won"] as const;
  const terminal = ["lost", "dormant"];
  const currentIdx = pipeline.indexOf(current as (typeof pipeline)[number]);
  const isTerminal = terminal.includes(current);

  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {pipeline.map((s, i) => {
        const reached = currentIdx >= i;
        const isCurrent = current === s;
        return (
          <div key={s} className="flex items-center shrink-0">
            {i > 0 && (
              <div
                className={`h-[1.5px] w-10 ${
                  reached ? "bg-[var(--ink)]" : "bg-[var(--rule-2)]"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1.5 px-2">
              <div
                className={`w-[9px] h-[9px] rounded-full transition-all ${
                  isCurrent
                    ? "bg-[var(--accent)] ring-[3px] ring-[var(--accent-wash)]"
                    : reached
                    ? "bg-[var(--ink)]"
                    : "bg-[var(--rule)]"
                }`}
              />
              <span
                className={`text-[10.5px] tracking-[0.05em] ${
                  isCurrent
                    ? "text-[var(--accent-strong)] font-semibold"
                    : reached
                    ? "text-[var(--ink-3)]"
                    : "text-[var(--muted-2)]"
                }`}
              >
                {STAGE_LABELS[s]}
              </span>
            </div>
          </div>
        );
      })}
      {isTerminal && (
        <div className="ml-6 pl-6 border-l border-[var(--rule-2)] flex items-center gap-2">
          <div
            className={`w-[9px] h-[9px] rounded-full ${
              current === "lost" ? "bg-[var(--rust)]" : "bg-[var(--muted-2)]"
            }`}
          />
          <span
            className={`text-[10.5px] tracking-[0.05em] italic ${
              current === "lost" ? "text-[var(--rust)]" : "text-[var(--muted)]"
            }`}
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {STAGE_LABELS[current]}
          </span>
        </div>
      )}
      <div className="ml-auto pl-4 shrink-0">
        <StageSelector
          accountId={accountId}
          currentStage={current}
          stages={[...ALL_STAGES]}
        />
      </div>
    </div>
  );
}
