/**
 * Fire a Google Chat / Slack webhook alert for overdue replies.
 * Safe to call even if no webhook is configured — it's a no-op.
 */

type OverdueAlert = {
  accountName: string;
  accountId: string;
  orgName: string;
  orgRole: string;
  entryTitle: string;
  hoursOverdue: number;
};

export async function postOverdueAlert(
  webhookUrl: string | null,
  kind: "gchat" | "slack",
  alert: OverdueAlert
): Promise<boolean> {
  if (!webhookUrl) return false;

  const lines = [
    `⏰ *Overdue reply* on *${alert.accountName}*`,
    `${alert.orgName} (${alert.orgRole}) hasn't replied to: _${alert.entryTitle}_`,
    `${alert.hoursOverdue}h past SLA.`,
  ];

  try {
    if (kind === "gchat") {
      // Google Chat incoming webhook accepts a simple { text } payload
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ text: lines.join("\n") }),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    }
    // Slack incoming webhook
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch (e) {
    console.warn("webhook post failed", kind, e);
    return false;
  }
}
