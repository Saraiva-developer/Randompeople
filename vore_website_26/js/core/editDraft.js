export function editSectionKeyUi(tabId, subKey) {
  return String(tabId || "") + "::" + String(subKey || "");
}

export function isEditItemCollapsedUi(ctx, tabId, subKey, idx) {
  const { editor, editSectionKey } = ctx || {};
  const sectionKey = editSectionKey(tabId, subKey);
  return !!(
    editor.collapsedItemsBySection[sectionKey] &&
    editor.collapsedItemsBySection[sectionKey][idx] === true
  );
}

export function setEditItemCollapsedUi(ctx, tabId, subKey, idx, value) {
  const { editor, editSectionKey } = ctx || {};
  const sectionKey = editSectionKey(tabId, subKey);
  if (!editor.collapsedItemsBySection[sectionKey]) editor.collapsedItemsBySection[sectionKey] = {};
  editor.collapsedItemsBySection[sectionKey][idx] = !!value;
}

export function getDraftGalleryListsUi(ctx) {
  const { editor, uniqueUrlList, normalizeUrlList } = ctx || {};
  const data = editor.draft && editor.draft.data ? editor.draft.data : {};
  const gallery = data.gallery && typeof data.gallery === "object" ? data.gallery : {};
  const mergedVideos = uniqueUrlList([
    ...normalizeUrlList(gallery.videos || data.videos),
    ...normalizeUrlList(gallery.reels || data.reels),
  ]);
  return {
    photos: normalizeUrlList(gallery.photos || data.photos),
    videos: mergedVideos,
    reels: [],
  };
}

export function getDraftGalleryViewsUi(ctx) {
  const { editor, getDraftGalleryLists, ensureGalleryViewLength } = ctx || {};
  const data = editor.draft && editor.draft.data ? editor.draft.data : {};
  const lists = getDraftGalleryLists();
  const views = data.galleryViews && typeof data.galleryViews === "object" ? data.galleryViews : {};
  return {
    photos: ensureGalleryViewLength(lists.photos, views.photos),
    videos: ensureGalleryViewLength(lists.videos, views.videos),
    reels: ensureGalleryViewLength(lists.reels, views.reels),
  };
}

export function setDraftGalleryListsUi(ctx, nextLists) {
  const {
    editor,
    normalizeUrlList,
    getDraftGalleryViews,
    ensureGalleryViewLength,
  } = ctx || {};
  if (!editor.draft || !editor.draft.data) return;
  const data = editor.draft.data;
  const gallery =
    data.gallery && typeof data.gallery === "object" ? Object.assign({}, data.gallery) : {};
  gallery.photos = normalizeUrlList(nextLists.photos);
  gallery.videos = normalizeUrlList(nextLists.videos);
  gallery.reels = [];
  data.gallery = gallery;
  data.photos = gallery.photos.slice();
  data.videos = gallery.videos.slice();
  data.reels = [];
  const currentViews = getDraftGalleryViews();
  data.galleryViews = {
    photos: ensureGalleryViewLength(gallery.photos, currentViews.photos),
    videos: ensureGalleryViewLength(gallery.videos, currentViews.videos),
    reels: ensureGalleryViewLength(gallery.reels, currentViews.reels),
  };
}

export function setDraftGalleryViewsUi(ctx, nextViews) {
  const { editor, getDraftGalleryLists, ensureGalleryViewLength } = ctx || {};
  if (!editor.draft || !editor.draft.data) return;
  const data = editor.draft.data;
  const lists = getDraftGalleryLists();
  const source = nextViews && typeof nextViews === "object" ? nextViews : {};
  data.galleryViews = {
    photos: ensureGalleryViewLength(lists.photos, source.photos),
    videos: ensureGalleryViewLength(lists.videos, source.videos),
    reels: ensureGalleryViewLength(lists.reels, source.reels),
  };
}

export function scheduleToObjectUi(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  return {
    seg: String(base.seg || "").trim(),
    ter: String(base.ter || "").trim(),
    qua: String(base.qua || "").trim(),
    qui: String(base.qui || "").trim(),
    sex: String(base.sex || "").trim(),
    sab: String(base.sab || "").trim(),
    dom: String(base.dom || "").trim(),
  };
}
