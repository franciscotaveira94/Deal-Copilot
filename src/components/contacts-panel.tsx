"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, ChevronDown } from "lucide-react";
import { PERSONA_LABELS, personaStyle } from "@/lib/health";

const PERSONAS = ["unknown", "champion", "economic-buyer", "influencer", "blocker", "user"];

type Contact = {
  id: string;
  name: string;
  role: string | null;
  persona: string;
  email: string | null;
};

export function ContactsPanel({
  accountId,
  contacts,
}: {
  accountId: string;
  contacts: Contact[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newPersona, setNewPersona] = useState("unknown");

  async function add() {
    if (!newName.trim()) return;
    setBusy("new");
    await fetch(`/api/accounts/${accountId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, role: newRole, persona: newPersona }),
    });
    setNewName("");
    setNewRole("");
    setNewPersona("unknown");
    setAdding(false);
    router.refresh();
    setBusy(null);
  }

  async function setPersona(id: string, persona: string) {
    setBusy(id);
    await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona }),
    });
    router.refresh();
    setBusy(null);
  }

  async function del(id: string) {
    if (!confirm("Remove this contact?")) return;
    setBusy(id);
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    router.refresh();
    setBusy(null);
  }

  const count = contacts.length;
  const champion = contacts.some((c) => c.persona === "champion");
  const eb = contacts.some((c) => c.persona === "economic-buyer");

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-[10px] border-b border-[var(--line-2)]">
        <div className="flex items-center gap-2">
          <h2 className="label">Stakeholders · {count}</h2>
          {count > 0 && (
            <div className="flex items-center gap-1 text-[10.5px] text-[var(--muted)]">
              {!champion && (
                <span
                  className="text-[var(--risk)] font-medium"
                  title="No champion identified"
                >
                  · no champion
                </span>
              )}
              {!eb && count > 0 && (
                <span className="text-[var(--risk)] font-medium" title="No economic buyer">
                  · no EB
                </span>
              )}
            </div>
          )}
        </div>
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
        <div className="p-2 bg-[var(--accent-bg)] border-b border-[var(--line-2)] animate-in space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewName("");
                }
              }}
              className="input input-sm !bg-white flex-1"
            />
            <input
              placeholder="Role / title"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="input input-sm !bg-white flex-1"
            />
            <select
              value={newPersona}
              onChange={(e) => setNewPersona(e.target.value)}
              className="input input-sm !bg-white !w-[125px]"
            >
              {PERSONAS.map((p) => (
                <option key={p} value={p}>
                  {PERSONA_LABELS[p]}
                </option>
              ))}
            </select>
            <button onClick={add} disabled={busy === "new"} className="btn btn-accent btn-sm">
              {busy === "new" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
            </button>
          </div>
        </div>
      )}

      {contacts.length === 0 && !adding ? (
        <div className="px-4 py-5 text-center text-[12.5px] text-[var(--muted)] italic">
          No stakeholders yet. Add the people you&apos;re engaging.
        </div>
      ) : (
        <div className="divide-y divide-[var(--line-2)]">
          {contacts.map((c) => (
            <ContactRow key={c.id} c={c} busy={busy === c.id} onPersona={setPersona} onDelete={del} />
          ))}
        </div>
      )}
    </section>
  );
}

function ContactRow({
  c,
  busy,
  onPersona,
  onDelete,
}: {
  c: Contact;
  busy: boolean;
  onPersona: (id: string, persona: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 group hover:bg-[var(--bg-hover)] transition">
      <div className="w-7 h-7 shrink-0 rounded-md bg-[var(--bg-subtle)] border border-[var(--line-2)] flex items-center justify-center text-[10.5px] font-semibold text-[var(--ink-3)]">
        {c.name
          .split(" ")
          .slice(0, 2)
          .map((p) => p[0])
          .join("")
          .toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[var(--ink)] truncate">{c.name}</div>
        {(c.role || c.email) && (
          <div className="text-[11px] text-[var(--muted)] truncate">
            {[c.role, c.email].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-[5px] text-[11px] font-medium border ${personaStyle(
            c.persona
          )} hover:opacity-90`}
        >
          {PERSONA_LABELS[c.persona]}
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute top-full right-0 mt-1 bg-white border border-[var(--line)] rounded-[7px] shadow-[var(--shadow-lg)] overflow-hidden z-40 min-w-[150px] animate-in">
              {PERSONAS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    onPersona(c.id, p);
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-[var(--bg-hover)] ${
                    p === c.persona ? "bg-[var(--bg-subtle)]" : ""
                  }`}
                >
                  {PERSONA_LABELS[p]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        onClick={() => onDelete(c.id)}
        disabled={busy}
        className="opacity-0 group-hover:opacity-100 p-1 -mr-1 text-[var(--muted-2)] hover:text-[var(--neg)] transition"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
