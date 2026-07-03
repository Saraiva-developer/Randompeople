import {
  normalizeUrlListUi,
  uniqueUrlListUi,
  getProfileGalleryListsUi,
  getProfileGalleryViewsUi,
  bindProfileContentInteractionsUi,
  buildCatalogGridCardUi,
  buildCatalogListCardUi,
  renderProfileCatalogTabUi,
  renderProfileLodgingTabUi,
} from "../ui/profileCatalog.js";
import {
  renderProfileGalleryTabUi,
  renderProfileScheduleTabUi,
  renderProfileAgendaTabUi,
  renderProfilePartnersTabUi,
  renderProfileLocationsTabUi,
  openSavedMediaModalUi,
  openSavedItemModalUi,
} from "../ui/profileScreen.js";

export function createProfileContentFacade(ctx) {
  const {
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
    onOpenItemModal,
    onRenderProfile,
    isEnabledFlag,
    renderItem,
  } = ctx;

  function normalizeUrlList(value) {
    return normalizeUrlListUi(value);
  }

  function uniqueUrlList(list) {
    return uniqueUrlListUi(list);
  }

  function getProfileGalleryLists(profileData) {
    return getProfileGalleryListsUi({
      normalizeUrlList,
      uniqueUrlList,
    }, profileData);
  }

  function getProfileGalleryViews(profileData) {
    return getProfileGalleryViewsUi({
      ensureGalleryViewLength,
      getProfileGalleryLists,
    }, profileData);
  }

  function bindProfileContentInteractions(tabId, items) {
    return bindProfileContentInteractionsUi({
      el,
      openItemModal: onOpenItemModal,
    }, tabId, items);
  }

  function buildCatalogGridCard(tabId, item, idx) {
    return buildCatalogGridCardUi({
      pick,
      getItemMediaList,
      isOnFlag,
      esc,
    }, tabId, item, idx);
  }

  function buildCatalogListCard(tabId, item, idx) {
    return buildCatalogListCardUi({
      pick,
      getItemMediaList,
      isOnFlag,
      esc,
    }, tabId, item, idx);
  }

  function renderProfileCatalogTab(tabId, activeSection, items) {
    return renderProfileCatalogTabUi({
      state,
      setState,
      el,
      esc,
      renderProfile: onRenderProfile,
      bindProfileContentInteractions,
      buildCatalogGridCard,
      buildCatalogListCard,
    }, tabId, activeSection, items);
  }

  function renderProfileLodgingTab(tabId, sections, subId) {
    return renderProfileLodgingTabUi({
      state,
      setState,
      el,
      pick,
      isEnabledFlag,
      clampNumber,
      getItemMediaList,
      isOnFlag,
      toArrayList,
      esc,
      renderProfile: onRenderProfile,
      openItemModal: onOpenItemModal,
    }, tabId, sections, subId);
  }

  function renderProfileGalleryTab(profileData) {
    return renderProfileGalleryTabUi({
      getProfileGalleryLists,
      getProfileGalleryViews,
      state,
      setState,
      el,
      esc,
      renderItem,
      bindProfileContentInteractions,
      onRenderProfile,
    }, profileData);
  }

  function renderProfileScheduleTab(profileData) {
    return renderProfileScheduleTabUi({
      el,
      renderItem,
    }, profileData);
  }

  function renderProfileAgendaTab(profileData) {
    return renderProfileAgendaTabUi({
      el,
      esc,
      renderItem,
      toOpenableUrl,
    }, profileData);
  }

  function renderProfilePartnersTab(profileData) {
    return renderProfilePartnersTabUi({
      el,
      renderItem,
    }, profileData);
  }

  function renderProfileLocationsTab(profileData) {
    return renderProfileLocationsTabUi({
      el,
      esc,
      toOpenableUrl,
    }, profileData);
  }

  function openSavedMediaModal(index, sourceList = null) {
    return openSavedMediaModalUi({
      ensurePersonalStoreLoaded,
      personalStore,
      openItemModal: onOpenItemModal,
    }, index, sourceList);
  }

  function openSavedItemModal(index, sourceList = null) {
    return openSavedItemModalUi({
      ensurePersonalStoreLoaded,
      personalStore,
      deepClone,
      openItemModal: onOpenItemModal,
    }, index, sourceList);
  }

  return {
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
  };
}
