import { redirect } from "next/navigation";
import { PersonalProfileClient } from "@/features/profiles/personal-profile-client";
import {
  getPendingPermissionRequests,
  getShareConversations
} from "@/features/recommendations/queries";
import { getSavedEntries, getSavedProfiles } from "@/features/saved/queries";
import {
  getCurrentAccount,
  getCurrentOwnedProfile,
  getPublishedProfiles
} from "@/features/vore-shell/queries";

export default async function OwnProfilePage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login?message=Inicia sessao para veres o teu perfil.");
  }

  // Personal ("common") accounts have no public profile of their own; like the
  // native app they get the saved/recent/alerts screen instead.
  if (account.account_type === "common") {
    const [savedProfiles, profiles, conversations, permissionRequests, savedEntries] =
      await Promise.all([
        getSavedProfiles(),
        getPublishedProfiles(160),
        getShareConversations(),
        getPendingPermissionRequests(),
        getSavedEntries()
      ]);

    return (
      <PersonalProfileClient
        name={account.name || ""}
        email={account.email}
        savedProfiles={savedProfiles}
        profiles={profiles}
        conversations={conversations}
        permissionRequests={permissionRequests}
        savedMedia={savedEntries.media}
        savedItems={savedEntries.items}
      />
    );
  }

  const profile = await getCurrentOwnedProfile();

  if (!profile) {
    redirect("/edit-profile");
  }

  redirect(`/profile/${profile.slug}`);
}
