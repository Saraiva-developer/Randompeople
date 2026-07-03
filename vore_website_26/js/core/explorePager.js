let exploreSentinelObserver = null;

export function getExplorePagerKeyUi(ctx, list) {
  const { state } = ctx || {};
  const ids = (Array.isArray(list) ? list : [])
    .slice(0, 80)
    .map((entry) => String((entry && entry.id) || 0))
    .join(",");
  return [
    String(state.exploreSearch || "").trim().toLowerCase(),
    String(state.exploreDiscoveryFilter || "all"),
    String(state.exploreSortBy || "relevance"),
    (Array.isArray(state.exploreCategoryFilters) ? state.exploreCategoryFilters : []).slice().sort().join(","),
    String((Array.isArray(list) ? list.length : 0)),
    ids,
  ].join("|");
}

export function getExploreVisibleProfilesUi(ctx, list) {
  const { explorePagerState, EXPLORE_PAGE_SIZE, getExplorePagerKey } = ctx || {};
  const safeList = Array.isArray(list) ? list : [];
  explorePagerState.totalCount = safeList.length;
  const nextKey = getExplorePagerKey(safeList);
  if (explorePagerState.key !== nextKey) {
    explorePagerState.key = nextKey;
    explorePagerState.visibleCount = EXPLORE_PAGE_SIZE;
    explorePagerState.lastAutoLoadAt = 0;
  }
  return safeList.slice(0, Math.max(EXPLORE_PAGE_SIZE, Number(explorePagerState.visibleCount || EXPLORE_PAGE_SIZE)));
}

export function loadMoreExploreItemsUi(ctx) {
  const { explorePagerState, EXPLORE_PAGE_SIZE, renderAll } = ctx || {};
  const total = Math.max(0, Number(explorePagerState.totalCount || 0));
  if (!total) return;
  const current = Math.max(EXPLORE_PAGE_SIZE, Number(explorePagerState.visibleCount || EXPLORE_PAGE_SIZE));
  if (current >= total) return;
  explorePagerState.visibleCount = Math.min(total, current + EXPLORE_PAGE_SIZE);
  renderAll();
}

export function setupExploreSentinelObserverUi(ctx) {
  const { el, state, explorePagerState, EXPLORE_PAGE_SIZE, loadMoreExploreItems } = ctx || {};
  if (!el.exploreSentinel) return;
  if (exploreSentinelObserver) return;
  if (typeof IntersectionObserver !== "function") return;
  exploreSentinelObserver = new IntersectionObserver(
    (entries) => {
      const first = Array.isArray(entries) && entries[0] ? entries[0] : null;
      if (!first || !first.isIntersecting) return;
      if (state.currentTab !== "explore") return;
      const now = Date.now();
      if (now - Number(explorePagerState.lastAutoLoadAt || 0) < 260) return;
      const total = Math.max(0, Number(explorePagerState.totalCount || 0));
      const visible = Math.max(EXPLORE_PAGE_SIZE, Number(explorePagerState.visibleCount || EXPLORE_PAGE_SIZE));
      if (visible >= total) return;
      explorePagerState.lastAutoLoadAt = now;
      loadMoreExploreItems();
    },
    { root: null, threshold: 0.1, rootMargin: "240px 0px 320px 0px" }
  );
  exploreSentinelObserver.observe(el.exploreSentinel);
}
