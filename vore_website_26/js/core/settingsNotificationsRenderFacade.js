import { renderSettingsFacade, renderNotificationsFacade } from "../ui/settingsNotificationsFacade.js";
import { setNotificationsNavCountUi } from "../ui/settingsFlow.js";

export function createSettingsNotificationsRenderFacade(ctx) {
  function setNotificationsNavCount(count) {
    return setNotificationsNavCountUi({
      el: ctx.el,
      NAV_LABELS: ctx.NAV_LABELS,
      esc: ctx.esc,
    }, count);
  }

  function renderSettings() {
    return renderSettingsFacade({
      el: ctx.el,
      settingsUi: ctx.settingsUi,
      state: ctx.state,
      getStoredLanguage: ctx.getStoredLanguage,
      renderSettingsScreen: ctx.renderSettingsScreen,
      isGuestUser: ctx.isGuestUser,
      isCommonUser: ctx.isCommonUser,
      isProfessionalUser: ctx.isProfessionalUser,
      esc: ctx.esc,
      tUi: ctx.tUi,
      settingsRowHtml: ctx.settingsRowHtml,
      settingsToggleHtml: ctx.settingsToggleHtml,
      localizeSettingsHtml: ctx.localizeSettingsHtml,
      renderSettings,
      renderAll: ctx.renderAll,
      setScreen: ctx.setScreen,
      setState: ctx.setState,
      handleSettingsLogout: ctx.handleSettingsLogout,
    });
  }

  function renderNotifications() {
    return renderNotificationsFacade({
      renderNotificationsScreen: ctx.renderNotificationsScreen,
      el: ctx.el,
      state: ctx.state,
      esc: ctx.esc,
      setState: ctx.setState,
      renderNotifications,
      getCurrentUserInboxEntries: ctx.getCurrentUserInboxEntries,
      deepClone: ctx.deepClone,
      isNotificationRead: ctx.isNotificationRead,
      getBadgeType: ctx.getBadgeType,
      resolveProfileFilter: ctx.resolveProfileFilter,
      markNotificationRead: ctx.markNotificationRead,
      markCurrentUserInboxEntryRead: ctx.markCurrentUserInboxEntryRead,
      openSharedEntry: ctx.openSharedEntry,
      openPublicProfile: ctx.openPublicProfile,
      formatRelativeTime: ctx.formatRelativeTime,
      toTimestampMs: ctx.toTimestampMs,
      renderAll: ctx.renderAll,
      setNotificationsNavCount,
    });
  }

  return {
    setNotificationsNavCount,
    renderSettings,
    renderNotifications,
  };
}
