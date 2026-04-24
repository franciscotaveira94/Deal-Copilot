import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const s = await getSettings();
  return NextResponse.json({ settings: s });
}

export async function PATCH(req: NextRequest) {
  await getSettings(); // ensure row exists
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of [
    "googleChatWebhookUrl",
    "slackWebhookUrl",
    "slaDistributorHours",
    "slaPartnerHours",
    "slaCustomerHours",
    "slaOtherHours",
    "notificationsEnabled",
  ]) {
    if (k in body) data[k] = body[k];
  }
  const s = await prisma.settings.update({
    where: { id: "default" },
    data,
  });
  return NextResponse.json({ ok: true, settings: s });
}
