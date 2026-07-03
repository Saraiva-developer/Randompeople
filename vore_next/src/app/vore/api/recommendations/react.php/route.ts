import { json } from "@/features/legacy-vore/api";
import { requireCommonUser, updateRecommendationReaction } from "@/features/legacy-vore/recommendations";

export async function POST(request: Request) {
  const session = await requireCommonUser();

  if ("error" in session) {
    return json({ ok: false, error: session.error }, { status: session.status });
  }

  const body = await request.json().catch(() => ({}));
  const recommendationId = Number(body.recommendation_id || 0);

  if (recommendationId <= 0) {
    return json({ ok: false, error: "recommendation_id obrigatorio." }, { status: 422 });
  }

  const result = await updateRecommendationReaction(
    session.user.id,
    recommendationId,
    String(body.reaction || "")
  );

  if ("error" in result) {
    return json({ ok: false, error: result.error }, { status: result.status });
  }

  return json({ ok: true, recommendation_id: recommendationId, reaction: result.reaction });
}
