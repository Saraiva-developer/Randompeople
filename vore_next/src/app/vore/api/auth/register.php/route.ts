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
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const accountTypeRaw = String(body.account_type || "professional").trim();
  const accountType = accountTypeRaw === "common" ? "common" : "professional";

  if (!name || !email || !password) {
    return json({ ok: false, error: "Preenche nome, email e password." }, { status: 400 });
  }

  if (password.length < 6) {
    return json({ ok: false, error: "A password deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, account_type: accountType } }
  });

  if (error || !data.user) {
    return json({ ok: false, error: error?.message || "Falha no registo." }, { status: 400 });
  }

  const publicUser = await getPublicUserForAuthUser(supabase, data.user);
  const profile = accountType === "common" ? null : await ensureProfileForUser(supabase, data.user);

  return json({
    ok: true,
    authenticated: true,
    user: mapUser(data.user, publicUser),
    profile: profile ? mapProfile(profile) : null
  });
}
