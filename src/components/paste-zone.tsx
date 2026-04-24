"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check, AlertCircle, X } from "lucide-react";
import { kindMeta, KINDS } from "@/lib/utils";

export function PasteZone({
  accountId,
  accountName,
  aiEnabled,
  backend,
  model,
  local,
}: {
  accountId: string;
  accountName: string;
  aiEnabled: boolean;
  backend?: string;
  model?: string;
  local?: boolean;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [useAI, setUseAI] = useState(aiEnabled);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [kindOverride, setKindOverride] = useState<string>("auto");

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 360) + "px";
  }, [content]);

  async function save() {
    if (!content.trim() || state === "saving") return;
    setState("saving");
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          kind: kindOverride === "auto" ? undefined : kindOverride,
          useAI: useAI && aiEnabled,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setState("done");
      setContent("");
      setKindOverride("auto");
      setTimeout(() => setState("idle"), 1200);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setState("error");
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      save();
    }
  }

  const charCount = content.length;

  return (
    <div
      className={`card transition-all ${
        content.trim()
          ? "ring-2 ring-[var(--accent-ring)] border-[var(--accent)]"
          : "hover:border-[#D6D6D4]"
      }`}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-md bg-[var(--accent-bg)] flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-[var(--accent)]" strokeWidth={2.6} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[13px] font-semibold text-[var(--ink)]">
                Paste anything
              </div>
              {aiEnabled && backend && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-[4px] text-[10px] font-medium bg-[var(--bg-subtle)] border border-[var(--line-2)] text-[var(--muted)]"
                  title={local ? "AI running locally — no data leaves your Mac" : "Cloud AI"}
                >
                  {local ? (
                    <>
                      <span className="w-1 h-1 rounded-full bg-[var(--pos)]" />
                      Local · {model}
                    </>
                  ) : (
                    <>Cloud · {model}</>
                  )}
                </span>
              )}
            </div>
            <div className="text-[11.5px] text-[var(--muted)]">
              Email, transcript, voice note, scribbled notes — AI will structure it into a timeline entry for{" "}
              <strong className="text-[var(--ink-3)] font-medium">{accountName}</strong>.
            </div>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={onKey}
          placeholder="Drop raw content here…"
          className="w-full bg-transparent border-0 focus:ring-0 text-[13.5px] leading-relaxed resize-none min-h-[84px] max-h-[360px] placeholder:text-[var(--muted-2)]"
        />

        {content.trim() && (
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-[var(--line-2)] animate-in">
            <div className="flex items-center gap-3 text-[11.5px]">
              <select
                value={kindOverride}
                onChange={(e) => setKindOverride(e.target.value)}
                className="bg-transparent border border-[var(--line)] rounded-[5px] px-2 py-[3px] text-[11.5px] text-[var(--ink-3)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="auto">AI picks kind</option>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {kindMeta(k).label}
                  </option>
                ))}
              </select>

              {aiEnabled ? (
                <label className="flex items-center gap-1.5 cursor-pointer text-[var(--muted)] hover:text-[var(--ink-3)]">
                  <input
                    type="checkbox"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  <span>Auto-structure</span>
                </label>
              ) : (
                <span className="text-[var(--muted-2)]">AI disabled</span>
              )}

              <span className="text-[var(--muted-2)] tabular-nums">
                {charCount.toLocaleString()} chars
              </span>
            </div>

            <div className="flex items-center gap-2">
              {state === "error" && error && (
                <span className="text-[11px] text-[var(--neg)] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </span>
              )}
              <button
                onClick={() => {
                  setContent("");
                  setKindOverride("auto");
                }}
                className="btn btn-ghost btn-sm"
              >
                Clear
              </button>
              <button
                onClick={save}
                disabled={state === "saving"}
                className="btn btn-accent btn-sm"
              >
                {state === "saving" ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {useAI && aiEnabled ? "Structuring…" : "Saving…"}
                  </>
                ) : state === "done" ? (
                  <>
                    <Check className="w-3 h-3" />
                    Saved
                  </>
                ) : (
                  <>
                    Save to timeline
                    <kbd className="!bg-white/20 !text-white !border-white/20 ml-1">
                      ⌘↵
                    </kbd>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
