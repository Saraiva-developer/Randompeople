import { getCurrentUser } from "@/features/auth/session";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase";
import { parseItemShareUri } from "@/features/recommendations/shared";
import type {
  PermissionRequest,
  ReactionKey,
  ShareConversation,
  ShareEntry
} from "@/features/recommendations/shared";

type RecommendationRow = {
  id: number;
  sender_user_id: string;
  receiver_user_id: string;
  profile_slug: string | null;
  source_profile_name: string | null;
  content_type: "profile" | "photo" | "video" | "reel";
  content_uri: string | null;
  created_at: string;
  expires_at: string;
};

/** Names/emails of other users are only readable with the service role. */
async function resolveUsers(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<string, { name: string; email: string }>();

  try {
    const admin = getSupabaseAdminClient();
    const { data } = await admin.from("users").select("id, name, email").in("id", unique);
    const rows = (data as Array<{ id: string; name: string | null; email: string }> | null) || [];
    return new Map(
      rows.map((row) => [row.id, { name: String(row.name || "").trim(), email: row.email }])
    );
  } catch {
    return new Map<string, { name: string; email: string }>();
  }
}

export async function getShareConversations(): Promise<ShareConversation[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("recommendations")
    .select("*")
    .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(300);

  const rows = (data as RecommendationRow[] | null) || [];
  if (!rows.length) return [];

  const otherIds = rows.map((row) =>
    row.sender_user_id === user.id ? row.receiver_user_id : row.sender_user_id
  );
  const [users, { data: reactionRows }] = await Promise.all([
    resolveUsers(otherIds),
    supabase
      .from("recommendation_reactions")
      .select("recommendation_id, reaction")
      .eq("user_id", user.id)
      .in(
        "recommendation_id",
        rows.map((row) => row.id)
      )
  ]);
  const reactions = new Map(
    ((reactionRows as Array<{ recommendation_id: number; reaction: string }> | null) || []).map(
      (row) => [row.recommendation_id, row.reaction as ReactionKey]
    )
  );

  const grouped = new Map<string, ShareConversation>();
  rows.forEach((row) => {
    const isSent = row.sender_user_id === user.id;
    const otherId = isSent ? row.receiver_user_id : row.sender_user_id;
    const info = users.get(otherId);

    const entry: ShareEntry = {
      id: row.id,
      direction: isSent ? "sent" : "received",
      contentType: row.content_type,
      contentUri: String(row.content_uri || ""),
      profileSlug: String(row.profile_slug || ""),
      sourceProfileName: String(row.source_profile_name || ""),
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      item: parseItemShareUri(String(row.content_uri || "")),
      myReaction: reactions.get(row.id) || null
    };

    const existing = grouped.get(otherId);
    if (existing) {
      existing.entries.push(entry);
      if (entry.createdAt > existing.lastAt) existing.lastAt = entry.createdAt;
      return;
    }
    grouped.set(otherId, {
      userId: otherId,
      name: info?.name || "",
      email: info?.email || "",
      entries: [entry],
      lastAt: entry.createdAt
    });
  });

  return [...grouped.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** Requests waiting for the current user to approve. */
export async function getPendingPermissionRequests(): Promise<PermissionRequest[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("recommendation_permissions")
    .select("user_id, created_at")
    .eq("target_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data as Array<{ user_id: string; created_at: string }> | null) || [];
  if (!rows.length) return [];

  const users = await resolveUsers(rows.map((row) => row.user_id));
  return rows.map((row) => {
    const info = users.get(row.user_id);
    return {
      senderUserId: row.user_id,
      senderName: info?.name || "",
      senderEmail: info?.email || "",
      createdAt: row.created_at
    };
  });
}
