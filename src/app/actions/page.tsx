import Link from "next/link";
import { prisma } from "@/lib/db";
import { relative } from "@/lib/utils";
import { ToggleAction } from "@/components/toggle-action";

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const now = new Date();
  const actions = await prisma.action.findMany({
    orderBy: [{ done: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    include: { account: true },
  });

  const overdue = actions.filter((a) => !a.done && a.dueAt && new Date(a.dueAt) < now);
  const open = actions.filter((a) => !a.done && !overdue.includes(a));
  const done = actions.filter((a) => a.done);

  return (
    <div className="max-w-[920px] mx-auto px-10 py-10">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
        Actions
      </div>
      <h1 className="text-[34px] font-semibold tracking-[-0.02em] leading-none mb-2">
        {open.length + overdue.length} open
      </h1>
      <p className="text-[13px] text-[var(--muted)] mb-8">
        {overdue.length} overdue · {done.length} completed
      </p>

      <div className="space-y-5">
        {overdue.length > 0 && (
          <Group title="Overdue" accent="danger">
            {overdue.map((a) => (
              <Row key={a.id} action={a} />
            ))}
          </Group>
        )}
        {open.length > 0 && (
          <Group title="Open">
            {open.map((a) => (
              <Row key={a.id} action={a} />
            ))}
          </Group>
        )}
        {done.length > 0 && (
          <Group title="Completed" muted>
            {done.map((a) => (
              <Row key={a.id} action={a} />
            ))}
          </Group>
        )}
      </div>

      {actions.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-[14px] font-medium">No actions yet</div>
          <div className="text-[12px] text-[var(--muted)] mt-1">
            Actions can be added from any account page.
          </div>
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  children,
  accent,
  muted,
}: {
  title: string;
  children: React.ReactNode;
  accent?: "danger";
  muted?: boolean;
}) {
  const dot = accent === "danger" ? "bg-[var(--neg)]" : "bg-[var(--muted-2)]";
  return (
    <section className={`card overflow-hidden ${muted ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2 px-4 py-[10px] border-b border-[var(--line-2)]">
        <span className={`tag-dot ${dot}`} />
        <h2 className="label">{title}</h2>
      </div>
      <div className="divide-y divide-[var(--line-2)]">{children}</div>
    </section>
  );
}

function Row({
  action,
}: {
  action: {
    id: string;
    title: string;
    detail: string | null;
    dueAt: Date | null;
    done: boolean;
    account: { id: string; name: string } | null;
  };
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition">
      <div className="mt-0.5">
        <ToggleAction actionId={action.id} done={action.done} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`text-[13.5px] ${
            action.done
              ? "line-through text-[var(--muted-2)]"
              : "text-[var(--ink)] font-medium"
          }`}
        >
          {action.title}
        </div>
        {action.detail && !action.done && (
          <div className="text-[12px] text-[var(--muted)] mt-0.5">{action.detail}</div>
        )}
        <div className="text-[11.5px] text-[var(--muted)] mt-1 flex items-center gap-2">
          {action.account && (
            <>
              <Link
                href={`/accounts/${action.account.id}`}
                className="hover:text-[var(--accent-ink)] transition"
              >
                {action.account.name}
              </Link>
              {action.dueAt && <span className="text-[var(--line)]">·</span>}
            </>
          )}
          {action.dueAt && <span>{relative(action.dueAt)}</span>}
        </div>
      </div>
    </div>
  );
}
