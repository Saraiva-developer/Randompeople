export function bindGlobalEvents(ctx) {
  const {
    el,
    setState,
    renderAll,
    state,
    closeItemModal,
    closeReviewsModal,
    closeSharePicker,
    updateProfileStickyOffsets,
    setScreen,
    isCommonUser,
    getOwnProfileForAuthUser,
  } = ctx || {};

  if (el.nav) {
    el.nav.addEventListener("click", (ev) => {
      const button = ev.target.closest("button[data-tab]");
      if (button) {
        const tab = String(button.dataset.tab || "");
        if (tab === "profile" && isCommonUser()) {
          setState({ profileContext: "personal" });
        } else if (tab === "profile" && state.authUser) {
          const ownProfile = getOwnProfileForAuthUser();
          if (ownProfile) setState({ selectedProfileId: ownProfile.id });
        }
        setScreen(tab);
      }
    });
  }
  if (el.editNavHandle) {
    el.editNavHandle.addEventListener("click", (ev) => {
      const toggleBtn = ev.target.closest("button[data-edit-nav-toggle]");
      if (!toggleBtn) return;
      if (!el.appShell || !el.appShell.classList.contains("edit-focus")) return;
      const nowOpen = el.appShell.classList.toggle("edit-nav-open");
      const nextLabel = nowOpen ? "Fechar navegacao" : "Abrir navegacao";
      toggleBtn.setAttribute("aria-label", nextLabel);
      toggleBtn.setAttribute("title", nextLabel);
    });
  }
  if (el.search) {
    el.search.addEventListener("input", () => {
      setState({ exploreSearch: el.search.value || "" });
      renderAll();
    });
  }
  if (el.exploreOpenFilters) {
    el.exploreOpenFilters.addEventListener("click", () => {
      setState({ exploreAdvancedOpen: !state.exploreAdvancedOpen });
      renderAll();
    });
  }
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    closeItemModal();
    closeReviewsModal();
    closeSharePicker();
    if (state.exploreAdvancedOpen) {
      setState({ exploreAdvancedOpen: false });
      renderAll();
    }
  });
  window.addEventListener("resize", () => {
    updateProfileStickyOffsets();
  });
  window.addEventListener("orientationchange", () => {
    updateProfileStickyOffsets();
  });
}
