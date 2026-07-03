import { selectedProfileUi, getOwnProfileForAuthUserUi, ensureProfileTabUi, ensureSubTabUi } from "./profileNav.js";
import { buildProfileShareUrlUi, shareProfileUi } from "./profileShare.js";
import { renderCardsUi, renderItemUi } from "../ui/cards.js";
import { getSocialItemsUi } from "../ui/socialLinks.js";

export function createCardItemFacade(ctx) {
  const {
    state,
    setState,
    isCommonUser,
    esc,
    getBadgeType,
    isProfileSaved,
    toggleSavedProfile,
    onRenderAll,
    resolveProfileOriginTab,
    openPublicProfile,
    PROFILE_TYPE_LABEL,
    pick,
    isOnFlag,
    toOpenableUrl,
    inferMediaType,
    normalizeGalleryView,
    getGalleryViewStyle,
    getItemMediaList,
    resolveServiceTypeMeta,
    toSocialUrl,
    detectSocialIcon,
    navigatorRef,
    alertRef,
    promptRef,
    windowLocation,
  } = ctx;

  function selectedProfile() {
    return selectedProfileUi(state);
  }

  function getOwnProfileForAuthUser() {
    return getOwnProfileForAuthUserUi(state);
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
      onRenderAll,
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

  function getSocialItems(profileData) {
    return getSocialItemsUi({
      toSocialUrl,
      toOpenableUrl,
      detectSocialIcon,
    }, profileData);
  }

  function buildProfileShareUrl(profile) {
    return buildProfileShareUrlUi(profile, windowLocation || {});
  }

  async function shareProfile(profile) {
    return shareProfileUi({
      buildProfileShareUrl,
      navigatorRef,
      alertRef,
      promptRef,
    }, profile);
  }

  return {
    selectedProfile,
    getOwnProfileForAuthUser,
    ensureProfileTab,
    ensureSubTab,
    renderCards,
    renderItem,
    getSocialItems,
    buildProfileShareUrl,
    shareProfile,
  };
}
