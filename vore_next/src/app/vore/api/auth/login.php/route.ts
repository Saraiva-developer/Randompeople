import { getSupabaseServerClient } from "@/lib/supabase";
import {
  ensureProfileForUser,
  getPublicUserForAuthUser,
  json,
  mapProfile,
  mapUser
} from "@/features/legacy-vore/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return json({ ok: false, error: "Preenche email e password." }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return json({ ok: false, error: error?.message || "Falha no login." }, { status: 401 });
  }

  const publicUser = await getPublicUserForAuthUser(supabase, data.user);
  const accountType = String(publicUser?.account_type || data.user.user_metadata?.account_type || "professional");
  const profile = accountType === "common" ? null : await ensureProfileForUser(supabase, data.user);

  return json({
    ok: true,
    authenticated: true,
    user: mapUser(data.user, publicUser),
    profile: profile ? mapProfile(profile) : null
  });
}
