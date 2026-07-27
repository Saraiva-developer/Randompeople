"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
      <p className="card-meta muted">
        <span className="card-meta-location">{card.location}</span>
        {card.rating ? (
          <span className="rating">{"\u2605"} {card.rating}</span>
        ) : null}
      </p>
    </Link>
  );
}

export function HomeClient({ profiles }: { profiles: ProfileRow[] }) {
  const [activeFilter, setActiveFilter] = useState<HomeFilter>("destaques");

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

  const suggested = sortedProfiles.slice(0, 8);
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
      <div id="homeSuggested" className="suggested-strip">
        {suggested.map((profile) => (
          <HomeCard key={`suggested-${profile.id}`} profile={profile} compact />
        ))}
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
