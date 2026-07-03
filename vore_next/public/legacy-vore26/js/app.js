import { api } from "./api/client.js";
import { state, setState, mapProfileRow, profileSections, getTabsForProfile } from "./core/state.js";
import { PROFILE_TYPE_LABEL } from "./config.js";
import { settingsRowHtml as settingsRowHtmlView, settingsToggleHtml as settingsToggleHtmlView, localizeSettingsHtml as localizeSettingsHtmlView } from "./ui/settingsHelpers.js";
import { getStoredLanguage as getStoredLanguageI18n, setI18nLanguage, getUiBundle, tUi } from "./core/i18n.js";
import { bootstrapUi } from "./core/bootstrap.js";
import { bindGlobalEvents } from "./core/events.js";
import { startAppUi } from "./core/startup.js";
import { setScreenUi } from "./core/navigation.js";
import { toTimestampMsUi as toTimestampMs, formatRelativeTimeUi as formatRelativeTime, getShareKindLabelUi as getShareKindLabel, tabIdToLabelUi as tabIdToLabel } from "./core/shareHelpers.js";
import { recommendationTypeToShareKindUi as recommendationTypeToShareKind, reactionToEmojiUi as reactionToEmoji, mapItemShareKindFromTabUi as mapItemShareKindFromTab, mapTabFromItemShareKindUi as mapTabFromItemShareKind, resolveMediaUriUi as resolveMediaUri, parseSharedItemPayloadUi as parseSharedItemPayload, mapItemFromSharedPayloadUi as mapItemFromSharedPayload, recommendationTimestampMsUi as recommendationTimestampMs } from "./core/recommendations.js";
import { hasAccessSessionUi, getAccountTypeUi, getAllowedTabsUi, isGuestUserUi, isCommonUserUi, isProfessionalUserUi, applyNavigationAccessUi } from "./core/access.js";
import { selectedProfileUi, getOwnProfileForAuthUserUi, getNavActiveTabUi, resolveProfileOriginTabUi, openPublicProfileUi, ensureProfileTabUi, ensureSubTabUi } from "./core/profileNav.js";
import { escUi as esc, deepCloneUi as deepClone, clampNumberUi as clampNumber, isLikelyHtmlUi as isLikelyHtml, sanitizeRichHtmlUi, galleryDefaultViewUi, normalizeGalleryViewUi, ensureGalleryViewLengthUi, getGalleryViewStyleUi, normalizeTextUi as normalizeText, slugifyUi as slugify, setModalBodyLockUi, centerActiveChipUi, updateProfileStickyOffsetsUi, pickUi as pick, inferMediaTypeUi as inferMediaType, readFileAsDataUrlUi as readFileAsDataUrl, toArrayListUi as toArrayList, normalizeEmailUi as normalizeEmail, isValidEmailUi, linesToListUi as linesToList, listToLinesUi as listToLines } from "./core/utils.js";
import { editSectionKeyUi, isEditItemCollapsedUi, setEditItemCollapsedUi } from "./core/editDraft.js";
import { PROFILE_TYPE_OPTIONS, PROFILE_CATEGORY_OPTIONS, SERVICE_TYPE_META, HOME_FILTERS, HOME_FILTER_LABELS, EXPLORE_DISCOVERY_OPTIONS, EXPLORE_SORT_OPTIONS, CATEGORY_TAXONOMY } from "./core/constants.js";
import { getStoredLanguageUi, getUiLanguageUi, applyUiLanguageLabelsUi } from "./core/uiLanguage.js";
import { getProfileModalsUi } from "./core/profileModalsFactory.js";
import { getItemMediaListUi } from "./core/itemMedia.js";
import { buildProfileShareUrlUi, shareProfileUi } from "./core/profileShare.js";
import { createRecommendationsFacade } from "./core/recommendationsFacade.js";
import { createUserStoreFacade } from "./core/userStoreFacade.js";
import { createShareUiFacade } from "./core/shareUiFacade.js";
import { createHomeExploreFacade } from "./core/homeExploreFacade.js";
import { createProfileContentFacade } from "./core/profileContentFacade.js";
import { createEditFacade } from "./core/editFacade.js";
import { createProfileRenderFacade } from "./core/profileRenderFacade.js";
import { createSettingsNotificationsRenderFacade } from "./core/settingsNotificationsRenderFacade.js";
import { renderSettingsScreen } from "./ui/settingsScreen.js";
import { renderNotificationsScreen } from "./ui/notificationsScreen.js";
import { handleSettingsLogoutUi } from "./ui/settingsFlow.js";
import { renderExploreAdvancedModalUi } from "./ui/homeExploreScreen.js";
import { renderProfileScreen, renderCommonProfileScreen, renderCommonProfileContentScreen } from "./ui/profileScreen.js";
import { createProfileModals } from "./ui/profileModals.js";
import { renderEntryGateUi } from "./ui/entryGate.js";
import { renderCardsUi, renderItemUi } from "./ui/cards.js";
import { toOpenableUrlUi as toOpenableUrl, toSocialUrlUi as toSocialUrl, detectSocialIconUi as detectSocialIcon, getSocialIconSvgUi as getSocialIconSvg, getSocialIconLabelUi as getSocialIconLabel, getSocialItemsUi } from "./ui/socialLinks.js";
import { renderAllUi } from "./ui/renderAll.js";

