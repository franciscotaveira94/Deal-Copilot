import { NextRequest, NextResponse } from "next/server";
import { postOverdueAlert } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const { kind, url } = (await req.json()) as { kind: "gchat" | "slack"; url: string };
  if (!url) return NextResponse.json({ ok: false, error: "No URL" }, { status: 400 });
  const ok = await postOverdueAlert(url, kind, {
    accountName: "Test",
    accountId: "test",
    orgName: "Deal Copilot",
    orgRole: "test",
    entryTitle: "Webhook test",
    hoursOverdue: 0,
  });
  return NextResponse.json({ ok });
}
