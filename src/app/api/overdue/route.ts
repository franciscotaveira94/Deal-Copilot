import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { postOverdueAlert } from "@/lib/notify";

/**
 * Returns the list of overdue-reply entries, AND fires webhook notifications
 * for any that haven't been notified yet (marks them with overdueNotifiedAt).
 * Called by the client every 60s while the app is open.
 */
export async function GET() {
  const now = new Date();
  const entries = await prisma.timelineEntry.findMany({
    where: {
      awaitingReplyDueAt: { lt: now },
      awaitedReplyResolvedAt: null,
      awaitingReplyFromId: { not: null },
    },
    include: {
      account: { select: { id: true, name: true } },
      awaitingReplyFrom: { select: { id: true, name: true } },
    },
    orderBy: { awaitingReplyDueAt: "asc" },
  });

  // Fire webhooks for ones not yet notified
  const settings = await getSettings();
  const fresh = entries.filter((e) => !e.overdueNotifiedAt);

  if (fresh.length > 0 && (settings.googleChatWebhookUrl || settings.slackWebhookUrl)) {
    for (const e of fresh) {
      if (!e.awaitingReplyFrom) continue;
      const hoursOverdue = Math.floor(
        (now.getTime() - new Date(e.awaitingReplyDueAt!).getTime()) / (3600 * 1000)
      );
      const partyRole =
        (
          await prisma.dealParty.findFirst({
            where: {
              accountId: e.accountId,
              organisationId: e.awaitingReplyFromId!,
            },
            select: { role: true },
          })
        )?.role || "party";

      const alert = {
        accountName: e.account.name,
        accountId: e.account.id,
        orgName: e.awaitingReplyFrom.name,
        orgRole: partyRole,
        entryTitle: e.title,
        hoursOverdue,
      };
      await postOverdueAlert(settings.googleChatWebhookUrl, "gchat", alert);
      await postOverdueAlert(settings.slackWebhookUrl, "slack", alert);
    }
    // Mark all as notified
    await prisma.timelineEntry.updateMany({
      where: { id: { in: fresh.map((e) => e.id) } },
      data: { overdueNotifiedAt: new Date() },
    });
  }

  return NextResponse.json({
    count: entries.length,
    entries: entries.map((e) => ({
      id: e.id,
      accountId: e.accountId,
      accountName: e.account.name,
      orgName: e.awaitingReplyFrom?.name,
      title: e.title,
      dueAt: e.awaitingReplyDueAt,
    })),
  });
}
