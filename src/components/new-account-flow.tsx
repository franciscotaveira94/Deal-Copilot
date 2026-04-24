"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ArrowRight, AlertCircle, X } from "lucide-react";
import { ALL_STAGES, PRIORITIES } from "@/lib/utils";
import { PARTY_LABELS, PARTY_ROLES, partyStyle } from "@/lib/orgs";

type Draft = {
  name: string;
  domain: string | null;
  industry: string | null;
  stage: string;
  priority: string;
  arrUsd: number | null;
  summary: string | null;
  nextAction: string | null;
  parties: Array<{
    name: string;
    domain: string | null;
    role: string;
    reasoning: string;
  }>;
  confidence: number;
  reasoning: string;
};

type Mode = "paste" | "review" | "manual";

export function NewAccountFlow({
  prefilledName,
  aiEnabled,
  backendLabel,
}: {
  prefilledName: string;
  aiEnabled: boolean;
  backendLabel: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(prefilledName ? "manual" : "paste");

  // Paste mode state
  const [content, setContent] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review / manual state
  const [draft, setDraft] = useState<Draft>({
    name: prefilledName,
    domain: null,
    industry: null,
    stage: "discovery",
    priority: "medium",
    arrUsd: null,
    summary: null,
    nextAction: null,
    parties: [],
    confidence: 0,
    reasoning: "",
  });
  const [saving, setSaving] = useState(false);

  async function generate() {
    if (!content.trim()) return;
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setDraft(data.draft);
      setMode("review");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to draft");
    } finally {
      setDrafting(false);
    }
  }

  async function save() {
    if (!draft.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      router.push(`/accounts/${data.account.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  }

  function updateField<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  // -----------------------------------------------------
  // PASTE MODE — the big hero
  // -----------------------------------------------------
  if (mode === "paste") {
    return (
      <div className="space-y-4">
        <div
          className={`card transition-all p-5 ${
            content.trim()
              ? "ring-2 ring-[var(--accent-ring)] border-[var(--accent)]"
              : "hover:border-[#D6D6D4]"
          }`}
        >
          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-7 h-7 shrink-0 rounded-md bg-[var(--accent-bg)] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={2.6} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="text-[14px] font-semibold">Paste anything</div>
                {aiEnabled && backendLabel && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-[4px] text-[10px] font-medium bg-[var(--bg-subtle)] border border-[var(--line-2)] text-[var(--muted)]">
                    <span className="w-1 h-1 rounded-full bg-[var(--pos)]" />
                    {backendLabel}
                  </span>
                )}
              </div>
              <div className="text-[12px] text-[var(--muted)] leading-relaxed">
                Drop in an email thread, meeting transcript, Slack intro, scribbled notes — anything.
                The AI will extract the customer name, parties, stage, pricing, and a summary.
              </div>
            </div>
          </div>

          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                generate();
              }
            }}
            placeholder={
              aiEnabled
                ? "Paste the email thread, notes, or context here…"
                : "AI not running. Switch to manual below."
            }
            disabled={!aiEnabled}
            rows={14}
            className="input w-full !text-[13px] !leading-relaxed font-mono min-h-[260px] resize-y"
          />

          {error && (
            <div className="mt-3 px-3 py-2 text-[12px] text-[var(--neg)] bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-[1px] shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setMode("manual")}
              className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)] transition"
            >
              Or fill the form manually →
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--muted-2)]">
                <kbd>⌘↵</kbd> to draft
              </span>
              <button
                onClick={generate}
                disabled={drafting || !content.trim() || !aiEnabled}
                className="btn btn-accent"
              >
                {drafting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Drafting…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Draft deal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // REVIEW / MANUAL MODE — form with optional draft prefill
  // -----------------------------------------------------
  return (
    <div className="space-y-4">
      {mode === "review" && (
        <div className="card p-3 flex items-start gap-3 bg-[var(--accent-bg)] border-[var(--accent-bg-2)]">
          <Sparkles className="w-4 h-4 text-[var(--accent-ink)] mt-0.5 shrink-0" />
          <div className="flex-1 text-[12.5px] text-[var(--ink)] leading-snug">
            <div className="font-medium mb-0.5">
              AI drafted this from your paste — review and tweak before saving.
            </div>
            {draft.reasoning && (
              <div className="text-[11.5px] text-[var(--ink-3)]">{draft.reasoning}</div>
            )}
          </div>
          <span className="text-[10.5px] font-medium text-[var(--accent-ink)] tabular-nums shrink-0">
            {draft.confidence}% confident
          </span>
          <button
            onClick={() => {
              setMode("paste");
            }}
            className="text-[var(--muted)] hover:text-[var(--ink)] p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="card p-6 space-y-5">
        <F label="Company name" required>
          <input
            value={draft.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
            placeholder="e.g. Monument Technology"
            className="input input-lg"
            autoFocus={mode === "manual"}
          />
        </F>

        <div className="grid grid-cols-2 gap-3">
          <F label="Domain">
            <input
              value={draft.domain ?? ""}
              onChange={(e) => updateField("domain", e.target.value || null)}
              placeholder="monument.tech"
              className="input"
            />
          </F>
          <F label="Industry">
            <input
              value={draft.industry ?? ""}
              onChange={(e) => updateField("industry", e.target.value || null)}
              placeholder="Legal / Financial services"
              className="input"
            />
          </F>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <F label="Stage">
            <select
              value={draft.stage}
              onChange={(e) => updateField("stage", e.target.value)}
              className="input"
            >
              {ALL_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </F>
          <F label="Priority">
            <select
              value={draft.priority}
              onChange={(e) => updateField("priority", e.target.value)}
              className="input"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </F>
          <F label="ARR ($)">
            <input
              type="number"
              step="0.01"
              value={draft.arrUsd ?? ""}
              onChange={(e) =>
                updateField(
                  "arrUsd",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              placeholder="3600"
              className="input"
            />
          </F>
        </div>

        <F label="Summary" help="Where is this deal right now?">
          <textarea
            value={draft.summary ?? ""}
            onChange={(e) => updateField("summary", e.target.value || null)}
            rows={3}
            className="input"
          />
        </F>

        <F label="Next action">
          <input
            value={draft.nextAction ?? ""}
            onChange={(e) => updateField("nextAction", e.target.value || null)}
            className="input"
          />
        </F>

        {/* Parties */}
        <div>
          <div className="text-[11px] font-semibold text-[var(--ink-3)] mb-1.5 tracking-wide flex items-center justify-between">
            <span>
              Parties on this deal{" "}
              <span className="text-[var(--muted-2)] font-normal">
                · {draft.parties.length}
              </span>
            </span>
            <button
              type="button"
              onClick={() =>
                updateField("parties", [
                  ...draft.parties,
                  { name: "", domain: null, role: "partner", reasoning: "" },
                ])
              }
              className="text-[11px] text-[var(--accent-ink)] hover:underline"
            >
              + Add
            </button>
          </div>
          {draft.parties.length === 0 ? (
            <div className="text-[12px] text-[var(--muted-2)] italic">
              No parties yet. They&apos;ll auto-populate from future pastes, or add them here.
            </div>
          ) : (
            <div className="space-y-1.5">
              {draft.parties.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={p.name}
                    onChange={(e) => {
                      const next = [...draft.parties];
                      next[i] = { ...next[i], name: e.target.value };
                      updateField("parties", next);
                    }}
                    placeholder="Organisation name"
                    className="input !py-1.5 !text-[12.5px] flex-1"
                  />
                  <input
                    value={p.domain ?? ""}
                    onChange={(e) => {
                      const next = [...draft.parties];
                      next[i] = { ...next[i], domain: e.target.value || null };
                      updateField("parties", next);
                    }}
                    placeholder="Domain"
                    className="input !py-1.5 !text-[12.5px] !w-[140px]"
                  />
                  <select
                    value={p.role}
                    onChange={(e) => {
                      const next = [...draft.parties];
                      next[i] = { ...next[i], role: e.target.value };
                      updateField("parties", next);
                    }}
                    className="input !py-1.5 !text-[12.5px] !w-[115px]"
                  >
                    {PARTY_ROLES.filter((r) => r !== "cloudflare").map((r) => (
                      <option key={r} value={r}>
                        {PARTY_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const next = draft.parties.filter((_, idx) => idx !== i);
                      updateField("parties", next);
                    }}
                    className="text-[var(--muted-2)] hover:text-[var(--neg)] p-1"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="px-3 py-2 text-[12px] text-[var(--neg)] bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-[1px] shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[var(--line-2)]">
          {mode === "manual" && aiEnabled ? (
            <button
              type="button"
              onClick={() => setMode("paste")}
              className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)]"
            >
              ← Back to paste
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={save}
            disabled={saving || !draft.name.trim()}
            className="btn btn-primary btn-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                Create deal
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function F({
  label,
  required,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold text-[var(--ink-3)] mb-1.5 tracking-wide">
        {label}
        {required && <span className="text-[var(--accent)] ml-0.5">*</span>}
      </div>
      {children}
      {help && <div className="text-[11px] text-[var(--muted-2)] mt-1">{help}</div>}
    </label>
  );
}
