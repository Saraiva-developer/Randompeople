export function recommendationTypeToShareKindUi(rawType) {
  const type = String(rawType || "").trim().toLowerCase();
  if (["photo", "photos", "foto", "fotos", "image", "images"].includes(type)) return "photo";
  if (["video", "videos", "reel", "reels"].includes(type)) return "video";
  return "profile";
}

export function reactionToEmojiUi(reaction) {
  const code = String(reaction || "").trim().toLowerCase();
  if (code === "like") return "\u{1F44D}";
  if (code === "fire") return "\u{1F525}";
  if (code === "wow") return "\u{1F929}";
  if (code === "love") return "\u{2764}\u{FE0F}";
  return "";
}

export function mapItemShareKindFromTabUi(tabId) {
  const tab = String(tabId || "").trim().toLowerCase();
  if (tab === "servicos") return "service";
  if (tab === "produtos") return "product";
  if (tab === "menu") return "menu";
  if (tab === "portfolio") return "portfolio";
  if (tab === "casas") return "house";
  if (tab === "quartos") return "room";
  if (tab === "campanhas") return "campaign";
  return "product";
}

export function mapTabFromItemShareKindUi(kind) {
  const value = String(kind || "").trim().toLowerCase();
  if (value === "service") return "servicos";
  if (value === "product") return "produtos";
  if (value === "menu") return "menu";
  if (value === "portfolio") return "portfolio";
  if (value === "house") return "casas";
  if (value === "room") return "quartos";
  if (value === "campaign") return "campanhas";
  return "produtos";
}

export function resolveMediaUriUi(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  if (/^data:(image|video)\//i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return "";
}

export function parseSharedItemPayloadUi(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw || !raw.startsWith("itemshare:")) return null;
  const encoded = raw.slice("itemshare:".length);
  if (!encoded) return null;
  try {
    const json = decodeURIComponent(encoded);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    const kind = String(parsed.kind || "").trim().toLowerCase();
    if (!["service", "product", "menu", "portfolio", "house", "room", "campaign"].includes(kind)) return null;
    return {
      kind,
      section: String(parsed.section || "").trim(),
      name: String(parsed.name || "").trim(),
      price: String(parsed.price || "").trim(),
      oldPrice: String(parsed.oldPrice || "").trim(),
      time: String(parsed.time || "").trim(),
      note: String(parsed.note || "").trim(),
      image: String(parsed.image || "").trim(),
    };
  } catch (_e) {
    return null;
  }
}

export function buildItemShareUriFromPayloadUi(ctx, payload) {
  const { pick, getItemMediaList } = ctx || {};
  const safe = payload && typeof payload === "object" ? payload : {};
  const item = safe.item && typeof safe.item === "object" ? safe.item : {};
  const tabId = String(safe.tabId || "").trim().toLowerCase();
  const rawName = pick(item, ["name", "title", "label", "description"]);
  const rawPrice = pick(item, ["price", "promoNowPrice", "nightlyPrice", "priceNight", "pricePerNight", "price_per_night"]);
  const rawOldPrice = pick(item, ["promoOldPrice"]);
  const rawTime = pick(item, ["time", "duration"]);
  const rawNote = pick(item, ["description", "note", "notes", "shortDescription"]);
  const imageList = getItemMediaList(tabId, item).filter((m) => String(m && m.type || "") === "image");
  const rawImage = imageList[0] ? String(imageList[0].url || "") : pick(item, ["imageUrl", "image"]);
  const itemPayload = {
    kind: mapItemShareKindFromTabUi(tabId),
    section: String(safe.subtitle || safe.profileName || "").trim(),
    name: String(rawName || safe.title || "Conteudo").trim(),
    price: String(rawPrice || "").trim(),
    oldPrice: String(rawOldPrice || "").trim(),
    time: String(rawTime || "").trim(),
    note: String(rawNote || "").trim(),
    image: String(rawImage || "").trim(),
  };
  return "itemshare:" + encodeURIComponent(JSON.stringify(itemPayload));
}

