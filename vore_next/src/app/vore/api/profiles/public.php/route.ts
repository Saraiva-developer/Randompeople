import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { json, mapProfile } from "@/features/legacy-vore/api";
import type { Database } from "@/types/supabase";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = String(url.searchParams.get("slug") || "").trim().toLowerCase();

  if (!slug) {
    return json({ ok: false, error: "Slug obrigatorio." }, { status: 422 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await (admin.from("profiles") as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: ProfileRow | null; error: { message: string } | null }>;
      };
    };
  })
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return json({ ok: false, error: "Perfil nao encontrado." }, { status: 404 });
  }

  if (!data.is_published) {
    return json({ ok: false, error: "Perfil nao publicado." }, { status: 403 });
  }

  return json({ ok: true, profile: mapProfile(data) });
}
