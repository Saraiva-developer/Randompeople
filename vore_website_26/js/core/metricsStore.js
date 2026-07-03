export function getMetricsDayKeyUi() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return String(y) + "-" + String(m) + "-" + String(d);
}

export function getGuestClientIdUi(localStorageRef) {
  try {
    let token = String(localStorageRef.getItem("vore_guest_client_id") || "").trim();
    if (!token) {
      token = String(Date.now()) + "_" + String(Math.random()).slice(2, 8);
      localStorageRef.setItem("vore_guest_client_id", token);
    }
    return token;
  } catch (_e) {
    return "guest";
  }
}

export function getMetricsClientKeyUi(ctx) {
  const { getCurrentUserId, getGuestClientId } = ctx || {};
  const userId = getCurrentUserId();
  if (userId > 0) return "user_" + String(userId);
  return "guest_" + getGuestClientId();
}

export function getMetricsStorageKeyUi(clientKey) {
  return "vore_metrics_" + String(clientKey || "guest");
}

export function ensureMetricsStoreLoadedUi(ctx) {
  const {
    metricsStore,
    getMetricsClientKey,
    getMetricsDayKey,
    getMetricsStorageKey,
    localStorageRef,
  } = ctx || {};
  const clientKey = getMetricsClientKey();
  const dayKey = getMetricsDayKey();
  if (metricsStore.loadedForKey === clientKey && metricsStore.dayKey === dayKey) return;
  let parsed = { dayKey, profileViews: {} };
  try {
    const raw = localStorageRef.getItem(getMetricsStorageKey(clientKey));
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") parsed = Object.assign(parsed, obj);
    }
  } catch (_e) {}
  if (String(parsed.dayKey || "") !== dayKey) {
    parsed.dayKey = dayKey;
    parsed.profileViews = {};
  }
  const views = parsed.profileViews && typeof parsed.profileViews === "object" ? parsed.profileViews : {};
  const normalized = {};
  Object.keys(views).forEach((key) => {
    const id = Number(key || 0);
    const count = Math.max(0, Number(views[key] || 0));
    if (id > 0 && count > 0) normalized[String(id)] = count;
  });
  metricsStore.loadedForKey = clientKey;
  metricsStore.dayKey = dayKey;
  metricsStore.profileViews = normalized;
}

export function persistMetricsStoreUi(ctx) {
  const {
    metricsStore,
    getMetricsClientKey,
    getMetricsStorageKey,
    getMetricsDayKey,
    localStorageRef,
  } = ctx || {};
  const clientKey = getMetricsClientKey();
  if (!clientKey) return;
  try {
    localStorageRef.setItem(
      getMetricsStorageKey(clientKey),
      JSON.stringify({
        dayKey: metricsStore.dayKey || getMetricsDayKey(),
        profileViews: metricsStore.profileViews || {},
      })
    );
  } catch (_e) {}
}

export function incrementProfileViewUi(ctx, profileId) {
  const { metricsStore, ensureMetricsStoreLoaded, persistMetricsStore } = ctx || {};
  const pid = Number(profileId || 0);
  if (pid <= 0) return;
  ensureMetricsStoreLoaded();
  const key = String(pid);
  const current = Number(metricsStore.profileViews[key] || 0);
  metricsStore.profileViews[key] = current + 1;
  persistMetricsStore();
}

export function getProfileViewCountUi(ctx, profileId) {
  const { metricsStore, ensureMetricsStoreLoaded } = ctx || {};
  const pid = Number(profileId || 0);
  if (pid <= 0) return 0;
  ensureMetricsStoreLoaded();
  return Number(metricsStore.profileViews[String(pid)] || 0);
}

export function getTotalProfileViewsUi(ctx) {
  const { metricsStore, ensureMetricsStoreLoaded } = ctx || {};
  ensureMetricsStoreLoaded();
  return Object.values(metricsStore.profileViews || {}).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
}

export function getTrendingProfilesUi(ctx, sourceProfiles, limit = 3) {
  const { getProfileViewCount, parseRating, getBadgeType } = ctx || {};
  const list = Array.isArray(sourceProfiles) ? sourceProfiles : [];
  const scored = list.map((profile) => {
    const views = getProfileViewCount(profile && profile.id);
    const rating = parseRating(profile);
    const badge = getBadgeType(profile);
    const badgeBoost = badge === "promo" ? 2 : badge === "novo" ? 1.5 : badge === "verif" ? 1 : 0;
    const score = views * 3 + rating + badgeBoost;
    return { profile, score, views };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, Math.max(1, Number(limit || 3)));
}
