"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { relative } from "@/lib/utils";
import { ToggleAction } from "./toggle-action";

type Action = {
  id: string;
  title: string;
  detail: string | null;
  dueAt: Date | null;
  done: boolean;
  priority: string;
};

export function ActionsPanel({
  accountId,
  actions,
}: {
  accountId: string;
  actions: Action[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");

  async function add() {
    if (!newTitle.trim()) return;
    setBusy("new");
    await fetch(`/api/accounts/${accountId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        dueAt: newDue || null,
      }),
    });
    setNewTitle("");
    setNewDue("");
    setAdding(false);
    router.refresh();
    setBusy(null);
  }

  const open = actions.filter((a) => !a.done);
  const done = actions.filter((a) => a.done);

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-[10px] border-b border-[var(--line-2)]">
        <h2 className="label">
          Actions · {open.length} open
        </h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="btn btn-ghost btn-sm !text-[var(--accent-ink)]"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        )}
      </div>

      {adding && (
        <div className="p-2 bg-[var(--accent-bg)] border-b border-[var(--line-2)] animate-in">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              placeholder="New action…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewTitle("");
                }
              }}
              className="input input-lg flex-1 !bg-white"
            />
            <input
              type="date"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              className="input !w-[150px] !bg-white"
            />
            <button onClick={add} disabled={busy === "new"} className="btn btn-accent">
              {busy === "new" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setNewTitle("");
              }}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {actions.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-[var(--muted)] italic">
          No actions yet.
        </div>
      ) : (
        <div>
          {open.length > 0 && (
            <div className="divide-y divide-[var(--line-2)]">
              {open.map((a) => (
                <ActionItem key={a.id} action={a} />
              ))}
            </div>
          )}
          {done.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer select-none px-4 py-2 text-[11px] text-[var(--muted)] hover:bg-[var(--bg-hover)] flex items-center gap-1.5">
                <span className="group-open:rotate-90 transition-transform">›</span>
                <span>{done.length} completed</span>
              </summary>
              <div className="divide-y divide-[var(--line-2)] opacity-60">
                {done.map((a) => (
                  <ActionItem key={a.id} action={a} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function ActionItem({ action }: { action: Action }) {
  const overdue = !action.done && action.dueAt && new Date(action.dueAt) < new Date();
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition">
      <div className="mt-0.5">
        <ToggleAction actionId={action.id} done={action.done} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`text-[13px] leading-snug ${
            action.done
              ? "line-through text-[var(--muted-2)]"
              : "text-[var(--ink)]"
          }`}
        >
          {action.title}
        </div>
        {action.detail && !action.done && (
          <div className="text-[11.5px] text-[var(--muted)] mt-0.5">{action.detail}</div>
        )}
        {action.dueAt && !action.done && (
          <div
            className={`text-[11px] mt-1 ${
              overdue ? "text-[var(--neg)] font-medium" : "text-[var(--muted)]"
            }`}
          >
            {overdue ? "overdue · " : "due "}
            {relative(action.dueAt)}
          </div>
        )}
      </div>
    </div>
  );
}
