"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { profileTypeOptions } from "@/features/profiles/constants";
import { getProfileData } from "@/features/profiles/view";
import type { Database } from "@/types/supabase";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function getTypeLabel(type: string) {
  return profileTypeOptions.find((item) => item.value === type)?.label ?? "Perfil";
}

const DISCOVERY_OPTIONS = [
  { key: "all", label: "Tudo" },
  { key: "perto", label: "Perto" },
  { key: "promocoes", label: "Promocoes" },
  { key: "novidades", label: "Novidades" },
  { key: "verif", label: "Verificados" }
] as const;

const SORT_OPTIONS = [
  { key: "relevance", label: "Relevancia" },
  { key: "rating", label: "Top rating" },
  { key: "recent", label: "Mais recentes" },
  { key: "near", label: "Mais perto" }
] as const;

const CATEGORY_OPTIONS = [
  { key: "massagem", label: "Massagem" },
  { key: "beleza", label: "Beleza" },
  { key: "restaurante", label: "Restaurante" },
  { key: "loja", label: "Loja" },
  { key: "criador", label: "Criador" },
  { key: "hotel", label: "Hotel" }
] as const;

function normalize(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function resolveFilter(profile: ProfileRow) {
  if (profile.type === "shop") return "promocoes";
  if (profile.type === "lodging") return "perto";
  if (profile.type === "creator") return "novidades";
  return "destaques";
}

function scoreLocal(profile: ProfileRow) {
  const data = getProfileData(profile.data);
  const location = normalize(String(data.location || profile.location || ""));
  let score = 0;
  if (resolveFilter(profile) === "perto") score += 3;
  if (location.includes("portugal")) score += 1;
  if (location.includes("lisboa")) score += 1;
  return score;
}

function parseRating(profile: ProfileRow) {
  const data = getProfileData(profile.data);
  const rating = Number(String(data.rating || "").replace(",", "."));
  return Number.isFinite(rating) ? rating : 0;
}

function parseRecent(profile: ProfileRow) {
  const ts = Date.parse(String(profile.updated_at || profile.created_at || ""));
  return Number.isFinite(ts) ? ts : 0;
}

function inferCategoryKeys(profile: ProfileRow) {
  const data = getProfileData(profile.data);
  const haystack = normalize(
    [profile.name, data.category, data.role, data.location, data.about, profile.bio]
      .filter(Boolean)
      .join(" ")
  );

  return CATEGORY_OPTIONS.filter((item) => haystack.includes(normalize(item.key))).map(
    (item) => item.key
  ) as string[];
}

export function ExploreClient({ profiles }: { profiles: ProfileRow[] }) {
  const [search, setSearch] = useState("");
  const [discovery, setDiscovery] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [categories, setCategories] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(12);

  const filtered = useMemo(() => {
    const searchText = normalize(search);

    const next = profiles.filter((profile) => {
      const data = getProfileData(profile.data);
      const categoryKeys = inferCategoryKeys(profile);
      const badge = normalize(String(data.badge || ""));
      const haystack = normalize(
        [profile.name, data.category, data.role, data.location, data.about, profile.bio]
          .filter(Boolean)
          .join(" ")
      );

      const searchMatch = !searchText || haystack.includes(searchText);
      const discoveryMatch =
        discovery === "all" ||
        (discovery === "perto" && resolveFilter(profile) === "perto") ||
        (discovery === "promocoes" && resolveFilter(profile) === "promocoes") ||
        (discovery === "novidades" && resolveFilter(profile) === "novidades") ||
        (discovery === "verif" && (badge === "verif" || data.verified === true));

      const categoryMatch =
        !categories.length ||
        categories.some(
          (selected) =>
            categoryKeys.includes(selected) || haystack.includes(normalize(selected))
        );

      return searchMatch && discoveryMatch && categoryMatch;
    });

    next.sort((a, b) => {
      if (sortBy === "rating") return parseRating(b) - parseRating(a);
      if (sortBy === "recent") return parseRecent(b) - parseRecent(a);
      if (sortBy === "near") {
        const diff = scoreLocal(b) - scoreLocal(a);
        if (diff !== 0) return diff;
        return parseRating(b) - parseRating(a);
      }
      const diff = scoreLocal(b) - scoreLocal(a);
      if (diff !== 0) return diff;
      return parseRating(b) - parseRating(a);
    });

    return next;
  }, [categories, discovery, profiles, search, sortBy]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <section className="explore-screen">
      <div className="explore-search-row">
        <div className="explore-search-box">
          <span className="explore-search-icon">⌕</span>
          <input
            className="input explore-search-input"
            placeholder="Pesquisar perfis..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(12);
            }}
          />
          <button className="explore-search-filter-btn" type="button">
            ⚙
          </button>
        </div>
      </div>

      <div className="explore-meta-row">
        <span id="exploreMetaText" className="muted">
          {filtered.length} resultados
        </span>
        <span id="exploreTrendText" className="muted">
          Tendencia:{" "}
          {filtered
            .slice(0, 2)
            .map((profile) => profile.name)
            .join(" | ") || "Sem dados"}
        </span>
      </div>

      <div id="exploreSortRow" className="explore-sort-row">
        <span className="explore-group-label">Ordenar</span>
        <div className="chips chips-scroll explore-sort-chips">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={sortBy === option.key ? "active" : ""}
              onClick={() => {
                setSortBy(option.key);
                setVisibleCount(12);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="explore-filter-group">
        <span className="explore-group-label">Filtrar</span>
        <div id="exploreActiveFilters" className="explore-active-filters">
          {DISCOVERY_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`vore-chip-button${discovery === option.key ? " active" : ""}`}
              onClick={() => {
                setDiscovery(option.key);
                setVisibleCount(12);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="explore-filter-group">
        <span className="explore-group-label">Categorias</span>
        <div className="chips chips-scroll explore-category-chips">
        {CATEGORY_OPTIONS.map((option) => {
          const active = categories.includes(option.key);
          return (
            <button
              key={option.key}
              type="button"
              className={`vore-chip-button${active ? " active" : ""}`}
              onClick={() => {
                setCategories((current) =>
                  current.includes(option.key)
                    ? current.filter((entry) => entry !== option.key)
                    : [...current, option.key]
                );
                setVisibleCount(12);
              }}
            >
              {option.label}
            </button>
          );
        })}
        </div>
      </div>

      <div id="exploreCards" className="grid">
        {visible.map((profile) => {
          const data = getProfileData(profile.data);
          const avatar = String(profile.avatar_url || data.avatar || "").trim();
          const rating = String(data.rating || "").trim();
          const verified =
            data.verified === true ||
            String(data.badge || "").trim().toLowerCase() === "verif";
          const badge = String(data.badge || "").trim().toLowerCase();
          const badgeLabel = badge === "promo" ? "Promo" : badge === "novo" ? "Novo" : "";
          const category = String(data.category || data.role || getTypeLabel(profile.type)).trim();
          const location = String(data.location || profile.location || "Portugal").trim();

          return (
            <Link key={profile.id} href={`/profile/${profile.slug}`} className="card">
              {!verified && badgeLabel ? (
                <span className={`card-badge card-badge-${badge}`}>{badgeLabel}</span>
              ) : null}
              <div className="card-avatar-wrap">
                {avatar ? (
                  <img src={avatar} alt={profile.name} className="card-avatar" />
                ) : (
                  <div className="card-avatar placeholder">
                    {profile.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                {verified ? <span className="card-avatar-verif">✓</span> : null}
              </div>
              <div className="card-name-row">
                <h3>{profile.name}</h3>
              </div>
              <p className="card-category">{category || "Perfil"}</p>
              <p className="card-meta muted">
                <span className="card-meta-location">{location || "Portugal"}</span>
                {rating ? <span className="rating">★ {rating}</span> : null}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="vore-load-more-row">
        <span className="muted">
          A mostrar {visible.length} de {filtered.length}
        </span>
        {visible.length < filtered.length ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => setVisibleCount((count) => count + 12)}
          >
            Mostrar mais
          </button>
        ) : null}
      </div>
    </section>
  );
}
