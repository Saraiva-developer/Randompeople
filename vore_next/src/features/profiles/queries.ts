import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Database } from "@/types/supabase";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const getProfileByUserId = cache(async (userId: string) => {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as ProfileRow | null;
});

export const getPublicProfileBySlug = cache(async (slug: string) => {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("*").eq("slug", slug).maybeSingle();

  return data as ProfileRow | null;
});
