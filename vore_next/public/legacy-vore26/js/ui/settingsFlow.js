export async function handleSettingsLogoutUi(ctx) {
  const {
    api,
    closeSharePicker,
    closeItemModal,
    closeReviewsModal,
    setState,
    personalStore,
    notificationsStore,
    resetRecommendationsStore,
    metricsStore,
    settingsUi,
    entryUi,
    renderAll,
  } = ctx || {};
  try {
    await api.authLogout();
  } catch (_e) {}
  closeSharePicker();
  closeItemModal();
  closeReviewsModal();
  setState({
    authUser: null,
    guestMode: false,
    authEntryView: "welcome",
    currentTab: "home",
    profileContext: "public",
    notificationsFilter: "all",
  });
  personalStore.loadedForUserId = 0;
  personalStore.data = null;
  notificationsStore.loadedForUserId = 0;
  notificationsStore.readKeys = [];
  resetRecommendationsStore();
  metricsStore.loadedForKey = "";
  metricsStore.dayKey = "";
  metricsStore.profileViews = {};
  settingsUi.message = "";
  settingsUi.view = "main";
  entryUi.error = "";
  entryUi.success = "";
  entryUi.pending = false;
  renderAll();
}

export function setNotificationsNavCountUi(ctx, count) {
  const { el, NAV_LABELS, esc } = ctx || {};
  if (!el.nav) return;
  const btn = el.nav.querySelector('button[data-tab="notifications"]');
  if (!btn) return;
  const safe = Math.max(0, Number(count || 0));
  const labelNode = btn.querySelector(".nav-btn-label");
  if (labelNode) labelNode.textContent = NAV_LABELS.notifications;
  else btn.textContent = NAV_LABELS.notifications;
  let dot = btn.querySelector(".nav-dot");
  if (safe > 0) {
    if (!dot) {
      dot = document.createElement("span");
      dot.className = "nav-dot";
      btn.appendChild(dot);
    }
    dot.textContent = esc(safe > 99 ? "99+" : String(safe));
  } else if (dot && dot.parentNode) {
    dot.parentNode.removeChild(dot);
  }
}
