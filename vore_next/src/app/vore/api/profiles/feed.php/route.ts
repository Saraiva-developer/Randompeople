import { json, mapProfile } from "@/features/legacy-vore/api";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 120), 1), 200);
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return json({ ok: false, error: error.message }, { status: 500 });
  }

  const profiles = (data || []).map(mapProfile);

  return json({ ok: true, profiles, count: profiles.length });
}
