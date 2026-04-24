"use client";

import { useEffect, useRef } from "react";

/**
 * Polls /api/overdue every 60s. When new overdue-reply entries are detected
 * (compared to the previous poll), fires a browser notification.
 */
export function OverduePoller() {
  const seen = useRef<Set<string>>(new Set());
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/overdue");
        if (!res.ok) return;
        const data = await res.json();
        const entries: Array<{
          id: string;
          accountId: string;
          accountName: string;
          orgName: string;
          title: string;
          dueAt: string;
        }> = data.entries || [];

        if (!loaded.current) {
          // First load: just populate the seen set. Don't nag about everything at once.
          entries.forEach((e) => seen.current.add(e.id));
          loaded.current = true;
          return;
        }

        if ("Notification" in window && Notification.permission === "granted") {
          for (const e of entries) {
            if (!seen.current.has(e.id)) {
              seen.current.add(e.id);
              try {
                const n = new Notification(`${e.orgName} hasn't replied`, {
                  body: `${e.accountName} — "${e.title}"`,
                  icon: "/favicon.ico",
                  tag: e.id,
                });
                n.onclick = () => {
                  window.focus();
                  window.location.href = `/accounts/${e.accountId}`;
                  n.close();
                };
              } catch {}
            }
          }
        } else {
          entries.forEach((e) => seen.current.add(e.id));
        }
      } catch {
        // silent
      }
    }

    tick();
    const id = setInterval(() => {
      if (!cancelled) tick();
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return null;
}
