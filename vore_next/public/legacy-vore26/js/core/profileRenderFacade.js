import { renderCommonProfileContentFacade, renderCommonProfileFacade, renderProfileFacade } from "../ui/profileFacade.js";

export function createProfileRenderFacade(ctx) {
  function renderCommonProfileContent() {
    return renderCommonProfileContentFacade({
      renderCommonProfileContentScreen: ctx.renderCommonProfileContentScreen,
      state: ctx.state,
      setState: ctx.setState,
      el: ctx.el,
      esc: ctx.esc,
      renderProfile,
      isCommonUser: ctx.isCommonUser,
      ensurePersonalStoreLoaded: ctx.ensurePersonalStoreLoaded,
      personalStore: ctx.personalStore,
      recommendationsStore: ctx.recommendationsStore,
      refreshRecommendationsForCurrentUser: ctx.refreshRecommendationsForCurrentUser,
      normalizeText: ctx.normalizeText,
      formatRelativeTime: ctx.formatRelativeTime,
      buildShareThreads: ctx.buildShareThreads,
      markThreadRead: ctx.markThreadRead,
      getShareKindLabel: ctx.getShareKindLabel,
      getShareEntryPreviewImage: ctx.getShareEntryPreviewImage,
      reactionToEmoji: ctx.reactionToEmoji,
      handleRecommendationReaction: ctx.handleRecommendationReaction,
      handleRecommendationPermissionAction: ctx.handleRecommendationPermissionAction,
      openSharedEntry: ctx.openSharedEntry,
      renderCards: ctx.renderCards,
      tabIdToLabel: ctx.tabIdToLabel,
      getSavedItemPreviewImage: ctx.getSavedItemPreviewImage,
      openSavedMediaModal: ctx.openSavedMediaModal,
      openSavedItemModal: ctx.openSavedItemModal,
    });
  }

  function renderCommonProfile() {
    return renderCommonProfileFacade({
      renderCommonProfileScreen: ctx.renderCommonProfileScreen,
      state: ctx.state,
      setState: ctx.setState,
      el: ctx.el,
      esc: ctx.esc,
      countUnreadShares: ctx.countUnreadShares,
      renderCommonProfileContent,
      centerActiveChip: ctx.centerActiveChip,
      updateProfileStickyOffsets: ctx.updateProfileStickyOffsets,
      renderProfile,
    });
  }

  function renderProfile() {
    return renderProfileFacade({
      renderProfileScreen: ctx.renderProfileScreen,
      state: ctx.state,
      setState: ctx.setState,
      el: ctx.el,
      isCommonUser: ctx.isCommonUser,
      renderCommonProfile,
      selectedProfile: ctx.selectedProfile,
      getTabsForProfile: ctx.getTabsForProfile,
      ensureProfileTab: ctx.ensureProfileTab,
      profileSections: ctx.profileSections,
      ensureSubTab: ctx.ensureSubTab,
      PROFILE_TYPE_LABEL: ctx.PROFILE_TYPE_LABEL,
      getSocialItems: ctx.getSocialItems,
      getBadgeType: ctx.getBadgeType,
      getSocialIconLabel: ctx.getSocialIconLabel,
      getSocialIconSvg: ctx.getSocialIconSvg,
      esc: ctx.esc,
      isProfileSaved: ctx.isProfileSaved,
      toggleSavedProfile: ctx.toggleSavedProfile,
      setScreen: ctx.setScreen,
      openSharePicker: ctx.openSharePicker,
      shareProfile: ctx.shareProfile,
      sanitizeRichHtml: ctx.sanitizeRichHtml,
      renderProfileGalleryTab: ctx.renderProfileGalleryTab,
      renderProfileScheduleTab: ctx.renderProfileScheduleTab,
      renderProfileAgendaTab: ctx.renderProfileAgendaTab,
      renderProfilePartnersTab: ctx.renderProfilePartnersTab,
      renderProfileLocationsTab: ctx.renderProfileLocationsTab,
      centerActiveChip: ctx.centerActiveChip,
      updateProfileStickyOffsets: ctx.updateProfileStickyOffsets,
      isEnabledFlag: ctx.isEnabledFlag,
      renderProfileCatalogTab: ctx.renderProfileCatalogTab,
      renderProfileLodgingTab: ctx.renderProfileLodgingTab,
      renderItem: ctx.renderItem,
      bindProfileContentInteractions: ctx.bindProfileContentInteractions,
      openReviewsModal: ctx.openReviewsModal,
      renderProfile,
    });
  }

  return {
    renderCommonProfileContent,
    renderCommonProfile,
    renderProfile,
  };
}
