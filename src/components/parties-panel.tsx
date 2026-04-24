"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ChevronDown, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { PARTY_LABELS, PARTY_ROLES, partyStyle } from "@/lib/orgs";
import { daysAgo, relative } from "@/lib/utils";

type Party = {
  id: string;
  role: string;
  notes: string | null;
  lastActivityAt: Date | string | null;
  organisation: {
    id: string;
    name: string;
    domain: string | null;
    kind: string;
  };
};

export function PartiesPanel({
  accountId,
  parties,
}: {
  accountId: string;
  parties: Party[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("partner");
  const [domain, setDomain] = useState("");

  // Sort: customer → distributor → partner → cloudflare → other
  const order = ["customer", "distributor", "partner", "cloudflare", "other"];
  const sorted = [...parties].sort(
    (a, b) => order.indexOf(a.role) - order.indexOf(b.role)
  );

  async function add() {
    if (!name.trim()) return;
    setBusy("add");
    try {
      const res = await fetch(`/api/accounts/${accountId}/parties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), role, domain: domain.trim() || null }),
      });
      if (res.ok) {
        setName("");
        setDomain("");
        setRole("partner");
        setAdding(false);
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function setRoleFor(partyId: string, r: string) {
    setBusy(partyId);
    try {
      await fetch(`/api/deal-parties/${partyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: r }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(partyId: string) {
    if (!confirm("Remove this party from the deal? The organisation itself stays.")) return;
    setBusy(partyId);
    try {
      await fetch(`/api/deal-parties/${partyId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  // Highlight parties that have gone quiet
  const quietThreshold = 14;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-[10px] border-b border-[var(--line-2)]">
        <div className="flex items-center gap-2">
          <h2 className="label">Parties · {parties.length}</h2>
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
              placeholder="Organisation name (e.g. Natilik)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
                if (e.key === "Escape") {
                  setAdding(false);
                  setName("");
                }
              }}
              className="input input-sm !bg-white flex-[2]"
            />
            <input
              placeholder="Domain (optional)"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="input input-sm !bg-white flex-1"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input input-sm !bg-white !w-[120px]"
            >
              {PARTY_ROLES.map((r) => (
                <option key={r} value={r}>
                  {PARTY_LABELS[r]}
                </option>
              ))}
            </select>
            <button
              onClick={add}
              disabled={busy === "add" || !name.trim()}
              className="btn btn-accent btn-sm"
            >
              {busy === "add" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !adding ? (
        <div className="px-4 py-5 text-center text-[12.5px] text-[var(--muted)] italic leading-relaxed">
          No parties yet. Add the customer, and any partner or distributor involved.
          <br />
          <span className="text-[11px]">
            The paste box will try to detect them for you automatically.
          </span>
        </div>
      ) : (
        <div className="divide-y divide-[var(--line-2)]">
          {sorted.map((p) => {
            const quietDays =
              p.lastActivityAt ? daysAgo(p.lastActivityAt) : null;
            const quiet = quietDays != null && quietDays >= quietThreshold;
            return (
              <PartyRow
                key={p.id}
                party={p}
                quiet={quiet}
                busy={busy === p.id}
                onRole={(r) => setRoleFor(p.id, r)}
                onRemove={() => remove(p.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function PartyRow({
  party,
  quiet,
  busy,
  onRole,
  onRemove,
}: {
  party: Party;
  quiet: boolean;
  busy: boolean;
  onRole: (role: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const initials = party.organisation.name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 group hover:bg-[var(--bg-hover)] transition">
      <div
        className={`w-7 h-7 shrink-0 rounded-md border flex items-center justify-center text-[10.5px] font-semibold ${
          quiet
            ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-[var(--bg-subtle)] border-[var(--line-2)] text-[var(--ink-3)]"
        }`}
      >
        {initials || "?"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/orgs/${party.organisation.id}`}
            className="text-[13px] font-medium text-[var(--ink)] truncate hover:text-[var(--accent-ink)] transition"
          >
            {party.organisation.name}
          </Link>
          {quiet && (
            <AlertTriangle
              className="w-3 h-3 text-[var(--risk)]"
              title={`Last activity ${daysAgo(party.lastActivityAt)} days ago`}
            />
          )}
        </div>
        <div className="text-[11px] text-[var(--muted)] flex items-center gap-1.5">
          {party.organisation.domain && <span>{party.organisation.domain}</span>}
          {party.organisation.domain && party.lastActivityAt && (
            <span className="text-[var(--line)]">·</span>
          )}
          {party.lastActivityAt && (
            <span className={quiet ? "text-[var(--risk)] font-medium" : ""}>
              active {relative(party.lastActivityAt)}
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-[5px] text-[11px] font-medium border ${partyStyle(
            party.role
          )} hover:opacity-90`}
        >
          {PARTY_LABELS[party.role]}
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute top-full right-0 mt-1 bg-white border border-[var(--line)] rounded-[7px] shadow-[var(--shadow-lg)] overflow-hidden z-40 min-w-[130px] animate-in">
              {PARTY_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    onRole(r);
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-[var(--bg-hover)] ${
                    r === party.role ? "bg-[var(--bg-subtle)]" : ""
                  }`}
                >
                  {PARTY_LABELS[r]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Link
        href={`/orgs/${party.organisation.id}`}
        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--muted-2)] hover:text-[var(--ink)] transition"
        title="Open organisation"
      >
        <ExternalLink className="w-3 h-3" />
      </Link>

      <button
        onClick={onRemove}
        disabled={busy}
        className="opacity-0 group-hover:opacity-100 p-1 -mr-1 text-[var(--muted-2)] hover:text-[var(--neg)] transition"
        title="Remove from deal"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
