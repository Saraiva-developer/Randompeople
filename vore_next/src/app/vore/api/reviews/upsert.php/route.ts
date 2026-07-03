import { getCurrentSupabaseUser, json, legacyNumericId } from "@/features/legacy-vore/api";
import {
  findProfileForReviews,
  getProfileReviews,
  saveProfileReviews,
  toLegacyReview
} from "@/features/legacy-vore/reviews";

export async function POST(request: Request) {
  const { user } = await getCurrentSupabaseUser();

  if (!user) {
    return json({ ok: false, error: "Login necessario." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || "").trim();
  const profileContext = await findProfileForReviews({ slug });

  if (!profileContext) {
    return json({ ok: false, error: "Perfil nao encontrado." }, { status: 404 });
  }

  if (profileContext.profile.user_id === user.id) {
    return json({ ok: false, error: "Nao podes avaliar o teu proprio perfil." }, { status: 403 });
  }

  const rating = Math.max(1, Math.min(5, Number(body.rating || 0)));
  const comment = String(body.comment || "").trim().slice(0, 1200);
  const now = new Date().toISOString();
  const reviews = getProfileReviews(profileContext.profile);
  const currentIndex = reviews.findIndex((review) => review.user_uuid === user.id);
  const nextReview = {
    user_uuid: user.id,
    user_id: legacyNumericId(user.id),
    user_name: String(user.user_metadata?.name || user.email || "Utilizador"),
    rating,
    comment,
    created_at: currentIndex >= 0 ? reviews[currentIndex].created_at : now,
    updated_at: now
  };

  if (currentIndex >= 0) reviews[currentIndex] = nextReview;
  else reviews.unshift(nextReview);

  const saved = await saveProfileReviews(profileContext, reviews);

  if (saved.error) {
    return json({ ok: false, error: saved.error }, { status: 500 });
  }

  return json({ ok: true, review: toLegacyReview(nextReview), summary: saved.summary });
}
