import { getSupabaseServerClient } from "@/lib/supabase";
import { json } from "@/features/legacy-vore/api";

export async function POST() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();

  return json({ ok: true });
}