const el = {
  nav: document.getElementById("mainNav"),
  screens: [...document.querySelectorAll(".screen")],
  home: document.getElementById("homeCards"),
  explore: document.getElementById("exploreCards"),
};
el.entryGate = document.getElementById("entryGate");
el.appShell = document.getElementById("appShell");
el.homeFilters = document.getElementById("homeFilterChips");
el.homeInsights = document.getElementById("homeInsights");
el.homeSuggested = document.getElementById("homeSuggested");
el.homeProfilesTitle = document.getElementById("homeProfilesTitle");
el.exploreSortRow = document.getElementById("exploreSortRow");
el.exploreMetaText = document.getElementById("exploreMetaText");
el.exploreTrendText = document.getElementById("exploreTrendText");
el.exploreActiveFilters = document.getElementById("exploreActiveFilters");
el.exploreOpenFilters = document.getElementById("exploreOpenFilters");
el.explorePager = document.getElementById("explorePager");
el.exploreSentinel = document.getElementById("exploreSentinel");
if (!el.exploreSentinel && el.explorePager && el.explorePager.parentElement) {
  const sentinel = document.createElement("div");
  sentinel.id = "exploreSentinel";
  sentinel.className = "explore-sentinel";
  el.explorePager.parentElement.insertBefore(sentinel, el.explorePager.nextSibling);
  el.exploreSentinel = sentinel;
}
el.search = document.getElementById("searchInput");
el.head = document.getElementById("profileHead");
el.tabs = document.getElementById("profileTabs");
el.subtabs = document.getElementById("profileSubTabs");
el.content = document.getElementById("profileContent");
el.notificationsFilters = document.getElementById("notificationsFilters");
el.notificationsList = document.getElementById("notificationsList");
el.edit = document.getElementById("editPlaceholder");
el.status = document.getElementById("statusText");
el.settings = document.getElementById("settingsInfo");
el.desktopRail = document.getElementById("desktopRail");
el.editNavHandle = document.getElementById("editNavHandle");

