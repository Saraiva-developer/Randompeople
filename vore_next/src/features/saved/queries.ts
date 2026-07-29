import { getCurrentUser } from "@/features/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { ProfileRow } from "@/features/vore-shell/queries";
import type { SavedItemEntry, SavedMediaEntry } from "@/features/saved/entries";

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

type SavedEntryRow = {
  entry_key: string;
  kind: "media" | "item";
  data: Record<string, unknown> | null;
  created_at: string;
};

function str(value: unknown) {
  return String(value ?? "").trim();
}

export async function getSavedEntries() {
  const user = await getCurrentUser();
  if (!user) return { media: [] as SavedMediaEntry[], items: [] as SavedItemEntry[] };

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("saved_entries")
    .select("entry_key, kind, data, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(300);

  const rows = (data as SavedEntryRow[] | null) || [];
  const media: SavedMediaEntry[] = [];
  const items: SavedItemEntry[] = [];

  rows.forEach((row) => {
    const payload = row.data && typeof row.data === "object" ? row.data : {};
    if (row.kind === "media") {
      media.push({
        key: row.entry_key,
        type: str(payload.type) === "video" ? "video" : "photo",
        uri: str(payload.uri),
        profileName: str(payload.profileName),
        profileSlug: str(payload.profileSlug),
        savedAt: row.created_at
      });
      return;
    }
    items.push({
      key: row.entry_key,
      kind: str(payload.kind),
      section: str(payload.section),
      name: str(payload.name),
      note: str(payload.note),
      price: str(payload.price),
      oldPrice: str(payload.oldPrice),
      image: str(payload.image),
      profileName: str(payload.profileName),
      profileSlug: str(payload.profileSlug),
      savedAt: row.created_at
    });
  });

  return { media: media.filter((entry) => entry.uri), items };
}

/** Entry keys the viewer already saved for this profile, for initial button state. */
export async function getSavedEntryKeysForProfile(profileSlug: string) {
  const user = await getCurrentUser();
  if (!user || !profileSlug) return [] as string[];

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("saved_entries")
    .select("entry_key")
    .eq("user_id", user.id)
    .limit(300);

  const rows = (data as Array<{ entry_key: string }> | null) || [];
  const needle = `:${profileSlug.toLowerCase()}:`;
  return rows.map((row) => row.entry_key).filter((key) => key.toLowerCase().includes(needle));
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
