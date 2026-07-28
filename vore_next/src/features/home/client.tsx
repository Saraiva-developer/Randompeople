"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProfileRow } from "@/features/vore-shell/display";
import {
  getBadgeType,
  getCardDisplayData,
  resolveProfileFilter,
  scoreLocal
} from "@/features/vore-shell/display";

const HOME_FILTERS = [
  { id: "destaques", label: "Destaques" },
  { id: "novidades", label: "Novidades" },
  { id: "promocoes", label: "Promocoes" },
  { id: "perto", label: "Perto de mim" }
] as const;

type HomeFilter = (typeof HOME_FILTERS)[number]["id"];

function HomeCard({ profile, compact = false }: { profile: ProfileRow; compact?: boolean }) {
  const card = getCardDisplayData(profile);
  const badgeLabel =
    card.badge === "promo" ? "Promo" : card.badge === "novo" ? "Novo" : "";

  return (
    <Link href={`/profile/${profile.slug}`} className={`card${compact ? " card-compact" : ""}`}>
      {!card.verified && badgeLabel ? (
        <span className={`card-badge card-badge-${card.badge}`}>{badgeLabel}</span>
      ) : null}
      <div className="card-avatar-wrap">
        {card.avatar ? (
          <img src={card.avatar} alt={profile.name} className="card-avatar" />
        ) : (
          <div className="card-avatar placeholder">{profile.name.slice(0, 1).toUpperCase()}</div>
        )}
        {card.verified ? <span className="card-avatar-verif">{"\u2713"}</span> : null}
      </div>
      <div className="card-name-row">
        <h3>{profile.name}</h3>
      </div>
      <p className="card-category">{card.category}</p>
      <p className="muted">{card.location}</p>
      {card.rating ? (
        <p className="rating">
          <svg className="rating-star" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M10 1.6l2.47 5.24 5.77.75-4.19 4.03.99 5.76L10 14.87l-5.04 2.51.99-5.76-4.19-4.03 5.77-.75L10 1.6Z"
              fill="currentColor"
            />
          </svg>
          {card.rating}
        </p>
      ) : null}
    </Link>
  );
}

const SUGGESTED_CARD_WIDTH = 122;
const SUGGESTED_CARD_GAP = 3;

export function HomeClient({ profiles }: { profiles: ProfileRow[] }) {
  const [activeFilter, setActiveFilter] = useState<HomeFilter>("destaques");
  const suggestedRef = useRef<HTMLDivElement>(null);
  const suggestedWrapRef = useRef<HTMLDivElement>(null);
  const [suggestedWidth, setSuggestedWidth] = useState<number | null>(null);

  useEffect(() => {
    const measureTarget = suggestedWrapRef.current?.parentElement;
    if (!measureTarget) return;

    function recompute() {
      const available = measureTarget!.clientWidth;
      const step = SUGGESTED_CARD_WIDTH + SUGGESTED_CARD_GAP;
      const count = Math.max(1, Math.floor((available + SUGGESTED_CARD_GAP) / step));
      setSuggestedWidth(count * step - SUGGESTED_CARD_GAP);
    }

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(measureTarget);
    return () => observer.disconnect();
  }, []);

  function scrollSuggested(direction: -1 | 1) {
    const step = SUGGESTED_CARD_WIDTH + SUGGESTED_CARD_GAP;
    suggestedRef.current?.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => scoreLocal(b) - scoreLocal(a)),
    [profiles]
  );

  const homeList = useMemo(() => {
    const raw =
      activeFilter === "destaques"
        ? profiles
        : profiles.filter((profile) => resolveProfileFilter(profile) === activeFilter);
    return [...raw].sort((a, b) => scoreLocal(b) - scoreLocal(a));
  }, [activeFilter, profiles]);

  const suggested = sortedProfiles.slice(0, 16);
  const trending = sortedProfiles[0]?.name || "Sem dados";
  const promoCount = profiles.filter(
    (profile) => getBadgeType(profile) === "promo" || resolveProfileFilter(profile) === "promocoes"
  ).length;
  const newCount = profiles.filter(
    (profile) => getBadgeType(profile) === "novo" || resolveProfileFilter(profile) === "novidades"
  ).length;

  return (
    <section className="home-screen">
      <div className="home-heading">
        <h1>Encontra quem procuras</h1>
        <p className="muted">Perfis profissionais verificados, perto de ti.</p>
      </div>

      <div className="chips home-insights">
        <span className="home-insight-chip">Vistas hoje: 0</span>
        <span className="home-insight-chip">Em alta: {trending}</span>
        <span className="home-insight-chip">
          Promocoes: {promoCount} | Novos: {newCount}
        </span>
      </div>

      <div id="homeFilterChips" className="chips chips-scroll notranslate" translate="no">
        {HOME_FILTERS.map((filter) => (
          <button
            key={filter.id}
            className={activeFilter === filter.id ? "active" : ""}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="section-heading-row">
        <h3 className="section-title">Sugestoes</h3>
      </div>
      <div
        className="suggested-strip-wrap"
        ref={suggestedWrapRef}
        style={suggestedWidth ? { width: suggestedWidth, maxWidth: "100%" } : undefined}
      >
        <button
          type="button"
          className="suggested-strip-arrow suggested-strip-arrow-left"
          aria-label="Deslizar para a esquerda"
          onClick={() => scrollSuggested(-1)}
        >
          ‹
        </button>
        <div
          id="homeSuggested"
          className="suggested-strip"
          ref={suggestedRef}
          style={suggestedWidth ? { width: suggestedWidth, maxWidth: "100%" } : undefined}
        >
          {suggested.map((profile) => (
            <HomeCard key={`suggested-${profile.id}`} profile={profile} compact />
          ))}
        </div>
        <button
          type="button"
          className="suggested-strip-arrow suggested-strip-arrow-right"
          aria-label="Deslizar para a direita"
          onClick={() => scrollSuggested(1)}
        >
          ›
        </button>
      </div>

      <div className="section-heading-row">
        <h3 id="homeProfilesTitle" className="section-title">
          {HOME_FILTERS.find((filter) => filter.id === activeFilter)?.label || "Destaques"}
        </h3>
        <span className="section-count muted">{homeList.length} perfis</span>
      </div>
      <div id="homeCards" className="grid">
        {homeList.map((profile) => (
          <HomeCard key={profile.id} profile={profile} />
        ))}
      </div>
    </section>
  );
}
