/**
 * Email-thread follow-up tracking.
 *
 * Every timeline entry can have:
 *   - direction: "outbound" (I sent) | "inbound" (I received) | null
 *   - awaitingReplyFromId: the org we're waiting to hear from
 *   - awaitingReplyDueAt: when the SLA runs out
 *   - awaitedReplyResolvedAt: auto-set when the counterparty finally replies
 *
 * When you paste an outbound email, the system starts a timer.
 * When the counterparty pastes an inbound reply, the timer auto-clears.
 * If the timer runs out, it shows in the Today view + fires notifications.
 */

export type Direction = "outbound" | "inbound" | null;

/** Returns the SLA in hours for a given org role. */
export function slaHoursForRole(
  role: string,
  settings: {
    slaDistributorHours: number;
    slaPartnerHours: number;
    slaCustomerHours: number;
    slaOtherHours: number;
  }
): number {
  switch (role) {
    case "distributor":
      return settings.slaDistributorHours;
    case "partner":
      return settings.slaPartnerHours;
    case "customer":
      return settings.slaCustomerHours;
    default:
      return settings.slaOtherHours;
  }
}

/** Compute when the reply is due, given sent time + SLA. */
export function dueAtFromSla(
  sentAt: Date,
  slaHours: number
): Date {
  return new Date(sentAt.getTime() + slaHours * 3600 * 1000);
}

export function isOverdue(dueAt: Date | string | null, now = new Date()): boolean {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() < now.getTime();
}

/** Human-friendly time-remaining (or overdue) string. */
export function formatTimeTo(dueAt: Date | string | null, now = new Date()): string {
  if (!dueAt) return "—";
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const diffMs = due.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / (3600 * 1000));
  const mins = Math.floor((abs % (3600 * 1000)) / (60 * 1000));
  const days = Math.floor(hours / 24);

  const label = (() => {
    if (days >= 1) return `${days}d ${hours % 24}h`;
    if (hours >= 1) return `${hours}h ${mins}m`;
    return `${mins}m`;
  })();
  return diffMs >= 0 ? `in ${label}` : `${label} overdue`;
}
