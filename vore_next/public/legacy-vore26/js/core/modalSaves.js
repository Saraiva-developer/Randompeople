export function buildSavedMediaKeyUi(profileId, tabId, mediaUrl) {
  return String(Number(profileId || 0)) + "|" + String(tabId || "") + "|" + String(mediaUrl || "");
}

export function buildSavedItemKeyUi(ctx, profileId, tabId, item) {
  const { pick, slugify } = ctx || {};
  const title = pick(item, ["name", "title", "label", "description"]) || "item";
  const price =
    pick(item, ["price", "promoNowPrice", "nightlyPrice", "priceNight", "pricePerNight", "price_per_night"]) || "";
  return (
    String(Number(profileId || 0)) +
    "|" +
    String(tabId || "") +
    "|" +
    slugify(title) +
    "|" +
    slugify(price)
  );
}

export function isCurrentModalSavedUi(ctx) {
  const {
    ensurePersonalStoreLoaded,
    isCommonUser,
    personalStore,
    itemModalState,
    getItemMediaList,
    buildSavedMediaKey,
    buildSavedItemKey,
  } = ctx || {};
  ensurePersonalStoreLoaded();
  if (!isCommonUser() || !personalStore.data || !itemModalState.open) return false;
  const tabId = String(itemModalState.tabId || "");
  const item = itemModalState.items[itemModalState.index] || {};
  const profileId = Number(itemModalState.profileId || 0);
  if (tabId === "galeria") {
    const media = getItemMediaList(tabId, item)[itemModalState.mediaIndex] || null;
    if (!media || !media.url) return false;
    const key = buildSavedMediaKey(profileId, tabId, media.url);
    return personalStore.data.savedMedia.some((entry) => String((entry && entry.key) || "") === key);
  }
  const key = buildSavedItemKey(profileId, tabId, item);
  return personalStore.data.savedItems.some((entry) => String((entry && entry.key) || "") === key);
}

export function toggleCurrentModalSaveUi(ctx) {
  const {
    ensurePersonalStoreLoaded,
    isCommonUser,
    personalStore,
    itemModalState,
    getItemMediaList,
    buildSavedMediaKey,
    buildSavedItemKey,
    pick,
    deepClone,
    persistPersonalStore,
    api,
  } = ctx || {};
  ensurePersonalStoreLoaded();
  if (!isCommonUser() || !personalStore.data || !itemModalState.open) return;
  const tabId = String(itemModalState.tabId || "");
  const item = itemModalState.items[itemModalState.index] || {};
  const profileId = Number(itemModalState.profileId || 0);
  const profileName = String(itemModalState.profileName || "Perfil");
  if (tabId === "galeria") {
    const media = getItemMediaList(tabId, item)[itemModalState.mediaIndex] || null;
    if (!media || !media.url) return;
    const key = buildSavedMediaKey(profileId, tabId, media.url);
    const list = personalStore.data.savedMedia;
    const idx = list.findIndex((entry) => String((entry && entry.key) || "") === key);
    let savedEntry = null;
    let isSaved = false;
    if (idx >= 0) list.splice(idx, 1);
    else {
      savedEntry = {
        key,
        profileId,
        profileName,
        tabId,
        mediaUrl: media.url,
        mediaType: media.type || "image",
        title: pick(item, ["name", "title", "label"]) || "Media",
        savedAt: Date.now(),
      };
      list.unshift(savedEntry);
      personalStore.data.savedMedia = list.slice(0, 500);
      isSaved = true;
    }
    persistPersonalStore();
    if (api && typeof api.savedEntrySet === "function") {
      api.savedEntrySet("media", key, savedEntry || { key }, isSaved).catch(() => {});
    }
    return;
  }
  const key = buildSavedItemKey(profileId, tabId, item);
  const list = personalStore.data.savedItems;
  const idx = list.findIndex((entry) => String((entry && entry.key) || "") === key);
  let savedEntry = null;
  let isSaved = false;
  if (idx >= 0) list.splice(idx, 1);
  else {
    savedEntry = {
      key,
      profileId,
      profileName,
      tabId,
      title: pick(item, ["name", "title", "label"]) || "Item",
      item: deepClone(item),
      savedAt: Date.now(),
    };
    list.unshift(savedEntry);
    personalStore.data.savedItems = list.slice(0, 500);
    isSaved = true;
  }
  persistPersonalStore();
  if (api && typeof api.savedEntrySet === "function") {
    api.savedEntrySet("item", key, savedEntry || { key }, isSaved).catch(() => {});
  }
}
