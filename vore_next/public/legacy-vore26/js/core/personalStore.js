export function blankPersonalDataUi() {
  return {
    savedProfiles: [],
    recentProfiles: [],
    savedMedia: [],
    savedItems: [],
    shareInbox: [],
    shareSent: [],
    shareContacts: [],
  };
}

export function getPersonalStorageKeyUi(userId) {
  return "vore_personal_" + String(Number(userId || 0));
}

export function getCommonUserIdUi(ctx) {
  const { isCommonUser, state } = ctx || {};
  if (!isCommonUser()) return 0;
  return Number((state.authUser && state.authUser.id) || 0);
}

export function ensurePersonalStoreLoadedUi(ctx) {
  const {
    personalStore,
    getCommonUserId,
    blankPersonalData,
    getPersonalStorageKey,
    normalizeEmail,
    isValidEmail,
    localStorageRef,
    api,
  } = ctx || {};
  const userId = getCommonUserId();
  if (!userId) {
    personalStore.loadedForUserId = 0;
    personalStore.data = null;
    return;
  }
  if (personalStore.loadedForUserId === userId && personalStore.data) return;
  let data = blankPersonalData();
  try {
    const raw = localStorageRef.getItem(getPersonalStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") data = Object.assign(data, parsed);
    }
  } catch (_e) {}
  data.savedProfiles = Array.from(
    new Set((Array.isArray(data.savedProfiles) ? data.savedProfiles : []).map((id) => Number(id || 0)).filter((id) => id > 0))
  );
  data.recentProfiles = Array.from(
    new Set((Array.isArray(data.recentProfiles) ? data.recentProfiles : []).map((id) => Number(id || 0)).filter((id) => id > 0))
  );
  data.savedMedia = Array.isArray(data.savedMedia) ? data.savedMedia : [];
  data.savedItems = Array.isArray(data.savedItems) ? data.savedItems : [];
  data.shareInbox = Array.isArray(data.shareInbox) ? data.shareInbox : [];
  data.shareSent = Array.isArray(data.shareSent) ? data.shareSent : [];
  data.shareContacts = Array.isArray(data.shareContacts) ? data.shareContacts : [];
  data.shareContacts = data.shareContacts
    .map((entry) => ({
      email: normalizeEmail((entry && entry.email) || ""),
      name: String((entry && entry.name) || "").trim(),
      lastUsedAt: Number((entry && entry.lastUsedAt) || 0),
    }))
    .filter((entry) => isValidEmail(entry.email))
    .slice(0, 200);
  personalStore.loadedForUserId = userId;
  personalStore.data = data;
  if (api && typeof api.savedProfilesGet === "function" && personalStore.remoteLoadedForUserId !== userId) {
    personalStore.remoteLoadedForUserId = userId;
    api.savedProfilesGet()
      .then((resp) => {
        if (personalStore.loadedForUserId !== userId || !personalStore.data) return;
        const remoteIds = Array.from(
          new Set((Array.isArray(resp && resp.saved_profile_ids) ? resp.saved_profile_ids : [])
            .map((id) => Number(id || 0))
            .filter((id) => id > 0))
        );
        const localIds = Array.from(
          new Set((Array.isArray(personalStore.data.savedProfiles) ? personalStore.data.savedProfiles : [])
            .map((id) => Number(id || 0))
            .filter((id) => id > 0))
        );
        const remoteSet = new Set(remoteIds);
        const missingRemote = localIds.filter((id) => !remoteSet.has(id));
        personalStore.data.savedProfiles = Array.from(
          new Set([].concat(remoteIds, localIds))
        ).slice(0, 500);
        const remoteMedia = Array.isArray(resp && resp.saved_media) ? resp.saved_media : [];
        const remoteItems = Array.isArray(resp && resp.saved_items) ? resp.saved_items : [];
        const mergeEntries = (remote, local) => {
          const byKey = {};
          [].concat(remote || [], local || []).forEach((entry) => {
            const key = String((entry && entry.key) || "");
            if (!key || byKey[key]) return;
            byKey[key] = entry;
          });
          return Object.values(byKey).slice(0, 500);
        };
        const localMedia = Array.isArray(personalStore.data.savedMedia) ? personalStore.data.savedMedia : [];
        const localItems = Array.isArray(personalStore.data.savedItems) ? personalStore.data.savedItems : [];
        const remoteMediaKeys = new Set(remoteMedia.map((entry) => String((entry && entry.key) || "")).filter(Boolean));
        const remoteItemKeys = new Set(remoteItems.map((entry) => String((entry && entry.key) || "")).filter(Boolean));
        const missingMedia = localMedia.filter((entry) => {
          const key = String((entry && entry.key) || "");
          return key && !remoteMediaKeys.has(key);
        });
        const missingItems = localItems.filter((entry) => {
          const key = String((entry && entry.key) || "");
          return key && !remoteItemKeys.has(key);
        });
        personalStore.data.savedMedia = mergeEntries(remoteMedia, localMedia);
        personalStore.data.savedItems = mergeEntries(remoteItems, localItems);
        persistPersonalStoreUi(ctx);
        missingRemote.slice(0, 500).forEach((id) => {
          api.savedProfileSet(id, true).catch(() => {});
        });
        missingMedia.slice(0, 500).forEach((entry) => {
          api.savedEntrySet("media", entry.key, entry, true).catch(() => {});
        });
        missingItems.slice(0, 500).forEach((entry) => {
          api.savedEntrySet("item", entry.key, entry, true).catch(() => {});
        });
      })
      .catch(() => {});
  }
}

