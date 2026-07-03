import { cache } from "react";
import { getCurrentUser } from "@/features/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Database } from "@/types/supabase";

export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const getCurrentAccount = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data as UserRow | null;
});

export const getCurrentOwnedProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as ProfileRow | null;
});

export const getPublishedProfiles = cache(async (limit = 18) => {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data || []) as ProfileRow[];
});
