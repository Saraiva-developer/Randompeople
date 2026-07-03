import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentSupabaseUser, json } from "@/features/legacy-vore/api";
import type { Json } from "@/types/supabase";

function table(name: string) {
  const admin = getSupabaseAdminClient();
  return (admin.from as unknown as (table: string) => any)(name);
}

function savedProfilesTable() {
  return table("saved_profiles");
}

function savedEntriesTable() {
  return table("saved_entries");
}

async function listSavedProfileRefs(userId: string) {
  const { data, error } = await savedProfilesTable()
    .select("profile_ref")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "Falha ao carregar guardados.");

  return (data || []).map((row: { profile_ref: string }) => String(row.profile_ref || "")).filter(Boolean);
}

async function listSavedEntries(userId: string) {
  const { data, error } = await savedEntriesTable()
    .select("kind,entry_key,data,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "Falha ao carregar guardados.");

  const media: Json[] = [];
  const items: Json[] = [];

  (data || []).forEach((row: { kind: string; entry_key: string; data: Json }) => {
    const payload = row.data && typeof row.data === "object" && !Array.isArray(row.data)
      ? { key: row.entry_key, ...row.data }
      : { key: row.entry_key };

    if (row.kind === "media") media.push(payload);
    if (row.kind === "item") items.push(payload);
  });

  return { saved_media: media, saved_items: items };
}

async function savedPayload(userId: string) {
  const [savedProfileIds, entries] = await Promise.all([
    listSavedProfileRefs(userId),
    listSavedEntries(userId).catch(() => ({ saved_media: [], saved_items: [] }))
  ]);

  return {
    saved_profile_ids: savedProfileIds,
    ...entries
  };
}

export async function GET() {
  const { user } = await getCurrentSupabaseUser();

  if (!user) {
    return json({ ok: false, error: "Login necessario." }, { status: 401 });
  }

  const payload = await savedPayload(user.id);

  return json({ ok: true, ...payload });
}

export async function POST(request: Request) {
  const { user } = await getCurrentSupabaseUser();

  if (!user) {
    return json({ ok: false, error: "Login necessario." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const kind = String(body.kind || "").trim().toLowerCase();

  if (kind === "media" || kind === "item") {
    const entry = body.entry && typeof body.entry === "object" ? body.entry : {};
    const entryKey = String(body.key || entry.key || "").trim();

    if (!entryKey) {
      return json({ ok: false, error: "key obrigatorio." }, { status: 422 });
    }

    if (entryKey.length > 500) {
      return json({ ok: false, error: "key demasiado longa." }, { status: 422 });
    }

    const saved = body.saved !== false && String(body.saved || "true").toLowerCase() !== "false";

    if (saved) {
      const { error } = await savedEntriesTable()
        .upsert(
          {
            user_id: user.id,
            kind,
            entry_key: entryKey,
            data: entry as Json
          },
          { onConflict: "user_id,kind,entry_key" }
        );

      if (error) return json({ ok: false, error: error.message }, { status: 500 });
    } else {
      const { error } = await savedEntriesTable()
        .delete()
        .eq("user_id", user.id)
        .eq("kind", kind)
        .eq("entry_key", entryKey);

      if (error) return json({ ok: false, error: error.message }, { status: 500 });
    }

    const payload = await savedPayload(user.id);

    return json({ ok: true, ...payload });
  }

  const profileRef = String(body.profile_id || body.profile_ref || "").trim();

  if (!profileRef) {
    return json({ ok: false, error: "profile_id obrigatorio." }, { status: 422 });
  }

  if (profileRef.length > 80) {
    return json({ ok: false, error: "profile_id demasiado longo." }, { status: 422 });
  }

  const saved = body.saved !== false && String(body.saved || "true").toLowerCase() !== "false";

  if (saved) {
    const { error } = await savedProfilesTable()
      .upsert({ user_id: user.id, profile_ref: profileRef }, { onConflict: "user_id,profile_ref" });

    if (error) return json({ ok: false, error: error.message }, { status: 500 });
  } else {
    const { error } = await savedProfilesTable()
      .delete()
      .eq("user_id", user.id)
      .eq("profile_ref", profileRef);

    if (error) return json({ ok: false, error: error.message }, { status: 500 });
  }

  const payload = await savedPayload(user.id);

  return json({ ok: true, ...payload });
}

export const PUT = POST;
export const PATCH = POST;