export function mapItemFromSharedPayloadUi(payload) {
  const safe = payload && typeof payload === "object" ? payload : {};
  const item = {
    name: String(safe.name || "Item").trim(),
    description: String(safe.note || "").trim(),
  };
  if (safe.price) item.price = String(safe.price);
  if (safe.oldPrice) {
    item.promoEnabled = "yes";
    item.promoOldPrice = String(safe.oldPrice);
    item.promoNowPrice = String(safe.price || "");
  }
  if (safe.time) item.time = String(safe.time);
  if (safe.image) {
    item.imageUrl = String(safe.image);
    item.images = [String(safe.image)];
  }
  return item;
}

export function recommendationTimestampMsUi(rawValue) {
  const ts = Date.parse(String(rawValue || ""));
  return Number.isFinite(ts) ? ts : 0;
}

export function mapRecommendationEntryUi(ctx, rawEntry, mode = "inbox") {
  const { state, normalizeEmail, isNotificationRead, deepClone } = ctx || {};
  const raw = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
  const currentUser = state.authUser && typeof state.authUser === "object" ? state.authUser : {};
  const sender = raw.sender && typeof raw.sender === "object" ? raw.sender : {};
  const receiver = raw.receiver && typeof raw.receiver === "object" ? raw.receiver : {};
  const senderEmail = normalizeEmail(sender.email || "");
  const receiverEmail = normalizeEmail(receiver.email || "");
  const senderName = String(sender.name || sender.email || "Utilizador");
  const receiverName = String(receiver.name || receiver.email || "Utilizador");
  const id = Number(raw.id || 0);
  const createdAt = recommendationTimestampMsUi(raw.created_at);
  const profileId = Number(raw.profile_id || 0);
  const profileSlug = String(raw.profile_slug || "").trim();
  const sourceProfileName = String(raw.source_profile_name || "Perfil").trim() || "Perfil";
  const contentType = recommendationTypeToShareKindUi(raw.content_type);
  const parsedItem = parseSharedItemPayloadUi(raw.content_uri);

  let kind = "profile";
  let tabId = "profile";
  let mediaUrl = "";
  let mediaType = "image";
  let item = null;
  let title = sourceProfileName;
  let subtitle = "Perfil partilhado";

  if (parsedItem) {
    kind = "item";
    tabId = mapTabFromItemShareKindUi(parsedItem.kind);
    item = mapItemFromSharedPayloadUi(parsedItem);
    mediaUrl = resolveMediaUriUi(parsedItem.image || "");
    mediaType = "image";
    title = parsedItem.name || sourceProfileName || "Conteudo";
    subtitle = sourceProfileName + " - " + (parsedItem.section || tabId);
  } else if (contentType === "profile") {
    kind = "profile";
    tabId = "profile";
    title = sourceProfileName || "Perfil";
    subtitle = "Perfil partilhado";
  } else {
    kind = "media";
    tabId = "galeria";
    mediaType = contentType === "video" ? "video" : "image";
    mediaUrl = resolveMediaUriUi(raw.content_uri || "");
    title = sourceProfileName || "Media";
    subtitle = (mediaType === "video" ? "Video" : "Foto") + " - " + sourceProfileName;
  }

  const fromEmail = mode === "sent" ? normalizeEmail(currentUser.email || "") : senderEmail;
  const fromName = mode === "sent" ? String(currentUser.name || currentUser.email || "Utilizador") : senderName;
  const toEmail = mode === "sent" ? receiverEmail : normalizeEmail(currentUser.email || "");
  const toName = mode === "sent" ? receiverName : String(currentUser.name || currentUser.email || "Utilizador");
  const key = id > 0 ? ("share_" + String(id)) : ("share_tmp_" + String(createdAt));

  return {
    id: id > 0 ? String(id) : ("tmp_" + String(createdAt)),
    kind,
    title,
    subtitle,
    profileId,
    profileSlug,
    profileName: sourceProfileName,
    tabId,
    mediaUrl,
    mediaType,
    item,
    fromEmail,
    fromName,
    toEmail,
    toName,
    read: mode === "inbox" ? isNotificationRead(key) : true,
    createdAt,
    reaction: String(raw.reaction || raw.receiver_reaction || ""),
    raw: deepClone(raw),
  };
}

