"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export function TimelineEntryActions({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    setBusy(true);
    await fetch(`/api/timeline/${entryId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={del}
      disabled={busy}
      className="p-1.5 text-[var(--muted)] hover:text-rose-600 hover:bg-rose-50 rounded transition disabled:opacity-50"
      title="Delete entry"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
