import { json } from "@/features/legacy-vore/api";
import { listRecommendationsForUser, requireCommonUser } from "@/features/legacy-vore/recommendations";

export async function GET() {
  const session = await requireCommonUser();

  if ("error" in session) {
    return json({ ok: false, error: session.error }, { status: session.status });
  }

  const data = await listRecommendationsForUser(session.user.id);

  return json({ ok: true, ...data });
}