export function setRecommendationContactsFromListsUi(ctx, inboxList, sentList) {
  const { recommendationsStore, normalizeEmail, isValidEmail, state } = ctx || {};
  const byEmail = {};
  const push = (emailValue, nameValue, ts = 0) => {
    const email = normalizeEmail(emailValue);
    if (!isValidEmail(email)) return;
    const currentEmail = normalizeEmail(state.authUser && state.authUser.email);
    if (email === currentEmail) return;
    const current = byEmail[email];
    byEmail[email] = {
      email,
      name: String(nameValue || (current && current.name) || "").trim(),
      lastUsedAt: Math.max(Number(ts || 0), Number(current && current.lastUsedAt || 0)),
    };
  };
  (Array.isArray(recommendationsStore.contacts) ? recommendationsStore.contacts : []).forEach((entry) => {
    push(entry && entry.email, entry && entry.name, entry && entry.lastUsedAt);
  });
  (Array.isArray(inboxList) ? inboxList : []).forEach((entry) => {
    push(entry && entry.fromEmail, entry && entry.fromName, entry && entry.createdAt);
  });
  (Array.isArray(sentList) ? sentList : []).forEach((entry) => {
    push(entry && entry.toEmail, entry && entry.toName, entry && entry.createdAt);
  });
  recommendationsStore.contacts = Object.values(byEmail)
    .sort((a, b) => Number(b && b.lastUsedAt || 0) - Number(a && a.lastUsedAt || 0))
    .slice(0, 200);
}

export function resetRecommendationsStoreUi(recommendationsStore) {
  recommendationsStore.loadedForUserId = 0;
  recommendationsStore.loading = false;
  recommendationsStore.error = "";
  recommendationsStore.inbox = [];
  recommendationsStore.sent = [];
  recommendationsStore.pendingPermissions = [];
  recommendationsStore.contacts = [];
  recommendationsStore.lastLoadedAt = 0;
  recommendationsStore.inflight = null;
}

export async function refreshRecommendationsForCurrentUserUi(ctx, options = {}) {
  const {
    state,
    isCommonUser,
    resetRecommendationsStore,
    recommendationsStore,
    api,
    mapRecommendationEntry,
    setRecommendationContactsFromLists,
    hasAccessSession,
    renderNotifications,
    renderProfile,
  } = ctx || {};
  const force = !!(options && options.force);
  const silent = !!(options && options.silent);
  const userId = Number((state.authUser && state.authUser.id) || 0);
  if (!isCommonUser() || !userId) {
    resetRecommendationsStore();
    return;
  }
  const now = Date.now();
  if (!force && recommendationsStore.loadedForUserId === userId && now - Number(recommendationsStore.lastLoadedAt || 0) < 10000) {
    return;
  }
  if (recommendationsStore.inflight && !force) return recommendationsStore.inflight;
  recommendationsStore.loading = true;
  recommendationsStore.error = "";
  const task = api.recommendationsMe()
    .then((resp) => {
      const inboxRaw = Array.isArray(resp && resp.inbox) ? resp.inbox : [];
      const sentRaw = Array.isArray(resp && resp.sent) ? resp.sent : [];
      const pendingRaw = Array.isArray(resp && resp.pending_permissions) ? resp.pending_permissions : [];
      const inbox = inboxRaw.map((entry) => mapRecommendationEntry(entry, "inbox"));
      const sent = sentRaw.map((entry) => mapRecommendationEntry(entry, "sent"));
      recommendationsStore.loadedForUserId = userId;
      recommendationsStore.inbox = inbox;
      recommendationsStore.sent = sent;
      recommendationsStore.pendingPermissions = pendingRaw.map((entry) => ({
        sender_user_id: Number(entry && entry.sender_user_id || 0),
        sender_name: String(entry && entry.sender_name || ""),
        sender_email: String(entry && entry.sender_email || ""),
        status: String(entry && entry.status || "pending"),
        created_at: String(entry && entry.created_at || ""),
      }));
      setRecommendationContactsFromLists(inbox, sent);
      recommendationsStore.lastLoadedAt = Date.now();
    })
    .catch((err) => {
      recommendationsStore.error = String((err && err.message) || err || "Erro ao carregar partilhas.");
      recommendationsStore.loadedForUserId = userId;
      recommendationsStore.inbox = [];
      recommendationsStore.sent = [];
      recommendationsStore.pendingPermissions = [];
      recommendationsStore.lastLoadedAt = Date.now();
    })
    .finally(() => {
      recommendationsStore.loading = false;
      recommendationsStore.inflight = null;
      if (!silent && hasAccessSession()) {
        if (state.currentTab === "notifications") renderNotifications();
        if (state.currentTab === "profile" && isCommonUser() && String(state.profileContext || "personal") !== "public") renderProfile();
      }
    });
  recommendationsStore.inflight = task;
  return task;
}

