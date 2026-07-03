import { SettingsClient } from "@/features/settings/client";
import { getCurrentAccount, getCurrentOwnedProfile } from "@/features/vore-shell/queries";

export default async function SettingsPage() {
  const [account, profile] = await Promise.all([
    getCurrentAccount(),
    getCurrentOwnedProfile()
  ]);

  return <SettingsClient account={account} profile={profile} />;
}
