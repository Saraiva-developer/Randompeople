import {
  ensureSharePickerRootUi,
  closeSharePickerUi,
  openSharePickerUi,
  renderSharePickerUi,
  getCurrentModalSharePayloadUi,
} from "../ui/sharePicker.js";
import {
  buildShareThreadsUi,
  markThreadReadUi,
  getSavedItemPreviewImageUi,
  getShareEntryPreviewImageUi,
  openSharedEntryUi,
} from "./shareHelpers.js";

export function createShareUiFacade(ctx) {
  const {
    documentRef,
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
    onRenderProfile,
    onRenderAll,
    itemModalState,
    pick,
    getItemMediaList,
    recommendationsStore,
    slugify,
    markNotificationRead,
    state,
    onOpenPublicProfile,
    onOpenItemModal,
  } = ctx;

  function closeSharePicker() {
    return closeSharePickerUi({
      sharePickerState,
      documentRef,
    });
  }

  function ensureSharePickerRoot() {
    return ensureSharePickerRootUi({
      documentRef,
      closeSharePicker,
    });
  }

  function openSharePicker(payload) {
    return openSharePickerUi({
      isCommonUser,
      sharePickerState,
      deepClone,
      renderSharePicker,
    }, payload);
  }

  function renderSharePicker() {
    return renderSharePickerUi({
      ensureSharePickerRoot,
      sharePickerState,
      getShareContacts,
      normalizeEmail,
      isValidEmail,
      esc,
      loadSharePickerUsers,
      dispatchShare,
      closeSharePicker,
      el,
      renderProfile: onRenderProfile,
      renderAll: onRenderAll,
    });
  }

  function getCurrentModalSharePayload() {
    return getCurrentModalSharePayloadUi({
      itemModalState,
      pick,
      getItemMediaList,
      deepClone,
    });
  }

  function buildShareThreads(list, shareSub) {
    return buildShareThreadsUi({
      normalizeEmail,
      slugify,
    }, list, shareSub);
  }

  function markThreadRead(threadKey, shareSub) {
    return markThreadReadUi({
      recommendationsStore,
      normalizeEmail,
      slugify,
      markNotificationRead,
    }, threadKey, shareSub);
  }

  function getSavedItemPreviewImage(entry) {
    return getSavedItemPreviewImageUi({
      getItemMediaList,
    }, entry);
  }

  function getShareEntryPreviewImage(entry) {
    return getShareEntryPreviewImageUi({
      state,
      getItemMediaList,
    }, entry);
  }

  function openSharedEntry(entry) {
    return openSharedEntryUi({
      state,
      openPublicProfile: onOpenPublicProfile,
      openItemModal: onOpenItemModal,
      deepClone,
    }, entry);
  }

  return {
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
  };
}
