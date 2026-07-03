export function setScreenUi(ctx, name, options = {}) {
  const {
    hasAccessSession,
    onRenderEntryGate,
    itemModalState,
    closeItemModal,
    reviewsState,
    closeReviewsModal,
    getAllowedTabs,
    state,
    setState,
    getProfileNavActiveOverride,
    setProfileNavActiveOverride,
    el,
    getNavActiveTab,
    onRenderExploreAdvancedModal,
    onRenderProfile,
    onRenderNotifications,
    onRenderSettings,
    onRenderEdit,
  } = ctx || {};

  if (!hasAccessSession()) {
    onRenderEntryGate();
    return;
  }
  if (itemModalState.open) closeItemModal();
  if (reviewsState.open) closeReviewsModal();
  const allowed = getAllowedTabs();
  const target = allowed.includes(name) ? name : (allowed[0] || "home");
  const navActiveTabRequested = String((options && options.navActiveTab) || "").trim();
  const currentOverride = String(getProfileNavActiveOverride() || "");
  if (target === "profile") {
    if (navActiveTabRequested && allowed.includes(navActiveTabRequested)) setProfileNavActiveOverride(navActiveTabRequested);
    else if (!options.keepNavActiveOverride) setProfileNavActiveOverride("");
    else setProfileNavActiveOverride(currentOverride);
  } else {
    setProfileNavActiveOverride("");
  }
  const prevTab = state.currentTab;
  if (target === "profile" && prevTab !== "profile" && prevTab !== "edit") {
    const nextReturn = prevTab === "explore" ? "explore" : (prevTab === "notifications" ? "notifications" : "home");
    setState({ profileReturnTab: nextReturn });
  }
  setState({ currentTab: target });
  el.screens.forEach((screen) => screen.classList.toggle("active", screen.id === target));
  if (el.appShell) {
    const isEdit = target === "edit";
    el.appShell.classList.toggle("edit-focus", isEdit);
    if (!isEdit || !options.keepEditNavOpen) el.appShell.classList.remove("edit-nav-open");
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
  if (el.nav) {
    const navActiveTab = getNavActiveTab();
    el.nav.querySelectorAll("button[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === navActiveTab));
  }
  if (target !== "explore" && state.exploreAdvancedOpen) {
    setState({ exploreAdvancedOpen: false });
    onRenderExploreAdvancedModal();
  }
  if (target === "profile") onRenderProfile();
  if (target === "notifications") onRenderNotifications();
  if (target === "settings") onRenderSettings();
  if (target === "edit") onRenderEdit();
}
