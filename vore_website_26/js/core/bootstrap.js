export async function bootstrapUi(ctx) {
  const {
    el,
    tUi,
    getStoredLanguage,
    settingsUi,
    setState,
    renderEntryGate,
    api,
    resetRecommendationsStore,
    mapProfileRow,
    refreshRecommendationsForCurrentUser,
    renderAll,
    hasAccessSession,
    esc,
  } = ctx || {};

  if (el.status) el.status.textContent = tUi("status.loading", "A carregar...");
  try {
    const storedLanguage = getStoredLanguage();
    if (storedLanguage) settingsUi.language = storedLanguage;
    setState({ authEntryView: "loading", authLoading: true });
    renderEntryGate();
    const me = await api.authMe();
    if (me && me.authenticated && me.user) {
      setState({
        authUser: me.user,
        guestMode: false,
        authEntryView: "welcome",
        authLoading: false,
        notificationsFilter: "all",
        profileContext: String(me && me.user && me.user.account_type || "").toLowerCase() === "common" ? "personal" : "public",
      });
      settingsUi.credentials.email = String(me.user.email || "");
    } else {
      setState({ authUser: null, guestMode: false, authEntryView: "welcome", authLoading: false, profileContext: "public", notificationsFilter: "all" });
      resetRecommendationsStore();
    }
    const feed = await api.profilesFeed(120);
    const profiles = ((feed && feed.profiles) || []).map(mapProfileRow);
    setState({ profiles, selectedProfileId: profiles[0] ? profiles[0].id : null });
    if (me && me.authenticated && me.user && String(me.user.account_type || "").toLowerCase() === "common") {
      await refreshRecommendationsForCurrentUser({ force: true, silent: true });
    } else {
      resetRecommendationsStore();
    }
    renderAll();
    if (el.status) {
      if (hasAccessSession()) el.status.textContent = tUi("status.loadedProfiles", "Perfis carregados: {count}", { count: profiles.length });
      else el.status.textContent = tUi("status.chooseAccess", "Seleciona Entrar, Registar ou Convidado.");
    }
  } catch (err) {
    setState({ authLoading: false, authEntryView: "welcome", guestMode: false, authUser: null, profileContext: "public", notificationsFilter: "all" });
    resetRecommendationsStore();
    renderEntryGate();
    if (el.status) el.status.textContent = tUi("status.errorPrefix", "Erro: ") + esc((err && err.message) || err);
  }
}
