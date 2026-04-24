"use client";

import { Health, bandLabel, bandStyle } from "@/lib/health";

/**
 * Compact donut-style health indicator.
 * Sizes: sm (28px), md (44px), lg (72px)
 */
export function HealthRing({
  health,
  size = "md",
  showLabel = true,
}: {
  health: Health;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const dim = size === "sm" ? 28 : size === "md" ? 44 : 72;
  const stroke = size === "sm" ? 3 : size === "md" ? 4 : 5;
  const r = (dim - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (health.score / 100) * c;
  const style = bandStyle(health.band);
  const fontSize = size === "sm" ? 9 : size === "md" ? 12 : 18;

  return (
    <div className={`inline-flex items-center gap-2 ${showLabel ? "" : ""}`}>
      <div className="relative shrink-0" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-[var(--line)]"
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className={`transition-[stroke-dashoffset] duration-700 ${style.ring}`}
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center font-semibold tabular-nums ${style.text}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {health.score}
        </div>
      </div>
      {showLabel && (
        <div className="flex flex-col leading-tight">
          <span className={`text-[11.5px] font-semibold ${style.text}`}>
            {bandLabel(health.band)}
          </span>
          <span className="text-[10.5px] text-[var(--muted)]">
            {health.flags.filter((f) => f.level === "critical" || f.level === "warning").length}{" "}
            {health.flags.length === 1 ? "flag" : "flags"}
          </span>
        </div>
      )}
    </div>
  );
}

/** Vertical list of flags with colour-coded dots */
export function HealthFlags({ health }: { health: Health }) {
  const style = bandStyle(health.band);
  return (
    <div className="space-y-2">
      {health.flags.length === 0 && (
        <div className="text-[12px] text-[var(--muted-2)] italic">No signals yet.</div>
      )}
      {health.flags.map((f) => {
        const dotColor =
          f.level === "critical"
            ? "bg-[var(--neg)]"
            : f.level === "warning"
            ? "bg-[var(--risk)]"
            : f.level === "positive"
            ? "bg-[var(--pos)]"
            : "bg-[var(--muted-2)]";
        return (
          <div key={f.id} className="flex items-start gap-2.5">
            <span className={`tag-dot ${dotColor} mt-[6px]`} />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-medium text-[var(--ink)]">
                {f.label}
              </div>
              {f.detail && (
                <div className="text-[11.5px] text-[var(--muted)] leading-snug">
                  {f.detail}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
