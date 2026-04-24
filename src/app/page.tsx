import Link from "next/link";
import { buildBrief, narrateBrief } from "@/lib/brief";
import { formatArr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Brief() {
  const data = await buildBrief();
  const prose = await narrateBrief(data);
  const { counts, signals, date } = data;

  const overdueReplies = signals.filter((s) => s.kind === "overdue-reply");
  const overdueActions = signals.filter((s) => s.kind === "overdue-action");
  const stale = signals.filter((s) => s.kind === "stale");
  const dueSoon = signals.filter((s) => s.kind === "action-due");
  const upcoming = signals.filter((s) => s.kind === "upcoming");

  const formattedDate = date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const totalIssues = overdueReplies.length + overdueActions.length + stale.length;

  return (
    <div className="relative">
      {/* Masthead — newspaper-style with date above title */}
      <div className="max-w-[780px] mx-auto px-12 pt-16 pb-8">
        <header className="mb-10 animate-fade">
          <div className="flex items-baseline justify-between border-b border-[var(--ink)] pb-2 mb-10">
            <span
              className="font-serif text-[16px] italic text-[var(--ink-2)]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Your desk, {formattedDate.split(",")[0].toLowerCase()}.
            </span>
            <span
              className="font-serif text-[12px] italic text-[var(--muted)] tabular-nums"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {formattedDate}
            </span>
          </div>

          <h1 className="display mb-6" style={{ fontFamily: "var(--font-serif)" }}>
            {totalIssues === 0 ? (
              <>
                A <em>quiet</em> morning.
              </>
            ) : totalIssues <= 2 ? (
              <>Two <em>small things</em>.</>
            ) : totalIssues <= 5 ? (
              <>A <em>handful</em> of open threads.</>
            ) : (
              <>A <em>full</em> desk.</>
            )}
          </h1>

          <p
            className="narrative dropcap max-w-[620px]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {prose}
          </p>

          {/* Ambient pipeline figure — right aligned, subtle */}
          <div className="flex items-baseline justify-between mt-10 pt-4 border-t border-[var(--rule-2)]">
            <div className="flex items-baseline gap-8">
              <Stat label="Open" value={String(counts.pipelineCount)} />
              <Stat label="ARR" value={formatArr(counts.pipelineArr)} />
              <Stat
                label="Silent"
                value={String(counts.overdueReplies)}
                emphasis={counts.overdueReplies > 0}
              />
              <Stat
                label="Overdue"
                value={String(counts.overdueActions)}
                emphasis={counts.overdueActions > 0}
              />
              <Stat label="This week" value={String(counts.dueSoon)} />
            </div>
            <Link
              href="/pipeline"
              className="text-[11.5px] text-[var(--muted)] hover:text-[var(--ink)] italic"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              see all →
            </Link>
          </div>
        </header>

        {/* SIGNAL SECTIONS — each group reads as a short article */}
        <main className="space-y-14 stagger">
          {overdueReplies.length > 0 && (
            <SignalSection
              title={overdueReplies.length === 1 ? "A thread gone quiet." : "Threads gone quiet."}
              lede={
                overdueReplies.length === 1
                  ? "You sent something and nobody replied."
                  : `${overdueReplies.length} people owe you a reply.`
              }
              tone="rust"
            >
              {overdueReplies.map((s, i) => (
                <SignalRow
                  key={i}
                  href={`/accounts/${s.accountId}`}
                  primary={<><strong>{s.orgName}</strong> on {s.accountName}</>}
                  secondary={s.title}
                  meta={s.meta}
                  tone="rust"
                />
              ))}
            </SignalSection>
          )}

          {overdueActions.length > 0 && (
            <SignalSection
              title={overdueActions.length === 1 ? "A task you owe yourself." : "Tasks you owe yourself."}
              lede={
                overdueActions.length === 1
                  ? "This one's past its date."
                  : `${overdueActions.length} tasks past their date.`
              }
              tone="rust"
            >
              {overdueActions.map((s, i) => (
                <SignalRow
                  key={i}
                  href={`/accounts/${s.accountId}`}
                  primary={s.title}
                  secondary={s.accountName}
                  meta={s.meta}
                  tone="rust"
                />
              ))}
            </SignalSection>
          )}

          {stale.length > 0 && (
            <SignalSection
              title={stale.length === 1 ? "A deal is drifting." : "Deals drifting."}
              lede={
                stale.length === 1
                  ? "Worth a nudge."
                  : `Worth a nudge on ${stale.length}.`
              }
              tone="ochre"
            >
              {stale.map((s, i) => (
                <SignalRow
                  key={i}
                  href={`/accounts/${s.accountId}`}
                  primary={s.accountName}
                  meta={s.meta}
                  tone="ochre"
                />
              ))}
            </SignalSection>
          )}

          {dueSoon.length > 0 && (
            <SignalSection
              title="This week."
              lede={`${dueSoon.length} action${dueSoon.length === 1 ? "" : "s"} on the horizon.`}
              tone="neutral"
            >
              {dueSoon.map((s, i) => (
                <SignalRow
                  key={i}
                  href={`/accounts/${s.accountId}`}
                  primary={s.title}
                  secondary={s.accountName}
                  meta={s.meta}
                  tone="neutral"
                />
              ))}
            </SignalSection>
          )}

          {upcoming.length > 0 && (
            <SignalSection
              title="Coming up."
              lede={`${upcoming.length} meeting${upcoming.length === 1 ? "" : "s"} booked.`}
              tone="neutral"
            >
              {upcoming.map((s, i) => (
                <SignalRow
                  key={i}
                  href={`/accounts/${s.accountId}`}
                  primary={s.title}
                  secondary={s.accountName}
                  meta={s.meta}
                  tone="neutral"
                />
              ))}
            </SignalSection>
          )}

          {totalIssues === 0 && counts.dueSoon === 0 && counts.upcomingMeetings === 0 && (
            <div className="py-12 text-center">
              <p
                className="narrative italic text-[var(--muted)]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                All quiet. Make a coffee, read something, or{" "}
                <Link href="/accounts/new" className="underline">
                  start a new deal
                </Link>
                .
              </p>
            </div>
          )}
        </main>

        <footer className="mt-20 pt-6 border-t border-[var(--rule-2)] flex items-center justify-between text-[10.5px] text-[var(--muted-2)]">
          <span
            className="font-serif italic"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Compiled for you, locally.
          </span>
          <span className="flex items-center gap-1">
            Press <kbd>⌘</kbd><kbd>K</kbd> to fly anywhere.
          </span>
        </footer>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div className="eyebrow text-[9.5px] mb-1">{label}</div>
      <div
        className={`font-serif text-[20px] tabular-nums leading-none ${
          emphasis ? "text-[var(--rust)]" : "text-[var(--ink)]"
        }`}
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {value}
      </div>
    </div>
  );
}

function SignalSection({
  title,
  lede,
  tone,
  children,
}: {
  title: string;
  lede: string;
  tone: "rust" | "ochre" | "neutral";
  children: React.ReactNode;
}) {
  const toneColor =
    tone === "rust"
      ? "text-[var(--rust)]"
      : tone === "ochre"
      ? "text-[var(--ochre)]"
      : "text-[var(--ink-3)]";

  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <h2
          className="headline"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {title}
        </h2>
        <span
          className={`font-serif italic text-[14px] ${toneColor}`}
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {lede}
        </span>
      </div>
      <div className="divide-y divide-[var(--rule-2)]">{children}</div>
    </section>
  );
}

function SignalRow({
  href,
  primary,
  secondary,
  meta,
  tone,
}: {
  href: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  meta?: string;
  tone: "rust" | "ochre" | "neutral";
}) {
  const metaColor =
    tone === "rust"
      ? "text-[var(--rust)]"
      : tone === "ochre"
      ? "text-[var(--ochre)]"
      : "text-[var(--muted)]";
  return (
    <Link
      href={href}
      className="block py-3.5 group"
    >
      <div className="flex items-baseline justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] text-[var(--ink)] group-hover:text-[var(--accent-strong)] transition-colors">
            {primary}
          </div>
          {secondary && (
            <div
              className="text-[13px] text-[var(--muted)] mt-1 italic"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              “{secondary}”
            </div>
          )}
        </div>
        {meta && (
          <span
            className={`text-[12px] italic tabular-nums shrink-0 ${metaColor}`}
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {meta}
          </span>
        )}
      </div>
    </Link>
  );
}
