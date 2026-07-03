import {
  getDraftGalleryListsUi,
  getDraftGalleryViewsUi,
  setDraftGalleryListsUi,
  setDraftGalleryViewsUi,
  scheduleToObjectUi,
} from "./editDraft.js";
import { saveEditDraftUi, bindEditTopEventsUi } from "../ui/editActions.js";
import { bindSimpleEditTabEventsUi } from "../ui/editSimpleTab.js";
import { renderSimpleEditTabUi } from "../ui/editSimpleTabRender.js";
import { getDraftSectionsUi, setDraftSectionsUi, blankItemUi, renderEditItemCardUi } from "../ui/editHelpers.js";
import { renderEditScreen } from "../ui/editScreen.js";

export function createEditFacade(ctx) {
  const SIMPLE_EDIT_TABS = ["galeria", "horario", "agenda", "parcerias", "locais"];

  function isSimpleEditTab(tabId) {
    return SIMPLE_EDIT_TABS.includes(String(tabId || "").toLowerCase());
  }

  function getDraftGalleryLists() {
    return getDraftGalleryListsUi({
      editor: ctx.editor,
      uniqueUrlList: ctx.uniqueUrlList,
      normalizeUrlList: ctx.normalizeUrlList,
    });
  }

  function getDraftGalleryViews() {
    return getDraftGalleryViewsUi({
      editor: ctx.editor,
      getDraftGalleryLists,
      ensureGalleryViewLength: ctx.ensureGalleryViewLength,
    });
  }

  function setDraftGalleryLists(nextLists) {
    return setDraftGalleryListsUi({
      editor: ctx.editor,
      normalizeUrlList: ctx.normalizeUrlList,
      getDraftGalleryViews,
      ensureGalleryViewLength: ctx.ensureGalleryViewLength,
    }, nextLists);
  }

  function setDraftGalleryViews(nextViews) {
    return setDraftGalleryViewsUi({
      editor: ctx.editor,
      getDraftGalleryLists,
      ensureGalleryViewLength: ctx.ensureGalleryViewLength,
    }, nextViews);
  }

  function scheduleToObject(raw) {
    return scheduleToObjectUi(raw);
  }

  function renderSimpleEditTab(tabId) {
    return renderSimpleEditTabUi({
      editor: ctx.editor,
      getDraftGalleryLists,
      getDraftGalleryViews,
      normalizeGalleryView: ctx.normalizeGalleryView,
      getGalleryViewStyle: ctx.getGalleryViewStyle,
      esc: ctx.esc,
      scheduleToObject,
    }, tabId);
  }

  function bindSimpleEditTabEvents(tabId, runtime = {}) {
    return bindSimpleEditTabEventsUi({
      editor: ctx.editor,
      el: ctx.el,
      renderEdit,
      getDraftGalleryLists,
      getDraftGalleryViews,
      setDraftGalleryLists,
      setDraftGalleryViews,
      normalizeGalleryView: ctx.normalizeGalleryView,
      openItemModal: ctx.openItemModal,
      ensureGalleryViewLength: ctx.ensureGalleryViewLength,
      galleryDefaultView: ctx.galleryDefaultView,
      readFileAsDataUrl: ctx.readFileAsDataUrl,
      getDraftSections,
      setDraftSections,
      scheduleToObject,
      toArrayList: ctx.toArrayList,
      setEditorStatus: runtime && typeof runtime.setEditorStatus === "function"
        ? runtime.setEditorStatus
        : null,
    }, tabId);
  }

  function getDraftSections(tabId) {
    return getDraftSectionsUi({
      editor: ctx.editor,
      slugify: ctx.slugify,
      deepClone: ctx.deepClone,
      isEnabledFlag: ctx.isEnabledFlag,
    }, tabId);
  }

  function setDraftSections(tabId, sections) {
    return setDraftSectionsUi({ editor: ctx.editor }, tabId, sections);
  }

  function blankItem(tabId) {
    return blankItemUi(tabId);
  }

  function renderEditItemCard(editTab, item, idx, options = {}) {
    return renderEditItemCardUi({
      pick: ctx.pick,
      isOnFlag: ctx.isOnFlag,
      isEnabledFlag: ctx.isEnabledFlag,
      getMergedItemImages: ctx.getMergedItemImages,
      esc: ctx.esc,
      resolveServiceTypeMeta: ctx.resolveServiceTypeMeta,
      SERVICE_TYPE_META: ctx.SERVICE_TYPE_META,
      listToLines: ctx.listToLines,
      toArrayList: ctx.toArrayList,
      inferMediaType: ctx.inferMediaType,
    }, editTab, item, idx, options);
  }

  async function saveEditDraft() {
    return saveEditDraftUi({
      state: ctx.state,
      setState: ctx.setState,
      editor: ctx.editor,
      sanitizeRichHtml: ctx.sanitizeRichHtml,
      getDraftGalleryLists,
      getDraftGalleryViews,
      ensureGalleryViewLength: ctx.ensureGalleryViewLength,
      api: ctx.api,
      mapProfileRow: ctx.mapProfileRow,
      renderAll: ctx.renderAll,
      setScreen: ctx.setScreen,
      slugify: ctx.slugify,
    });
  }

  function bindEditTopEvents() {
    return bindEditTopEventsUi({
      el: ctx.el,
      setState: ctx.setState,
      renderEdit,
      editor: ctx.editor,
    });
  }

  function renderEdit() {
    return renderEditScreen({
      state: ctx.state,
      el: ctx.el,
      setState: ctx.setState,
      selectedProfile: ctx.selectedProfile,
      renderProfile: ctx.renderProfile,
      editor: ctx.editor,
      deepClone: ctx.deepClone,
      getTabsForProfile: ctx.getTabsForProfile,
      isSimpleEditTab,
      getDraftSections,
      setDraftSections,
      PROFILE_CATEGORY_OPTIONS: ctx.PROFILE_CATEGORY_OPTIONS,
      esc: ctx.esc,
      sanitizeRichHtml: ctx.sanitizeRichHtml,
      renderSimpleEditTab,
      renderEditItemCard,
      isEditItemCollapsed: ctx.isEditItemCollapsed,
      bindEditTopEvents,
      slugify: ctx.slugify,
      blankItem,
      setEditItemCollapsed: ctx.setEditItemCollapsed,
      isEnabledFlag: ctx.isEnabledFlag,
      openItemModal: ctx.openItemModal,
      readFileAsDataUrl: ctx.readFileAsDataUrl,
      getMergedItemImages: ctx.getMergedItemImages,
      applyMergedItemImages: ctx.applyMergedItemImages,
      toArrayList: ctx.toArrayList,
      saveEditDraft,
      bindSimpleEditTabEvents,
      PROFILE_TYPE_OPTIONS: ctx.PROFILE_TYPE_OPTIONS,
      PROFILE_TYPE_LABEL: ctx.PROFILE_TYPE_LABEL,
      getSocialIconSvg: ctx.getSocialIconSvg,
      renderItem: ctx.renderItem,
      getSocialItems: ctx.getSocialItems,
      getDraftGalleryLists,
      buildCatalogGridCard: ctx.buildCatalogGridCard,
      buildCatalogListCard: ctx.buildCatalogListCard,
    });
  }

  return {
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
  };
}
