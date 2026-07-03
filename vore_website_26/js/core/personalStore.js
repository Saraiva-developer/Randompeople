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
  const { ensurePersonalStoreLoaded, personalStore, persistPersonalStore } = ctx || {};
  ensurePersonalStoreLoaded();
  const pid = Number(profileId || 0);
  if (!pid || !personalStore.data) return false;
  const list = personalStore.data.savedProfiles;
  const idx = list.indexOf(pid);
  if (idx >= 0) list.splice(idx, 1);
  else list.unshift(pid);
  personalStore.data.savedProfiles = Array.from(new Set(list)).slice(0, 500);
  persistPersonalStore();
  return list.includes(pid);
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
