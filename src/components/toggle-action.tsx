"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ToggleAction({ actionId, done }: { actionId: string; done: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [optim, setOptim] = useState(done);

  async function onClick() {
    setBusy(true);
    setOptim((v) => !v);
    await fetch(`/api/actions/${actionId}/toggle`, { method: "POST" });
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center shrink-0 transition ${
        optim
          ? "bg-[var(--accent)] border-[var(--accent)] hover:bg-[var(--accent-ink)]"
          : "bg-white border-[var(--line)] hover:border-[var(--accent)]"
      }`}
      aria-label={optim ? "Mark as not done" : "Mark as done"}
    >
      {optim && <Check className="w-[11px] h-[11px] text-white" strokeWidth={3.2} />}
    </button>
  );
}
