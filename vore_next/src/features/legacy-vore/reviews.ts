import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/supabase";
import { legacyNumericId } from "./api";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

type ReviewEntry = {
  user_uuid: string;
  user_id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

function asRecord(value: Json | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

function normalizeReviews(value: Json | null | undefined) {
  return (Array.isArray(value) ? value : [])
    .map((entry) => {
      const item = asRecord(entry);
      const userUuid = String(item.user_uuid || "");
      const rating = Math.max(1, Math.min(5, Number(item.rating || 0)));

      if (!userUuid || !rating) return null;

      return {
        user_uuid: userUuid,
        user_id: Number(item.user_id || legacyNumericId(userUuid)),
        user_name: String(item.user_name || "Utilizador"),
        rating,
        comment: String(item.comment || "").slice(0, 1200),
        created_at: String(item.created_at || new Date().toISOString()),
        updated_at: String(item.updated_at || item.created_at || new Date().toISOString())
      } satisfies ReviewEntry;
    })
    .filter(Boolean) as ReviewEntry[];
}

export function buildReviewsSummary(reviews: ReviewEntry[]) {
  const distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let sum = 0;

  reviews.forEach((review) => {
    const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating || 0))));
    distribution[String(rating) as keyof typeof distribution] += 1;
    sum += rating;
  });

  return {
    average: reviews.length ? Number((sum / reviews.length).toFixed(2)) : 0,
    total: reviews.length,
    distribution
  };
}

export async function findProfileForReviews({ slug }: { slug?: string | null }) {
  const safeSlug = String(slug || "").trim();

  if (!safeSlug) return null;

  const admin = getSupabaseAdminClient();
  const profilesTable = admin.from("profiles") as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: ProfileRow | null; error: { message: string } | null }>;
      };
    };
    update: (value: ProfileUpdate) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
  const { data } = await profilesTable.select("*").eq("slug", safeSlug).maybeSingle();

  if (!data) return null;

  return { admin, profilesTable, profile: data };
}

export function getProfileReviews(profile: ProfileRow) {
  const data = asRecord(profile.data);
  return normalizeReviews(data.reviews);
}

export function toLegacyReview(review: ReviewEntry) {
  return {
    id: `${review.user_id}-${review.updated_at}`,
    user_id: review.user_id,
    user_name: review.user_name,
    rating: review.rating,
    comment: review.comment,
    created_at: review.created_at,
    updated_at: review.updated_at
  };
}

export async function saveProfileReviews(
  profileContext: Awaited<ReturnType<typeof findProfileForReviews>>,
  reviews: ReviewEntry[]
) {
  if (!profileContext) return { error: "Perfil nao encontrado." };

  const currentData = asRecord(profileContext.profile.data);
  const summary = buildReviewsSummary(reviews);
  const nextData = {
    ...currentData,
    reviews: reviews as unknown as Json,
    rating: summary.average ? summary.average.toFixed(1) : ""
  };
  const { error } = await profileContext.profilesTable
    .update({
      data: nextData,
      updated_at: new Date().toISOString()
    })
    .eq("id", profileContext.profile.id);

  return { error: error?.message || null, summary };
}
