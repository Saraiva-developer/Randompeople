import { redirect } from "next/navigation";
import { getCurrentOwnedProfile } from "@/features/vore-shell/queries";

export default async function OwnProfilePage() {
  const profile = await getCurrentOwnedProfile();

  if (!profile) {
    redirect("/edit-profile");
  }

  redirect(`/profile/${profile.slug}`);
}
