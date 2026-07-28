import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/session";
import { NotificationsClient } from "@/features/notifications/client";
import { getPublishedProfiles } from "@/features/vore-shell/queries";

export default async function NotificationsPage() {
  const [user, profiles] = await Promise.all([
    getCurrentUser(),
    getPublishedProfiles(160)
  ]);

  if (!user) {
    redirect("/login?message=Inicia sessao para veres as notificacoes.");
  }

  return (
    <NotificationsClient
      user={user ? { id: user.id, email: user.email ?? null } : null}
      profiles={profiles}
    />
  );
}