const editor = {
  profileId: null,
  draft: null,
  activeSubByTab: {},
  collapsedItemsBySection: {},
  history: { past: [], future: [] },
  lastChangeAt: 0,
  lastAutosaveAt: 0,
  lastServerSaveAt: 0,
  statusText: "",
  autosaveHydratedFor: 0,
  autosaveTimer: 0,
};
const itemModalState = { open: false, tabId: "", items: [], index: 0, mediaIndex: 0, profileId: 0, profileName: "" };
const reviewsState = {
  open: false,
  profileId: 0,
  slug: "",
  profileName: "",
  loading: false,
  saving: false,
  error: "",
  summary: { average: 0, total: 0, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } },
  list: [],
  canRate: false,
  rating: 0,
  comment: "",
  sortMode: "recent",
};
const settingsUi = {
  view: "main",
  notifNewVisits: true,
  notifShares: true,
  notifPromos: true,
  profileActive: true,
  language: "pt",
  theme: "claro",
  credentials: { email: "", currentPassword: "", newPassword: "", repeatPassword: "" },
  message: "",
};
const sharePickerState = {
  open: false,
  payload: null,
  query: "",
  error: "",
  usersLoading: false,
  usersQuery: "",
  users: [],
  searchToken: 0,
};
const personalStore = {
  loadedForUserId: 0,
  data: null,
};
const notificationsStore = {
  loadedForUserId: 0,
  readKeys: [],
};
const recommendationsStore = {
  loadedForUserId: 0,
  loading: false,
  error: "",
  inbox: [],
  sent: [],
  pendingPermissions: [],
  contacts: [],
  lastLoadedAt: 0,
  inflight: null,
};
const metricsStore = {
  loadedForKey: "",
  dayKey: "",
  profileViews: {},
};
const entryUi = {
  error: "",
  success: "",
  pending: false,
};
const EXPLORE_PAGE_SIZE = 24;
const NAV_LABELS = {
  home: "Home",
  explore: "Explorar",
  notifications: "Notificações",
  profile: "Perfil",
  edit: "Editar Perfil",
  settings: "Definições",
};
const explorePagerState = {
  key: "",
  visibleCount: EXPLORE_PAGE_SIZE,
  totalCount: 0,
  lastAutoLoadAt: 0,
};
let profileNavActiveOverride = "";
function getProfileModals() {
  return getProfileModalsUi({
    createProfileModals,
    options: {
      itemModalState,
      reviewsState,
      selectedProfile,
      setModalBodyLock,
      isCommonUser,
      getCurrentModalSharePayload,
      openSharePicker,
      toggleCurrentModalSave,
      renderProfile,
      renderAll,
      getItemMediaList,
      pick,
      isOnFlag,
      toArrayList,
      getGalleryViewStyle,
      resolveServiceTypeMeta,
      esc,
      isCurrentModalSaved,
      api,
      setState,
      state,
    },
  });
}

function getStoredLanguage() {
  return getStoredLanguageUi(getStoredLanguageI18n);
}

function getUiLanguage() {
  return getUiLanguageUi({
    settingsUi,
    getStoredLanguage,
    setI18nLanguage,
  });
}

function applyUiLanguageLabels() {
  return applyUiLanguageLabelsUi({
    getUiLanguage,
    getUiBundle,
    NAV_LABELS,
    HOME_FILTERS,
    HOME_FILTER_LABELS,
    EXPLORE_DISCOVERY_OPTIONS,
    EXPLORE_SORT_OPTIONS,
  });
}

applyUiLanguageLabels();

function resolveServiceTypeMeta(value) {
  const id = String(value || "general").trim().toLowerCase();
  return SERVICE_TYPE_META.find((entry) => entry.id === id || String(entry.label || "").trim().toLowerCase() === id) || SERVICE_TYPE_META[0];
}

function sanitizeRichHtml(value) {
  return sanitizeRichHtmlUi({
    documentRef: document,
    esc,
    isLikelyHtml,
  }, value);
}

function galleryDefaultView() {
  return galleryDefaultViewUi();
}

function normalizeGalleryView(raw) {
  return normalizeGalleryViewUi({
    clampNumber,
  }, raw);
}

function ensureGalleryViewLength(list, viewList) {
  return ensureGalleryViewLengthUi({
    normalizeGalleryView,
  }, list, viewList);
}

function getGalleryViewStyle(view, mediaType) {
  return getGalleryViewStyleUi({
    normalizeGalleryView,
  }, view, mediaType);
}

function editSectionKey(tabId, subKey) {
  return editSectionKeyUi(tabId, subKey);
}

function isEditItemCollapsed(tabId, subKey, idx) {
  return isEditItemCollapsedUi({
    editor,
    editSectionKey,
  }, tabId, subKey, idx);
}

function setEditItemCollapsed(tabId, subKey, idx, value) {
  return setEditItemCollapsedUi({
    editor,
    editSectionKey,
  }, tabId, subKey, idx, value);
}

function setModalBodyLock(forceLock) {
  return setModalBodyLockUi({
    documentRef: document,
    itemModalState,
    reviewsState,
  }, forceLock);
}

