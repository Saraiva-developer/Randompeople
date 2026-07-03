import {
  getMergedItemImagesUi,
  applyMergedItemImagesUi,
  resolveProfileFilterUi,
  scoreLocalUi,
  inferProfileCategoryKeysUi,
  findTaxonomyKeysByQueryUi,
  parseRatingUi,
  parseRecentUi,
  getExploreFilteredProfilesUi,
} from "./exploreFilters.js";
import {
  getExplorePagerKeyUi,
  getExploreVisibleProfilesUi,
  loadMoreExploreItemsUi,
  setupExploreSentinelObserverUi,
} from "./explorePager.js";
import {
  renderExploreSortChipsUi,
  renderExploreActiveFiltersUi,
  renderHomeFiltersUi,
  renderHomeInsightsUi,
  renderDesktopRailUi,
  renderExploreTrendUi,
  renderExplorePagerUi,
} from "../ui/homeExploreScreen.js";

export function createHomeExploreFacade(ctx) {
  const {
    state,
    setState,
    esc,
    renderAll,
    normalizeText,
    HOME_FILTERS,
    HOME_FILTER_LABELS,
    EXPLORE_DISCOVERY_OPTIONS,
    EXPLORE_SORT_OPTIONS,
    CATEGORY_TAXONOMY,
    TAXONOMY_INDEX,
    getTotalProfileViews,
    getTrendingProfiles,
    explorePagerState,
    EXPLORE_PAGE_SIZE,
    el,
    hasAccessSession,
    PROFILE_TYPE_LABEL,
    resolveProfileOriginTab,
    openPublicProfile,
  } = ctx;

  function getMergedItemImages(item) {
    return getMergedItemImagesUi({
      toArrayList: ctx.toArrayList,
      pick: ctx.pick,
    }, item);
  }

  function applyMergedItemImages(item, merged) {
    return applyMergedItemImagesUi({
      toArrayList: ctx.toArrayList,
    }, item, merged);
  }

  function resolveProfileFilter(profile) {
    return resolveProfileFilterUi(profile);
  }

  function scoreLocal(profile) {
    return scoreLocalUi({
      resolveProfileFilter,
    }, profile);
  }

  function inferProfileCategoryKeys(profile) {
    return inferProfileCategoryKeysUi({
      normalizeText,
      TAXONOMY_INDEX,
    }, profile);
  }

  function findTaxonomyKeysByQuery(query) {
    return findTaxonomyKeysByQueryUi({
      normalizeText,
      TAXONOMY_INDEX,
    }, query);
  }

  function parseRating(profile) {
    return parseRatingUi(profile);
  }

  function parseRecent(profile) {
    return parseRecentUi(profile);
  }

  function getBadgeType(profile) {
    const raw = String((profile && profile.badge) || (profile && profile.data && profile.data.badge) || "").trim().toLowerCase();
    if (raw === "verif") return "verif";
    if (raw === "promo") return "promo";
    if (raw === "novo") return "novo";
    return "";
  }

  function getExploreFilteredProfiles() {
    return getExploreFilteredProfilesUi({
      state,
      normalizeText,
      findTaxonomyKeysByQuery,
      resolveProfileFilter,
      getBadgeType,
      inferProfileCategoryKeys,
      parseRating,
      parseRecent,
      scoreLocal,
    });
  }

  function getHomeExploreUiCtx() {
    return {
      el,
      state,
      setState,
      esc,
      renderAll,
      HOME_FILTERS,
      HOME_FILTER_LABELS,
      EXPLORE_DISCOVERY_OPTIONS,
      EXPLORE_SORT_OPTIONS,
      CATEGORY_TAXONOMY,
      normalizeText,
      getTotalProfileViews,
      getTrendingProfiles,
      getBadgeType,
      resolveProfileFilter,
      loadMoreExploreItems,
    };
  }

  function renderExploreSortChips() {
    renderExploreSortChipsUi(getHomeExploreUiCtx());
  }

  function removeExploreCategoryFilter(key) {
    const next = (Array.isArray(state.exploreCategoryFilters) ? state.exploreCategoryFilters : []).filter((k) => k !== key);
    setState({ exploreCategoryFilters: next });
    renderAll();
  }

  function renderExploreActiveFilters() {
    renderExploreActiveFiltersUi(getHomeExploreUiCtx());
  }

  function renderHomeFilters() {
    renderHomeFiltersUi(getHomeExploreUiCtx());
  }

  function renderHomeInsights() {
    renderHomeInsightsUi(getHomeExploreUiCtx());
  }

  function renderDesktopRail() {
    return renderDesktopRailUi({
      el,
      state,
      hasAccessSession,
      scoreLocal,
      PROFILE_TYPE_LABEL,
      getBadgeType,
      esc,
      resolveProfileOriginTab,
      openPublicProfile,
    });
  }

  function renderExploreTrend(exploreList) {
    renderExploreTrendUi(getHomeExploreUiCtx(), exploreList);
  }

  function getExplorePagerKey(list) {
    return getExplorePagerKeyUi({
      state,
    }, list);
  }

  function getExploreVisibleProfiles(list) {
    return getExploreVisibleProfilesUi({
      explorePagerState,
      EXPLORE_PAGE_SIZE,
      getExplorePagerKey,
    }, list);
  }

  function loadMoreExploreItems() {
    return loadMoreExploreItemsUi({
      explorePagerState,
      EXPLORE_PAGE_SIZE,
      renderAll,
    });
  }

  function setupExploreSentinelObserver() {
    return setupExploreSentinelObserverUi({
      el,
      state,
      explorePagerState,
      EXPLORE_PAGE_SIZE,
      loadMoreExploreItems,
    });
  }

  function renderExplorePager(totalCount, shownCount) {
    renderExplorePagerUi(getHomeExploreUiCtx(), totalCount, shownCount);
  }

  return {
    getMergedItemImages,
    applyMergedItemImages,
    resolveProfileFilter,
    scoreLocal,
    inferProfileCategoryKeys,
    findTaxonomyKeysByQuery,
    parseRating,
    parseRecent,
    getExploreFilteredProfiles,
    getHomeExploreUiCtx,
    renderExploreSortChips,
    removeExploreCategoryFilter,
    renderExploreActiveFilters,
    getBadgeType,
    renderHomeFilters,
    renderHomeInsights,
    renderDesktopRail,
    renderExploreTrend,
    getExplorePagerKey,
    getExploreVisibleProfiles,
    loadMoreExploreItems,
    setupExploreSentinelObserver,
    renderExplorePager,
  };
}
