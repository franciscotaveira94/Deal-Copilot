"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Save, Trash2, X } from "lucide-react";
import { isoDate } from "@/lib/utils";

type Account = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  stage: string;
  priority: string;
  arr: number | null;
  summary: string | null;
  nextAction: string | null;
  nextActionDue: Date | null;
  notes: string | null;
};

export function AccountQuickEdit({
  account,
  stages,
}: {
  account: Account;
  stages: string[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(formData: FormData) {
    setBusy(true);
    await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        domain: formData.get("domain") || null,
        industry: formData.get("industry") || null,
        stage: formData.get("stage"),
        priority: formData.get("priority"),
        arr: formData.get("arr")
          ? Math.round(parseFloat(String(formData.get("arr"))) * 100)
          : null,
        summary: formData.get("summary") || null,
        nextAction: formData.get("nextAction") || null,
        nextActionDue: formData.get("nextActionDue") || null,
        notes: formData.get("notes") || null,
      }),
    });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  async function del() {
    if (
      !confirm(
        `Delete ${account.name}? Timeline, actions, contacts, and chat history will be removed. Cannot be undone.`
      )
    )
      return;
    await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    router.push("/accounts");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-secondary btn-sm"
        title="Edit account"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-[12px] shadow-[var(--shadow-lg)] w-full max-w-xl max-h-[90vh] flex flex-col border border-[var(--line)] animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[var(--line-2)] flex items-center justify-between">
              <h2 className="font-semibold text-[var(--ink)]">Edit account</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded hover:bg-[var(--bg-hover)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form action={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <F label="Name">
                <input name="name" defaultValue={account.name} required className="input" />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Domain">
                  <input name="domain" defaultValue={account.domain ?? ""} className="input" />
                </F>
                <F label="Industry">
                  <input name="industry" defaultValue={account.industry ?? ""} className="input" />
                </F>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <F label="Stage">
                  <select name="stage" defaultValue={account.stage} className="input">
                    {stages.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </F>
                <F label="Priority">
                  <select name="priority" defaultValue={account.priority} className="input">
                    <option>low</option>
                    <option>medium</option>
                    <option>high</option>
                    <option>critical</option>
                  </select>
                </F>
                <F label="ARR ($)">
                  <input
                    name="arr"
                    type="number"
                    step="0.01"
                    defaultValue={account.arr != null ? account.arr / 100 : ""}
                    className="input"
                  />
                </F>
              </div>
              <F label="Summary">
                <textarea
                  name="summary"
                  rows={3}
                  defaultValue={account.summary ?? ""}
                  className="input"
                />
              </F>
              <div className="grid grid-cols-[1fr_160px] gap-3">
                <F label="Next action">
                  <input name="nextAction" defaultValue={account.nextAction ?? ""} className="input" />
                </F>
                <F label="Due">
                  <input
                    name="nextActionDue"
                    type="date"
                    defaultValue={isoDate(account.nextActionDue)}
                    className="input"
                  />
                </F>
              </div>
              <F label="Notes">
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={account.notes ?? ""}
                  className="input font-mono !text-[12px]"
                />
              </F>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--line-2)]">
                <button type="button" onClick={del} className="btn btn-danger-ghost btn-sm">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
                    Cancel
                  </button>
                  <button type="submit" disabled={busy} className="btn btn-primary">
                    <Save className="w-3.5 h-3.5" />
                    {busy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold text-[var(--ink-3)] mb-1 tracking-wide">
        {label}
      </div>
      {children}
    </label>
  );
}
