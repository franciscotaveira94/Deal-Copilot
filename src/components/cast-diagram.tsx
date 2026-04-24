"use client";

/**
 * Cast-of-characters mini diagram.
 * A small horizontal chip-flow showing who's on the deal and who's gone quiet.
 * Not a graph, not a kanban. A visual sentence.
 */

import Link from "next/link";
import { daysAgo } from "@/lib/utils";

type Party = {
  id: string;
  role: string;
  lastActivityAt: Date | string | null;
  organisation: { id: string; name: string };
};

type Stakeholder = {
  id: string;
  name: string;
  persona: string;
  role: string | null;
};

export function CastDiagram({
  parties,
  stakeholders,
}: {
  parties: Party[];
  stakeholders: Stakeholder[];
}) {
  const order = ["cloudflare", "distributor", "partner", "customer", "other"];
  const sorted = [...parties].sort(
    (a, b) => order.indexOf(a.role) - order.indexOf(b.role)
  );

  // We always start with "You" (Cloudflare), then the chain
  return (
    <div className="overflow-x-auto -mx-2 px-2 pb-1">
      <div className="flex items-center gap-0 min-w-min">
        <PartyNode name="You" role="cloudflare" quiet={false} isSelf />
        {sorted.map((p, i) => {
          const quiet = p.lastActivityAt ? daysAgo(p.lastActivityAt) >= 14 : true;
          const veryQuiet = p.lastActivityAt ? daysAgo(p.lastActivityAt) >= 30 : true;
          const initials = p.organisation.name
            .split(/[\s-]+/)
            .slice(0, 2)
            .map((x) => x[0])
            .join("")
            .toUpperCase();
          return (
            <div key={p.id} className="flex items-center">
              <Connector quiet={quiet} />
              <Link href={`/orgs/${p.organisation.id}`}>
                <PartyNode
                  name={p.organisation.name}
                  initials={initials}
                  role={p.role}
                  quiet={quiet}
                  veryQuiet={veryQuiet}
                />
              </Link>
            </div>
          );
        })}
      </div>
      {stakeholders.length > 0 && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--rule-2)] overflow-x-auto">
          <span className="eyebrow text-[9.5px] shrink-0">People</span>
          {stakeholders.map((s) => (
            <StakeholderPill key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function PartyNode({
  name,
  initials,
  role,
  quiet,
  veryQuiet,
  isSelf,
}: {
  name: string;
  initials?: string;
  role: string;
  quiet: boolean;
  veryQuiet?: boolean;
  isSelf?: boolean;
}) {
  const roleColor = roleAccent(role);
  const displayInitials = initials || name.slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex flex-col items-center gap-1.5 shrink-0 transition-opacity duration-300 ${
        veryQuiet ? "opacity-50" : quiet ? "opacity-75" : "opacity-100"
      }`}
      title={quiet ? `${name} — quiet${veryQuiet ? " (>30d)" : ""}` : name}
    >
      <div
        className={`w-10 h-10 rounded-full border flex items-center justify-center text-[11px] font-semibold transition-colors ${roleColor.bg} ${roleColor.border} ${roleColor.text}`}
      >
        {isSelf ? (
          <span
            className="font-serif italic text-[13px]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            You
          </span>
        ) : (
          displayInitials
        )}
      </div>
      <div className="text-[10.5px] text-[var(--ink-3)] max-w-[84px] text-center truncate font-medium">
        {name}
      </div>
      <div
        className="text-[9px] uppercase tracking-wider text-[var(--muted-2)] leading-none"
        style={{ letterSpacing: "0.14em" }}
      >
        {roleLabel(role)}
      </div>
    </div>
  );
}

function Connector({ quiet }: { quiet: boolean }) {
  // Thin dashed line between nodes — dotted & dim if the connection is stale
  return (
    <div
      className={`h-px w-10 mx-1 ${
        quiet ? "border-t border-dashed border-[var(--muted-3)]" : "bg-[var(--rule)]"
      }`}
      style={{ marginTop: -18 }}
    />
  );
}

function StakeholderPill({ s }: { s: Stakeholder }) {
  const pc = personaColor(s.persona);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-[2px] rounded-full border text-[10.5px] shrink-0 ${pc.bg} ${pc.border} ${pc.text}`}
      title={`${s.name} — ${s.persona}`}
    >
      <span className={`tag-dot ${pc.dot}`} />
      {s.name}
      {s.role && <span className="text-[var(--muted-2)] font-normal italic">· {s.role}</span>}
    </span>
  );
}

function roleAccent(role: string) {
  switch (role) {
    case "cloudflare":
      return {
        bg: "bg-[var(--ink)]",
        border: "border-[var(--ink)]",
        text: "text-[var(--paper)]",
      };
    case "customer":
      return {
        bg: "bg-[var(--teal-wash)]",
        border: "border-[var(--teal)]/40",
        text: "text-[var(--teal)]",
      };
    case "distributor":
      return {
        bg: "bg-[var(--plum-wash)]",
        border: "border-[var(--plum)]/40",
        text: "text-[var(--plum)]",
      };
    case "partner":
      return {
        bg: "bg-[var(--accent-wash)]",
        border: "border-[var(--accent)]/40",
        text: "text-[var(--accent-strong)]",
      };
    default:
      return {
        bg: "bg-[var(--paper-2)]",
        border: "border-[var(--rule)]",
        text: "text-[var(--ink-3)]",
      };
  }
}

function roleLabel(role: string) {
  return role === "cloudflare" ? "you" : role;
}

function personaColor(p: string) {
  switch (p) {
    case "champion":
      return {
        bg: "bg-[var(--teal-wash)]",
        border: "border-[var(--teal)]/30",
        text: "text-[var(--teal)]",
        dot: "bg-[var(--teal)]",
      };
    case "economic-buyer":
      return {
        bg: "bg-[var(--plum-wash)]",
        border: "border-[var(--plum)]/30",
        text: "text-[var(--plum)]",
        dot: "bg-[var(--plum)]",
      };
    case "blocker":
      return {
        bg: "bg-[var(--rust-wash)]",
        border: "border-[var(--rust)]/30",
        text: "text-[var(--rust)]",
        dot: "bg-[var(--rust)]",
      };
    default:
      return {
        bg: "bg-[var(--paper-2)]",
        border: "border-[var(--rule-2)]",
        text: "text-[var(--ink-3)]",
        dot: "bg-[var(--muted-2)]",
      };
  }
}
