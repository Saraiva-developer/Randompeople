import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase";
import { getCurrentUser } from "@/features/auth/session";

export type ReviewEntry = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  userId: string;
  reviewerName: string;
};

export type ReviewerContext = {
  userId: string;
  canRate: boolean;
  myRating: number;
  myComment: string;
};

type ReviewRowRaw = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  users?: { name?: string | null } | null;
};

export async function getProfileReviews(profileId: string): Promise<ReviewEntry[]> {
  // The users table is only self-readable under RLS, so reviewer names are
  // resolved server-side with the service role when available.
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("reviews")
      .select("id, rating, comment, created_at, user_id, users(name)")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return ((data as ReviewRowRaw[] | null) || []).map((row) => ({
      id: row.id,
      rating: Number(row.rating) || 0,
      comment: String(row.comment || "").trim(),
      createdAt: row.created_at,
      userId: row.user_id,
      reviewerName: String(row.users?.name || "").trim() || "Utilizador"
    }));
  } catch {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, user_id")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(100);
    return ((data as ReviewRowRaw[] | null) || []).map((row) => ({
      id: row.id,
      rating: Number(row.rating) || 0,
      comment: String(row.comment || "").trim(),
      createdAt: row.created_at,
      userId: row.user_id,
      reviewerName: "Utilizador"
    }));
  }
}

export async function getReviewerContext(
  profileId: string,
  profileOwnerId: string
): Promise<ReviewerContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await getSupabaseServerClient();
  const [{ data: userRowRaw }, { data: myReviewRaw }] = await Promise.all([
    supabase.from("users").select("account_type").eq("id", user.id).maybeSingle(),
    supabase
      .from("reviews")
      .select("rating, comment")
      .eq("profile_id", profileId)
      .eq("user_id", user.id)
      .maybeSingle()
  ]);
  const userRow = userRowRaw as { account_type?: string } | null;
  const myReview = myReviewRaw as { rating?: number; comment?: string | null } | null;

  const accountType = String(userRow?.account_type || "").toLowerCase();
  return {
    userId: user.id,
    canRate: accountType === "common" && profileOwnerId !== user.id,
    myRating: Number(myReview?.rating) || 0,
    myComment: String(myReview?.comment || "").trim()
  };
}