export function getCurrentUserInboxEntriesUi(ctx) {
  const { isCommonUser, recommendationsStore } = ctx || {};
  if (!isCommonUser()) return [];
  return Array.isArray(recommendationsStore.inbox) ? recommendationsStore.inbox : [];
}

export function markCurrentUserInboxEntryReadUi(ctx, entryId) {
  const { markNotificationRead, recommendationsStore } = ctx || {};
  const token = String(entryId || "").trim();
  if (!token) return;
  markNotificationRead("share_" + token);
  const list = Array.isArray(recommendationsStore.inbox) ? recommendationsStore.inbox : [];
  list.forEach((entry) => {
    if (String(entry && entry.id || "") === token) entry.read = true;
  });
}

export function mergeIncomingSharesForCurrentUserUi(ctx) {
  const { isCommonUser, refreshRecommendationsForCurrentUser } = ctx || {};
  if (!isCommonUser()) return;
  void refreshRecommendationsForCurrentUser({ silent: true });
}

export function countUnreadSharesUi(recommendationsStore) {
  const list = Array.isArray(recommendationsStore.inbox) ? recommendationsStore.inbox : [];
  return list.filter((entry) => !entry || entry.read !== true).length;
}

export function upsertShareContactUi(ctx, email, name = "") {
  const { recommendationsStore, normalizeEmail, isValidEmail } = ctx || {};
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return;
  const idx = recommendationsStore.contacts.findIndex((entry) => normalizeEmail(entry && entry.email) === normalized);
  const now = Date.now();
  if (idx >= 0) {
    const current = recommendationsStore.contacts[idx] || {};
    recommendationsStore.contacts[idx] = {
      email: normalized,
      name: String(name || current.name || "").trim(),
      lastUsedAt: now,
    };
  } else {
    recommendationsStore.contacts.push({
      email: normalized,
      name: String(name || "").trim(),
      lastUsedAt: now,
    });
  }
  recommendationsStore.contacts = recommendationsStore.contacts
    .sort((a, b) => Number(b && b.lastUsedAt || 0) - Number(a && a.lastUsedAt || 0))
    .slice(0, 200);
}

export function getShareContactsUi(recommendationsStore) {
  return Array.isArray(recommendationsStore.contacts) ? recommendationsStore.contacts.slice(0, 100) : [];
}