export function persistPersonalStoreUi(ctx) {
  const { personalStore, getCommonUserId, getPersonalStorageKey, localStorageRef } = ctx || {};
  const userId = getCommonUserId();
  if (!userId || !personalStore.data) return;
  try {
    localStorageRef.setItem(getPersonalStorageKey(userId), JSON.stringify(personalStore.data));
  } catch (_e) {}
}

export function getCurrentUserIdUi(state) {
  return Number((state.authUser && state.authUser.id) || 0);
}

export function getNotificationsStorageKeyUi(userId) {
  return "vore_notifications_" + String(Number(userId || 0));
}

export function ensureNotificationsStoreLoadedUi(ctx) {
  const { notificationsStore, getCurrentUserId, getNotificationsStorageKey, localStorageRef } = ctx || {};
  const userId = getCurrentUserId();
  if (!userId) {
    notificationsStore.loadedForUserId = 0;
    notificationsStore.readKeys = [];
    return;
  }
  if (notificationsStore.loadedForUserId === userId) return;
  let parsed = { readKeys: [] };
  try {
    const raw = localStorageRef.getItem(getNotificationsStorageKey(userId));
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") parsed = Object.assign(parsed, obj);
    }
  } catch (_e) {}
  notificationsStore.loadedForUserId = userId;
  notificationsStore.readKeys = Array.from(
    new Set((Array.isArray(parsed.readKeys) ? parsed.readKeys : []).map((v) => String(v || "")).filter(Boolean))
  );
}

export function persistNotificationsStoreUi(ctx) {
  const { notificationsStore, getCurrentUserId, getNotificationsStorageKey, localStorageRef } = ctx || {};
  const userId = getCurrentUserId();
  if (!userId) return;
  try {
    localStorageRef.setItem(
      getNotificationsStorageKey(userId),
      JSON.stringify({ readKeys: notificationsStore.readKeys.slice(0, 2000) })
    );
  } catch (_e) {}
}

export function isNotificationReadUi(ctx, key) {
  const { ensureNotificationsStoreLoaded, notificationsStore } = ctx || {};
  ensureNotificationsStoreLoaded();
  return notificationsStore.readKeys.includes(String(key || ""));
}

export function markNotificationReadUi(ctx, key) {
  const { ensureNotificationsStoreLoaded, notificationsStore, persistNotificationsStore } = ctx || {};
  ensureNotificationsStoreLoaded();
  const token = String(key || "");
  if (!token) return;
  if (!notificationsStore.readKeys.includes(token)) {
    notificationsStore.readKeys.unshift(token);
    notificationsStore.readKeys = Array.from(new Set(notificationsStore.readKeys)).slice(0, 2000);
    persistNotificationsStore();
  }
}

export function isProfileSavedUi(ctx, profileId) {
  const { ensurePersonalStoreLoaded, personalStore } = ctx || {};
  ensurePersonalStoreLoaded();
  const pid = Number(profileId || 0);
  if (!pid || !personalStore.data) return false;
  return personalStore.data.savedProfiles.includes(pid);
}

export function toggleSavedProfileUi(ctx, profileId) {
  const { ensurePersonalStoreLoaded, personalStore, persistPersonalStore, api } = ctx || {};
  ensurePersonalStoreLoaded();
  const pid = Number(profileId || 0);
  if (!pid || !personalStore.data) return false;
  const list = personalStore.data.savedProfiles;
  const idx = list.indexOf(pid);
  if (idx >= 0) list.splice(idx, 1);
  else list.unshift(pid);
  personalStore.data.savedProfiles = Array.from(new Set(list)).slice(0, 500);
  persistPersonalStore();
  const isSaved = personalStore.data.savedProfiles.includes(pid);
  if (api && typeof api.savedProfileSet === "function") {
    api.savedProfileSet(pid, isSaved).catch(() => {});
  }
  return isSaved;
}

export function addRecentProfileUi(ctx, profileId) {
  const { ensurePersonalStoreLoaded, personalStore, persistPersonalStore } = ctx || {};
  ensurePersonalStoreLoaded();
  const pid = Number(profileId || 0);
  if (!pid || !personalStore.data) return;
  const list = personalStore.data.recentProfiles.filter((id) => id !== pid);
  list.unshift(pid);
  personalStore.data.recentProfiles = list.slice(0, 80);
  persistPersonalStore();
}
