"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronDown } from "lucide-react";
import { kindMeta, relative, sentimentStyle, shortDate } from "@/lib/utils";

type Entry = {
  id: string;
  kind: string;
  title: string;
  occurredAt: Date;
  summary: string | null;
  sentiment: string | null;
  content: string;
};

export function TimelineEntryRow({ entry }: { entry: Entry }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const km = kindMeta(entry.kind);

  async function del() {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    setBusy(true);
    await fetch(`/api/timeline/${entry.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <article className="relative">
      {/* Timeline dot */}
      <span
        className={`absolute -left-[22px] top-[14px] w-[12px] h-[12px] rounded-full border-2 border-white ${km.tint.replace(
          "bg-",
          "bg-"
        )}`}
        style={{ boxShadow: "0 0 0 1.5px var(--line)" }}
      />

      <div className="card overflow-hidden group">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-px rounded-[4px] text-[10.5px] font-semibold uppercase tracking-wider ${km.tint}`}
                >
                  {km.label}
                </span>
                <span className="text-[11px] text-[var(--muted)]">
                  {shortDate(entry.occurredAt)} · {relative(entry.occurredAt)}
                </span>
                {entry.sentiment && entry.sentiment !== "neutral" && (
                  <span
                    className={`text-[11px] font-medium ${sentimentStyle(entry.sentiment)}`}
                  >
                    · {entry.sentiment}
                  </span>
                )}
              </div>
              <h3 className="text-[14.5px] font-semibold text-[var(--ink)] leading-snug">
                {entry.title}
              </h3>
            </div>
            <button
              onClick={del}
              disabled={busy}
              className="opacity-0 group-hover:opacity-100 p-1.5 -m-1 text-[var(--muted-2)] hover:text-[var(--neg)] rounded transition"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {entry.summary && (
            <p className="text-[13px] text-[var(--ink-3)] leading-relaxed mt-2.5">
              {entry.summary}
            </p>
          )}

          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-[11px] text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1 transition"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            {expanded ? "Hide raw content" : "Show raw content"}
          </button>

          {expanded && (
            <pre className="mt-3 text-[11.5px] text-[var(--ink-3)] whitespace-pre-wrap font-mono bg-[var(--bg-subtle)] p-3 rounded-[6px] max-h-[400px] overflow-y-auto border border-[var(--line-2)] animate-in">
              {entry.content}
            </pre>
          )}
        </div>
      </div>
    </article>
  );
}
