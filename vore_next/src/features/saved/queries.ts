import { getCurrentUser } from "@/features/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { ProfileRow } from "@/features/vore-shell/queries";

export async function getSavedProfiles(): Promise<ProfileRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("saved_profiles")
    .select("profile_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data as Array<{ profile_id: string | null }> | null) || [];
  const ids = rows.map((row) => row.profile_id).filter((id): id is string => !!id);
  if (!ids.length) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids)
    .eq("is_published", true);

  const byId = new Map((profiles as ProfileRow[] | null)?.map((p) => [p.id, p]) || []);
  // Keep the saved-at ordering rather than the profiles table ordering.
  return ids.map((id) => byId.get(id)).filter((p): p is ProfileRow => !!p);
}

export async function isProfileSaved(profileId: string) {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("saved_profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("profile_id", profileId)
    .maybeSingle();

  return !!data;
}
