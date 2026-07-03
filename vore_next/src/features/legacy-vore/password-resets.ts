import { createHash, randomBytes } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function table(name: string) {
  const admin = getSupabaseAdminClient();
  return (admin.from as unknown as (tableName: string) => any)(name);
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordReset(email: string) {
  const safeEmail = String(email || "").trim().toLowerCase();
  const { data: user } = await table("users").select("id,email").eq("email", safeEmail).maybeSingle();

  if (!user) {
    return {
      message: "Se o email existir, enviamos instrucoes."
    };
  }

  const resetToken = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { error } = await table("password_resets").insert({
    user_id: user.id,
    token_hash: hashResetToken(resetToken),
    expires_at: expiresAt
  });

  if (error) throw new Error(error.message || "Falha ao gerar token.");

  return {
    message: "Token de recuperacao gerado.",
    reset_token: resetToken,
    expires_at: expiresAt
  };
}

export async function consumePasswordReset(token: string, password: string) {
  const tokenHash = hashResetToken(token);
  const { data: row } = await table("password_resets")
    .select("*")
    .eq("token_hash", tokenHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { error: "Token invalido.", status: 404 as const };
  if (row.used_at) return { error: "Token ja utilizado.", status: 409 as const };
  if (new Date(String(row.expires_at)).getTime() < Date.now()) {
    return { error: "Token expirado.", status: 410 as const };
  }

  const admin = getSupabaseAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(row.user_id, {
    password
  });

  if (updateError) return { error: updateError.message || "Falha ao atualizar palavra-passe.", status: 500 as const };

  await table("password_resets")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { message: "Palavra-passe atualizada com sucesso." };
}