function centerActiveChip(container, selector = "button.active") {
  return centerActiveChipUi(container, selector);
}

function updateProfileStickyOffsets() {
  return updateProfileStickyOffsetsUi({
    documentRef: document,
    el,
  });
}

function isValidEmail(value) {
  return isValidEmailUi({
    normalizeEmail,
  }, value);
}

function parseRating(profile) {
  const n = Number(String((profile && profile.rating) || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getBadgeType(profile) {
  const raw = String((profile && profile.badge) || (profile && profile.data && profile.data.badge) || "").trim().toLowerCase();
  if (raw === "verif") return "verif";
  if (raw === "promo") return "promo";
  if (raw === "novo") return "novo";
  return "";
}

const {
  blankPersonalData,
  getPersonalStorageKey,
  getCommonUserId,
  ensurePersonalStoreLoaded,
  persistPersonalStore,
  getCurrentUserId,
  getNotificationsStorageKey,
  ensureNotificationsStoreLoaded,
  persistNotificationsStore,
  isNotificationRead,
  markNotificationRead,
  getMetricsDayKey,
  getGuestClientId,
  getMetricsClientKey,
  getMetricsStorageKey,
  ensureMetricsStoreLoaded,
  persistMetricsStore,
  incrementProfileView,
  getProfileViewCount,
  getTotalProfileViews,
  getTrendingProfiles,
  isProfileSaved,
  toggleSavedProfile,
  addRecentProfile,
  buildSavedMediaKey,
  buildSavedItemKey,
  isCurrentModalSaved,
  toggleCurrentModalSave,
} = createUserStoreFacade({
  state,
  personalStore,
  notificationsStore,
  metricsStore,
  localStorageRef: localStorage,
  normalizeEmail,
  isValidEmail,
  isCommonUser,
  parseRating,
  getBadgeType,
  itemModalState,
  getItemMediaList,
  pick,
  slugify,
  deepClone,
  api,
});
const {
  buildItemShareUriFromPayload,
  mapRecommendationEntry,
  setRecommendationContactsFromLists,
  resetRecommendationsStore,
  refreshRecommendationsForCurrentUser,
  getCurrentUserInboxEntries,
  markCurrentUserInboxEntryRead,
  mergeIncomingSharesForCurrentUser,
  countUnreadShares,
  upsertShareContact,
  getShareContacts,
  loadSharePickerUsers,
  dispatchShare,
  handleRecommendationPermissionAction,
  handleRecommendationReaction,
} = createRecommendationsFacade({
  state,
  normalizeEmail,
  isNotificationRead,
  deepClone,
  recommendationsStore,
  isValidEmail,
  hasAccessSession,
  renderNotifications,
  renderProfile,
  isCommonUser,
  api,
  markNotificationRead,
  sharePickerState,
  pick,
  getItemMediaList,
});
const {
  ensureSharePickerRoot,
  closeSharePicker,
  openSharePicker,
  renderSharePicker,
  getCurrentModalSharePayload,
  buildShareThreads,
  markThreadRead,
  getSavedItemPreviewImage,
  getShareEntryPreviewImage,
  openSharedEntry,
} = createShareUiFacade({
  documentRef: document,
  sharePickerState,
  isCommonUser,
  deepClone,
  getShareContacts,
  normalizeEmail,
  isValidEmail,
  esc,
  loadSharePickerUsers,
  dispatchShare,
  el,
  onRenderProfile: renderProfile,
  onRenderAll: renderAll,
  itemModalState,
  pick,
  getItemMediaList,
  recommendationsStore,
  slugify,
  markNotificationRead,
  state,
  onOpenPublicProfile: openPublicProfile,
  onOpenItemModal: openItemModal,
});

const TAXONOMY_INDEX = CATEGORY_TAXONOMY.map((item) => {
  const terms = [item.key, item.label, ...(Array.isArray(item.keywords) ? item.keywords : [])]
    .map((term) => normalizeText(term))
    .filter(Boolean);
  return Object.assign({}, item, { normalizedTerms: terms });
});

function getSocialItems(profileData) {
  return getSocialItemsUi({
    toSocialUrl,
    toOpenableUrl,
    detectSocialIcon,
  }, profileData);
}

function buildProfileShareUrl(profile) {
  return buildProfileShareUrlUi(profile, window.location || {});
}

async function shareProfile(profile) {
  return shareProfileUi({
    buildProfileShareUrl,
    navigatorRef: navigator,
    alertRef: alert,
    promptRef: prompt,
  }, profile);
}

const {
  getMergedItemImages,
  applyMergedItemImages,
  resolveProfileFilter,
  scoreLocal,
  inferProfileCategoryKeys,
  findTaxonomyKeysByQuery,
  parseRecent,
  getExploreFilteredProfiles,
  getHomeExploreUiCtx,
  renderExploreSortChips,
  removeExploreCategoryFilter,
  renderExploreActiveFilters,
  renderHomeFilters,
  renderHomeInsights,
  renderDesktopRail,
  renderExploreTrend,
  getExplorePagerKey,
  getExploreVisibleProfiles,
  loadMoreExploreItems,
  setupExploreSentinelObserver,
  renderExplorePager,
} = createHomeExploreFacade({
  state,
  setState,
  esc,
  renderAll,
  normalizeText,
  HOME_FILTERS,
  HOME_FILTER_LABELS,
  EXPLORE_DISCOVERY_OPTIONS,
  EXPLORE_SORT_OPTIONS,
  CATEGORY_TAXONOMY,
  TAXONOMY_INDEX,
  getTotalProfileViews,
  getTrendingProfiles,
  explorePagerState,
  EXPLORE_PAGE_SIZE,
  el,
  hasAccessSession,
  PROFILE_TYPE_LABEL,
  resolveProfileOriginTab,
  openPublicProfile,
  pick,
  toArrayList,
});
function getItemMediaList(tabId, item) {
  return getItemMediaListUi({
    pick,
    inferMediaType,
    normalizeGalleryView,
    getMergedItemImages,
  }, tabId, item);
}

function selectedProfile() {
  return selectedProfileUi(state);
}

function getOwnProfileForAuthUser() {
  return getOwnProfileForAuthUserUi(state);
}

function getNavActiveTab() {
  return getNavActiveTabUi(state, profileNavActiveOverride);
}

function resolveProfileOriginTab() {
  return resolveProfileOriginTabUi({
    state,
    isCommonUser,
  });
}

function openPublicProfile(profileId, options = {}) {
  return openPublicProfileUi({
    setState,
    incrementProfileView,
    isCommonUser,
    addRecentProfile,
    setScreen,
  }, profileId, options);
}

function hasAccessSession() {
  return hasAccessSessionUi(state);
}

function getAccountType() {
  return getAccountTypeUi(state);
}

function getAllowedTabs() {
  return getAllowedTabsUi({
    state,
    hasAccessSession,
    getAccountType,
    isGuestUser,
    isCommonUser,
  });
}

function applyNavigationAccess() {
  return applyNavigationAccessUi({
    el,
    getAllowedTabs,
    state,
    setState,
    NAV_LABELS,
  });
}

function renderEntryGate() {
  return renderEntryGateUi({
    el,
    state,
    entryUi,
    hasAccessSession,
    setState,
    esc,
    api,
    settingsUi,
    resetRecommendationsStore,
    refreshRecommendationsForCurrentUser,
    mapProfileRow,
    onRenderAll: renderAll,
    onRenderEntryGate: renderEntryGate,
  });
}

function setScreen(name, options = {}) {
  return setScreenUi({
    hasAccessSession,
    onRenderEntryGate: renderEntryGate,
    itemModalState,
    closeItemModal,
    reviewsState,
    closeReviewsModal,
    getAllowedTabs,
    state,
    setState,
    getProfileNavActiveOverride: () => profileNavActiveOverride,
    setProfileNavActiveOverride: (value) => { profileNavActiveOverride = String(value || ""); },
    el,
    getNavActiveTab,
    onRenderExploreAdvancedModal: renderExploreAdvancedModal,
    onRenderProfile: renderProfile,
    onRenderNotifications: renderNotifications,
    onRenderSettings: renderSettings,
    onRenderEdit: renderEdit,
  }, name, options);
}

function isGuestUser() {
  return isGuestUserUi(state);
}

function isCommonUser() {
  return isCommonUserUi(state);
}

function isProfessionalUser() {
  return isProfessionalUserUi({
    state,
    getAccountType,
  });
}

function settingsRowHtml(label, hint = "", dataAction = "") {
  return settingsRowHtmlView(esc, label, hint, dataAction);
}

function settingsToggleHtml(label, key, value) {
  return settingsToggleHtmlView(esc, label, key, value);
}

function localizeSettingsHtml(html) {
  return localizeSettingsHtmlView(html, tUi, esc);
}
async function handleSettingsLogout() {
  return handleSettingsLogoutUi({
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
  });
}

const settingsNotificationsRenderFacade = createSettingsNotificationsRenderFacade({
  el,
  NAV_LABELS,
  esc,
  settingsUi,
  state,
  getStoredLanguage,
  renderSettingsScreen,
  isGuestUser,
  isCommonUser,
  isProfessionalUser,
  tUi,
  settingsRowHtml,
  settingsToggleHtml,
  localizeSettingsHtml,
  renderAll,
  setScreen,
  setState,
  handleSettingsLogout,
  renderNotificationsScreen,
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
});

function renderSettings() {
  return settingsNotificationsRenderFacade.renderSettings();
}

function setNotificationsNavCount(count) {
  return settingsNotificationsRenderFacade.setNotificationsNavCount(count);
}

function renderNotifications() {
  return settingsNotificationsRenderFacade.renderNotifications();
}
function ensureProfileTab(tabs) {
  return ensureProfileTabUi({
    state,
    setState,
  }, tabs);
}

function ensureSubTab(sections) {
  return ensureSubTabUi({
    state,
    setState,
  }, sections);
}
function renderCards(list, root, options = {}) {
  return renderCardsUi({
    isCommonUser,
    esc,
    getBadgeType,
    isProfileSaved,
    toggleSavedProfile,
    onRenderAll: renderAll,
    resolveProfileOriginTab,
    openPublicProfile,
    PROFILE_TYPE_LABEL,
  }, list, root, options);
}

function renderItem(tabId, item, idx = 0) {
  return renderItemUi({
    pick,
    isOnFlag,
    esc,
    toOpenableUrl,
    inferMediaType,
    normalizeGalleryView,
    getGalleryViewStyle,
    getItemMediaList,
    resolveServiceTypeMeta,
  }, tabId, item, idx);
}

function closeItemModal() {
  return getProfileModals().closeItemModal();
}

function openItemModal(tabId, items, index, context = {}) {
  return getProfileModals().openItemModal(tabId, items, index, context);
}

function renderItemModal() {
  return getProfileModals().renderItemModal();
}

function closeReviewsModal() {
  return getProfileModals().closeReviewsModal();
}

async function loadReviews() {
  return getProfileModals().loadReviews();
}

async function submitReview() {
  return getProfileModals().submitReview();
}

function renderReviewsModal() {
  return getProfileModals().renderReviewsModal();
}

async function openReviewsModal() {
  return getProfileModals().openReviewsModal();
}
function renderExploreAdvancedModal() {
  renderExploreAdvancedModalUi(getHomeExploreUiCtx());
}
const {
  normalizeUrlList,
  uniqueUrlList,
  getProfileGalleryLists,
  getProfileGalleryViews,
  bindProfileContentInteractions,
  buildCatalogGridCard,
  buildCatalogListCard,
  renderProfileCatalogTab,
  renderProfileLodgingTab,
  renderProfileGalleryTab,
  renderProfileScheduleTab,
  renderProfileAgendaTab,
  renderProfilePartnersTab,
  renderProfileLocationsTab,
  openSavedMediaModal,
  openSavedItemModal,
} = createProfileContentFacade({
  state,
  setState,
  el,
  esc,
  pick,
  isOnFlag,
  clampNumber,
  toArrayList,
  deepClone,
  toOpenableUrl,
  ensureGalleryViewLength,
  getItemMediaList,
  ensurePersonalStoreLoaded,
  personalStore,
  onOpenItemModal: openItemModal,
  onRenderProfile: renderProfile,
  isEnabledFlag,
  renderItem,
});

const profileRenderFacade = createProfileRenderFacade({
  renderCommonProfileContentScreen,
  renderCommonProfileScreen,
  renderProfileScreen,
  state,
  setState,
  el,
  esc,
  isCommonUser,
  ensurePersonalStoreLoaded,
  personalStore,
  recommendationsStore,
  refreshRecommendationsForCurrentUser,
  normalizeText,
  formatRelativeTime,
  buildShareThreads,
  markThreadRead,
  getShareKindLabel,
  getShareEntryPreviewImage,
  reactionToEmoji,
  handleRecommendationReaction,
  handleRecommendationPermissionAction,
  openSharedEntry,
  renderCards,
  tabIdToLabel,
  getSavedItemPreviewImage,
  openSavedMediaModal,
  openSavedItemModal,
  countUnreadShares,
  centerActiveChip,
  updateProfileStickyOffsets,
  selectedProfile,
  getTabsForProfile,
  ensureProfileTab,
  profileSections,
  ensureSubTab,
  PROFILE_TYPE_LABEL,
  getSocialItems,
  getBadgeType,
  getSocialIconLabel,
  getSocialIconSvg,
  isProfileSaved,
  toggleSavedProfile,
  setScreen,
  openSharePicker,
  shareProfile,
  sanitizeRichHtml,
  renderProfileGalleryTab,
  renderProfileScheduleTab,
  renderProfileAgendaTab,
  renderProfilePartnersTab,
  renderProfileLocationsTab,
  isEnabledFlag,
  renderProfileCatalogTab,
  renderProfileLodgingTab,
  renderItem,
  bindProfileContentInteractions,
  openReviewsModal,
});

function renderCommonProfileContent() {
  return profileRenderFacade.renderCommonProfileContent();
}

function renderCommonProfile() {
  return profileRenderFacade.renderCommonProfile();
}

function renderProfile() {
  return profileRenderFacade.renderProfile();
}

function isEnabledFlag(value) {
  if (value === false) return false;
  if (value === true) return true;
  if (typeof value === "number") return value !== 0;
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return true;
  if (["false", "0", "no", "off", "nao"].includes(raw)) return false;
  return true;
}

function isOnFlag(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "number") return value !== 0;
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return false;
  return ["true", "1", "yes", "on", "sim", "y"].includes(raw);
}

const {
  isSimpleEditTab,
  getDraftGalleryLists,
  getDraftGalleryViews,
  setDraftGalleryLists,
  setDraftGalleryViews,
  scheduleToObject,
  renderSimpleEditTab,
  bindSimpleEditTabEvents,
  getDraftSections,
  setDraftSections,
  blankItem,
  renderEditItemCard,
  saveEditDraft,
  bindEditTopEvents,
  renderEdit,
} = createEditFacade({
  editor,
  uniqueUrlList,
  normalizeUrlList,
  ensureGalleryViewLength,
  normalizeGalleryView,
  getGalleryViewStyle,
  esc,
  el,
  openItemModal,
  galleryDefaultView,
  readFileAsDataUrl,
  toArrayList,
  slugify,
  deepClone,
  isEnabledFlag,
  pick,
  isOnFlag,
  getMergedItemImages,
  resolveServiceTypeMeta,
  SERVICE_TYPE_META,
  listToLines,
  inferMediaType,
  state,
  setState,
  sanitizeRichHtml,
  api,
  mapProfileRow,
  renderAll,
  setScreen,
  selectedProfile,
  renderProfile,
  getTabsForProfile,
  PROFILE_CATEGORY_OPTIONS,
  isEditItemCollapsed,
  setEditItemCollapsed,
  applyMergedItemImages,
  PROFILE_TYPE_OPTIONS,
  PROFILE_TYPE_LABEL,
  getSocialIconSvg,
  renderItem,
  getSocialItems,
  buildCatalogGridCard,
  buildCatalogListCard,
});
function renderAll() {
  return renderAllUi({
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
  renderEdit,
  renderDesktopRail,
  });
}
async function bootstrap() {
  return bootstrapUi({
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
  });
}
bindGlobalEvents({
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
});
startAppUi({
  el,
  tUi,
  setupExploreSentinelObserver,
  renderEntryGate,
  setState,
  bootstrap,
});







































