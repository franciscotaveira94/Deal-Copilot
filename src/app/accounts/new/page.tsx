import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ALL_STAGES } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

async function createAccount(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const account = await prisma.account.create({
    data: {
      name,
      domain: String(formData.get("domain") || "") || null,
      industry: String(formData.get("industry") || "") || null,
      stage: String(formData.get("stage") || "discovery"),
      priority: String(formData.get("priority") || "medium"),
      arr: formData.get("arr") ? Math.round(parseFloat(String(formData.get("arr"))) * 100) : null,
      summary: String(formData.get("summary") || "") || null,
      nextAction: String(formData.get("nextAction") || "") || null,
    },
  });
  redirect(`/accounts/${account.id}`);
}

export default async function NewAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="max-w-xl mx-auto px-10 py-10">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--muted)] hover:text-[var(--ink)] mb-5 transition"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to accounts
      </Link>

      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
        New account
      </div>
      <h1 className="text-[32px] font-semibold tracking-[-0.02em] leading-tight mb-1">
        Add a new deal.
      </h1>
      <p className="text-[13.5px] text-[var(--muted)] mb-8">
        Minimum viable is just the name — you can flesh it out later.
      </p>

      <form action={createAccount} className="card p-6 space-y-5">
        <F label="Company name" required>
          <input
            name="name"
            defaultValue={sp.name ?? ""}
            required
            placeholder="e.g. Gunnercooke LLP"
            className="input input-lg"
            autoFocus
          />
        </F>

        <div className="grid grid-cols-2 gap-4">
          <F label="Domain">
            <input name="domain" placeholder="gunnercooke.com" className="input" />
          </F>
          <F label="Industry">
            <input name="industry" placeholder="Legal / Professional services" className="input" />
          </F>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <F label="Stage">
            <select name="stage" defaultValue="discovery" className="input">
              {ALL_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </F>
          <F label="Priority">
            <select name="priority" defaultValue="medium" className="input">
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
          </F>
          <F label="ARR ($)">
            <input name="arr" type="number" step="0.01" placeholder="50000" className="input" />
          </F>
        </div>

        <F label="Summary" help="Where is this deal right now? One or two sentences.">
          <textarea
            name="summary"
            rows={3}
            placeholder="Enterprise Turnstile deal, CTO signed off, paper in flight..."
            className="input"
          />
        </F>

        <F label="Next action">
          <input name="nextAction" placeholder="Follow up on order form..." className="input" />
        </F>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn btn-primary btn-lg">
            Create account
          </button>
          <Link href="/accounts" className="btn btn-ghost btn-lg">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function F({
  label,
  required,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold text-[var(--ink-3)] mb-1.5 tracking-wide">
        {label}
        {required && <span className="text-[var(--accent)] ml-0.5">*</span>}
      </div>
      {children}
      {help && <div className="text-[11px] text-[var(--muted-2)] mt-1">{help}</div>}
    </label>
  );
}
