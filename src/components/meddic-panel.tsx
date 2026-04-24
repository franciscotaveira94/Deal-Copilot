"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Edit3, Check, X } from "lucide-react";

type Meddic = {
  meddicMetrics: string | null;
  meddicEconomicBuyer: string | null;
  meddicDecisionCriteria: string | null;
  meddicDecisionProcess: string | null;
  meddicPainIdentified: string | null;
  meddicChampion: string | null;
};

const FIELDS: Array<{
  key: keyof Meddic;
  short: string;
  label: string;
  hint: string;
}> = [
  { key: "meddicMetrics", short: "M", label: "Metrics", hint: "What measurable outcome does the buyer want?" },
  { key: "meddicEconomicBuyer", short: "E", label: "Economic buyer", hint: "Who signs the contract?" },
  { key: "meddicDecisionCriteria", short: "D", label: "Decision criteria", hint: "What must be true for them to say yes?" },
  { key: "meddicDecisionProcess", short: "D", label: "Decision process", hint: "How will they decide? Steps, approvers, timeline" },
  { key: "meddicPainIdentified", short: "I", label: "Identified pain", hint: "What compelling event drives this now?" },
  { key: "meddicChampion", short: "C", label: "Champion", hint: "Who is selling this internally for you?" },
];

export function MeddicPanel({
  accountId,
  values,
  aiEnabled,
}: {
  accountId: string;
  values: Meddic;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [local, setLocal] = useState<Meddic>(values);
  const [editing, setEditing] = useState<keyof Meddic | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [draft, setDraft] = useState("");

  async function save(key: keyof Meddic) {
    await fetch(`/api/accounts/${accountId}/meddic`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: draft || null }),
    });
    setLocal((prev) => ({ ...prev, [key]: draft || null }));
    setEditing(null);
    router.refresh();
  }

  async function extract() {
    setExtracting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/meddic`, { method: "POST" });
      if (res.ok) {
        const { account } = await res.json();
        setLocal({
          meddicMetrics: account.meddicMetrics,
          meddicEconomicBuyer: account.meddicEconomicBuyer,
          meddicDecisionCriteria: account.meddicDecisionCriteria,
          meddicDecisionProcess: account.meddicDecisionProcess,
          meddicPainIdentified: account.meddicPainIdentified,
          meddicChampion: account.meddicChampion,
        });
        router.refresh();
      }
    } finally {
      setExtracting(false);
    }
  }

  const filled = FIELDS.filter((f) => local[f.key]?.trim()).length;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-[10px] border-b border-[var(--line-2)]">
        <div className="flex items-center gap-2">
          <h2 className="label">MEDDIC · {filled}/6</h2>
          <div className="flex gap-[3px]">
            {FIELDS.map((f) => (
              <span
                key={f.key}
                className={`w-1.5 h-1.5 rounded-full ${
                  local[f.key]?.trim() ? "bg-[var(--accent)]" : "bg-[var(--line)]"
                }`}
              />
            ))}
          </div>
        </div>
        {aiEnabled && (
          <button
            onClick={extract}
            disabled={extracting}
            className="btn btn-ghost btn-sm !text-[var(--accent-ink)] disabled:opacity-50"
          >
            {extracting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Extracting…
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Extract from timeline
              </>
            )}
          </button>
        )}
      </div>
      <div className="divide-y divide-[var(--line-2)]">
        {FIELDS.map((f) => {
          const value = local[f.key];
          const isEditing = editing === f.key;
          return (
            <div key={f.key} className="px-4 py-3 group">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 shrink-0 rounded-[5px] bg-[var(--bg-subtle)] border border-[var(--line-2)] flex items-center justify-center text-[11px] font-semibold text-[var(--ink-3)]">
                  {f.short}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[11.5px] font-semibold text-[var(--ink)]">
                      {f.label}
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => {
                          setDraft(value || "");
                          setEditing(f.key);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[var(--muted-2)] hover:text-[var(--ink)] transition"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-1.5">
                      <textarea
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={f.hint}
                        rows={2}
                        className="input text-[12.5px]"
                      />
                      <div className="flex gap-1 mt-1.5">
                        <button
                          onClick={() => save(f.key)}
                          className="btn btn-accent btn-sm"
                        >
                          <Check className="w-3 h-3" />
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="btn btn-ghost btn-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : value ? (
                    <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5 leading-snug whitespace-pre-wrap">
                      {value}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setDraft("");
                        setEditing(f.key);
                      }}
                      className="text-[11.5px] text-[var(--muted-2)] italic hover:text-[var(--accent-ink)] mt-0.5 text-left"
                    >
                      {f.hint}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
