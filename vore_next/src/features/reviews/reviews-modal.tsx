"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ReviewEntry, ReviewerContext } from "@/features/reviews/queries";

function Star({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill={filled ? "#f59e0b" : "#e2e8f0"}
      aria-hidden="true"
    >
      <path d="M10 1.6l2.47 5.24 5.77.75-4.19 4.03.99 5.76L10 14.87l-5.04 2.51.99-5.76-4.19-4.03 5.77-.75L10 1.6Z" />
    </svg>
  );
}

function StarsRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="rvw-stars" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Star key={step} filled={value >= step - 0.25} size={size} />
      ))}
    </span>
  );
}

function formatReviewDate(iso: string) {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "";
  return new Date(ts).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

export function ProfileRatingButton({
  profileId,
  fallbackRating,
  initialReviews,
  reviewer
}: {
  profileId: string;
  fallbackRating: string;
  initialReviews: ReviewEntry[];
  reviewer: ReviewerContext | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState<ReviewEntry[]>(initialReviews);
  const [sortMode, setSortMode] = useState<"recent" | "best">("recent");
  const [draftRating, setDraftRating] = useState(reviewer?.myRating || 0);
  const [draftComment, setDraftComment] = useState(reviewer?.myComment || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const total = reviews.length;
  const average = total
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / total
    : Number(fallbackRating.replace(",", ".")) || 0;
  const averageText = average ? average.toFixed(1) : "-";

  const distribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      const key = Math.max(1, Math.min(5, Math.round(review.rating)));
      counts[key] += 1;
    });
    return counts;
  }, [reviews]);

  const sorted = useMemo(() => {
    const list = [...reviews];
    if (sortMode === "best") {
      list.sort((a, b) => b.rating - a.rating || Date.parse(b.createdAt) - Date.parse(a.createdAt));
    } else {
      list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }
    return list;
  }, [reviews, sortMode]);

  async function submitReview() {
    if (!reviewer || !draftRating || saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    const supabase = getSupabaseBrowserClient();
    const reviewsTable = supabase.from("reviews") as unknown as {
      upsert: (
        values: {
          profile_id: string;
          user_id: string;
          rating: number;
          comment: string | null;
        },
        options: { onConflict: string }
      ) => Promise<{ error: { message: string } | null }>;
    };
    const { error: upsertError } = await reviewsTable.upsert(
      {
        profile_id: profileId,
        user_id: reviewer.userId,
        rating: draftRating,
        comment: draftComment.trim() || null
      },
      { onConflict: "profile_id,user_id" }
    );
    setSaving(false);
    if (upsertError) {
      setError("Nao foi possivel guardar a avaliacao. Tenta novamente.");
      return;
    }
    setSaved(true);
    setReviews((current) => {
      const withoutMine = current.filter((review) => review.userId !== reviewer.userId);
      return [
        {
          id: `mine-${reviewer.userId}`,
          rating: draftRating,
          comment: draftComment.trim(),
          createdAt: new Date().toISOString(),
          userId: reviewer.userId,
          reviewerName: "A tua avaliacao"
        },
        ...withoutMine
      ];
    });
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="profile-native-meta-item rvw-trigger"
        onClick={() => setOpen(true)}
      >
        <span className="profile-native-star">
          <Star filled size={14} />
        </span>
        {averageText}
        {total ? <span className="rvw-trigger-count">({total})</span> : null}
      </button>

      {open ? (
        <div className="pnt-modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="pnt-modal-panel rvw-panel"
            role="dialog"
            aria-label="Avaliacoes"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pnt-modal-header">
              <div className="pnt-modal-heading">
                <h4 className="pnt-modal-title">Avaliações</h4>
              </div>
              <button
                type="button"
                className="pnt-modal-close"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="pnt-modal-body">
              <div className="rvw-summary">
                <div className="rvw-summary-main">
                  <span className="rvw-average">{averageText}</span>
                  <StarsRow value={average} size={16} />
                  <span className="rvw-total">
                    {total ? `${total} ${total === 1 ? "avaliação" : "avaliações"}` : "Sem avaliações"}
                  </span>
                </div>
                <div className="rvw-distribution">
                  {[5, 4, 3, 2, 1].map((step) => {
                    const count = distribution[step] || 0;
                    const pct = total ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={step} className="rvw-dist-row">
                        <span className="rvw-dist-label">{step}</span>
                        <Star filled size={11} />
                        <span className="rvw-dist-bar">
                          <span className="rvw-dist-fill" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="rvw-dist-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {reviewer?.canRate ? (
                <div className="rvw-form">
                  <span className="explore-group-label">A tua avaliação</span>
                  <div className="rvw-star-picker">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <button
                        key={step}
                        type="button"
                        className="rvw-star-btn"
                        aria-label={`${step} estrelas`}
                        onClick={() => setDraftRating(step)}
                      >
                        <Star filled={draftRating >= step} size={22} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="rvw-comment-input"
                    placeholder="Escreve um comentário (opcional)..."
                    maxLength={1200}
                    rows={3}
                    value={draftComment}
                    onChange={(event) => setDraftComment(event.target.value)}
                  />
                  {error ? <p className="rvw-error">{error}</p> : null}
                  {saved ? <p className="rvw-saved">Avaliação guardada.</p> : null}
                  <button
                    type="button"
                    className="pnt-reserve-btn"
                    disabled={!draftRating || saving}
                    onClick={submitReview}
                  >
                    {saving ? "A guardar..." : reviewer.myRating ? "Atualizar avaliação" : "Enviar avaliação"}
                  </button>
                </div>
              ) : reviewer ? null : (
                <p className="rvw-login-hint">
                  <a href="/login">Inicia sessão</a> com uma conta pessoal para avaliar este perfil.
                </p>
              )}

              {sorted.length ? (
                <>
                  <div className="rvw-sort-row">
                    {(
                      [
                        ["recent", "Recentes"],
                        ["best", "Melhores"]
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={`pnt-subtab${sortMode === key ? " is-active" : ""}`}
                        onClick={() => setSortMode(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="rvw-list">
                    {sorted.map((review) => (
                      <div key={review.id} className="rvw-item">
                        <div className="rvw-item-top">
                          <span className="rvw-item-name">{review.reviewerName}</span>
                          <StarsRow value={review.rating} size={12} />
                        </div>
                        {review.comment ? <p className="rvw-item-comment">{review.comment}</p> : null}
                        <span className="rvw-item-date">{formatReviewDate(review.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
