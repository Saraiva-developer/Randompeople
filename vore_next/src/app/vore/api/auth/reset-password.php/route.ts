import { json } from "@/features/legacy-vore/api";
import { consumePasswordReset } from "@/features/legacy-vore/password-resets";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  const password = String(body.password || "");

  if (!token || token.length < 16) {
    return json({ ok: false, error: "Token invalido." }, { status: 422 });
  }

  if (password.length < 6) {
    return json({ ok: false, error: "A palavra-passe deve ter pelo menos 6 caracteres." }, { status: 422 });
  }

  const result = await consumePasswordReset(token, password);

  if ("error" in result) {
    return json({ ok: false, error: result.error }, { status: result.status });
  }

  return json({ ok: true, message: result.message });
}
