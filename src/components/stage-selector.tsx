"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { stageStyle, STAGE_LABELS } from "@/lib/utils";

export function StageSelector({
  accountId,
  currentStage,
  stages,
}: {
  accountId: string;
  currentStage: string;
  stages: string[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [optimistic, setOptimistic] = useState(currentStage);
  const router = useRouter();

  const st = stageStyle(optimistic);

  async function set(stage: string) {
    setOpen(false);
    if (stage === optimistic) return;
    setOptimistic(stage);
    setBusy(true);
    await fetch(`/api/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className={`flex items-center gap-1.5 px-2.5 py-[5px] rounded-[6px] border font-medium text-[12px] hover:opacity-90 transition ${st.tag}`}
      >
        <span className={`tag-dot ${st.dot}`} />
        {STAGE_LABELS[optimistic]}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 bg-white border border-[var(--line)] rounded-[8px] shadow-[var(--shadow-lg)] overflow-hidden z-50 min-w-[160px] animate-in">
            {stages.map((s) => {
              const sst = stageStyle(s);
              return (
                <button
                  key={s}
                  onClick={() => set(s)}
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--bg-hover)] ${
                    s === optimistic ? "bg-[var(--bg-subtle)]" : ""
                  }`}
                >
                  <span className={`tag-dot ${sst.dot}`} />
                  <span className="flex-1">{STAGE_LABELS[s]}</span>
                  {s === optimistic && <span className="text-[var(--accent)]">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
