"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Bell, AlertCircle } from "lucide-react";

type Initial = {
  googleChatWebhookUrl: string;
  slackWebhookUrl: string;
  slaDistributorHours: number;
  slaPartnerHours: number;
  slaCustomerHours: number;
  slaOtherHours: number;
  notificationsEnabled: boolean;
};

export function SettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [form, setForm] = useState<Initial>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<"gchat" | "slack" | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );

  async function save() {
    setBusy(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    router.refresh();
  }

  async function test(kind: "gchat" | "slack") {
    setTesting(kind);
    setTestResult(null);
    const url = kind === "gchat" ? form.googleChatWebhookUrl : form.slackWebhookUrl;
    const res = await fetch("/api/settings/test-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, url }),
    });
    const data = await res.json();
    setTesting(null);
    setTestResult(data.ok ? `${kind} test sent ✓` : `${kind} failed: ${data.error || "unknown"}`);
    setTimeout(() => setTestResult(null), 3500);
  }

  async function requestNotif() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      new Notification("Deal Copilot notifications enabled", {
        body: "You'll be alerted here when replies go overdue.",
        icon: "/favicon.ico",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* SLAs */}
      <section className="card p-5">
        <h2 className="text-[14px] font-semibold mb-1">Follow-up SLAs</h2>
        <p className="text-[12px] text-[var(--muted)] mb-4">
          How long to wait for a reply before flagging it overdue. Default per role; you can
          override per organisation later.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <SlaField
            label="Distributor"
            hint="Transactional — should move fast"
            value={form.slaDistributorHours}
            onChange={(v) => setForm({ ...form, slaDistributorHours: v })}
          />
          <SlaField
            label="Partner"
            hint="Implementation / channel"
            value={form.slaPartnerHours}
            onChange={(v) => setForm({ ...form, slaPartnerHours: v })}
          />
          <SlaField
            label="Customer"
            hint="End buyer — gets more rope"
            value={form.slaCustomerHours}
            onChange={(v) => setForm({ ...form, slaCustomerHours: v })}
          />
          <SlaField
            label="Other"
            hint="Fallback"
            value={form.slaOtherHours}
            onChange={(v) => setForm({ ...form, slaOtherHours: v })}
          />
        </div>
      </section>

      {/* Browser notifications */}
      <section className="card p-5">
        <h2 className="text-[14px] font-semibold mb-1">macOS notifications</h2>
        <p className="text-[12px] text-[var(--muted)] mb-4">
          Native browser notifications when a reply goes overdue. Requires the app to be open in a
          tab.
        </p>
        {notifPerm === "unsupported" ? (
          <div className="text-[12.5px] text-[var(--muted)]">Not supported in this browser.</div>
        ) : notifPerm === "granted" ? (
          <div className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--pos)] font-medium">
            <Check className="w-3.5 h-3.5" />
            Notifications enabled
          </div>
        ) : (
          <button onClick={requestNotif} className="btn btn-secondary btn-sm">
            <Bell className="w-3.5 h-3.5" />
            Enable notifications
          </button>
        )}
      </section>

      {/* Google Chat webhook */}
      <section className="card p-5">
        <h2 className="text-[14px] font-semibold mb-1">Google Chat alerts</h2>
        <p className="text-[12px] text-[var(--muted)] mb-4">
          Paste an{" "}
          <a
            href="https://developers.google.com/chat/how-tos/webhooks"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--accent-ink)] underline"
          >
            incoming webhook URL
          </a>{" "}
          from a Chat space (space → Apps & integrations → Webhooks). We&apos;ll post overdue
          alerts there, once per entry.
        </p>
        <div className="flex gap-2">
          <input
            value={form.googleChatWebhookUrl}
            onChange={(e) => setForm({ ...form, googleChatWebhookUrl: e.target.value })}
            placeholder="https://chat.googleapis.com/v1/spaces/..."
            className="input flex-1 !text-[12.5px] font-mono"
          />
          <button
            onClick={() => test("gchat")}
            disabled={!form.googleChatWebhookUrl.trim() || testing === "gchat"}
            className="btn btn-secondary"
          >
            {testing === "gchat" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Test"}
          </button>
        </div>
      </section>

      {/* Slack webhook */}
      <section className="card p-5">
        <h2 className="text-[14px] font-semibold mb-1">Slack alerts</h2>
        <p className="text-[12px] text-[var(--muted)] mb-4">
          Slack incoming webhook URL (app.slack.com → Apps → Incoming Webhooks).
        </p>
        <div className="flex gap-2">
          <input
            value={form.slackWebhookUrl}
            onChange={(e) => setForm({ ...form, slackWebhookUrl: e.target.value })}
            placeholder="https://hooks.slack.com/services/..."
            className="input flex-1 !text-[12.5px] font-mono"
          />
          <button
            onClick={() => test("slack")}
            disabled={!form.slackWebhookUrl.trim() || testing === "slack"}
            className="btn btn-secondary"
          >
            {testing === "slack" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Test"}
          </button>
        </div>
      </section>

      {testResult && (
        <div
          className={`px-3 py-2 text-[12.5px] rounded-md flex items-center gap-2 ${
            testResult.includes("✓")
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-rose-50 text-rose-700 border border-rose-100"
          }`}
        >
          {testResult.includes("✓") ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {testResult}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 sticky bottom-4 bg-white/80 backdrop-blur-sm p-2 -mx-2 rounded-lg">
        {saved && (
          <span className="text-[12px] text-[var(--pos)] flex items-center gap-1">
            <Check className="w-3 h-3" />
            Saved
          </span>
        )}
        <button onClick={save} disabled={busy} className="btn btn-primary btn-lg">
          {busy ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Save settings"
          )}
        </button>
      </div>
    </div>
  );
}

function SlaField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold text-[var(--ink-3)] mb-1 tracking-wide">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="input !w-[90px] tabular-nums"
        />
        <span className="text-[11.5px] text-[var(--muted)]">hours</span>
      </div>
      <div className="text-[10.5px] text-[var(--muted-2)] mt-0.5">{hint}</div>
    </label>
  );
}
