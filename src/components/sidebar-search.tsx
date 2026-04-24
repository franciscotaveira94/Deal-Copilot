"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { stageStyle } from "@/lib/utils";

type A = { id: string; name: string; stage: string };

export function SidebarSearch({ accounts }: { accounts: A[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.toLowerCase();
    return accounts
      .filter((a) => a.name.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q, accounts]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[13px] h-[13px] text-[var(--muted-2)] pointer-events-none" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Search accounts"
          className="w-full pl-8 pr-10 py-[6px] text-[12.5px] bg-[var(--bg-subtle)] border border-transparent hover:border-[var(--line-2)] focus:border-[var(--line)] focus:bg-white rounded-[6px] transition placeholder:text-[var(--muted-2)]"
        />
        <kbd className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">⌘K</kbd>
      </div>

      {open && q.trim() && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[var(--line)] rounded-[8px] shadow-[var(--shadow-lg)] overflow-hidden z-40 animate-in">
          {results.map((a) => {
            const st = stageStyle(a.stage);
            return (
              <Link
                key={a.id}
                href={`/accounts/${a.id}`}
                onClick={() => {
                  setQ("");
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-[var(--bg-hover)]"
              >
                <span className={`tag-dot ${st.dot}`} />
                <span className="truncate">{a.name}</span>
              </Link>
            );
          })}
        </div>
      )}

      {open && q.trim() && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[var(--line)] rounded-[8px] shadow-[var(--shadow-lg)] px-3 py-2 text-[12px] text-[var(--muted)] z-40 animate-in">
          No matches. Press Enter to{" "}
          <Link href={`/accounts/new?name=${encodeURIComponent(q.trim())}`} className="text-[var(--accent-ink)] underline">
            create &ldquo;{q.trim()}&rdquo;
          </Link>
        </div>
      )}
    </div>
  );
}
