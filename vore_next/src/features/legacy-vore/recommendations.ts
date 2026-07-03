import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/supabase";
import { getCurrentSupabaseUser, legacyNumericId } from "./api";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type RecommendationRow = Database["public"]["Tables"]["recommendations"]["Row"];
type RecommendationInsert = Database["public"]["Tables"]["recommendations"]["Insert"];
type PermissionStatus = Database["public"]["Tables"]["recommendation_permissions"]["Row"]["status"];
type ReceiveMode = Database["public"]["Tables"]["recommendation_settings"]["Row"]["receive_mode"];
type Reaction = Database["public"]["Tables"]["recommendation_reactions"]["Row"]["reaction"];
type ContentType = RecommendationRow["content_type"];

const CONTENT_TYPES = new Set(["profile", "photo", "video", "reel"]);
const REACTIONS = new Set(["like", "fire", "wow", "love"]);
const PERMISSION_STATUSES = new Set(["pending", "approved", "blocked", "rejected"]);
const RECEIVE_MODES = new Set(["all", "approved", "off"]);

function dbTable(name: string) {
  const admin = getSupabaseAdminClient();
  return (admin.from as unknown as (table: string) => any)(name);
}

function asRecord(value: Json | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

function normalizeReceiveMode(value: unknown): ReceiveMode {
  const mode = String(value || "approved").trim().toLowerCase();
  return RECEIVE_MODES.has(mode) ? (mode as ReceiveMode) : "approved";
}

function normalizePermissionStatus(value: unknown): PermissionStatus {
  const status = String(value || "pending").trim().toLowerCase();
  return PERMISSION_STATUSES.has(status) ? (status as PermissionStatus) : "pending";
}

export function normalizeContentType(value: unknown): ContentType {
  const type = String(value || "profile").trim().toLowerCase();
  return CONTENT_TYPES.has(type) ? (type as ContentType) : "profile";
}

export async function requireCommonUser() {
  const { user } = await getCurrentSupabaseUser();

  if (!user) {
    return { error: "Login necessario.", status: 401 as const };
  }

  const { data, error } = await dbTable("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return { error: "Utilizador nao encontrado.", status: 404 as const };
  }

  if (data.account_type !== "common") {
    return { error: "Acesso reservado a conta pessoal.", status: 403 as const };
  }

  return { user: data as UserRow };
}

export async function getRecommendationSettings(userId: string) {
  const { data } = await dbTable("recommendation_settings")
    .select("receive_mode")
    .eq("user_id", userId)
    .maybeSingle();

  return { receive_mode: normalizeReceiveMode(data?.receive_mode) };
}

export async function setRecommendationReceiveMode(userId: string, mode: unknown) {
  const receiveMode = normalizeReceiveMode(mode);
  await dbTable("recommendation_settings")
    .upsert({ user_id: userId, receive_mode: receiveMode }, { onConflict: "user_id" });

  return { receive_mode: receiveMode };
}

export async function resolveCommonUserByEmail(email: string) {
  const safeEmail = String(email || "").trim().toLowerCase();
  if (!safeEmail) return null;

  const { data } = await dbTable("users")
    .select("*")
    .eq("email", safeEmail)
    .eq("account_type", "common")
    .maybeSingle();

  return data as UserRow | null;
}

export async function resolveCommonUserByLegacyId(id: number) {
  if (!Number.isFinite(id) || id <= 0) return null;

  const { data } = await dbTable("users")
    .select("*")
    .eq("account_type", "common")
    .limit(1000);

  return ((data || []) as UserRow[]).find((row) => legacyNumericId(row.id) === id) || null;
}

export async function searchCommonUsers(query: string, currentUserId: string) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];

  const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
  const { data } = await dbTable("users")
    .select("id,name,email,account_type,created_at,updated_at")
    .eq("account_type", "common")
    .neq("id", currentUserId)
    .or(`name.ilike.${pattern},email.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(30);

  return ((data || []) as UserRow[]).map((row) => ({
    id: legacyNumericId(row.id),
    remote_id: row.id,
    name: row.name || "",
    email: row.email || ""
  }));
}

export async function getPermissionStatus(senderUserId: string, receiverUserId: string) {
  const { data } = await dbTable("recommendation_permissions")
    .select("status")
    .eq("user_id", senderUserId)
    .eq("target_user_id", receiverUserId)
    .maybeSingle();

  return data?.status ? normalizePermissionStatus(data.status) : null;
}

export async function upsertPermission(senderUserId: string, receiverUserId: string, status: PermissionStatus) {
  await dbTable("recommendation_permissions")
    .upsert(
      {
        user_id: senderUserId,
        target_user_id: receiverUserId,
        status
      },
      { onConflict: "user_id,target_user_id" }
    );
}

export async function resolveProfile(profileId: unknown, profileSlug: unknown) {
  const remoteId = String(profileId || "").trim();
  const slug = String(profileSlug || "").trim().toLowerCase();

  if (/^[0-9a-f-]{36}$/i.test(remoteId)) {
    const { data } = await dbTable("profiles").select("*").eq("id", remoteId).maybeSingle();
    if (data) return data as ProfileRow;
  }

  if (slug) {
    const { data } = await dbTable("profiles").select("*").eq("slug", slug).maybeSingle();
    if (data) return data as ProfileRow;
  }

  return null;
}

function avatarFromProfileData(profile: ProfileRow | null | undefined) {
  const data = asRecord(profile?.data);
  return String(data.avatar || profile?.avatar_url || "");
}

async function latestProfilesByUserIds(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Map<string, ProfileRow>();

  const { data } = await dbTable("profiles")
    .select("*")
    .in("user_id", ids)
    .order("updated_at", { ascending: false });
  const map = new Map<string, ProfileRow>();

  ((data || []) as ProfileRow[]).forEach((profile) => {
    if (!map.has(profile.user_id)) map.set(profile.user_id, profile);
  });

  return map;
}

async function usersByIds(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Map<string, UserRow>();

  const { data } = await dbTable("users").select("*").in("id", ids);
  const map = new Map<string, UserRow>();

  ((data || []) as UserRow[]).forEach((user) => map.set(user.id, user));

  return map;
}

async function reactionsForRecommendations(recommendationIds: number[], userId?: string) {
  const ids = Array.from(new Set(recommendationIds.filter((id) => Number(id) > 0)));
  if (!ids.length) return new Map<number, Reaction>();

  let query = dbTable("recommendation_reactions")
    .select("recommendation_id,reaction,user_id")
    .in("recommendation_id", ids);

  if (userId) query = query.eq("user_id", userId);

  const { data } = await query;
  const map = new Map<number, Reaction>();

  (data || []).forEach((row: { recommendation_id: number; reaction: Reaction }) => {
    map.set(Number(row.recommendation_id), row.reaction as Reaction);
  });

  return map;
}

export async function listRecommendationsForUser(userId: string) {
  const now = new Date().toISOString();
  const settings = await getRecommendationSettings(userId);
  const [{ data: inboxRows }, { data: sentRows }, { data: pendingRows }] = await Promise.all([
    dbTable("recommendations")
      .select("*")
      .eq("receiver_user_id", userId)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(120),
    dbTable("recommendations")
      .select("*")
      .eq("sender_user_id", userId)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(120),
    dbTable("recommendation_permissions")
      .select("*")
      .eq("target_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(120)
  ]);
  const inbox = (inboxRows || []) as RecommendationRow[];
  const sent = (sentRows || []) as RecommendationRow[];
  const pending = (pendingRows || []) as Database["public"]["Tables"]["recommendation_permissions"]["Row"][];
  const users = await usersByIds([
    ...inbox.map((row) => row.sender_user_id),
    ...sent.map((row) => row.receiver_user_id),
    ...pending.map((row) => row.user_id)
  ]);
  const profiles = await latestProfilesByUserIds(Array.from(users.keys()));
  const viewerReactions = await reactionsForRecommendations(inbox.map((row) => row.id), userId);
  const receiverReactions = await reactionsForRecommendations(sent.map((row) => row.id));

  return {
    settings,
    inbox: inbox.map((row) => {
      const sender = users.get(row.sender_user_id);
      return {
        id: row.id,
        sender: {
          id: legacyNumericId(row.sender_user_id),
          remote_id: row.sender_user_id,
          name: sender?.name || "",
          email: sender?.email || "",
          avatar: avatarFromProfileData(profiles.get(row.sender_user_id))
        },
        profile_id: row.profile_id ? legacyNumericId(row.profile_id) : null,
        profile_slug: row.profile_slug || "",
        source_profile_name: row.source_profile_name || "",
        content_type: row.content_type,
        content_uri: row.content_uri || "",
        reaction: viewerReactions.get(row.id) || "",
        created_at: row.created_at,
        expires_at: row.expires_at
      };
    }),
    sent: sent.map((row) => {
      const receiver = users.get(row.receiver_user_id);
      return {
        id: row.id,
        receiver: {
          id: legacyNumericId(row.receiver_user_id),
          remote_id: row.receiver_user_id,
          name: receiver?.name || "",
          email: receiver?.email || "",
          avatar: avatarFromProfileData(profiles.get(row.receiver_user_id))
        },
        profile_id: row.profile_id ? legacyNumericId(row.profile_id) : null,
        profile_slug: row.profile_slug || "",
        source_profile_name: row.source_profile_name || "",
        content_type: row.content_type,
        content_uri: row.content_uri || "",
        receiver_reaction: receiverReactions.get(row.id) || "",
        created_at: row.created_at,
        expires_at: row.expires_at
      };
    }),
    pending_permissions: pending.map((row) => {
      const sender = users.get(row.user_id);
      return {
        sender_user_id: legacyNumericId(row.user_id),
        sender_user_uuid: row.user_id,
        sender_name: sender?.name || "",
        sender_email: sender?.email || "",
        status: row.status,
        created_at: row.created_at
      };
    })
  };
}

export async function createRecommendation(senderId: string, payload: Record<string, unknown>) {
  const recipientEmail = String(payload.recipient_email || "").trim().toLowerCase();
  const recipientLegacyId = Number(payload.recipient_id || 0);
  const receiver =
    recipientLegacyId > 0
      ? await resolveCommonUserByLegacyId(recipientLegacyId)
      : await resolveCommonUserByEmail(recipientEmail);

  if (!receiver) return { error: "Destinatario nao encontrado.", status: 404 as const };
  if (receiver.id === senderId) return { error: "Nao podes enviar para a tua propria conta.", status: 422 as const };

  const permission = await getPermissionStatus(senderId, receiver.id);
  if (permission === "blocked") {
    return { error: "Nao tens permissao para enviar a este utilizador.", status: 403 as const };
  }
  if (permission !== "approved") {
    await upsertPermission(senderId, receiver.id, "pending");
    return { error: "permission_required", message: "Pedido de permissao enviado.", status: 403 as const };
  }

  const contentType = normalizeContentType(payload.content_type);
  const contentUri = String(payload.content_uri || "").trim();
  let profileId: string | null = null;
  let profileSlug = String(payload.profile_slug || "").trim().toLowerCase() || null;
  let sourceProfileName = String(payload.source_profile_name || "").trim() || null;
  const profile = await resolveProfile(payload.profile_id, profileSlug);

  if (profile) {
    profileId = profile.id;
    profileSlug = profile.slug;
    sourceProfileName = sourceProfileName || profile.name;
  }

  if (contentType !== "profile" && !contentUri) {
    return { error: "content_uri obrigatorio para este tipo.", status: 422 as const };
  }
  if (contentType === "profile" && !profileId && !profileSlug && !sourceProfileName) {
    return { error: "Perfil de origem obrigatorio.", status: 422 as const };
  }

  const insert: RecommendationInsert = {
    sender_user_id: senderId,
    receiver_user_id: receiver.id,
    profile_id: profileId,
    profile_slug: profileSlug,
    source_profile_name: sourceProfileName,
    content_type: contentType,
    content_uri: contentUri || null,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
  const { data, error } = await dbTable("recommendations")
    .insert(insert)
    .select("id")
    .single();

  if (error || !data) return { error: error?.message || "Falha ao enviar.", status: 500 as const };

  return { recommendation_id: Number(data.id) };
}

export async function updateRecommendationReaction(userId: string, recommendationId: number, reaction: string) {
  const { data: recommendation } = await dbTable("recommendations")
    .select("id")
    .eq("id", recommendationId)
    .eq("receiver_user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!recommendation) return { error: "Recomendacao nao encontrada.", status: 404 as const };

  const safeReaction = String(reaction || "").trim().toLowerCase();
  if (!safeReaction) {
    await dbTable("recommendation_reactions")
      .delete()
      .eq("recommendation_id", recommendationId)
      .eq("user_id", userId);
    return { reaction: "" };
  }
  if (!REACTIONS.has(safeReaction)) return { error: "Reacao invalida.", status: 422 as const };

  await dbTable("recommendation_reactions")
    .upsert(
      {
        recommendation_id: recommendationId,
        user_id: userId,
        reaction: safeReaction as Reaction
      },
      { onConflict: "recommendation_id,user_id" }
    );

  return { reaction: safeReaction };
}
