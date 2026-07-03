import { json } from "@/features/legacy-vore/api";
import {
  requireCommonUser,
  resolveCommonUserByLegacyId,
  setRecommendationReceiveMode,
  upsertPermission
} from "@/features/legacy-vore/recommendations";

export async function POST(request: Request) {
  const session = await requireCommonUser();

  if ("error" in session) {
    return json({ ok: false, error: session.error }, { status: session.status });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim().toLowerCase();

  if (action === "set_mode") {
    const settings = await setRecommendationReceiveMode(session.user.id, body.receive_mode);
    return json({ ok: true, settings });
  }

  const statusMap: Record<string, "approved" | "rejected" | "blocked"> = {
    approve: "approved",
    reject: "rejected",
    block: "blocked",
    unblock: "rejected"
  };
  const status = statusMap[action];

  if (!status) {
    return json({ ok: false, error: "Acao invalida." }, { status: 422 });
  }

  const senderUserId = Number(body.sender_user_id || 0);
  const sender = await resolveCommonUserByLegacyId(senderUserId);

  if (!sender || sender.id === session.user.id) {
    return json({ ok: false, error: "Utilizador nao encontrado." }, { status: 404 });
  }

  await upsertPermission(sender.id, session.user.id, status);

  return json({ ok: true, sender_user_id: senderUserId, status });
}
