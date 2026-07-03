export function startAppUi(ctx) {
  const {
    el,
    tUi,
    setupExploreSentinelObserver,
    renderEntryGate,
    setState,
    bootstrap,
  } = ctx || {};

  if (!el.nav || !el.home || !el.explore || !el.explorePager || !el.head || !el.tabs || !el.subtabs || !el.content || !el.notificationsFilters || !el.notificationsList || !el.edit || !el.settings || !el.entryGate || !el.appShell) {
    if (el.status) el.status.textContent = tUi("status.missingLayout", "Erro: elementos base do layout em falta.");
  } else {
    setupExploreSentinelObserver();
    renderEntryGate();
    setState({ currentTab: "home" });
    bootstrap();
  }
}
