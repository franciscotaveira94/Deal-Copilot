"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import {
  formatArr,
  initials,
  priorityStyle,
  relative,
  STAGE_LABELS,
  stageStyle,
} from "@/lib/utils";
import { bandStyle, Health } from "@/lib/health";

type A = {
  id: string;
  name: string;
  stage: string;
  priority: string;
  arr: number | null;
  summary: string | null;
  lastTouch: Date;
  nextAction: string | null;
  nextActionDue: Date | null;
  _count: { actions: number };
  health?: Health;
};

const COLUMNS = ["discovery", "qualified", "proposal", "negotiation", "won"] as const;

export function Kanban({ accounts }: { accounts: A[] }) {
  const router = useRouter();
  const [items, setItems] = useState<A[]>(accounts);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const byStage = COLUMNS.reduce(
    (acc, s) => {
      acc[s] = items.filter((a) => a.stage === s);
      return acc;
    },
    {} as Record<string, A[]>
  );

  // Lost column (collapsed accordion)
  const lost = items.filter((a) => a.stage === "lost");

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const accountId = String(e.active.id);
    const destStage = e.over?.id;
    if (!destStage) return;
    const account = items.find((a) => a.id === accountId);
    if (!account || account.stage === destStage) return;

    // optimistic
    setItems((prev) => prev.map((a) => (a.id === accountId ? { ...a, stage: String(destStage) } : a)));

    await fetch(`/api/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: destStage }),
    });
    router.refresh();
  }

  const activeAccount = items.find((a) => a.id === activeId);

  return (
    <div className="flex-1 overflow-auto px-6 py-5 bg-[var(--bg)]">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-5 gap-3 min-w-[1100px]">
          {COLUMNS.map((stage) => (
            <Column key={stage} stage={stage} accounts={byStage[stage] || []} />
          ))}
        </div>

        {lost.length > 0 && (
          <details className="mt-6 group">
            <summary className="cursor-pointer select-none text-[12px] text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-2 px-2">
              <span className="tag-dot bg-[var(--stage-lost)]" />
              <span className="label">Closed lost · {lost.length}</span>
              <span className="text-[11px] text-[var(--muted-2)] group-open:rotate-90 transition">›</span>
            </summary>
            <div className="mt-3 grid grid-cols-5 gap-3 min-w-[1100px] opacity-70">
              {lost.map((a) => (
                <Card key={a.id} a={a} />
              ))}
            </div>
          </details>
        )}

        <DragOverlay>
          {activeAccount ? <Card a={activeAccount} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({ stage, accounts }: { stage: string; accounts: A[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });
  const totalArr = accounts.reduce((s, a) => s + (a.arr || 0), 0);
  const st = stageStyle(stage);

  return (
    <div className="flex flex-col min-h-0">
      {/* Column header */}
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2">
          <span className={`tag-dot ${st.dot}`} />
          <span className="font-semibold text-[12px] text-[var(--ink)] tracking-tight">
            {STAGE_LABELS[stage]}
          </span>
          <span className="text-[11px] text-[var(--muted-2)] font-medium tabular-nums">
            {accounts.length}
          </span>
        </div>
        {totalArr > 0 && (
          <span className="text-[11px] text-[var(--muted)] font-medium tabular-nums">
            {formatArr(totalArr, { compact: true })}
          </span>
        )}
      </div>

      {/* Droppable body */}
      <div
        ref={setNodeRef}
        className={`kanban-col p-2 min-h-[140px] flex-1 transition ${
          isOver ? "kanban-drop-active" : ""
        }`}
      >
        <div className="space-y-2">
          {accounts.length === 0 ? (
            <div className="px-2 py-6 text-center text-[11.5px] text-[var(--muted-2)] italic">
              Nothing here
            </div>
          ) : (
            accounts.map((a) => <DraggableCard key={a.id} a={a} />)
          )}
        </div>
      </div>
    </div>
  );
}

function DraggableCard({ a }: { a: A }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: a.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-30" : ""}
    >
      <Card a={a} />
    </div>
  );
}

function Card({ a, overlay }: { a: A; overlay?: boolean }) {
  const overdue = a.nextActionDue && new Date(a.nextActionDue) < new Date();
  const h = a.health;
  return (
    <Link
      href={`/accounts/${a.id}`}
      onClick={(e) => overlay && e.preventDefault()}
      className={`kanban-card block no-underline ${overlay ? "dragging" : ""}`}
    >
      {/* Top row: initials + name + priority */}
      <div className="flex items-start gap-2.5 mb-2">
        <div className="w-7 h-7 shrink-0 rounded-md bg-[var(--bg-subtle)] border border-[var(--line-2)] flex items-center justify-center text-[10.5px] font-semibold text-[var(--ink-3)]">
          {initials(a.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="font-semibold text-[13px] truncate text-[var(--ink)] leading-tight flex-1 min-w-0">
              {a.name}
            </div>
            {h && (
              <span
                className={`shrink-0 text-[9.5px] tabular-nums font-semibold px-1.5 py-[1px] rounded-full ${bandStyle(h.band).bg} ${bandStyle(h.band).text}`}
                title={`${h.band} · ${h.score}/100`}
              >
                {h.score}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`text-[10px] px-1.5 py-px rounded-[3px] border font-medium tabular-nums ${priorityStyle(
                a.priority
              )}`}
            >
              {a.priority}
            </span>
            {a.arr != null && a.arr > 0 && (
              <span className="text-[10.5px] text-[var(--muted)] font-medium tabular-nums">
                {formatArr(a.arr, { compact: true })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary (if any) */}
      {a.summary && (
        <div className="text-[11.5px] text-[var(--muted)] truncate-2 leading-snug mb-2">
          {a.summary}
        </div>
      )}

      {/* Next action */}
      {a.nextAction && (
        <div
          className={`text-[11px] flex items-start gap-1.5 mb-1.5 ${
            overdue ? "text-[var(--neg)]" : "text-[var(--ink-3)]"
          }`}
        >
          <span className="mt-[2px]">↳</span>
          <span className="truncate-1 leading-tight">{a.nextAction}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10.5px] text-[var(--muted-2)] pt-1.5 border-t border-[var(--line-3)]">
        <span className="flex items-center gap-1">
          {a._count.actions > 0 && (
            <span className="text-[var(--ink-3)] font-medium">{a._count.actions} ◯</span>
          )}
        </span>
        <span>{relative(a.lastTouch)}</span>
      </div>
    </Link>
  );
}
