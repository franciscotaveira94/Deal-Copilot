"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { relative } from "@/lib/utils";
import type { PrepBrief as PB } from "@/lib/ai-extract";

export function PrepBrief({
  accountId,
  initialBrief,
  initialGeneratedAt,
  aiEnabled,
}: {
  accountId: string;
  initialBrief: PB | null;
  initialGeneratedAt: Date | null;
  aiEnabled: boolean;
}) {
  const [brief, setBrief] = useState<PB | null>(initialBrief);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(initialGeneratedAt);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  async function regenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/brief`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBrief(data.brief);
        setGeneratedAt(new Date());
      }
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate if none exists and AI is on
  useEffect(() => {
    if (!brief && aiEnabled && !loading) {
      // only auto-generate once per session on first load
      // (user can regen manually afterwards)
      void regenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stale =
    generatedAt && Date.now() - new Date(generatedAt).getTime() > 3 * 24 * 3600 * 1000;

  return (
    <section className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-[10px] border-b border-[var(--line-2)] hover:bg-[var(--bg-hover)] transition"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--accent-ink)] flex items-center justify-center shadow-[0_2px_6px_rgba(243,128,32,0.20)]">
            <ClipboardList className="w-3 h-3 text-white" strokeWidth={2.6} />
          </div>
          <h2 className="label !text-[var(--ink)] !normal-case !tracking-normal !text-[13px] !font-semibold">
            Pre-call brief
          </h2>
          {generatedAt && (
            <span
              className={`text-[11px] ${
                stale ? "text-[var(--risk)]" : "text-[var(--muted)]"
              }`}
            >
              · generated {relative(generatedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {aiEnabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                regenerate();
              }}
              className="btn btn-ghost btn-sm"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {loading ? "Generating…" : "Refresh"}
            </span>
          )}
          <span className="text-[var(--muted-2)] text-[14px]">{open ? "−" : "+"}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 py-4">
          {!aiEnabled ? (
            <div className="text-[12px] text-[var(--muted)]">
              Enable AI to generate briefs. Start Ollama or set ANTHROPIC_API_KEY.
            </div>
          ) : loading && !brief ? (
            <div className="flex items-center gap-2 text-[12px] text-[var(--muted)] py-4 justify-center">
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating brief from timeline…
            </div>
          ) : !brief ? (
            <button onClick={regenerate} className="btn btn-accent btn-sm">
              <Sparkles className="w-3 h-3" />
              Generate brief
            </button>
          ) : (
            <div className="space-y-4">
              {brief.oneLine && (
                <div className="text-[14px] text-[var(--ink)] font-medium leading-snug">
                  {brief.oneLine}
                </div>
              )}
              {brief.context && (
                <div className="text-[13px] text-[var(--ink-3)] leading-relaxed">
                  {brief.context}
                </div>
              )}

              {brief.keyPoints?.length > 0 && (
                <BriefSection label="Key points">
                  {brief.keyPoints.map((b, i) => (
                    <Bullet key={i}>{b}</Bullet>
                  ))}
                </BriefSection>
              )}

              {brief.openQuestions?.length > 0 && (
                <BriefSection label="Probe / confirm">
                  {brief.openQuestions.map((b, i) => (
                    <Bullet key={i} tone="blue">
                      {b}
                    </Bullet>
                  ))}
                </BriefSection>
              )}

              {brief.risks?.length > 0 && (
                <BriefSection label="Risks">
                  {brief.risks.map((b, i) => (
                    <Bullet key={i} tone="red">
                      {b}
                    </Bullet>
                  ))}
                </BriefSection>
              )}

              {brief.suggestedAgenda?.length > 0 && (
                <BriefSection label="Suggested agenda">
                  <ol className="space-y-1.5 pl-1">
                    {brief.suggestedAgenda.map((b, i) => (
                      <li
                        key={i}
                        className="text-[13px] text-[var(--ink-3)] leading-snug flex items-start gap-2"
                      >
                        <span className="shrink-0 w-4 h-4 rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink)] text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ol>
                </BriefSection>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BriefSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold tracking-[0.06em] uppercase text-[var(--muted)] mb-1.5">
        {label}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Bullet({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "blue" | "red";
}) {
  const dot =
    tone === "red"
      ? "bg-[var(--neg)]"
      : tone === "blue"
      ? "bg-blue-500"
      : "bg-[var(--accent)]";
  return (
    <div className="flex items-start gap-2">
      <span className={`tag-dot ${dot} mt-[7px] shrink-0`} />
      <span className="text-[13px] text-[var(--ink-3)] leading-snug">{children}</span>
    </div>
  );
}
