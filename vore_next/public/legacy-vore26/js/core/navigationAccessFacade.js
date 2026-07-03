export function createNavigationAccessFacade(ctx) {
  const {
    state,
    setState,
    el,
    NAV_LABELS,
    itemModalState,
    reviewsState,
    getProfileNavActiveOverride,
    setProfileNavActiveOverride,
    incrementProfileView,
    addRecentProfile,
    closeItemModal,
    closeReviewsModal,
    onRenderEntryGate,
    onRenderExploreAdvancedModal,
    onRenderProfile,
    onRenderNotifications,
    onRenderSettings,
    onRenderEdit,
    getNavActiveTabUi,
    resolveProfileOriginTabUi,
    openPublicProfileUi,
    hasAccessSessionUi,
    getAccountTypeUi,
    getAllowedTabsUi,
    applyNavigationAccessUi,
    setScreenUi,
    isGuestUserUi,
    isCommonUserUi,
    isProfessionalUserUi,
  } = ctx;

  function getNavActiveTab() {
    return getNavActiveTabUi(state, getProfileNavActiveOverride());
  }

  function isGuestUser() {
    return isGuestUserUi(state);
  }

  function isCommonUser() {
    return isCommonUserUi(state);
  }

  function hasAccessSession() {
    return hasAccessSessionUi(state);
  }

  function getAccountType() {
    return getAccountTypeUi(state);
  }

  function isProfessionalUser() {
    return isProfessionalUserUi({
      state,
      getAccountType,
    });
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

  function setScreen(name, options = {}) {
    return setScreenUi({
      hasAccessSession,
      onRenderEntryGate,
      itemModalState,
      closeItemModal,
      reviewsState,
      closeReviewsModal,
      getAllowedTabs,
      state,
      setState,
      getProfileNavActiveOverride,
      setProfileNavActiveOverride,
      el,
      getNavActiveTab,
      onRenderExploreAdvancedModal,
      onRenderProfile,
      onRenderNotifications,
      onRenderSettings,
      onRenderEdit,
    }, name, options);
  }

  return {
    getNavActiveTab,
    resolveProfileOriginTab,
    openPublicProfile,
    hasAccessSession,
    getAccountType,
    getAllowedTabs,
    applyNavigationAccess,
    setScreen,
    isGuestUser,
    isCommonUser,
    isProfessionalUser,
  };
}
