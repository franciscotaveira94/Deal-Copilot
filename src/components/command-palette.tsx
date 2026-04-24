"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  Kanban,
  LayoutGrid,
  Building2,
  Settings as SettingsIcon,
  Plus,
  CheckCircle2,
  MailQuestion,
  ArrowRight,
  Sparkles,
  FileText,
} from "lucide-react";
import { stageStyle } from "@/lib/utils";

type Account = { id: string; name: string; stage: string };

type Command = {
  id: string;
  label: string;
  hint?: string;
  group: "jump" | "create" | "think" | "navigate";
  icon: React.ReactNode;
  keywords?: string;
  action: () => void;
};

export function CommandPalette({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const close = () => setOpen(false);
  const go = (href: string) => () => {
    router.push(href);
    close();
  };

  const commands: Command[] = useMemo(() => {
    const base: Command[] = [
      {
        id: "brief",
        label: "Open today’s brief",
        hint: "What needs your attention today",
        group: "think",
        icon: <FileText className="w-3.5 h-3.5" />,
        keywords: "today brief morning what overdue",
        action: go("/"),
      },
      {
        id: "new",
        label: "New deal",
        hint: "Paste anything, AI structures it",
        group: "create",
        icon: <Plus className="w-3.5 h-3.5" />,
        keywords: "new deal account create paste",
        action: go("/accounts/new"),
      },
      {
        id: "pipeline",
        label: "Pipeline",
        hint: "All deals by stage",
        group: "navigate",
        icon: <Kanban className="w-3.5 h-3.5" />,
        action: go("/pipeline"),
      },
      {
        id: "orgs",
        label: "Organisations",
        hint: "Partners, distributors, customers",
        group: "navigate",
        icon: <Building2 className="w-3.5 h-3.5" />,
        action: go("/orgs"),
      },
      {
        id: "accounts",
        label: "All accounts",
        group: "navigate",
        icon: <LayoutGrid className="w-3.5 h-3.5" />,
        action: go("/accounts"),
      },
      {
        id: "actions",
        label: "Actions",
        hint: "Open, overdue, completed",
        group: "navigate",
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        action: go("/actions"),
      },
      {
        id: "overdue",
        label: "Overdue replies",
        hint: "Threads past SLA",
        group: "think",
        icon: <MailQuestion className="w-3.5 h-3.5" />,
        keywords: "overdue replies waiting quiet silent",
        action: go("/"),
      },
      {
        id: "settings",
        label: "Settings",
        group: "navigate",
        icon: <SettingsIcon className="w-3.5 h-3.5" />,
        action: go("/settings"),
      },
    ];

    // Account jumps
    const accCommands: Command[] = accounts.map((a) => ({
      id: `acc-${a.id}`,
      label: a.name,
      hint: `Jump to ${a.stage}`,
      group: "jump",
      icon: (
        <span
          className={`tag-dot ${stageStyle(a.stage).dot} inline-block`}
          style={{ width: 7, height: 7 }}
        />
      ),
      keywords: `account deal ${a.stage} ${a.name}`,
      action: go(`/accounts/${a.id}`),
    }));

    return [...accCommands, ...base];
  }, [accounts, router]);

  const filtered = useMemo(() => {
    if (!q.trim()) return commands;
    const needle = q.toLowerCase();
    return commands.filter((c) =>
      (c.label + " " + (c.hint || "") + " " + (c.keywords || "")).toLowerCase().includes(needle)
    );
  }, [q, commands]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  function onKeyNav(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.action();
    }
  }

  if (!open) return null;

  const grouped = groupBy(filtered, (c) => c.group);

  return (
    <div
      className="fixed inset-0 cmdk-overlay z-50 flex items-start justify-center pt-[14vh] animate-fade"
      onClick={close}
    >
      <div
        className="cmdk-panel w-[640px] max-w-[92vw] max-h-[70vh] flex flex-col overflow-hidden animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--rule-2)]">
          <Search className="w-4 h-4 text-[var(--muted)] shrink-0" strokeWidth={2} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyNav}
            placeholder="Jump to a deal, or type what you want…"
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[var(--muted-2)]"
          />
          <div className="flex items-center gap-1">
            <kbd>↵</kbd>
            <span className="text-[10.5px] text-[var(--muted-2)]">open</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-[var(--muted)] font-serif italic">
              Nothing matches. Try a different word.
            </div>
          ) : (
            <>
              {(["jump", "create", "think", "navigate"] as const).map((g) => {
                const items = grouped.get(g);
                if (!items || items.length === 0) return null;
                return (
                  <div key={g}>
                    <div className="px-4 pt-3 pb-1 eyebrow text-[10px]">{groupLabel(g)}</div>
                    {items.map((c) => {
                      const idx = filtered.indexOf(c);
                      const isActive = idx === active;
                      return (
                        <button
                          key={c.id}
                          onMouseMove={() => setActive(idx)}
                          onClick={c.action}
                          className={`w-full flex items-center gap-3 px-4 py-[9px] text-left transition-colors ${
                            isActive ? "bg-[var(--paper-2)]" : ""
                          }`}
                        >
                          <div className="w-6 h-6 rounded-[5px] flex items-center justify-center bg-[var(--paper-2)] text-[var(--ink-3)]">
                            {c.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13.5px] text-[var(--ink)] truncate">
                              {c.label}
                            </div>
                            {c.hint && (
                              <div className="text-[11.5px] text-[var(--muted)] truncate">
                                {c.hint}
                              </div>
                            )}
                          </div>
                          {isActive && (
                            <ArrowRight className="w-3.5 h-3.5 text-[var(--accent)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--rule-2)] text-[10.5px] text-[var(--muted-2)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd>esc</kbd>
              <span>close</span>
            </span>
          </div>
          <span className="font-serif italic">Type to search. Enter to open.</span>
        </div>
      </div>
    </div>
  );
}

function groupLabel(g: string): string {
  switch (g) {
    case "jump":
      return "Deals";
    case "create":
      return "Create";
    case "think":
      return "Think";
    case "navigate":
      return "Navigate";
    default:
      return g;
  }
}

function groupBy<T, K>(arr: T[], f: (x: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const x of arr) {
    const k = f(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(x);
  }
  return m;
}
