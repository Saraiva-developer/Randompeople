import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/session";
import { getCurrentOwnedProfile } from "@/features/vore-shell/queries";

export default async function OwnProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?message=Inicia sessao para veres o teu perfil.");
  }

  const profile = await getCurrentOwnedProfile();

  if (!profile) {
    redirect("/edit-profile");
  }

  redirect(`/profile/${profile.slug}`);
}
