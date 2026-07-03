import { json } from "@/features/legacy-vore/api";
import { getCurrentSupabaseUser } from "@/features/legacy-vore/api";
import {
  buildReviewsSummary,
  findProfileForReviews,
  getProfileReviews,
  toLegacyReview
} from "@/features/legacy-vore/reviews";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const profileContext = await findProfileForReviews({ slug });

  if (!profileContext) {
    return json({ ok: false, error: "Perfil nao encontrado." }, { status: 404 });
  }

  const { user } = await getCurrentSupabaseUser();
  const reviews = getProfileReviews(profileContext.profile);
  const viewerReview = user ? reviews.find((review) => review.user_uuid === user.id) || null : null;
  const sorted = reviews
    .slice()
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));

  return json({
    ok: true,
    summary: buildReviewsSummary(reviews),
    reviews: sorted.map(toLegacyReview),
    viewer: {
      can_rate: !!user && user.id !== profileContext.profile.user_id,
      review: viewerReview ? toLegacyReview(viewerReview) : null
    }
  });
}
