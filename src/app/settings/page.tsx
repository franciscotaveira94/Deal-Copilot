import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getSettings();

  return (
    <div className="max-w-2xl mx-auto px-10 py-10">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
        Settings
      </div>
      <h1 className="text-[32px] font-semibold tracking-[-0.02em] leading-tight mb-6">
        Preferences
      </h1>

      <SettingsForm
        initial={{
          googleChatWebhookUrl: s.googleChatWebhookUrl ?? "",
          slackWebhookUrl: s.slackWebhookUrl ?? "",
          slaDistributorHours: s.slaDistributorHours,
          slaPartnerHours: s.slaPartnerHours,
          slaCustomerHours: s.slaCustomerHours,
          slaOtherHours: s.slaOtherHours,
          notificationsEnabled: s.notificationsEnabled,
        }}
      />
    </div>
  );
}
