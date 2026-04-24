import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewAccountFlow } from "@/components/new-account-flow";
import { backendMeta } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default async function NewAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const sp = await searchParams;
  const ai = await backendMeta();

  return (
    <div className="max-w-2xl mx-auto px-10 py-10">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--muted)] hover:text-[var(--ink)] mb-5 transition"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to accounts
      </Link>

      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
        New deal
      </div>
      <h1 className="text-[32px] font-semibold tracking-[-0.02em] leading-tight mb-1">
        Paste anything. I&apos;ll structure it.
      </h1>
      <p className="text-[13.5px] text-[var(--muted)] mb-6">
        Email thread, meeting notes, Slack intro — anything you have. AI will draft the deal,
        extract the parties, and suggest a summary and next action. You review, tweak, save.
      </p>

      <NewAccountFlow
        prefilledName={sp.name ?? ""}
        aiEnabled={ai.backend !== "none"}
        backendLabel={ai.local ? `Local · ${ai.model}` : ai.backend === "anthropic" ? `Cloud · ${ai.model}` : ""}
      />
    </div>
  );
}