export async function loadSharePickerUsersUi(ctx, query) {
  const { sharePickerState, api, normalizeEmail, isValidEmail } = ctx || {};
  const q = String(query || "").trim();
  sharePickerState.usersQuery = q;
  if (q.length < 2) {
    sharePickerState.users = [];
    sharePickerState.usersLoading = false;
    return;
  }
  const token = Number(sharePickerState.searchToken || 0) + 1;
  sharePickerState.searchToken = token;
  sharePickerState.usersLoading = true;
  try {
    const resp = await api.recommendationsUsers(q);
    if (token !== sharePickerState.searchToken) return;
    const users = Array.isArray(resp && resp.users) ? resp.users : [];
    sharePickerState.users = users
      .map((entry) => ({
        id: Number(entry && entry.id || 0),
        email: normalizeEmail(entry && entry.email),
        name: String(entry && entry.name || "").trim(),
      }))
      .filter((entry) => isValidEmail(entry.email));
  } catch (_e) {
    if (token !== sharePickerState.searchToken) return;
    sharePickerState.users = [];
  } finally {
    if (token === sharePickerState.searchToken) sharePickerState.usersLoading = false;
  }
}

export async function dispatchShareUi(ctx, payload, toEmailValue, toName = "") {
  const {
    isCommonUser,
    normalizeEmail,
    isValidEmail,
    api,
    upsertShareContact,
    refreshRecommendationsForCurrentUser,
    buildItemShareUriFromPayload,
  } = ctx || {};
  if (!isCommonUser()) return { ok: false, error: "Disponivel apenas para conta pessoal." };
  const toEmail = normalizeEmail(toEmailValue);
  if (!isValidEmail(toEmail)) {
    return { ok: false, error: "Email invalido." };
  }
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const rawKind = String(safePayload.kind || "").trim().toLowerCase();
  const kind = rawKind === "item" || rawKind === "media" || rawKind === "profile" ? rawKind : "profile";
  const requestPayload = {
    recipient_email: toEmail,
    source_profile_name: String(safePayload.profileName || safePayload.title || "Perfil").trim(),
    profile_id: Number(safePayload.profileId || 0) || null,
    profile_slug: String(safePayload.profileSlug || "").trim() || null,
    content_type: "profile",
    content_uri: "",
  };
  if (kind === "media") {
    requestPayload.content_type = String(safePayload.mediaType || "").toLowerCase() === "video" ? "video" : "photo";
    requestPayload.content_uri = String(safePayload.mediaUrl || "").trim();
  } else if (kind === "item") {
    requestPayload.content_type = "photo";
    requestPayload.content_uri = buildItemShareUriFromPayload(safePayload);
  }
  try {
    await api.recommendationsSend(requestPayload);
    upsertShareContact(toEmail, toName);
    await refreshRecommendationsForCurrentUser({ force: true, silent: true });
    return { ok: true };
  } catch (err) {
    await refreshRecommendationsForCurrentUser({ force: true, silent: true });
    const message = String((err && err.message) || err || "Não foi possível enviar.");
    if (message === "permission_required") {
      return { ok: false, error: "Pedido de permissão enviado.", permissionRequired: true };
    }
    return { ok: false, error: message || "Não foi possível enviar." };
  }
}

export async function handleRecommendationPermissionActionUi(ctx, action, senderUserId) {
  const { isCommonUser, api, refreshRecommendationsForCurrentUser } = ctx || {};
  const act = String(action || "").trim().toLowerCase();
  const senderId = Number(senderUserId || 0);
  if (!isCommonUser() || !act || senderId <= 0) return false;
  try {
    await api.recommendationsPermissionAction({
      action: act,
      sender_user_id: senderId,
    });
    await refreshRecommendationsForCurrentUser({ force: true, silent: true });
    return true;
  } catch (_e) {
    return false;
  }
}

export async function handleRecommendationReactionUi(ctx, recommendationId, reaction) {
  const { isCommonUser, api, refreshRecommendationsForCurrentUser } = ctx || {};
  const rid = Number(recommendationId || 0);
  const code = String(reaction || "").trim().toLowerCase();
  if (!isCommonUser() || rid <= 0) return false;
  try {
    await api.recommendationsReact(rid, code);
    await refreshRecommendationsForCurrentUser({ force: true, silent: true });
    return true;
  } catch (_e) {
    return false;
  }
}
