import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Database, Json } from "@/types/supabase";

type ProfileType = Database["public"]["Tables"]["profiles"]["Row"]["type"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

const PROFILE_TYPES = new Set(["service_pro", "food", "shop", "lodging", "creator"]);

export function json(data: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function legacyNumericId(value: string | null | undefined) {
  const source = String(value || "");
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return hash || 1;
}

function asRecord(value: Json | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

export function slugify(value: string) {
  return String(value || "perfil")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "perfil";
}

export function normalizeType(value: unknown): ProfileType {
  const type = String(value || "service_pro").trim();
  return PROFILE_TYPES.has(type) ? (type as ProfileType) : "service_pro";
}

function filterFromType(type: unknown) {
  const value = String(type || "").toLowerCase();
  if (value === "shop") return "promocoes";
  if (value === "lodging") return "perto";
  if (value === "creator") return "novidades";
  return "destaques";
}

export async function buildUniqueSlug(
  supabase: ReturnType<typeof getSupabaseServerClient> extends Promise<infer T> ? T : never,
  baseSlug: string,
  userId?: string
) {
  const base = slugify(baseSlug);
  let candidate = base;
  const profilesTable = supabase.from("profiles") as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        limit: (
          count: number
        ) => {
          maybeSingle: () => Promise<{
            data: Pick<ProfileRow, "id" | "user_id"> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

  for (let index = 2; index < 60; index += 1) {
    const query = profilesTable.select("id,user_id").eq("slug", candidate).limit(1);
    const { data, error } = await query.maybeSingle();

    if (error || !data || (userId && data.user_id === userId)) {
      return candidate;
    }

    candidate = `${base}-${index}`;
  }

  return `${base}-${Date.now().toString(36)}`;
}

export function mapUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}, row?: Pick<UserRow, "account_type" | "email" | "name"> | null) {
  const metadata = user.user_metadata || {};

  return {
    id: legacyNumericId(user.id),
    remote_id: user.id,
    uuid: user.id,
    email: row?.email || user.email || "",
    name: String(row?.name || metadata.name || metadata.full_name || user.email || "Utilizador"),
    account_type: String(row?.account_type || metadata.account_type || "professional")
  };
}

export async function getPublicUserForAuthUser(
  supabase: ReturnType<typeof getSupabaseServerClient> extends Promise<infer T> ? T : never,
  user: { id: string }
) {
  const usersTable = supabase.from("users") as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: UserRow | null; error: { message: string } | null }>;
      };
    };
  };
  const { data } = await usersTable.select("*").eq("id", user.id).maybeSingle();

  return data;
}

export function mapProfile(row: ProfileRow) {
  const data = asRecord(row.data);

  return {
    id: legacyNumericId(row.id),
    remote_id: row.id,
    remoteId: row.id,
    user_id: legacyNumericId(row.user_id),
    user_uuid: row.user_id,
    userUuid: row.user_id,
    slug: row.slug,
    name: row.name,
    type: row.type,
    filter: data.filter || filterFromType(row.type),
    is_published: row.is_published,
    created_at: row.created_at,
    updated_at: row.updated_at,
    data: {
      ...data,
      name: data.name || row.name,
      type: data.type || row.type,
      location: data.location || row.location || "",
      about: data.about || row.bio || "",
      avatar: data.avatar || row.avatar_url || "",
      cover: data.cover || row.cover_url || ""
    }
  };
}

export async function ensureProfileForUser(
  supabase: ReturnType<typeof getSupabaseServerClient> extends Promise<infer T> ? T : never,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
) {
  const metadata = user.user_metadata || {};
  const profilesTable = supabase.from("profiles") as unknown as {
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
    insert: (value: Database["public"]["Tables"]["profiles"]["Insert"]) => {
      select: (columns: string) => {
        single: () => Promise<{ data: ProfileRow | null; error: { message: string } | null }>;
      };
    };
  };
  const existing = await profilesTable
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.data) {
    return existing.data;
  }

  const name = String(metadata.name || metadata.full_name || user.email || "Perfil").trim() || "Perfil";
  const slug = await buildUniqueSlug(supabase, name, user.id);
  const { data } = await profilesTable
    .insert({
      user_id: user.id,
      slug,
      name,
      type: "service_pro",
      is_published: true,
      data: {
        name,
        type: "service_pro",
        category: "Servicos",
        role: "Servicos",
        location: "",
        about: "",
        tabs: [
          { id: "sobre", type: "sobre", label: "Sobre", enabled: true },
          { id: "servicos", type: "servicos", label: "Servicos", enabled: true },
          { id: "galeria", type: "galeria", label: "Galeria", enabled: true },
          { id: "horario", type: "horario", label: "Horario", enabled: true },
          { id: "parcerias", type: "parcerias", label: "Parcerias", enabled: true }
        ]
      }
    })
    .select("*")
    .single();

  return data;
}

export async function getCurrentSupabaseUser() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { supabase, user: null };
  }

  return { supabase, user: data.user };
}
