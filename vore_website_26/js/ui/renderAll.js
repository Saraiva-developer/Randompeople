export function renderAllUi(ctx) {
  const {
    applyUiLanguageLabels,
    applyNavigationAccess,
    renderEntryGate,
    hasAccessSession,
    setNotificationsNavCount,
    el,
    tUi,
    ensurePersonalStoreLoaded,
    mergeIncomingSharesForCurrentUser,
    ensureMetricsStoreLoaded,
    getAllowedTabs,
    state,
    setState,
    getNavActiveTab,
    resolveProfileFilter,
    scoreLocal,
    getExploreFilteredProfiles,
    getExploreVisibleProfiles,
    renderHomeFilters,
    renderHomeInsights,
    renderCards,
    renderExploreSortChips,
    renderExploreTrend,
    renderExploreActiveFilters,
    renderExplorePager,
    renderExploreAdvancedModal,
    renderNotifications,
    renderProfile,
    renderSettings,
    renderDesktopRail,
  } = ctx || {};

  applyUiLanguageLabels();
  applyNavigationAccess();
  renderEntryGate();
  if (!hasAccessSession()) {
    if (el.appShell) el.appShell.classList.remove("edit-focus");
    if (el.appShell) el.appShell.classList.remove("edit-nav-open");
    setNotificationsNavCount(0);
    if (el.desktopRail) el.desktopRail.innerHTML = "";
    if (el.status) el.status.textContent = tUi("status.chooseAccess", "Seleciona Entrar, Registar ou Convidado.");
    return;
  }
  ensurePersonalStoreLoaded();
  mergeIncomingSharesForCurrentUser();
  ensureMetricsStoreLoaded();
  const allowed = getAllowedTabs();
  if (!allowed.includes(state.currentTab) && allowed[0]) {
    setState({ currentTab: allowed[0] });
  }
  if (el.appShell) {
    const isEdit = state.currentTab === "edit";
    el.appShell.classList.toggle("edit-focus", isEdit);
    if (!isEdit) el.appShell.classList.remove("edit-nav-open");
  }
  if (el.editNavHandle) {
    const isEdit = !!(el.appShell && el.appShell.classList.contains("edit-focus"));
    const isOpen = !!(el.appShell && el.appShell.classList.contains("edit-nav-open"));
    el.editNavHandle.setAttribute("aria-hidden", isEdit ? "false" : "true");
    const toggleBtn = el.editNavHandle.querySelector("button[data-edit-nav-toggle]");
    if (toggleBtn) {
      const nextLabel = isOpen ? "Fechar navegacao" : "Abrir navegacao";
      toggleBtn.setAttribute("aria-label", nextLabel);
      toggleBtn.setAttribute("title", nextLabel);
    }
  }
  el.screens.forEach((screen) => screen.classList.toggle("active", screen.id === state.currentTab));
  if (el.nav) {
    const navActiveTab = getNavActiveTab();
    el.nav.querySelectorAll("button[data-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === navActiveTab);
    });
  }
  if (el.search && el.search.value !== String(state.exploreSearch || "")) {
    el.search.value = String(state.exploreSearch || "");
  }
  const activeHomeFilter = String(state.homeFilter || "destaques");
  const homeRaw = state.profiles.filter((p) => (activeHomeFilter === "destaques" ? true : resolveProfileFilter(p) === activeHomeFilter));
  const homeList = [...homeRaw].sort((a, b) => scoreLocal(b) - scoreLocal(a));
  const isDesktop = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(min-width: 1100px)").matches;
  const suggestedLimit = isDesktop ? 8 : 5;
  const suggested = [...state.profiles].sort((a, b) => scoreLocal(b) - scoreLocal(a)).slice(0, suggestedLimit);
  const exploreList = getExploreFilteredProfiles();
  const exploreVisibleList = getExploreVisibleProfiles(exploreList);

  renderHomeFilters();
  renderHomeInsights();
  renderCards(homeList, el.home, { emptyText: "Sem perfis para este filtro." });
  if (el.homeSuggested) renderCards(suggested, el.homeSuggested, { compact: true, emptyText: "Sem sugestoes." });
  renderExploreSortChips();
  if (el.exploreOpenFilters) {
    el.exploreOpenFilters.classList.toggle("active", !!state.exploreAdvancedOpen);
  }
  if (el.exploreMetaText) {
    const count = exploreList.length;
    el.exploreMetaText.textContent = count + " " + (count === 1 ? "resultado" : "resultados");
  }
  renderExploreTrend(exploreList);
  renderExploreActiveFilters();
  renderCards(exploreVisibleList, el.explore, { emptyText: "Sem resultados para os filtros atuais." });
  renderExplorePager(exploreList.length, exploreVisibleList.length);
  renderExploreAdvancedModal();
  renderNotifications();
  renderProfile();
  renderSettings();
  renderDesktopRail();
}
