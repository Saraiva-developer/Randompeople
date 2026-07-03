export function renderSettingsFacade(ctx) {
  const {
    el,
    settingsUi,
    state,
    getStoredLanguage,
    renderSettingsScreen,
    isGuestUser,
    isCommonUser,
    isProfessionalUser,
    esc,
    tUi,
    settingsRowHtml,
    settingsToggleHtml,
    localizeSettingsHtml,
    renderSettings,
    renderAll,
    setScreen,
    setState,
    handleSettingsLogout,
  } = ctx || {};
  if (!el.settings) return;
  const persistedLanguage = getStoredLanguage();
  if (persistedLanguage) settingsUi.language = persistedLanguage;
  if (state.authUser && state.authUser.email && !settingsUi.credentials.email) {
    settingsUi.credentials.email = String(state.authUser.email);
  }
  return renderSettingsScreen({
    root: el.settings,
    authUser: state.authUser,
    settingsUi,
    isGuestUser,
    isCommonUser,
    isProfessionalUser,
    esc,
    tUi,
    settingsRowHtml,
    settingsToggleHtml,
    localizeSettingsHtml,
    onRender: renderSettings,
    onRenderAll: renderAll,
    onOpenEditProfile: () => setScreen("edit"),
    onOpenProfile: () => setScreen("profile"),
    onSetPersonalProfileContext: () => {
      if (isCommonUser()) setState({ profileContext: "personal" });
    },
    onLogout: handleSettingsLogout,
  });
}

export function renderNotificationsFacade(ctx) {
  const {
    renderNotificationsScreen,
    el,
    state,
    esc,
    setState,
    renderNotifications,
    getCurrentUserInboxEntries,
    deepClone,
    isNotificationRead,
    getBadgeType,
    resolveProfileFilter,
    markNotificationRead,
    markCurrentUserInboxEntryRead,
    openSharedEntry,
    openPublicProfile,
    formatRelativeTime,
    toTimestampMs,
    renderAll,
    setNotificationsNavCount,
  } = ctx || {};
  return renderNotificationsScreen({
    rootList: el.notificationsList,
    rootFilters: el.notificationsFilters,
    authUser: state.authUser,
    profiles: state.profiles,
    notificationsFilter: state.notificationsFilter,
    esc,
    setNotificationsFilter: (value) => {
      setState({ notificationsFilter: String(value || "all") });
      renderNotifications();
    },
    getCurrentUserInboxEntries,
    deepClone,
    isNotificationRead,
    getBadgeType,
    resolveProfileFilter,
    markNotificationRead,
    markCurrentUserInboxEntryRead,
    openSharedEntry,
    openPublicProfile,
    formatRelativeTime,
    toTimestampMs,
    renderAll,
    setNavCount: setNotificationsNavCount,
  });
}
