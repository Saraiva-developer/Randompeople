import {
  buildUniqueSlug,
  getCurrentSupabaseUser,
  json,
  mapProfile,
  normalizeType,
  slugify
} from "@/features/legacy-vore/api";
import type { Database, Json } from "@/types/supabase";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function POST(request: Request) {
  const { supabase, user } = await getCurrentSupabaseUser();

  if (!user) {
    return json({ ok: false, error: "Login necessario." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const data = (body.data && typeof body.data === "object" ? body.data : {}) as Record<
    string,
    Json | undefined
  >;
  const name = String(body.name || data.name || "Perfil").trim() || "Perfil";
  const type = normalizeType(body.type || data.type);
  const slug = await buildUniqueSlug(supabase, String(body.slug || name), user.id);
  const profilesTable = supabase.from("profiles") as unknown as {
    insert: (value: ProfileInsert) => {
      select: (columns: string) => {
        single: () => Promise<{ data: ProfileRow | null; error: { message: string } | null }>;
      };
    };
  };

  const { data: profile, error } = await profilesTable
    .insert({
      user_id: user.id,
      slug,
      name,
      type,
      is_published: true,
      location: String(data.location || ""),
      bio: String(data.about || ""),
      avatar_url: String(data.avatar || ""),
      cover_url: String(data.cover || ""),
      data: { ...data, name, type }
    })
    .select("*")
    .single();

  if (error || !profile) {
    return json({ ok: false, error: error?.message || "Falha ao criar perfil." }, { status: 500 });
  }

  return json({ ok: true, profile: mapProfile(profile) });
}
