"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/features/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function toggleSavedProfileAction(profileId: string, nextSaved: boolean) {
  const user = await getCurrentUser();
  if (!user || !profileId) return { ok: false as const };

  const supabase = await getSupabaseServerClient();

  if (nextSaved) {
    const savedTable = supabase.from("saved_profiles") as unknown as {
      insert: (values: {
        user_id: string;
        profile_id: string;
        profile_ref: string;
      }) => Promise<{ error: { message: string } | null }>;
    };
    // profile_ref is still NOT NULL until migration 0008's follow-up drops it,
    // so it is written alongside the real FK.
    const { error } = await savedTable.insert({
      user_id: user.id,
      profile_id: profileId,
      profile_ref: profileId
    });
    if (error && !/duplicate key/i.test(error.message)) return { ok: false as const };
  } else {
    const { error } = await supabase
      .from("saved_profiles")
      .delete()
      .eq("user_id", user.id)
      .eq("profile_id", profileId);
    if (error) return { ok: false as const };
  }

  revalidatePath("/profile");
  return { ok: true as const };
}
