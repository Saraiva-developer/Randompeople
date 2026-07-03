import {
  buildItemShareUriFromPayloadUi,
  mapRecommendationEntryUi,
  setRecommendationContactsFromListsUi,
  resetRecommendationsStoreUi,
  refreshRecommendationsForCurrentUserUi,
  getCurrentUserInboxEntriesUi,
  markCurrentUserInboxEntryReadUi,
  mergeIncomingSharesForCurrentUserUi,
  countUnreadSharesUi,
  upsertShareContactUi,
  getShareContactsUi,
  loadSharePickerUsersUi,
  dispatchShareUi,
  handleRecommendationPermissionActionUi,
  handleRecommendationReactionUi,
} from "./recommendations.js";

export function createRecommendationsFacade(ctx) {
  const api = {};

  api.buildItemShareUriFromPayload = (payload) =>
    buildItemShareUriFromPayloadUi(
      {
        pick: ctx.pick,
        getItemMediaList: ctx.getItemMediaList,
      },
      payload
    );

  api.mapRecommendationEntry = (rawEntry, mode = "inbox") =>
    mapRecommendationEntryUi(
      {
        state: ctx.state,
        normalizeEmail: ctx.normalizeEmail,
        isNotificationRead: ctx.isNotificationRead,
        deepClone: ctx.deepClone,
      },
      rawEntry,
      mode
    );

  api.setRecommendationContactsFromLists = (inboxList, sentList) =>
    setRecommendationContactsFromListsUi(
      {
        recommendationsStore: ctx.recommendationsStore,
        normalizeEmail: ctx.normalizeEmail,
        isValidEmail: ctx.isValidEmail,
        state: ctx.state,
      },
      inboxList,
      sentList
    );

  api.resetRecommendationsStore = () => resetRecommendationsStoreUi(ctx.recommendationsStore);

  api.refreshRecommendationsForCurrentUser = (options = {}) =>
    refreshRecommendationsForCurrentUserUi(
      {
        state: ctx.state,
        isCommonUser: ctx.isCommonUser,
        resetRecommendationsStore: api.resetRecommendationsStore,
        recommendationsStore: ctx.recommendationsStore,
        api: ctx.api,
        mapRecommendationEntry: api.mapRecommendationEntry,
        setRecommendationContactsFromLists: api.setRecommendationContactsFromLists,
        hasAccessSession: ctx.hasAccessSession,
        renderNotifications: ctx.renderNotifications,
        renderProfile: ctx.renderProfile,
      },
      options
    );

  api.getCurrentUserInboxEntries = () =>
    getCurrentUserInboxEntriesUi({
      isCommonUser: ctx.isCommonUser,
      recommendationsStore: ctx.recommendationsStore,
    });

  api.markCurrentUserInboxEntryRead = (entryId) =>
    markCurrentUserInboxEntryReadUi(
      {
        markNotificationRead: ctx.markNotificationRead,
        recommendationsStore: ctx.recommendationsStore,
      },
      entryId
    );

  api.mergeIncomingSharesForCurrentUser = () =>
    mergeIncomingSharesForCurrentUserUi({
      isCommonUser: ctx.isCommonUser,
      refreshRecommendationsForCurrentUser: api.refreshRecommendationsForCurrentUser,
    });

  api.countUnreadShares = () => countUnreadSharesUi(ctx.recommendationsStore);

  api.upsertShareContact = (email, name = "") =>
    upsertShareContactUi(
      {
        recommendationsStore: ctx.recommendationsStore,
        normalizeEmail: ctx.normalizeEmail,
        isValidEmail: ctx.isValidEmail,
      },
      email,
      name
    );

  api.getShareContacts = () => getShareContactsUi(ctx.recommendationsStore);

  api.loadSharePickerUsers = (query) =>
    loadSharePickerUsersUi(
      {
        sharePickerState: ctx.sharePickerState,
        api: ctx.api,
        normalizeEmail: ctx.normalizeEmail,
        isValidEmail: ctx.isValidEmail,
      },
      query
    );

  api.dispatchShare = (payload, toEmailValue, toName = "") =>
    dispatchShareUi(
      {
        isCommonUser: ctx.isCommonUser,
        normalizeEmail: ctx.normalizeEmail,
        isValidEmail: ctx.isValidEmail,
        api: ctx.api,
        upsertShareContact: api.upsertShareContact,
        refreshRecommendationsForCurrentUser: api.refreshRecommendationsForCurrentUser,
        buildItemShareUriFromPayload: api.buildItemShareUriFromPayload,
      },
      payload,
      toEmailValue,
      toName
    );

  api.handleRecommendationPermissionAction = (action, senderUserId) =>
    handleRecommendationPermissionActionUi(
      {
        isCommonUser: ctx.isCommonUser,
        api: ctx.api,
        refreshRecommendationsForCurrentUser: api.refreshRecommendationsForCurrentUser,
      },
      action,
      senderUserId
    );

  api.handleRecommendationReaction = (recommendationId, reaction) =>
    handleRecommendationReactionUi(
      {
        isCommonUser: ctx.isCommonUser,
        api: ctx.api,
        refreshRecommendationsForCurrentUser: api.refreshRecommendationsForCurrentUser,
      },
      recommendationId,
      reaction
    );

  return api;
}
