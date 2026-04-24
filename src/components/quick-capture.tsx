"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { KINDS } from "@/lib/utils";

export function QuickCapture({
  accountId,
  aiEnabled,
}: {
  accountId: string;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>("note");
  const [useAI, setUseAI] = useState(aiEnabled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          title: title || undefined,
          kind,
          useAI: useAI && aiEnabled,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setOpen(false);
      setContent("");
      setTitle("");
      setKind("note");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to capture");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-[var(--navy)] text-white px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-[var(--navy)]/90 transition"
      >
        <Plus className="w-3.5 h-3.5" />
        Quick capture
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-[var(--line-2)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[var(--navy)]">Quick capture</h2>
                  <p className="text-[12px] text-[var(--muted)] mt-0.5">
                    Paste a transcript, email thread, meeting notes, anything.
                    {aiEnabled && " AI will structure and summarise it."}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-[var(--muted)] hover:text-[var(--ink)] text-xl leading-none px-2"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="flex items-center gap-3">
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="px-3 py-1.5 border border-[var(--line)] rounded-md text-[13px]"
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Title (optional — AI will suggest one)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-[var(--line)] rounded-md text-[13px]"
                />
              </div>

              <textarea
                autoFocus
                placeholder="Paste anything here. Email threads, meeting transcripts, notes, voice-to-text..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={14}
                className="w-full px-3 py-2 border border-[var(--line)] rounded-md text-[13px] font-mono leading-relaxed resize-y min-h-[220px]"
              />

              {aiEnabled && (
                <label className="flex items-start gap-2 text-[12px] text-[var(--ink-2)] p-3 bg-[var(--accent-bg)] rounded-md">
                  <input
                    type="checkbox"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Auto-structure with AI
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">
                      Claude will suggest a title, write a summary, detect kind and sentiment, and
                      clean the content (trim signatures, boilerplate).
                    </div>
                  </div>
                </label>
              )}

              {error && (
                <div className="px-3 py-2 text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--line-2)] flex items-center justify-between">
              <div className="text-[11px] text-[var(--muted)]">
                ⌘/Ctrl + Enter to save
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={submitting || !content.trim()}
                  className="bg-[var(--navy)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--navy)]/90 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submitting ? "Saving…" : "Save to timeline"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
