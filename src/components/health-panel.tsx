"use client";

import type { Health } from "@/lib/health";
import { HealthRing, HealthFlags } from "./health-ring";
import { bandLabel, bandStyle } from "@/lib/health";

export function HealthPanel({ health }: { health: Health }) {
  const style = bandStyle(health.band);
  return (
    <section className={`card overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-[10px] border-b border-[var(--line-2)]">
        <h2 className="label">Deal health</h2>
        <span className={`text-[11px] font-semibold ${style.text}`}>
          {bandLabel(health.band)} · {health.score}/100
        </span>
      </div>
      <div className="p-4 flex gap-4">
        <div className="shrink-0">
          <HealthRing health={health} size="lg" showLabel={false} />
        </div>
        <div className="flex-1 min-w-0">
          <HealthFlags health={health} />
        </div>
      </div>
    </section>
  );
}
