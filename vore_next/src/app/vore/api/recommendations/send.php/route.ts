import { json } from "@/features/legacy-vore/api";
import { createRecommendation, requireCommonUser } from "@/features/legacy-vore/recommendations";

export async function POST(request: Request) {
  const session = await requireCommonUser();

  if ("error" in session) {
    return json({ ok: false, error: session.error }, { status: session.status });
  }

  const body = await request.json().catch(() => ({}));
  const result = await createRecommendation(session.user.id, body);

  if ("error" in result) {
    return json(
      { ok: false, error: result.error, message: result.message || result.error },
      { status: result.status }
    );
  }

  return json({ ok: true, recommendation_id: result.recommendation_id });
}
