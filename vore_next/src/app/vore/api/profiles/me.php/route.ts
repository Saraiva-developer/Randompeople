import {
  getCurrentSupabaseUser,
  json,
  mapProfile,
  normalizeType
} from "@/features/legacy-vore/api";
import type { Database, Json } from "@/types/supabase";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

function profilesTableFor(supabase: Awaited<ReturnType<typeof getCurrentSupabaseUser>>["supabase"]) {
  return supabase.from("profiles") as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options: { ascending: boolean }
        ) => {
          limit: (count: number) => {
            maybeSingle: () => Promise<{ data: ProfileRow | null; error: { message: string } | null }>;
          };
        };
      };
    };
    update: (value: ProfileUpdate) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => {
          single: () => Promise<{ data: ProfileRow | null; error: { message: string } | null }>;
        };
      };
    };
  };
}

export async function GET() {
  const { supabase, user } = await getCurrentSupabaseUser();

  if (!user) {
    return json({ ok: false, error: "Login necessario." }, { status: 401 });
  }

  const existing = await profilesTableFor(supabase)
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return json({ ok: false, error: existing.error.message }, { status: 500 });
  }

  return json({ ok: true, profile: existing.data ? mapProfile(existing.data) : null });
}

export async function PUT(request: Request) {
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
  const isPublished =
    typeof body.is_published === "boolean" ? body.is_published : undefined;
  const profilesTable = profilesTableFor(supabase);

  const existing = await profilesTable
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error || !existing.data) {
    return json({ ok: false, error: "Perfil nao encontrado." }, { status: 404 });
  }

  const { data: profile, error } = await profilesTable
    .update({
      name,
      type,
      location: String(data.location || ""),
      bio: String(data.about || ""),
      avatar_url: String(data.avatar || ""),
      cover_url: String(data.cover || ""),
      ...(typeof isPublished === "boolean" ? { is_published: isPublished } : {}),
      data: { ...data, name, type },
      updated_at: new Date().toISOString()
    })
    .eq("id", existing.data.id)
    .select("*")
    .single();

  if (error || !profile) {
    return json({ ok: false, error: error?.message || "Falha ao guardar perfil." }, { status: 500 });
  }

  return json({ ok: true, profile: mapProfile(profile) });
}
