import {
  ensureProfileForUser,
  getCurrentSupabaseUser,
  getPublicUserForAuthUser,
  json,
  mapProfile,
  mapUser
} from "@/features/legacy-vore/api";

export async function GET() {
  const { supabase, user } = await getCurrentSupabaseUser();

  if (!user) {
    return json({ ok: true, authenticated: false, user: null });
  }

  const publicUser = await getPublicUserForAuthUser(supabase, user);
  const accountType = String(publicUser?.account_type || user.user_metadata?.account_type || "professional");
  const profile = accountType === "common" ? null : await ensureProfileForUser(supabase, user);

  return json({
    ok: true,
    authenticated: true,
    user: mapUser(user, publicUser),
    profile: profile ? mapProfile(profile) : null
  });
}
