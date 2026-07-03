import { json } from "@/features/legacy-vore/api";
import { createPasswordReset } from "@/features/legacy-vore/password-resets";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "Email invalido." }, { status: 422 });
  }

  const result = await createPasswordReset(email);

  return json({ ok: true, ...result });
}
