import {
  blankPersonalDataUi,
  getPersonalStorageKeyUi,
  getCommonUserIdUi,
  ensurePersonalStoreLoadedUi,
  persistPersonalStoreUi,
  getCurrentUserIdUi,
  getNotificationsStorageKeyUi,
  ensureNotificationsStoreLoadedUi,
  persistNotificationsStoreUi,
  isNotificationReadUi,
  markNotificationReadUi,
  isProfileSavedUi,
  toggleSavedProfileUi,
  addRecentProfileUi,
} from "./personalStore.js";
import {
  getMetricsDayKeyUi,
  getGuestClientIdUi,
  getMetricsClientKeyUi,
  getMetricsStorageKeyUi,
  ensureMetricsStoreLoadedUi,
  persistMetricsStoreUi,
  incrementProfileViewUi,
  getProfileViewCountUi,
  getTotalProfileViewsUi,
  getTrendingProfilesUi,
} from "./metricsStore.js";
import {
  buildSavedMediaKeyUi,
  buildSavedItemKeyUi,
  isCurrentModalSavedUi,
  toggleCurrentModalSaveUi,
} from "./modalSaves.js";

export function createUserStoreFacade(ctx) {
  const api = {};

  api.blankPersonalData = () => blankPersonalDataUi();
  api.getPersonalStorageKey = (userId) => getPersonalStorageKeyUi(userId);
  api.getCommonUserId = () =>
    getCommonUserIdUi({
      isCommonUser: ctx.isCommonUser,
      state: ctx.state,
    });

  api.ensurePersonalStoreLoaded = () =>
    ensurePersonalStoreLoadedUi({
      personalStore: ctx.personalStore,
      getCommonUserId: api.getCommonUserId,
      blankPersonalData: api.blankPersonalData,
      getPersonalStorageKey: api.getPersonalStorageKey,
      normalizeEmail: ctx.normalizeEmail,
      isValidEmail: ctx.isValidEmail,
      localStorageRef: ctx.localStorageRef,
    });

  api.persistPersonalStore = () =>
    persistPersonalStoreUi({
      personalStore: ctx.personalStore,
      getCommonUserId: api.getCommonUserId,
      getPersonalStorageKey: api.getPersonalStorageKey,
      localStorageRef: ctx.localStorageRef,
    });

  api.getCurrentUserId = () => getCurrentUserIdUi(ctx.state);
  api.getNotificationsStorageKey = (userId) => getNotificationsStorageKeyUi(userId);

  api.ensureNotificationsStoreLoaded = () =>
    ensureNotificationsStoreLoadedUi({
      notificationsStore: ctx.notificationsStore,
      getCurrentUserId: api.getCurrentUserId,
      getNotificationsStorageKey: api.getNotificationsStorageKey,
      localStorageRef: ctx.localStorageRef,
    });

  api.persistNotificationsStore = () =>
    persistNotificationsStoreUi({
      notificationsStore: ctx.notificationsStore,
      getCurrentUserId: api.getCurrentUserId,
      getNotificationsStorageKey: api.getNotificationsStorageKey,
      localStorageRef: ctx.localStorageRef,
    });

  api.isNotificationRead = (key) =>
    isNotificationReadUi(
      {
        ensureNotificationsStoreLoaded: api.ensureNotificationsStoreLoaded,
        notificationsStore: ctx.notificationsStore,
      },
      key
    );

  api.markNotificationRead = (key) =>
    markNotificationReadUi(
      {
        ensureNotificationsStoreLoaded: api.ensureNotificationsStoreLoaded,
        notificationsStore: ctx.notificationsStore,
        persistNotificationsStore: api.persistNotificationsStore,
      },
      key
    );

  api.getMetricsDayKey = () => getMetricsDayKeyUi();
  api.getGuestClientId = () => getGuestClientIdUi(ctx.localStorageRef);
  api.getMetricsClientKey = () =>
    getMetricsClientKeyUi({
      getCurrentUserId: api.getCurrentUserId,
      getGuestClientId: api.getGuestClientId,
    });
  api.getMetricsStorageKey = (clientKey) => getMetricsStorageKeyUi(clientKey);

  api.ensureMetricsStoreLoaded = () =>
    ensureMetricsStoreLoadedUi({
      metricsStore: ctx.metricsStore,
      getMetricsClientKey: api.getMetricsClientKey,
      getMetricsDayKey: api.getMetricsDayKey,
      getMetricsStorageKey: api.getMetricsStorageKey,
      localStorageRef: ctx.localStorageRef,
    });

  api.persistMetricsStore = () =>
    persistMetricsStoreUi({
      metricsStore: ctx.metricsStore,
      getMetricsClientKey: api.getMetricsClientKey,
      getMetricsStorageKey: api.getMetricsStorageKey,
      getMetricsDayKey: api.getMetricsDayKey,
      localStorageRef: ctx.localStorageRef,
    });

  api.incrementProfileView = (profileId) =>
    incrementProfileViewUi(
      {
        metricsStore: ctx.metricsStore,
        ensureMetricsStoreLoaded: api.ensureMetricsStoreLoaded,
        persistMetricsStore: api.persistMetricsStore,
      },
      profileId
    );

  api.getProfileViewCount = (profileId) =>
    getProfileViewCountUi(
      {
        metricsStore: ctx.metricsStore,
        ensureMetricsStoreLoaded: api.ensureMetricsStoreLoaded,
      },
      profileId
    );

  api.getTotalProfileViews = () =>
    getTotalProfileViewsUi({
      metricsStore: ctx.metricsStore,
      ensureMetricsStoreLoaded: api.ensureMetricsStoreLoaded,
    });

  api.getTrendingProfiles = (sourceProfiles, limit = 3) =>
    getTrendingProfilesUi(
      {
        getProfileViewCount: api.getProfileViewCount,
        parseRating: ctx.parseRating,
        getBadgeType: ctx.getBadgeType,
      },
      sourceProfiles,
      limit
    );

  api.isProfileSaved = (profileId) =>
    isProfileSavedUi(
      {
        ensurePersonalStoreLoaded: api.ensurePersonalStoreLoaded,
        personalStore: ctx.personalStore,
      },
      profileId
    );

  api.toggleSavedProfile = (profileId) =>
    toggleSavedProfileUi(
      {
        ensurePersonalStoreLoaded: api.ensurePersonalStoreLoaded,
        personalStore: ctx.personalStore,
        persistPersonalStore: api.persistPersonalStore,
      },
      profileId
    );

  api.addRecentProfile = (profileId) =>
    addRecentProfileUi(
      {
        ensurePersonalStoreLoaded: api.ensurePersonalStoreLoaded,
        personalStore: ctx.personalStore,
        persistPersonalStore: api.persistPersonalStore,
      },
      profileId
    );

  api.buildSavedMediaKey = (profileId, tabId, mediaUrl) =>
    buildSavedMediaKeyUi(profileId, tabId, mediaUrl);

  api.buildSavedItemKey = (profileId, tabId, item) =>
    buildSavedItemKeyUi(
      {
        pick: ctx.pick,
        slugify: ctx.slugify,
      },
      profileId,
      tabId,
      item
    );

  api.isCurrentModalSaved = () =>
    isCurrentModalSavedUi({
      ensurePersonalStoreLoaded: api.ensurePersonalStoreLoaded,
      isCommonUser: ctx.isCommonUser,
      personalStore: ctx.personalStore,
      itemModalState: ctx.itemModalState,
      getItemMediaList: ctx.getItemMediaList,
      buildSavedMediaKey: api.buildSavedMediaKey,
      buildSavedItemKey: api.buildSavedItemKey,
    });

  api.toggleCurrentModalSave = () =>
    toggleCurrentModalSaveUi({
      ensurePersonalStoreLoaded: api.ensurePersonalStoreLoaded,
      isCommonUser: ctx.isCommonUser,
      personalStore: ctx.personalStore,
      itemModalState: ctx.itemModalState,
      getItemMediaList: ctx.getItemMediaList,
      buildSavedMediaKey: api.buildSavedMediaKey,
      buildSavedItemKey: api.buildSavedItemKey,
      pick: ctx.pick,
      deepClone: ctx.deepClone,
      persistPersonalStore: api.persistPersonalStore,
    });

  return api;
}
