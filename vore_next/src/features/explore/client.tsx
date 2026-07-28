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

function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.6-3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function OptionsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2.4" fill="#fff" stroke="currentColor" strokeWidth="2" />
      <circle cx="15" cy="12" r="2.4" fill="#fff" stroke="currentColor" strokeWidth="2" />
      <circle cx="7" cy="17" r="2.4" fill="#fff" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function ExploreClient({ profiles }: { profiles: ProfileRow[] }) {
  const [search, setSearch] = useState("");
  const [discovery, setDiscovery] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [categories, setCategories] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(12);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

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

  const hasActiveAdvanced = discovery !== "all" || categories.length > 0;
  const categorySearchText = normalize(categorySearch);
  const visibleCategoryOptions = CATEGORY_OPTIONS.filter(
    (option) => !categorySearchText || normalize(option.label).includes(categorySearchText)
  );

  function clearAdvancedFilters() {
    setDiscovery("all");
    setCategories([]);
    setVisibleCount(12);
  }

  function closeAdvanced() {
    setShowAdvanced(false);
    setCategorySearch("");
  }

  return (
    <section className="explore-screen">
      <div className="explore-search-row">
        <div className="explore-search-box">
          <span className="explore-search-icon">
            <SearchIcon size={17} />
          </span>
          <input
            className="input explore-search-input"
            placeholder="Pesquisar perfis..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(12);
            }}
          />
          <button
            className={`explore-search-filter-btn${showAdvanced || hasActiveAdvanced ? " is-active" : ""}`}
            type="button"
            aria-label="Filtros avancados"
            onClick={() => setShowAdvanced((current) => !current)}
          >
            <OptionsIcon size={16} />
          </button>
        </div>
      </div>

      <div id="exploreSortRow" className="explore-sort-row">
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

      {hasActiveAdvanced ? (
        <div className="explore-active-filters-row">
          {discovery !== "all" ? (
            <button
              type="button"
              className="explore-active-filter-chip"
              onClick={() => {
                setDiscovery("all");
                setVisibleCount(12);
              }}
            >
              {DISCOVERY_OPTIONS.find((option) => option.key === discovery)?.label}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {categories.map((key) => (
            <button
              key={`active-${key}`}
              type="button"
              className="explore-active-filter-chip"
              onClick={() => {
                setCategories((current) => current.filter((entry) => entry !== key));
                setVisibleCount(12);
              }}
            >
              {CATEGORY_OPTIONS.find((option) => option.key === key)?.label || key}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}

      {showAdvanced ? (
        <div className="explore-advanced-backdrop" onClick={closeAdvanced}>
          <div
            className="explore-advanced-sheet"
            role="dialog"
            aria-label="Filtros avancados"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="explore-advanced-header">
              <h3>Filtros avancados</h3>
              <div className="explore-advanced-header-actions">
                <button type="button" className="explore-advanced-clear-btn" onClick={clearAdvancedFilters}>
                  Limpar
                </button>
                <button
                  type="button"
                  className="explore-advanced-close-btn"
                  aria-label="Fechar"
                  onClick={closeAdvanced}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="explore-advanced-body">
              <span className="explore-group-label">Descoberta</span>
              <div className="chips explore-advanced-chips">
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

              <span className="explore-group-label">Ordenar por</span>
              <div className="chips explore-advanced-chips">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`vore-chip-button${sortBy === option.key ? " active" : ""}`}
                    onClick={() => {
                      setSortBy(option.key);
                      setVisibleCount(12);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <span className="explore-group-label">Categorias</span>
              <div className="explore-category-search-box">
                <SearchIcon size={14} />
                <input
                  value={categorySearch}
                  placeholder="Pesquisar categoria..."
                  onChange={(event) => setCategorySearch(event.target.value)}
                />
              </div>
              <div className="explore-category-list">
                {visibleCategoryOptions.map((option) => {
                  const active = categories.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={`explore-category-row${active ? " is-active" : ""}`}
                      onClick={() => {
                        setCategories((current) =>
                          current.includes(option.key)
                            ? current.filter((entry) => entry !== option.key)
                            : [...current, option.key]
                        );
                        setVisibleCount(12);
                      }}
                    >
                      <span>{option.label}</span>
                      <span className={`explore-category-check${active ? " is-checked" : ""}`}>
                        {active ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
                {!visibleCategoryOptions.length ? (
                  <p className="muted explore-category-empty">Sem categorias para essa pesquisa.</p>
                ) : null}
              </div>
            </div>

            <button type="button" className="explore-advanced-done-btn" onClick={closeAdvanced}>
              Aplicar
            </button>
          </div>
        </div>
      ) : null}

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
              <p className="muted">{location || "Portugal"}</p>
              {rating ? (
                <p className="rating">
                  <svg className="rating-star" viewBox="0 0 20 20" aria-hidden="true">
                    <path
                      d="M10 1.6l2.47 5.24 5.77.75-4.19 4.03.99 5.76L10 14.87l-5.04 2.51.99-5.76-4.19-4.03 5.77-.75L10 1.6Z"
                      fill="currentColor"
                    />
                  </svg>
                  {rating}
                </p>
              ) : null}
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
