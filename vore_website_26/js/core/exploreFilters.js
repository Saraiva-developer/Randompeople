export function getMergedItemImagesUi(ctx, item) {
  const { toArrayList, pick } = ctx || {};
  const raw = toArrayList(item && item.images);
  const cover = pick(item, ["imageUrl", "image", "cover", "thumbnail"]);
  if (!cover) return raw;
  return [cover, ...raw.filter((src) => src !== cover)];
}

export function applyMergedItemImagesUi(ctx, item, merged) {
  const { toArrayList } = ctx || {};
  const list = toArrayList(merged);
  item.images = list;
  item.imageUrl = list[0] || "";
}

export function resolveProfileFilterUi(profile) {
  const explicit = String((profile && profile.filter) || (profile && profile.data && profile.data.filter) || "")
    .trim()
    .toLowerCase();
  if (explicit === "destaques" || explicit === "novidades" || explicit === "promocoes" || explicit === "perto") {
    return explicit;
  }
  const type = String((profile && profile.type) || (profile && profile.data && profile.data.type) || "service_pro")
    .toLowerCase();
  if (type === "shop") return "promocoes";
  if (type === "lodging") return "perto";
  if (type === "creator") return "novidades";
  return "destaques";
}

export function scoreLocalUi(ctx, profile) {
  const { resolveProfileFilter } = ctx || {};
  const filter = resolveProfileFilter(profile);
  const location = String((profile && profile.location) || "").toLowerCase();
  let score = 0;
  if (filter === "perto") score += 3;
  if (location.includes("portugal")) score += 1;
  return score;
}

export function inferProfileCategoryKeysUi(ctx, profile) {
  const { normalizeText, TAXONOMY_INDEX } = ctx || {};
  const p = profile && typeof profile === "object" ? profile : {};
  const data = p.data && typeof p.data === "object" ? p.data : {};
  const contentCategories = Array.isArray(data.contentCategories) ? data.contentCategories : [];
  const haystack = normalizeText(
    [p.name, p.category, p.location, p.about, data.about, ...contentCategories].join(" ")
  );
  if (!haystack) return [];
  return TAXONOMY_INDEX.filter((cat) => cat.normalizedTerms.some((term) => term && haystack.includes(term))).map(
    (cat) => cat.key
  );
}

export function findTaxonomyKeysByQueryUi(ctx, query) {
  const { normalizeText, TAXONOMY_INDEX } = ctx || {};
  const q = normalizeText(query);
  if (!q) return [];
  return TAXONOMY_INDEX.filter((cat) => cat.normalizedTerms.some((term) => term.includes(q))).map((cat) => cat.key);
}

export function parseRatingUi(profile) {
  const n = Number(String((profile && profile.rating) || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function parseRecentUi(profile) {
  const source =
    (profile &&
      (profile.updated_at || profile.created_at || (profile.data && (profile.data.updatedAt || profile.data.createdAt)))) ||
    "";
  const ts = Date.parse(String(source || ""));
  return Number.isFinite(ts) ? ts : 0;
}

export function getExploreFilteredProfilesUi(ctx) {
  const {
    state,
    normalizeText,
    findTaxonomyKeysByQuery,
    resolveProfileFilter,
    getBadgeType,
    inferProfileCategoryKeys,
    parseRating,
    parseRecent,
    scoreLocal,
  } = ctx || {};
  const list = Array.isArray(state.profiles) ? state.profiles : [];
  const searchText = normalizeText(state.exploreSearch || "");
  const discoveryFilter = String(state.exploreDiscoveryFilter || "all");
  const categoryFilters = Array.isArray(state.exploreCategoryFilters) ? state.exploreCategoryFilters : [];
  const sortBy = String(state.exploreSortBy || "relevance");
  const taxonomyKeysFromSearch = findTaxonomyKeysByQuery(searchText);

  const filtered = list.filter((p) => {
    const name = normalizeText((p && p.name) || "");
    const category = normalizeText((p && p.category) || "");
    const location = normalizeText((p && p.location) || "");
    const about = normalizeText((p && (p.about || (p.data && p.data.about))) || "");
    const contentCategories = Array.isArray(p && p.data && p.data.contentCategories)
      ? p.data.contentCategories.map((item) => normalizeText(item || ""))
      : [];
    const categoryHaystack = [name, category, about, contentCategories.join(" ")].join(" ").trim();
    const filter = resolveProfileFilter(p);
    const badge = getBadgeType(p);
    const profileTaxonomyKeys = inferProfileCategoryKeys(p);

    const searchMatch =
      !searchText ||
      name.includes(searchText) ||
      category.includes(searchText) ||
      location.includes(searchText) ||
      (taxonomyKeysFromSearch.length > 0 &&
        profileTaxonomyKeys.some((key) => taxonomyKeysFromSearch.includes(key)));

    const discoveryMatch =
      discoveryFilter === "all" ||
      (discoveryFilter === "perto" && filter === "perto") ||
      (discoveryFilter === "promocoes" && (filter === "promocoes" || badge === "promo")) ||
      (discoveryFilter === "novidades" && (filter === "novidades" || badge === "novo")) ||
      (discoveryFilter === "verif" && badge === "verif");

    const categoryMatch =
      !categoryFilters.length ||
      categoryFilters.some((selected) => profileTaxonomyKeys.includes(selected) || categoryHaystack.includes(selected));

    return searchMatch && discoveryMatch && categoryMatch;
  });

  const ranked = filtered.slice();
  ranked.sort((a, b) => {
    if (sortBy === "rating") return parseRating(b) - parseRating(a);
    if (sortBy === "recent") return parseRecent(b) - parseRecent(a);
    if (sortBy === "near") {
      const nearDiff = scoreLocal(b) - scoreLocal(a);
      if (nearDiff !== 0) return nearDiff;
      return parseRating(b) - parseRating(a);
    }
    const relevanceA = (searchText ? 0 : 1) + scoreLocal(a);
    const relevanceB = (searchText ? 0 : 1) + scoreLocal(b);
    const diff = relevanceB - relevanceA;
    if (diff !== 0) return diff;
    return parseRating(b) - parseRating(a);
  });
  return ranked;
}
