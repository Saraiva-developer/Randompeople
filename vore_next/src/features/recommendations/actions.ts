"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/features/auth/session";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase";
import type { ShareUser } from "@/features/recommendations/shared";

type SendResult =
  | { ok: true; status: "sent" | "requested" }
  | { ok: false; error: string };

async function getCommonUser() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("users").select("account_type").eq("id", user.id).maybeSingle();
  const account = data as { account_type?: string } | null;
  if (account?.account_type !== "common") return null;

  return user;
}

/**
 * Users can only read their own row under RLS, so candidate lookup runs with
 * the service role. Only personal accounts are searchable, matching the app.
 */
export async function searchShareUsersAction(query: string): Promise<ShareUser[]> {
  const user = await getCommonUser();
  if (!user) return [];

  const term = String(query || "").trim();
  if (term.length < 2) return [];

  try {
    const admin = getSupabaseAdminClient();
    const escaped = term.replace(/[%_,]/g, " ").trim();
    if (!escaped) return [];

    const { data } = await admin
      .from("users")
      .select("id, name, email")
      .eq("account_type", "common")
      .neq("id", user.id)
      .or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%`)
      .limit(10);

    const rows = (data as Array<{ id: string; name: string | null; email: string }> | null) || [];
    return rows.map((row) => ({
      id: row.id,
      name: String(row.name || "").trim(),
      email: row.email
    }));
  } catch {
    return [];
  }
}

export async function sendShareAction(input: {
  receiverUserId: string;
  profileId: string;
  profileSlug: string;
  sourceProfileName: string;
  contentType: "profile" | "photo" | "video" | "reel";
  contentUri: string;
}): Promise<SendResult> {
  const user = await getCommonUser();
  if (!user) return { ok: false, error: "A partilha privada é só para contas pessoais." };
  if (!input.receiverUserId || input.receiverUserId === user.id) {
    return { ok: false, error: "Escolhe um destinatário válido." };
  }

  const supabase = await getSupabaseServerClient();

  // Receiver controls who may reach them: 'all' accepts anyone, 'off' nobody,
  // 'approved' (the default) needs an approved permission row first.
  const admin = getSupabaseAdminClient();
  const [{ data: settingsRaw }, { data: permissionRaw }] = await Promise.all([
    admin
      .from("recommendation_settings")
      .select("receive_mode")
      .eq("user_id", input.receiverUserId)
      .maybeSingle(),
    supabase
      .from("recommendation_permissions")
      .select("status")
      .eq("user_id", user.id)
      .eq("target_user_id", input.receiverUserId)
      .maybeSingle()
  ]);

  const receiveMode = String((settingsRaw as { receive_mode?: string } | null)?.receive_mode || "approved");
  const permissionStatus = String((permissionRaw as { status?: string } | null)?.status || "");

  if (receiveMode === "off") {
    return { ok: false, error: "Este utilizador não está a receber partilhas." };
  }
  if (permissionStatus === "blocked" || permissionStatus === "rejected") {
    return { ok: false, error: "Este utilizador não aceita partilhas tuas." };
  }

  const needsApproval = receiveMode !== "all" && permissionStatus !== "approved";

  if (needsApproval) {
    if (permissionStatus === "pending") {
      return { ok: false, error: "Pedido já enviado. Aguarda que seja aceite." };
    }
    const permissionsTable = supabase.from("recommendation_permissions") as unknown as {
      insert: (values: {
        user_id: string;
        target_user_id: string;
        status: string;
      }) => Promise<{ error: { message: string } | null }>;
    };
    const { error } = await permissionsTable.insert({
      user_id: user.id,
      target_user_id: input.receiverUserId,
      status: "pending"
    });
    if (error) return { ok: false, error: "Não foi possível enviar o pedido." };

    revalidatePath("/profile");
    return { ok: true, status: "requested" };
  }

  const recommendationsTable = supabase.from("recommendations") as unknown as {
    insert: (values: {
      sender_user_id: string;
      receiver_user_id: string;
      profile_id: string | null;
      profile_slug: string;
      source_profile_name: string;
      content_type: string;
      content_uri: string;
    }) => Promise<{ error: { message: string } | null }>;
  };
  const { error } = await recommendationsTable.insert({
    sender_user_id: user.id,
    receiver_user_id: input.receiverUserId,
    profile_id: input.profileId || null,
    profile_slug: input.profileSlug,
    source_profile_name: input.sourceProfileName,
    content_type: input.contentType,
    content_uri: input.contentUri
  });
  if (error) return { ok: false, error: "Não foi possível enviar a partilha." };

  revalidatePath("/profile");
  return { ok: true, status: "sent" };
}

export async function reactToShareAction(
  recommendationId: number,
  reaction: string | null
): Promise<{ ok: boolean }> {
  const user = await getCommonUser();
  if (!user || !recommendationId) return { ok: false };

  const supabase = await getSupabaseServerClient();

  if (!reaction) {
    const { error } = await supabase
      .from("recommendation_reactions")
      .delete()
      .eq("recommendation_id", recommendationId)
      .eq("user_id", user.id);
    if (error) return { ok: false };
    revalidatePath("/profile");
    return { ok: true };
  }

  const reactionsTable = supabase.from("recommendation_reactions") as unknown as {
    upsert: (
      values: { recommendation_id: number; user_id: string; reaction: string },
      options: { onConflict: string }
    ) => Promise<{ error: { message: string } | null }>;
  };
  const { error } = await reactionsTable.upsert(
    { recommendation_id: recommendationId, user_id: user.id, reaction },
    { onConflict: "recommendation_id,user_id" }
  );
  if (error) return { ok: false };

  revalidatePath("/profile");
  return { ok: true };
}

export async function respondToPermissionAction(
  senderUserId: string,
  action: "approve" | "reject"
): Promise<{ ok: boolean }> {
  const user = await getCommonUser();
  if (!user || !senderUserId) return { ok: false };

  const supabase = await getSupabaseServerClient();
  const permissionsTable = supabase.from("recommendation_permissions") as unknown as {
    update: (values: { status: string }) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  };

  const { error } = await permissionsTable
    .update({ status: action === "approve" ? "approved" : "rejected" })
    .eq("user_id", senderUserId)
    .eq("target_user_id", user.id);

  if (error) return { ok: false };

  revalidatePath("/profile");
  return { ok: true };
}
