import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/session";
import { SettingsClient } from "@/features/settings/client";
import { getCurrentAccount, getCurrentOwnedProfile } from "@/features/vore-shell/queries";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?message=Inicia sessao para acederes as definicoes.");
  }

  const [account, profile] = await Promise.all([
    getCurrentAccount(),
    getCurrentOwnedProfile()
  ]);

  return <SettingsClient account={account} profile={profile} />;
}
