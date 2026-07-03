import { api } from "./api/client.js";
import { state, setState, mapProfileRow, profileSections, getTabsForProfile } from "./core/state.js";
import { PROFILE_TYPE_LABEL } from "./config.js";

const el = {
  nav: document.getElementById("mainNav"),
  screens: [...document.querySelectorAll(".screen")],
  home: document.getElementById("homeCards"),
  explore: document.getElementById("exploreCards"),
};
el.entryGate = document.getElementById("entryGate");
el.appShell = document.getElementById("appShell");
el.homeFilters = document.getElementById("homeFilterChips");
el.homeInsights = document.getElementById("homeInsights");
el.homeSuggested = document.getElementById("homeSuggested");
el.homeProfilesTitle = document.getElementById("homeProfilesTitle");
el.exploreSortRow = document.getElementById("exploreSortRow");
el.exploreMetaText = document.getElementById("exploreMetaText");
el.exploreTrendText = document.getElementById("exploreTrendText");
el.exploreActiveFilters = document.getElementById("exploreActiveFilters");
el.exploreOpenFilters = document.getElementById("exploreOpenFilters");
el.explorePager = document.getElementById("explorePager");
el.exploreSentinel = document.getElementById("exploreSentinel");
if (!el.exploreSentinel && el.explorePager && el.explorePager.parentElement) {
  const sentinel = document.createElement("div");
  sentinel.id = "exploreSentinel";
  sentinel.className = "explore-sentinel";
  el.explorePager.parentElement.insertBefore(sentinel, el.explorePager.nextSibling);
  el.exploreSentinel = sentinel;
}
el.search = document.getElementById("searchInput");
el.head = document.getElementById("profileHead");
el.tabs = document.getElementById("profileTabs");
el.subtabs = document.getElementById("profileSubTabs");
el.content = document.getElementById("profileContent");
el.notificationsFilters = document.getElementById("notificationsFilters");
el.notificationsList = document.getElementById("notificationsList");
el.edit = document.getElementById("editPlaceholder");
el.status = document.getElementById("statusText");
el.settings = document.getElementById("settingsInfo");

const editor = { profileId: null, draft: null, activeSubByTab: {}, collapsedItemsBySection: {} };
const itemModalState = { open: false, tabId: "", items: [], index: 0, mediaIndex: 0, profileId: 0, profileName: "" };
const reviewsState = {
  open: false,
  profileId: 0,
  slug: "",
  profileName: "",
  loading: false,
  saving: false,
  error: "",
  summary: { average: 0, total: 0, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } },
  list: [],
  canRate: false,
  rating: 0,
  comment: "",
  sortMode: "recent",
};
const settingsUi = {
  view: "main",
  notifNewVisits: true,
  notifShares: true,
  notifPromos: true,
  profileActive: true,
  language: "pt",
  theme: "claro",
  credentials: { email: "", currentPassword: "", newPassword: "", repeatPassword: "" },
  message: "",
};
const sharePickerState = {
  open: false,
  payload: null,
  query: "",
  error: "",
  usersLoading: false,
  usersQuery: "",
  users: [],
  searchToken: 0,
};
const personalStore = {
  loadedForUserId: 0,
  data: null,
};
const notificationsStore = {
  loadedForUserId: 0,
  readKeys: [],
};
const recommendationsStore = {
  loadedForUserId: 0,
  loading: false,
  error: "",
  inbox: [],
  sent: [],
  pendingPermissions: [],
  contacts: [],
  lastLoadedAt: 0,
  inflight: null,
};
const metricsStore = {
  loadedForKey: "",
  dayKey: "",
  profileViews: {},
};
const entryUi = {
  error: "",
  success: "",
  pending: false,
};
const EXPLORE_PAGE_SIZE = 24;
const NAV_LABELS = {
  home: "Home",
  explore: "Explorar",
  notifications: "Notificações",
  profile: "Perfil",
  edit: "Editar Perfil",
  settings: "Definições",
};
const explorePagerState = {
  key: "",
  visibleCount: EXPLORE_PAGE_SIZE,
  totalCount: 0,
  lastAutoLoadAt: 0,
};
let exploreSentinelObserver = null;

function getStoredLanguage() {
  try {
    const value = String(localStorage.getItem("vore_language") || "").toLowerCase();
    if (value === "pt" || value === "en" || value === "es") return value;
  } catch (_e) {}
  return "";
}
const PROFILE_TYPE_OPTIONS = ["service_pro", "shop", "food", "lodging", "creator"];
const PROFILE_CATEGORY_OPTIONS = {
  service_pro: ["Estetica", "Bem-estar", "Saude", "Treino", "Consultoria", "Eventos"],
  shop: ["Eletronica", "Moda", "Beleza", "Suplementos", "Casa e Decoracao", "Tecnologia"],
  food: ["Restaurante", "Bar", "Cafe", "Pastelaria", "Brunch", "Petiscos"],
  lodging: ["Alojamento", "Hotel", "Hostel", "Casa de Ferias", "Quarto", "Rural"],
  creator: ["Fotografia", "Video", "Design", "Musica", "Arte", "Conteudo"],
};
const SERVICE_TYPE_META = [
  { id: "general", label: "Geral", extra1: "Detalhe 1", extra2: "Detalhe 2" },
  { id: "beauty", label: "Beleza", extra1: "Area", extra2: "Material" },
  { id: "wellness", label: "Bem-estar", extra1: "Tipo de sessao", extra2: "Objetivo" },
  { id: "fitness", label: "Treino", extra1: "Nivel", extra2: "Objetivo" },
  { id: "consulting", label: "Consultoria", extra1: "Especialidade", extra2: "Formato" },
];
const HOME_FILTERS = [
  { id: "destaques", label: "Destaques" },
  { id: "novidades", label: "Novidades" },
  { id: "promocoes", label: "Promoções" },
  { id: "perto", label: "Perto de mim" },
];
const HOME_FILTER_LABELS = HOME_FILTERS.reduce((acc, f) => {
  acc[f.id] = f.label;
  return acc;
}, {});
const EXPLORE_DISCOVERY_OPTIONS = [
  { key: "all", label: "Todos" },
  { key: "perto", label: "Perto de mim" },
  { key: "promocoes", label: "Promoções" },
  { key: "novidades", label: "Novidades" },
  { key: "verif", label: "Verificados" },
];
const EXPLORE_SORT_OPTIONS = [
  { key: "relevance", label: "Relevancia" },
  { key: "recent", label: "Recentes" },
  { key: "rating", label: "Rating" },
  { key: "near", label: "Perto" },
];
const CATEGORY_TAXONOMY = [
  { key: "servicos_profissionais", label: "Servicos Profissionais", keywords: ["servico", "servicos", "consultoria", "tecnico", "assistencia", "profissional", "freelancer"] },
  { key: "saude_bem_estar", label: "Saude e Bem-Estar", keywords: ["saude", "bem estar", "terapia", "fisioterapia", "massagem", "psicologia", "nutricao", "nutricionista"] },
  { key: "desporto_fitness", label: "Desporto e Fitness", keywords: ["fitness", "ginasio", "treino", "personal trainer", "pt", "musculacao", "crossfit", "yoga", "pilates"] },
  { key: "beleza_estetica", label: "Beleza e Estetica", keywords: ["beleza", "estetica", "maquilhagem", "maquiagem", "cabelo", "barbeiro", "barbearia", "manicure", "pedicure"] },
  { key: "restaurante_bar", label: "Restaurante e Bar", keywords: ["restaurante", "bar", "petiscos", "comida", "menu", "cozinha", "drink", "cocktail"] },
  { key: "night_club", label: "Night Club", keywords: ["discoteca", "club", "night", "festa", "dj", "after"] },
  { key: "alojamento_turismo", label: "Alojamento e Turismo", keywords: ["alojamento", "hotel", "hostel", "casa", "quarto", "reserva", "turismo"] },
  { key: "moda_roupa", label: "Moda e Roupa", keywords: ["moda", "roupa", "vestuario", "tenis", "sapatilhas", "outfit"] },
  { key: "eletronica_tecnologia", label: "Eletronica e Tecnologia", keywords: ["eletronica", "tecnologia", "telemovel", "smartphone", "portatil", "gaming", "audio", "informatica"] },
  { key: "suplementos_nutricao", label: "Suplementos e Nutricao", keywords: ["suplementos", "proteina", "whey", "creatina", "pre treino", "nutricao desportiva"] },
  { key: "casa_decoracao", label: "Casa e Decoracao", keywords: ["casa", "decoracao", "interior", "mobilia", "velas"] },
  { key: "automovel_mobilidade", label: "Automovel e Mobilidade", keywords: ["automovel", "carro", "moto", "oficina", "mobilidade"] },
  { key: "educacao_formacao", label: "Educacao e Formacao", keywords: ["educacao", "formacao", "curso", "workshop", "aulas", "explicacoes", "mentoria"] },
  { key: "arte_cultura", label: "Arte e Cultura", keywords: ["arte", "cultura", "fotografia", "musica", "pintura", "teatro", "design"] },
  { key: "eventos_experiencias", label: "Eventos e Experiencias", keywords: ["evento", "experiencia", "casamento", "aniversario", "corporativo"] },
  { key: "negocios_empresas", label: "Negocios e Empresas", keywords: ["empresa", "negocio", "agencia", "b2b", "servicos empresariais"] },
  { key: "criador_portefolio", label: "Criador e Portefolio", keywords: ["criador", "creator", "portfolio", "portefolio", "conteudo", "influencer", "ugc", "social media"] },
];

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}
function deepClone(value) { return JSON.parse(JSON.stringify(value || {})); }

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function resolveServiceTypeMeta(value) {
  const id = String(value || "general").trim().toLowerCase();
  return SERVICE_TYPE_META.find((entry) => entry.id === id) || SERVICE_TYPE_META[0];
}

function isLikelyHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

function sanitizeRichHtml(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parser = new DOMParser();
  const wrapped = isLikelyHtml(raw) ? raw : raw.split(/\r?\n/).map((line) => "<p>" + esc(line) + "</p>").join("");
  const doc = parser.parseFromString("<div>" + wrapped + "</div>", "text/html");
  const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "BR", "P", "DIV", "UL", "OL", "LI", "SPAN"]);
  const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const queue = [];
  while (walker.nextNode()) queue.push(walker.currentNode);
  queue.forEach((node) => {
    if (!allowedTags.has(node.tagName)) {
      const text = doc.createTextNode(node.textContent || "");
      node.replaceWith(text);
      return;
    }
    [...node.attributes].forEach((attr) => {
      if (attr.name.toLowerCase() === "style") {
        const safeStyle = [];
        const styleValue = String(attr.value || "").toLowerCase();
        if (styleValue.includes("text-align:center")) safeStyle.push("text-align:center");
        if (styleValue.includes("text-align:right")) safeStyle.push("text-align:right");
        if (styleValue.includes("text-align:left")) safeStyle.push("text-align:left");
        if (safeStyle.length) node.setAttribute("style", safeStyle.join(";"));
        else node.removeAttribute("style");
      } else {
        node.removeAttribute(attr.name);
      }
    });
  });
  return (doc.body.innerHTML || "").trim();
}

function galleryDefaultView() {
  return { fit: "cover", zoom: 100, posX: 50, posY: 50 };
}

function normalizeGalleryView(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  const fit = String(base.fit || "").trim().toLowerCase() === "contain" ? "contain" : "cover";
  const zoom = clampNumber(base.zoom, 80, 220, 100);
  const posX = clampNumber(base.posX, 0, 100, 50);
  const posY = clampNumber(base.posY, 0, 100, 50);
  return { fit, zoom, posX, posY };
}

function ensureGalleryViewLength(list, viewList) {
  const mediaList = Array.isArray(list) ? list : [];
  const source = Array.isArray(viewList) ? viewList : [];
  const next = mediaList.map((_, idx) => normalizeGalleryView(source[idx]));
  return next;
}

function getGalleryViewStyle(view, mediaType) {
  const safe = normalizeGalleryView(view);
  if (mediaType === "video") return "object-fit:" + safe.fit + ";";
  const scale = Math.max(0.8, safe.zoom / 100);
  return "object-fit:" + safe.fit + ";object-position:" + safe.posX + "% " + safe.posY + "%;transform:scale(" + scale.toFixed(2) + ");";
}

function editSectionKey(tabId, subKey) {
  return String(tabId || "") + "::" + String(subKey || "");
}

function isEditItemCollapsed(tabId, subKey, idx) {
  const sectionKey = editSectionKey(tabId, subKey);
  return !!(editor.collapsedItemsBySection[sectionKey] && editor.collapsedItemsBySection[sectionKey][idx] === true);
}

function setEditItemCollapsed(tabId, subKey, idx, value) {
  const sectionKey = editSectionKey(tabId, subKey);
  if (!editor.collapsedItemsBySection[sectionKey]) editor.collapsedItemsBySection[sectionKey] = {};
  editor.collapsedItemsBySection[sectionKey][idx] = !!value;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "perfil";
}

function setModalBodyLock(forceLock) {
  const shouldLock = !!forceLock || !!itemModalState.open || !!reviewsState.open;
  if (document && document.body) {
    document.body.classList.toggle("modal-lock", shouldLock);
  }
}

function centerActiveChip(container, selector = "button.active") {
  if (!container) return;
  const node = container.querySelector(selector);
  if (!node || typeof node.scrollIntoView !== "function") return;
  try {
    node.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" });
  } catch (_e) {}
}

function updateProfileStickyOffsets() {
  const topbar = document.querySelector(".topbar");
  const tabs = el && el.tabs ? el.tabs : null;
  const topbarHeight = Math.max(48, Math.ceil((topbar && topbar.getBoundingClientRect && topbar.getBoundingClientRect().height) || 56));
  const tabsHeight = Math.max(36, Math.ceil((tabs && tabs.getBoundingClientRect && tabs.getBoundingClientRect().height) || 42));
  document.documentElement.style.setProperty("--profile-sticky-top", String(topbarHeight) + "px");
  document.documentElement.style.setProperty("--profile-subtabs-sticky-top", String(topbarHeight + tabsHeight) + "px");
}

function pick(obj, keys) {
  for (const key of keys) {
    const value = obj && obj[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function inferMediaType(url, rawType = "") {
  const t = String(rawType || "").trim().toLowerCase();
  if (t === "video" || t === "image") return t;
  const src = String(url || "").toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|$)/.test(src)) return "video";
  return "image";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha a ler ficheiro"));
    reader.readAsDataURL(file);
  });
}

function toArrayList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v || "").trim()).filter(Boolean);
  const raw = String(value || "").trim();
  if (!raw) return [];
  return raw.split(/[;,|]/).map((v) => v.trim()).filter(Boolean);
}

function blankPersonalData() {
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

function getPersonalStorageKey(userId) {
  return "vore_personal_" + String(Number(userId || 0));
}

function getCommonUserId() {
  if (!isCommonUser()) return 0;
  return Number((state.authUser && state.authUser.id) || 0);
}

function ensurePersonalStoreLoaded() {
  const userId = getCommonUserId();
  if (!userId) {
    personalStore.loadedForUserId = 0;
    personalStore.data = null;
    return;
  }
  if (personalStore.loadedForUserId === userId && personalStore.data) return;
  let data = blankPersonalData();
  try {
    const raw = localStorage.getItem(getPersonalStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        data = Object.assign(data, parsed);
      }
    }
  } catch (_e) {}
  data.savedProfiles = Array.from(new Set((Array.isArray(data.savedProfiles) ? data.savedProfiles : []).map((id) => Number(id || 0)).filter((id) => id > 0)));
  data.recentProfiles = Array.from(new Set((Array.isArray(data.recentProfiles) ? data.recentProfiles : []).map((id) => Number(id || 0)).filter((id) => id > 0)));
  data.savedMedia = Array.isArray(data.savedMedia) ? data.savedMedia : [];
  data.savedItems = Array.isArray(data.savedItems) ? data.savedItems : [];
  data.shareInbox = Array.isArray(data.shareInbox) ? data.shareInbox : [];
  data.shareSent = Array.isArray(data.shareSent) ? data.shareSent : [];
  data.shareContacts = Array.isArray(data.shareContacts) ? data.shareContacts : [];
  data.shareContacts = data.shareContacts
    .map((entry) => ({
      email: normalizeEmail(entry && entry.email),
      name: String(entry && entry.name || "").trim(),
      lastUsedAt: Number(entry && entry.lastUsedAt || 0),
    }))
    .filter((entry) => isValidEmail(entry.email))
    .slice(0, 200);
  personalStore.loadedForUserId = userId;
  personalStore.data = data;
}

function persistPersonalStore() {
  const userId = getCommonUserId();
  if (!userId || !personalStore.data) return;
  try {
    localStorage.setItem(getPersonalStorageKey(userId), JSON.stringify(personalStore.data));
  } catch (_e) {}
}

function getCurrentUserId() {
  return Number((state.authUser && state.authUser.id) || 0);
}

function getNotificationsStorageKey(userId) {
  return "vore_notifications_" + String(Number(userId || 0));
}

function ensureNotificationsStoreLoaded() {
  const userId = getCurrentUserId();
  if (!userId) {
    notificationsStore.loadedForUserId = 0;
    notificationsStore.readKeys = [];
    return;
  }
  if (notificationsStore.loadedForUserId === userId) return;
  let parsed = { readKeys: [] };
  try {
    const raw = localStorage.getItem(getNotificationsStorageKey(userId));
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") parsed = Object.assign(parsed, obj);
    }
  } catch (_e) {}
  notificationsStore.loadedForUserId = userId;
  notificationsStore.readKeys = Array.from(new Set((Array.isArray(parsed.readKeys) ? parsed.readKeys : []).map((v) => String(v || "")).filter(Boolean)));
}

function persistNotificationsStore() {
  const userId = getCurrentUserId();
  if (!userId) return;
  try {
    localStorage.setItem(getNotificationsStorageKey(userId), JSON.stringify({ readKeys: notificationsStore.readKeys.slice(0, 2000) }));
  } catch (_e) {}
}

function isNotificationRead(key) {
  ensureNotificationsStoreLoaded();
  return notificationsStore.readKeys.includes(String(key || ""));
}

function markNotificationRead(key) {
  ensureNotificationsStoreLoaded();
  const token = String(key || "");
  if (!token) return;
  if (!notificationsStore.readKeys.includes(token)) {
    notificationsStore.readKeys.unshift(token);
    notificationsStore.readKeys = Array.from(new Set(notificationsStore.readKeys)).slice(0, 2000);
    persistNotificationsStore();
  }
}

function getMetricsDayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return String(y) + "-" + String(m) + "-" + String(d);
}

function getGuestClientId() {
  try {
    let token = String(localStorage.getItem("vore_guest_client_id") || "").trim();
    if (!token) {
      token = String(Date.now()) + "_" + String(Math.random()).slice(2, 8);
      localStorage.setItem("vore_guest_client_id", token);
    }
    return token;
  } catch (_e) {
    return "guest";
  }
}

function getMetricsClientKey() {
  const userId = getCurrentUserId();
  if (userId > 0) return "user_" + String(userId);
  return "guest_" + getGuestClientId();
}

function getMetricsStorageKey(clientKey) {
  return "vore_metrics_" + String(clientKey || "guest");
}

function ensureMetricsStoreLoaded() {
  const clientKey = getMetricsClientKey();
  const dayKey = getMetricsDayKey();
  if (metricsStore.loadedForKey === clientKey && metricsStore.dayKey === dayKey) return;
  let parsed = { dayKey, profileViews: {} };
  try {
    const raw = localStorage.getItem(getMetricsStorageKey(clientKey));
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

function persistMetricsStore() {
  const clientKey = getMetricsClientKey();
  if (!clientKey) return;
  try {
    localStorage.setItem(getMetricsStorageKey(clientKey), JSON.stringify({
      dayKey: metricsStore.dayKey || getMetricsDayKey(),
      profileViews: metricsStore.profileViews || {},
    }));
  } catch (_e) {}
}

function incrementProfileView(profileId) {
  const pid = Number(profileId || 0);
  if (pid <= 0) return;
  ensureMetricsStoreLoaded();
  const key = String(pid);
  const current = Number(metricsStore.profileViews[key] || 0);
  metricsStore.profileViews[key] = current + 1;
  persistMetricsStore();
}

function getProfileViewCount(profileId) {
  const pid = Number(profileId || 0);
  if (pid <= 0) return 0;
  ensureMetricsStoreLoaded();
  return Number(metricsStore.profileViews[String(pid)] || 0);
}

function getTotalProfileViews() {
  ensureMetricsStoreLoaded();
  return Object.values(metricsStore.profileViews || {}).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
}

function getTrendingProfiles(sourceProfiles, limit = 3) {
  const list = Array.isArray(sourceProfiles) ? sourceProfiles : [];
  const scored = list.map((profile) => {
    const views = getProfileViewCount(profile && profile.id);
    const rating = parseRating(profile);
    const badge = getBadgeType(profile);
    const badgeBoost = badge === "promo" ? 2 : badge === "novo" ? 1.5 : badge === "verif" ? 1 : 0;
    const score = views * 3 + rating + badgeBoost;
    return { profile, score, views };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Number(limit || 3)));
}

function isProfileSaved(profileId) {
  ensurePersonalStoreLoaded();
  const pid = Number(profileId || 0);
  if (!pid || !personalStore.data) return false;
  return personalStore.data.savedProfiles.includes(pid);
}

function toggleSavedProfile(profileId) {
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

function addRecentProfile(profileId) {
  ensurePersonalStoreLoaded();
  const pid = Number(profileId || 0);
  if (!pid || !personalStore.data) return;
  const list = personalStore.data.recentProfiles.filter((id) => id !== pid);
  list.unshift(pid);
  personalStore.data.recentProfiles = list.slice(0, 80);
  persistPersonalStore();
}

function buildSavedMediaKey(profileId, tabId, mediaUrl) {
  return String(Number(profileId || 0)) + "|" + String(tabId || "") + "|" + String(mediaUrl || "");
}

function buildSavedItemKey(profileId, tabId, item) {
  const title = pick(item, ["name", "title", "label", "description"]) || "item";
  const price = pick(item, ["price", "promoNowPrice", "nightlyPrice", "priceNight", "pricePerNight", "price_per_night"]) || "";
  return String(Number(profileId || 0)) + "|" + String(tabId || "") + "|" + slugify(title) + "|" + slugify(price);
}

function isCurrentModalSaved() {
  ensurePersonalStoreLoaded();
  if (!isCommonUser() || !personalStore.data || !itemModalState.open) return false;
  const tabId = String(itemModalState.tabId || "");
  const item = itemModalState.items[itemModalState.index] || {};
  const profileId = Number(itemModalState.profileId || 0);
  if (tabId === "galeria") {
    const media = getItemMediaList(tabId, item)[itemModalState.mediaIndex] || null;
    if (!media || !media.url) return false;
    const key = buildSavedMediaKey(profileId, tabId, media.url);
    return personalStore.data.savedMedia.some((entry) => String(entry && entry.key || "") === key);
  }
  const key = buildSavedItemKey(profileId, tabId, item);
  return personalStore.data.savedItems.some((entry) => String(entry && entry.key || "") === key);
}

function toggleCurrentModalSave() {
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
    const idx = list.findIndex((entry) => String(entry && entry.key || "") === key);
    if (idx >= 0) list.splice(idx, 1);
    else {
      list.unshift({
        key,
        profileId,
        profileName,
        tabId,
        mediaUrl: media.url,
        mediaType: media.type || "image",
        title: pick(item, ["name", "title", "label"]) || "Media",
        savedAt: Date.now(),
      });
      personalStore.data.savedMedia = list.slice(0, 500);
    }
    persistPersonalStore();
    return;
  }
  const key = buildSavedItemKey(profileId, tabId, item);
  const list = personalStore.data.savedItems;
  const idx = list.findIndex((entry) => String(entry && entry.key || "") === key);
  if (idx >= 0) list.splice(idx, 1);
  else {
    list.unshift({
      key,
      profileId,
      profileName,
      tabId,
      title: pick(item, ["name", "title", "label"]) || "Item",
      item: deepClone(item),
      savedAt: Date.now(),
    });
    personalStore.data.savedItems = list.slice(0, 500);
  }
  persistPersonalStore();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function recommendationTypeToShareKind(rawType) {
  const type = String(rawType || "").trim().toLowerCase();
  if (["photo", "photos", "foto", "fotos", "image", "images"].includes(type)) return "photo";
  if (["video", "videos", "reel", "reels"].includes(type)) return "video";
  return "profile";
}

function reactionToEmoji(reaction) {
  const code = String(reaction || "").trim().toLowerCase();
  if (code === "like") return "\u{1F44D}";
  if (code === "fire") return "\u{1F525}";
  if (code === "wow") return "\u{1F929}";
  if (code === "love") return "\u{2764}\u{FE0F}";
  return "";
}

function mapItemShareKindFromTab(tabId) {
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

function mapTabFromItemShareKind(kind) {
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

function resolveMediaUri(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  if (/^data:(image|video)\//i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return "";
}

function parseSharedItemPayload(rawValue) {
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

function buildItemShareUriFromPayload(payload) {
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
    kind: mapItemShareKindFromTab(tabId),
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

function mapItemFromSharedPayload(payload) {
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

function recommendationTimestampMs(rawValue) {
  const ts = Date.parse(String(rawValue || ""));
  return Number.isFinite(ts) ? ts : 0;
}

function mapRecommendationEntry(rawEntry, mode = "inbox") {
  const raw = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
  const currentUser = state.authUser && typeof state.authUser === "object" ? state.authUser : {};
  const sender = raw.sender && typeof raw.sender === "object" ? raw.sender : {};
  const receiver = raw.receiver && typeof raw.receiver === "object" ? raw.receiver : {};
  const senderEmail = normalizeEmail(sender.email || "");
  const receiverEmail = normalizeEmail(receiver.email || "");
  const senderName = String(sender.name || sender.email || "Utilizador");
  const receiverName = String(receiver.name || receiver.email || "Utilizador");
  const id = Number(raw.id || 0);
  const createdAt = recommendationTimestampMs(raw.created_at);
  const profileId = Number(raw.profile_id || 0);
  const profileSlug = String(raw.profile_slug || "").trim();
  const sourceProfileName = String(raw.source_profile_name || "Perfil").trim() || "Perfil";
  const contentType = recommendationTypeToShareKind(raw.content_type);
  const parsedItem = parseSharedItemPayload(raw.content_uri);

  let kind = "profile";
  let tabId = "profile";
  let mediaUrl = "";
  let mediaType = "image";
  let item = null;
  let title = sourceProfileName;
  let subtitle = "Perfil partilhado";

  if (parsedItem) {
    kind = "item";
    tabId = mapTabFromItemShareKind(parsedItem.kind);
    item = mapItemFromSharedPayload(parsedItem);
    mediaUrl = resolveMediaUri(parsedItem.image || "");
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
    mediaUrl = resolveMediaUri(raw.content_uri || "");
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

function setRecommendationContactsFromLists(inboxList, sentList) {
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

function resetRecommendationsStore() {
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

async function refreshRecommendationsForCurrentUser(options = {}) {
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

function getCurrentUserInboxEntries() {
  if (!isCommonUser()) return [];
  return Array.isArray(recommendationsStore.inbox) ? recommendationsStore.inbox : [];
}

function markCurrentUserInboxEntryRead(entryId) {
  const token = String(entryId || "").trim();
  if (!token) return;
  markNotificationRead("share_" + token);
  const list = Array.isArray(recommendationsStore.inbox) ? recommendationsStore.inbox : [];
  list.forEach((entry) => {
    if (String(entry && entry.id || "") === token) entry.read = true;
  });
}

function mergeIncomingSharesForCurrentUser() {
  if (!isCommonUser()) return;
  void refreshRecommendationsForCurrentUser({ silent: true });
}

function countUnreadShares() {
  const list = Array.isArray(recommendationsStore.inbox) ? recommendationsStore.inbox : [];
  return list.filter((entry) => !entry || entry.read !== true).length;
}

function upsertShareContact(email, name = "") {
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

function getShareContacts() {
  return Array.isArray(recommendationsStore.contacts) ? recommendationsStore.contacts.slice(0, 100) : [];
}

async function loadSharePickerUsers(query) {
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

async function dispatchShare(payload, toEmailValue, toName = "") {
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

async function handleRecommendationPermissionAction(action, senderUserId) {
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

async function handleRecommendationReaction(recommendationId, reaction) {
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

function ensureSharePickerRoot() {
  let root = document.getElementById("sharePickerRoot");
  if (root) return root;
  root = document.createElement("div");
  root.id = "sharePickerRoot";
  root.className = "share-picker-root";
  root.innerHTML = (
    "<div class=\"share-picker-backdrop\" data-share-picker-close=\"1\"></div>" +
    "<div class=\"share-picker-panel\">" +
      "<div class=\"share-picker-top\">" +
        "<strong>Partilhar</strong>" +
        "<button type=\"button\" data-share-picker-close=\"1\">&times;</button>" +
      "</div>" +
      "<div id=\"sharePickerBody\" class=\"share-picker-body\"></div>" +
    "</div>"
  );
  document.body.appendChild(root);
  root.querySelectorAll("[data-share-picker-close]").forEach((btn) => btn.addEventListener("click", closeSharePicker));
  return root;
}

function closeSharePicker() {
  sharePickerState.open = false;
  sharePickerState.payload = null;
  sharePickerState.query = "";
  sharePickerState.error = "";
  sharePickerState.usersLoading = false;
  sharePickerState.usersQuery = "";
  sharePickerState.users = [];
  sharePickerState.searchToken = Number(sharePickerState.searchToken || 0) + 1;
  const root = document.getElementById("sharePickerRoot");
  if (root) root.classList.remove("open");
}

function openSharePicker(payload) {
  if (!isCommonUser()) return;
  sharePickerState.open = true;
  sharePickerState.payload = payload ? deepClone(payload) : null;
  sharePickerState.query = "";
  sharePickerState.error = "";
  sharePickerState.usersLoading = false;
  sharePickerState.usersQuery = "";
  sharePickerState.users = [];
  renderSharePicker();
}

function renderSharePicker() {
  const root = ensureSharePickerRoot();
  if (!sharePickerState.open) {
    root.classList.remove("open");
    return;
  }
  const body = root.querySelector("#sharePickerBody");
  const contacts = getShareContacts();
  const query = String(sharePickerState.query || "").trim();
  const qNorm = normalizeEmail(query);
  const localFiltered = !qNorm
    ? contacts.slice(0, 30)
    : contacts.filter((entry) =>
        normalizeEmail(entry && entry.email).includes(qNorm) ||
        String(entry && entry.name || "").toLowerCase().includes(qNorm)
      ).slice(0, 30);
  const remoteFiltered = Array.isArray(sharePickerState.users) ? sharePickerState.users : [];
  const byEmail = {};
  [...localFiltered, ...remoteFiltered].forEach((entry) => {
    const email = normalizeEmail(entry && entry.email);
    if (!isValidEmail(email)) return;
    if (!byEmail[email]) {
      byEmail[email] = {
        email,
        name: String(entry && entry.name || "").trim(),
      };
    }
  });
  const filtered = Object.values(byEmail).slice(0, 40);
  const hasExact = filtered.some((entry) => normalizeEmail(entry && entry.email) === qNorm);
  const canUseTyped = isValidEmail(qNorm) && !hasExact;
  const showRemoteLoading = sharePickerState.usersLoading && qNorm.length >= 2;
  const noResults = !filtered.length && !canUseTyped && !showRemoteLoading;

  body.innerHTML =
    "<div class=\"share-picker-form\">" +
      "<label>Email ou contacto</label>" +
      "<input id=\"sharePickerInput\" class=\"input\" placeholder=\"email@exemplo.com\" value=\"" + esc(query) + "\" />" +
      (sharePickerState.error ? "<p class=\"entry-error\">" + esc(sharePickerState.error) + "</p>" : "") +
      "<div class=\"share-picker-actions\">" +
        "<button type=\"button\" data-share-picker-action=\"close\">Cancelar</button>" +
        "<button type=\"button\" class=\"entry-submit-btn\" data-share-picker-action=\"send_input\">Enviar</button>" +
      "</div>" +
    "</div>" +
    "<div class=\"share-picker-list\">" +
      (showRemoteLoading ? "<p class=\"muted\">A procurar utilizadores...</p>" : "") +
      (canUseTyped
        ? "<button type=\"button\" class=\"share-picker-row\" data-share-email=\"" + esc(qNorm) + "\" data-share-name=\"\">" +
            "<span>Usar: " + esc(qNorm) + "</span><span>Enviar</span>" +
          "</button>"
        : "") +
      (filtered.length
        ? filtered.map((entry) => {
            const email = normalizeEmail(entry && entry.email);
            const name = String(entry && entry.name || "").trim();
            return (
              "<button type=\"button\" class=\"share-picker-row\" data-share-email=\"" + esc(email) + "\" data-share-name=\"" + esc(name) + "\">" +
                "<span class=\"share-picker-main\"><strong>" + esc(name || email) + "</strong><span class=\"muted\">" + esc(email) + "</span></span>" +
                "<span>Enviar</span>" +
              "</button>"
            );
          }).join("")
        : (noResults ? "<p class=\"muted\">Sem contactos. Escreve um email para enviar.</p>" : "")) +
    "</div>";

  const input = body.querySelector("#sharePickerInput");
  if (input) {
    input.addEventListener("input", () => {
      sharePickerState.query = String(input.value || "");
      sharePickerState.error = "";
      const nextQuery = String(sharePickerState.query || "").trim();
      if (nextQuery.length >= 2) {
        void loadSharePickerUsers(nextQuery).then(() => {
          if (sharePickerState.open) renderSharePicker();
        });
      } else {
        sharePickerState.users = [];
        sharePickerState.usersLoading = false;
      }
      renderSharePicker();
    });
    input.addEventListener("keydown", async (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        const targetEmail = normalizeEmail(input.value || "");
        if (!isValidEmail(targetEmail)) {
          sharePickerState.error = "Email invalido.";
          renderSharePicker();
          return;
        }
        const result = await dispatchShare(sharePickerState.payload, targetEmail, "");
        if (!result || !result.ok) {
          if (result && result.permissionRequired) {
            closeSharePicker();
            if (el.status) el.status.textContent = "Pedido de permissão enviado.";
            renderProfile();
            renderAll();
            return;
          }
          sharePickerState.error = String((result && result.error) || "Não foi possível enviar.");
          renderSharePicker();
          return;
        }
        closeSharePicker();
        renderProfile();
        renderAll();
      }
    });
  }

  body.querySelectorAll("button[data-share-picker-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = String(btn.dataset.sharePickerAction || "");
      if (action === "close") {
        closeSharePicker();
        return;
      }
      if (action === "send_input") {
        const targetEmail = normalizeEmail((body.querySelector("#sharePickerInput") || {}).value || "");
        if (!isValidEmail(targetEmail)) {
          sharePickerState.error = "Email invalido.";
          renderSharePicker();
          return;
        }
        const result = await dispatchShare(sharePickerState.payload, targetEmail, "");
        if (!result || !result.ok) {
          if (result && result.permissionRequired) {
            closeSharePicker();
            if (el.status) el.status.textContent = "Pedido de permissão enviado.";
            renderProfile();
            renderAll();
            return;
          }
          sharePickerState.error = String((result && result.error) || "Não foi possível enviar.");
          renderSharePicker();
          return;
        }
        closeSharePicker();
        renderProfile();
        renderAll();
      }
    });
  });

  body.querySelectorAll("button[data-share-email]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const email = normalizeEmail(btn.dataset.shareEmail || "");
      const name = String(btn.dataset.shareName || "");
      const result = await dispatchShare(sharePickerState.payload, email, name);
      if (!result || !result.ok) {
        if (result && result.permissionRequired) {
          closeSharePicker();
          if (el.status) el.status.textContent = "Pedido de permissão enviado.";
          renderProfile();
          renderAll();
          return;
        }
        sharePickerState.error = String((result && result.error) || "Não foi possível enviar.");
        renderSharePicker();
        return;
      }
      closeSharePicker();
      renderProfile();
      renderAll();
    });
  });
  root.classList.add("open");
}

function getCurrentModalSharePayload() {
  if (!itemModalState.open) return null;
  const tabId = String(itemModalState.tabId || "");
  const item = itemModalState.items[itemModalState.index] || {};
  const title = pick(item, ["name", "title", "label", "description"]) || "Conteudo";
  const profileId = Number(itemModalState.profileId || 0);
  const profileName = String(itemModalState.profileName || "Perfil");
  if (tabId === "galeria") {
    const media = getItemMediaList(tabId, item)[itemModalState.mediaIndex] || null;
    if (!media || !media.url) return null;
    return {
      kind: "media",
      title,
      subtitle: profileName + " - Galeria",
      profileId,
      profileName,
      tabId,
      mediaUrl: media.url,
      mediaType: media.type || "image",
    };
  }
  return {
    kind: "item",
    title,
    subtitle: profileName + " - " + tabId,
    profileId,
    profileName,
    tabId,
    item: deepClone(item),
  };
}

function getShareCounterpart(entry, shareSub) {
  const sub = String(shareSub || "recebidos");
  if (sub === "enviados") {
    const email = normalizeEmail(entry && entry.toEmail);
    const name = String(entry && (entry.toName || entry.toEmail) || "").trim();
    return { email, name: name || email || "Utilizador" };
  }
  const email = normalizeEmail(entry && entry.fromEmail);
  const name = String(entry && (entry.fromName || entry.fromEmail) || "").trim();
  return { email, name: name || email || "Utilizador" };
}

function buildShareThreads(list, shareSub) {
  const map = {};
  (Array.isArray(list) ? list : []).forEach((entry) => {
    const cp = getShareCounterpart(entry, shareSub);
    const key = cp.email || ("anon_" + slugify(cp.name || "utilizador"));
    if (!map[key]) {
      map[key] = {
        key,
        counterpart: cp,
        entries: [],
        lastAt: 0,
        unread: 0,
      };
    }
    map[key].entries.push(entry);
    map[key].lastAt = Math.max(map[key].lastAt, Number(entry && entry.createdAt || 0));
    if (shareSub === "recebidos" && entry && entry.read === false) map[key].unread += 1;
  });
  return Object.values(map)
    .map((thread) => {
      thread.entries.sort((a, b) => Number(b && b.createdAt || 0) - Number(a && a.createdAt || 0));
      return thread;
    })
    .sort((a, b) => Number(b.lastAt || 0) - Number(a.lastAt || 0));
}

function markThreadRead(threadKey, shareSub) {
  if (String(shareSub || "") !== "recebidos") return;
  const inbox = Array.isArray(recommendationsStore.inbox) ? recommendationsStore.inbox : [];
  inbox.forEach((entry) => {
    const cp = getShareCounterpart(entry, "recebidos");
    const key = cp.email || ("anon_" + slugify(cp.name || "utilizador"));
    if (key === threadKey) {
      entry.read = true;
      const id = String(entry && entry.id || "").trim();
      if (id) markNotificationRead("share_" + id);
    }
  });
}

function toTimestampMs(value) {
  const raw = Number(value || 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw < 1e12 ? raw * 1000 : raw;
}

function formatRelativeTime(value) {
  const ts = toTimestampMs(value);
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60 * 1000) return "agora";
  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 60) return mins + "m";
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 24) return hours + "h";
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days < 7) return days + "d";
  try {
    return new Date(ts).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
  } catch (_e) {
    return "";
  }
}

function getShareKindLabel(entry) {
  const kind = String(entry && entry.kind || "").toLowerCase();
  if (kind === "profile") return "Perfil";
  if (kind === "media") {
    const mediaType = String(entry && entry.mediaType || "").toLowerCase();
    return mediaType === "video" ? "Video" : "Foto";
  }
  const tabId = String(entry && entry.tabId || "").toLowerCase();
  if (tabId === "servicos") return "Servico";
  if (tabId === "produtos") return "Produto";
  if (tabId === "menu") return "Menu";
  if (tabId === "casas") return "Casa";
  if (tabId === "quartos") return "Quarto";
  if (tabId === "portfolio") return "Portfolio";
  return "Item";
}

function tabIdToLabel(value) {
  const tabId = String(value || "").trim().toLowerCase();
  if (tabId === "servicos") return "Servicos";
  if (tabId === "produtos") return "Produtos";
  if (tabId === "menu") return "Menu";
  if (tabId === "casas") return "Casas";
  if (tabId === "quartos") return "Quartos";
  if (tabId === "portfolio") return "Portfolio";
  if (tabId === "galeria") return "Galeria";
  if (tabId === "agenda") return "Agenda";
  if (tabId === "horario") return "Horário";
  return "Item";
}

function getSavedItemPreviewImage(entry) {
  const item = entry && entry.item && typeof entry.item === "object" ? entry.item : null;
  if (!item) return "";
  const tabId = String(entry && entry.tabId || "item");
  const media = getItemMediaList(tabId, item);
  const image = (Array.isArray(media) ? media : []).find((m) => String(m && m.type || "").toLowerCase() === "image");
  return String(image && image.url || "").trim();
}

function getShareEntryPreviewImage(entry) {
  const kind = String(entry && entry.kind || "").toLowerCase();
  if (kind === "profile") {
    const profileId = Number(entry && entry.profileId || 0);
    const profile = state.profiles.find((p) => Number(p && p.id || 0) === profileId);
    return String(profile && profile.avatar || "").trim();
  }
  if (kind === "media") {
    const mediaType = String(entry && entry.mediaType || "").toLowerCase();
    if (mediaType === "video") return "";
    return String(entry && entry.mediaUrl || "").trim();
  }
  const item = entry && entry.item && typeof entry.item === "object" ? entry.item : null;
  if (!item) return "";
  const tabId = String(entry && entry.tabId || "item");
  const media = getItemMediaList(tabId, item);
  const img = (Array.isArray(media) ? media : []).find((m) => String(m && m.type || "").toLowerCase() === "image");
  return String(img && img.url || "").trim();
}

function openSharedEntry(entry) {
  if (!entry || typeof entry !== "object") return;
  if (String(entry.kind || "") === "profile") {
    let pid = Number(entry.profileId || 0);
    if (!(pid > 0)) {
      const slug = String(entry.profileSlug || "").trim().toLowerCase();
      if (slug) {
        const found = state.profiles.find((p) => String((p && p.slug) || "").trim().toLowerCase() === slug);
        pid = Number(found && found.id || 0);
      }
    }
    if (pid > 0) {
      const nextBack = state.currentTab === "notifications" ? "notifications" : "profile";
      setState({ selectedProfileId: pid, profileContext: "public", profileReturnTab: nextBack });
      incrementProfileView(pid);
      setScreen("profile");
      renderProfile();
    }
    return;
  }
  if (String(entry.kind || "") === "media") {
    openItemModal("galeria", [{ name: entry.title || "Media", mediaUrl: entry.mediaUrl || "", mediaType: entry.mediaType || "image" }], 0, {
      profileId: Number(entry.profileId || 0),
      profileName: String(entry.profileName || "Perfil"),
    });
    return;
  }
  if (entry.item) {
    openItemModal(String(entry.tabId || "produtos"), [deepClone(entry.item)], 0, {
      profileId: Number(entry.profileId || 0),
      profileName: String(entry.profileName || "Perfil"),
    });
  }
}

const TAXONOMY_INDEX = CATEGORY_TAXONOMY.map((item) => {
  const terms = [item.key, item.label, ...(Array.isArray(item.keywords) ? item.keywords : [])]
    .map((term) => normalizeText(term))
    .filter(Boolean);
  return Object.assign({}, item, { normalizedTerms: terms });
});

function toOpenableUrl(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return "https://" + raw;
  return "";
}

function toSocialUrl(type, rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const clean = raw.replace(/^@+/, "");
  const baseByType = {
    instagram: "https://instagram.com/",
    tiktok: "https://www.tiktok.com/@",
    youtube: "https://youtube.com/",
    facebook: "https://facebook.com/",
    linkedin: "https://linkedin.com/in/",
    whatsapp: "https://wa.me/",
    x: "https://x.com/",
  };
  const base = baseByType[String(type || "").toLowerCase()] || "";
  if (!base) return toOpenableUrl(raw);
  return base + encodeURIComponent(clean);
}

function detectSocialIcon(url, hint = "") {
  const lower = String(url || "").toLowerCase();
  const type = String(hint || "").toLowerCase();
  if (type === "instagram" || lower.includes("instagram.")) return "instagram";
  if (type === "tiktok" || lower.includes("tiktok.")) return "tiktok";
  if (type === "youtube" || lower.includes("youtube.") || lower.includes("youtu.be")) return "youtube";
  if (type === "facebook" || lower.includes("facebook.")) return "facebook";
  if (type === "linkedin" || lower.includes("linkedin.")) return "linkedin";
  if (type === "whatsapp" || lower.includes("wa.me") || lower.includes("whatsapp.")) return "whatsapp";
  if (type === "x" || lower.includes("x.com") || lower.includes("twitter.")) return "x";
  return "website";
}

function getSocialItems(profileData) {
  const items = [];
  const seen = new Set();
  const social = profileData && typeof profileData.social === "object" ? profileData.social : {};
  function pushItem(iconHint, rawValue) {
    const url = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "whatsapp", "x"].includes(iconHint)
      ? toSocialUrl(iconHint, rawValue)
      : toOpenableUrl(rawValue);
    if (!url) return;
    const icon = detectSocialIcon(url, iconHint);
    const key = icon + "|" + url;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ icon, url });
  }
  pushItem("instagram", social.instagram);
  pushItem("tiktok", social.tiktok);
  pushItem("youtube", social.youtube);
  pushItem("facebook", social.facebook);
  pushItem("linkedin", social.linkedin);
  pushItem("x", social.x || social.twitter);
  pushItem("whatsapp", social.whatsapp);
  pushItem("website", profileData && (profileData.website || profileData.site));
  if (Array.isArray(profileData && profileData.links)) {
    profileData.links.forEach((entry) => {
      const raw = typeof entry === "string" ? entry : String((entry && entry.url) || "");
      const type = typeof entry === "string" ? "" : String((entry && entry.type) || "").toLowerCase();
      pushItem(type || "website", raw);
    });
  }
  return items.slice(0, 12);
}

function buildProfileShareUrl(profile) {
  const slug = String((profile && profile.slug) || "").trim();
  const base = String(window.location.origin || "") + String(window.location.pathname || "");
  if (slug) return base + "#perfil-" + encodeURIComponent(slug);
  return base;
}

async function shareProfile(profile) {
  const target = profile && typeof profile === "object" ? profile : null;
  if (!target) return;
  const url = buildProfileShareUrl(target);
  const title = String(target.name || "Perfil");
  const text = title + " - " + String(target.category || "Perfil");
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
  } catch (_err) {
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      alert("Link copiado.");
      return;
    }
  } catch (_e) {}
  prompt("Copia o link do perfil:", url);
}

function getMergedItemImages(item) {
  const raw = toArrayList(item && item.images);
  const cover = pick(item, ["imageUrl", "image", "cover", "thumbnail"]);
  if (!cover) return raw;
  return [cover, ...raw.filter((src) => src !== cover)];
}

function applyMergedItemImages(item, merged) {
  const list = toArrayList(merged);
  item.images = list;
  item.imageUrl = list[0] || "";
}

function resolveProfileFilter(profile) {
  const explicit = String((profile && profile.filter) || (profile && profile.data && profile.data.filter) || "").trim().toLowerCase();
  if (explicit === "destaques" || explicit === "novidades" || explicit === "promocoes" || explicit === "perto") return explicit;
  const type = String((profile && profile.type) || (profile && profile.data && profile.data.type) || "service_pro").toLowerCase();
  if (type === "shop") return "promocoes";
  if (type === "lodging") return "perto";
  if (type === "creator") return "novidades";
  return "destaques";
}

function scoreLocal(profile) {
  const filter = resolveProfileFilter(profile);
  const location = String((profile && profile.location) || "").toLowerCase();
  let score = 0;
  if (filter === "perto") score += 3;
  if (location.includes("portugal")) score += 1;
  return score;
}

function inferProfileCategoryKeys(profile) {
  const p = profile && typeof profile === "object" ? profile : {};
  const data = p.data && typeof p.data === "object" ? p.data : {};
  const contentCategories = Array.isArray(data.contentCategories) ? data.contentCategories : [];
  const haystack = normalizeText([
    p.name,
    p.category,
    p.location,
    p.about,
    data.about,
    ...contentCategories,
  ].join(" "));
  if (!haystack) return [];
  return TAXONOMY_INDEX.filter((cat) =>
    cat.normalizedTerms.some((term) => term && haystack.includes(term))
  ).map((cat) => cat.key);
}

function findTaxonomyKeysByQuery(query) {
  const q = normalizeText(query);
  if (!q) return [];
  return TAXONOMY_INDEX.filter((cat) =>
    cat.normalizedTerms.some((term) => term.includes(q))
  ).map((cat) => cat.key);
}

function parseRating(profile) {
  const n = Number(String((profile && profile.rating) || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function parseRecent(profile) {
  const source = (profile && (profile.updated_at || profile.created_at || (profile.data && (profile.data.updatedAt || profile.data.createdAt)))) || "";
  const ts = Date.parse(String(source || ""));
  return Number.isFinite(ts) ? ts : 0;
}

function getExploreFilteredProfiles() {
  const list = Array.isArray(state.profiles) ? state.profiles : [];
  const searchText = normalizeText(state.exploreSearch || "");
  const discoveryFilter = String(state.exploreDiscoveryFilter || "all");
  const categoryFilters = Array.isArray(state.exploreCategoryFilters) ? state.exploreCategoryFilters : [];
  const sortBy = String(state.exploreSortBy || "relevance");
  const taxonomyKeysFromSearch = findTaxonomyKeysByQuery(searchText);

  const filtered = list.filter((p) => {
    const name = normalizeText((p && p.name) || "");
    const category = normalizeText((p && p.category) || "");
    const location = normalizeText((p && p.location) || "");
    const about = normalizeText((p && (p.about || (p.data && p.data.about))) || "");
    const contentCategories = Array.isArray(p && p.data && p.data.contentCategories)
      ? p.data.contentCategories.map((item) => normalizeText(item || ""))
      : [];
    const categoryHaystack = [name, category, about, contentCategories.join(" ")].join(" ").trim();
    const filter = resolveProfileFilter(p);
    const badge = getBadgeType(p);
    const profileTaxonomyKeys = inferProfileCategoryKeys(p);

    const searchMatch =
      !searchText ||
      name.includes(searchText) ||
      category.includes(searchText) ||
      location.includes(searchText) ||
      (taxonomyKeysFromSearch.length > 0 && profileTaxonomyKeys.some((key) => taxonomyKeysFromSearch.includes(key)));

    const discoveryMatch =
      discoveryFilter === "all" ||
      (discoveryFilter === "perto" && filter === "perto") ||
      (discoveryFilter === "promocoes" && (filter === "promocoes" || badge === "promo")) ||
      (discoveryFilter === "novidades" && (filter === "novidades" || badge === "novo")) ||
      (discoveryFilter === "verif" && badge === "verif");

    const categoryMatch =
      !categoryFilters.length ||
      categoryFilters.some((selected) => profileTaxonomyKeys.includes(selected) || categoryHaystack.includes(selected));

    return searchMatch && discoveryMatch && categoryMatch;
  });

  const ranked = filtered.slice();
  ranked.sort((a, b) => {
    if (sortBy === "rating") return parseRating(b) - parseRating(a);
    if (sortBy === "recent") return parseRecent(b) - parseRecent(a);
    if (sortBy === "near") {
      const nearDiff = scoreLocal(b) - scoreLocal(a);
      if (nearDiff !== 0) return nearDiff;
      return parseRating(b) - parseRating(a);
    }
    const relevanceA = (searchText ? 0 : 1) + scoreLocal(a);
    const relevanceB = (searchText ? 0 : 1) + scoreLocal(b);
    const diff = relevanceB - relevanceA;
    if (diff !== 0) return diff;
    return parseRating(b) - parseRating(a);
  });
  return ranked;
}

function renderExploreSortChips() {
  if (!el.exploreSortRow) return;
  const activeSort = String(state.exploreSortBy || "relevance");
  el.exploreSortRow.innerHTML = EXPLORE_SORT_OPTIONS.map((opt) => (
    "<button class=\"" + (opt.key === activeSort ? "active" : "") + "\" data-explore-sort=\"" + opt.key + "\">" + esc(opt.label) + "</button>"
  )).join("");
  el.exploreSortRow.querySelectorAll("button[data-explore-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ exploreSortBy: button.dataset.exploreSort || "relevance" });
      renderAll();
    });
  });
}

function removeExploreCategoryFilter(key) {
  const next = (Array.isArray(state.exploreCategoryFilters) ? state.exploreCategoryFilters : []).filter((k) => k !== key);
  setState({ exploreCategoryFilters: next });
  renderAll();
}

function renderExploreActiveFilters() {
  if (!el.exploreActiveFilters) return;
  const discoveryFilter = String(state.exploreDiscoveryFilter || "all");
  const categoryFilters = Array.isArray(state.exploreCategoryFilters) ? state.exploreCategoryFilters : [];
  const sortBy = String(state.exploreSortBy || "relevance");
  const hasActive = discoveryFilter !== "all" || sortBy !== "relevance" || categoryFilters.length > 0;
  if (!hasActive) {
    el.exploreActiveFilters.innerHTML = "";
    return;
  }
  const discoveryLabel = (EXPLORE_DISCOVERY_OPTIONS.find((item) => item.key === discoveryFilter) || {}).label || "Descoberta";
  const sortLabel = (EXPLORE_SORT_OPTIONS.find((item) => item.key === sortBy) || {}).label || "Ordenacao";
  const categoryBits = categoryFilters.map((key) => {
    const label = (CATEGORY_TAXONOMY.find((item) => item.key === key) || {}).label || key;
    return "<button class=\"explore-active-filter-chip\" data-remove-explore-cat=\"" + esc(key) + "\">" + esc(label) + " <span>&times;</span></button>";
  }).join("");
  el.exploreActiveFilters.innerHTML =
    (discoveryFilter !== "all" ? "<button class=\"explore-active-filter-chip\" data-clear-discovery=\"1\">" + esc(discoveryLabel) + " <span>&times;</span></button>" : "") +
    (sortBy !== "relevance" ? "<button class=\"explore-active-filter-chip\" data-clear-sort=\"1\">" + esc(sortLabel) + " <span>&times;</span></button>" : "") +
    categoryBits;
  const clearDiscovery = el.exploreActiveFilters.querySelector("button[data-clear-discovery]");
  if (clearDiscovery) clearDiscovery.addEventListener("click", () => { setState({ exploreDiscoveryFilter: "all" }); renderAll(); });
  const clearSort = el.exploreActiveFilters.querySelector("button[data-clear-sort]");
  if (clearSort) clearSort.addEventListener("click", () => { setState({ exploreSortBy: "relevance" }); renderAll(); });
  el.exploreActiveFilters.querySelectorAll("button[data-remove-explore-cat]").forEach((button) => {
    button.addEventListener("click", () => removeExploreCategoryFilter(String(button.dataset.removeExploreCat || "")));
  });
}

function getBadgeType(profile) {
  const raw = String((profile && profile.badge) || (profile && profile.data && profile.data.badge) || "").trim().toLowerCase();
  if (raw === "verif") return "verif";
  if (raw === "promo") return "promo";
  if (raw === "novo") return "novo";
  return "";
}

function renderHomeFilters() {
  if (!el.homeFilters) return;
  const active = String(state.homeFilter || "destaques");
  el.homeFilters.innerHTML = HOME_FILTERS.map((f) => (
    "<button class=\"" + (active === f.id ? "active" : "") + "\" data-home-filter=\"" + f.id + "\">" + esc(f.label) + "</button>"
  )).join("");
  el.homeFilters.querySelectorAll("button[data-home-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ homeFilter: button.dataset.homeFilter || "destaques" });
      renderAll();
    });
  });
  if (el.homeProfilesTitle) {
    el.homeProfilesTitle.textContent = "Perfis: " + (HOME_FILTER_LABELS[active] || HOME_FILTER_LABELS.destaques);
  }
}

function renderHomeInsights() {
  if (!el.homeInsights) return;
  const profiles = Array.isArray(state.profiles) ? state.profiles : [];
  if (!profiles.length) {
    el.homeInsights.innerHTML = "";
    return;
  }
  const totalViews = getTotalProfileViews();
  const trending = getTrendingProfiles(profiles, 1);
  const topName = trending[0] && trending[0].profile ? String(trending[0].profile.name || "Sem dados") : "Sem dados";
  const promoCount = profiles.filter((p) => getBadgeType(p) === "promo" || resolveProfileFilter(p) === "promocoes").length;
  const newCount = profiles.filter((p) => getBadgeType(p) === "novo" || resolveProfileFilter(p) === "novidades").length;
  el.homeInsights.innerHTML =
    "<span class=\"home-insight-chip\">Vistas hoje: " + esc(String(totalViews)) + "</span>" +
    "<span class=\"home-insight-chip\">Em alta: " + esc(topName) + "</span>" +
    "<span class=\"home-insight-chip\">Promoções: " + esc(String(promoCount)) + " | Novos: " + esc(String(newCount)) + "</span>";
}

function renderExploreTrend(exploreList) {
  if (!el.exploreTrendText) return;
  const list = Array.isArray(exploreList) ? exploreList : [];
  if (!list.length) {
    el.exploreTrendText.textContent = "";
    return;
  }
  const trending = getTrendingProfiles(list, 2).map((entry) => String(entry && entry.profile && entry.profile.name || "").trim()).filter(Boolean);
  const label = trending.length ? ("Tendencia: " + trending.join(" | ")) : "";
  el.exploreTrendText.textContent = label;
}

function getExplorePagerKey(list) {
  const ids = (Array.isArray(list) ? list : []).slice(0, 80).map((entry) => String((entry && entry.id) || 0)).join(",");
  return [
    String(state.exploreSearch || "").trim().toLowerCase(),
    String(state.exploreDiscoveryFilter || "all"),
    String(state.exploreSortBy || "relevance"),
    (Array.isArray(state.exploreCategoryFilters) ? state.exploreCategoryFilters : []).slice().sort().join(","),
    String((Array.isArray(list) ? list.length : 0)),
    ids,
  ].join("|");
}

function getExploreVisibleProfiles(list) {
  const safeList = Array.isArray(list) ? list : [];
  explorePagerState.totalCount = safeList.length;
  const nextKey = getExplorePagerKey(safeList);
  if (explorePagerState.key !== nextKey) {
    explorePagerState.key = nextKey;
    explorePagerState.visibleCount = EXPLORE_PAGE_SIZE;
    explorePagerState.lastAutoLoadAt = 0;
  }
  return safeList.slice(0, Math.max(EXPLORE_PAGE_SIZE, Number(explorePagerState.visibleCount || EXPLORE_PAGE_SIZE)));
}

function loadMoreExploreItems() {
  const total = Math.max(0, Number(explorePagerState.totalCount || 0));
  if (!total) return;
  const current = Math.max(EXPLORE_PAGE_SIZE, Number(explorePagerState.visibleCount || EXPLORE_PAGE_SIZE));
  if (current >= total) return;
  explorePagerState.visibleCount = Math.min(total, current + EXPLORE_PAGE_SIZE);
  renderAll();
}

function setupExploreSentinelObserver() {
  if (!el.exploreSentinel) return;
  if (exploreSentinelObserver) return;
  if (typeof IntersectionObserver !== "function") return;
  exploreSentinelObserver = new IntersectionObserver((entries) => {
    const first = Array.isArray(entries) && entries[0] ? entries[0] : null;
    if (!first || !first.isIntersecting) return;
    if (state.currentTab !== "explore") return;
    const now = Date.now();
    if (now - Number(explorePagerState.lastAutoLoadAt || 0) < 260) return;
    const total = Math.max(0, Number(explorePagerState.totalCount || 0));
    const visible = Math.max(EXPLORE_PAGE_SIZE, Number(explorePagerState.visibleCount || EXPLORE_PAGE_SIZE));
    if (visible >= total) return;
    explorePagerState.lastAutoLoadAt = now;
    loadMoreExploreItems();
  }, { root: null, threshold: 0.1, rootMargin: "240px 0px 320px 0px" });
  exploreSentinelObserver.observe(el.exploreSentinel);
}

function renderExplorePager(totalCount, shownCount) {
  if (!el.explorePager) return;
  const total = Math.max(0, Number(totalCount || 0));
  const shown = Math.max(0, Number(shownCount || 0));
  if (el.exploreSentinel) {
    el.exploreSentinel.style.display = "none";
  }
  if (!total) {
    el.explorePager.innerHTML = "";
    return;
  }
  const hasMore = shown < total;
  el.explorePager.innerHTML =
    "<span class=\"muted\">A mostrar " + esc(String(shown)) + " de " + esc(String(total)) + "</span>" +
    (hasMore ? "<button type=\"button\" data-explore-load-more=\"1\">Mostrar mais</button>" : "");
  const btn = el.explorePager.querySelector("button[data-explore-load-more]");
  if (btn) {
    btn.addEventListener("click", loadMoreExploreItems);
  }
  if (el.exploreSentinel) {
    el.exploreSentinel.style.display = hasMore ? "block" : "none";
  }
}

function getItemMediaList(tabId, item) {
  if (tabId === "galeria") {
    const src = pick(item, ["mediaUrl", "url", "image", "video"]);
    if (!src) return [];
    return [{ url: src, type: inferMediaType(src, item && item.mediaType), galleryView: normalizeGalleryView(item && item.galleryView) }];
  }
  if (tabId === "campanhas") {
    const src = pick(item, ["mediaUrl", "image", "cover", "thumbnail", "video"]);
    if (!src) return [];
    return [{ url: src, type: inferMediaType(src, item && item.mediaType) }];
  }
  if (tabId === "casas" || tabId === "quartos" || tabId === "produtos" || tabId === "menu" || tabId === "portfolio" || tabId === "servicos") {
    const list = getMergedItemImages(item);
    if (list.length) return list.map((src) => ({ url: src, type: inferMediaType(src, "") }));
  }
  const src = pick(item, ["imageUrl", "image", "cover", "thumbnail", "video"]);
  if (!src) return [];
  return [{ url: src, type: inferMediaType(src, item && item.mediaType) }];
}

function selectedProfile() {
  return state.profiles.find((p) => p.id === state.selectedProfileId) || null;
}

function hasAccessSession() {
  return !!state.authUser || !!state.guestMode;
}

function getAccountType() {
  return String((state.authUser && state.authUser.account_type) || "").toLowerCase();
}

function getAllowedTabs() {
  if (!hasAccessSession()) return [];
  if (isGuestUser()) return ["home", "explore"];
  if (isCommonUser()) return ["home", "explore", "notifications", "profile", "settings"];
  return ["home", "explore", "notifications", "profile", "edit", "settings"];
}

function applyNavigationAccess() {
  if (!el.nav) return;
  const allowed = getAllowedTabs();
  const activeTab = allowed.includes(state.currentTab) ? state.currentTab : (allowed[0] || "home");
  if (activeTab !== state.currentTab && allowed.length) {
    setState({ currentTab: activeTab });
  }
  el.nav.querySelectorAll("button[data-tab]").forEach((button) => {
    const tab = String(button.dataset.tab || "");
    const visible = allowed.includes(tab);
    button.style.display = visible ? "" : "none";
    button.classList.toggle("active", visible && tab === activeTab);
    if (tab !== "notifications") {
      button.textContent = NAV_LABELS[tab] || button.textContent;
    }
  });
}

function renderEntryGate() {
  if (!el.entryGate || !el.appShell) return;
  if (hasAccessSession()) {
    el.entryGate.classList.remove("active");
    el.entryGate.innerHTML = "";
    el.appShell.classList.remove("hidden");
    return;
  }
  const view = String(state.authEntryView || "welcome");
  let html = "<div class=\"entry-card\">";
  html += "<div class=\"entry-logo\">Vore</div>";
  if (view === "loading") {
    html += "<h2 class=\"entry-title\">A iniciar</h2>";
    html += "<p class=\"entry-subtitle\">A validar sessao...</p>";
    html += "</div>";
    el.entryGate.innerHTML = html;
    el.entryGate.classList.add("active");
    el.appShell.classList.add("hidden");
    return;
  }
  if (view === "login") {
    html += "<h2 class=\"entry-title\">Entrar</h2>";
    html += "<p class=\"entry-subtitle\">Acede com a tua conta Vore.</p>";
    html += "<form class=\"entry-form\" id=\"entryLoginForm\">";
    html += "<label>Email<input required type=\"email\" id=\"entryLoginEmail\" class=\"input\" autocomplete=\"email\" /></label>";
    html += "<label>Palavra-passe<input required type=\"password\" id=\"entryLoginPassword\" class=\"input\" autocomplete=\"current-password\" /></label>";
    if (entryUi.error) html += "<p class=\"entry-error\">" + esc(entryUi.error) + "</p>";
    if (entryUi.success) html += "<p class=\"entry-success\">" + esc(entryUi.success) + "</p>";
    html += "<div class=\"entry-form-actions\">";
    html += "<button type=\"button\" data-entry-action=\"back\">Voltar</button>";
    html += "<button type=\"submit\" class=\"entry-submit-btn\"" + (entryUi.pending ? " disabled" : "") + ">" + (entryUi.pending ? "A entrar..." : "Entrar") + "</button>";
    html += "</div></form>";
    html += "<div class=\"entry-link-row\"><button type=\"button\" class=\"entry-link-btn\" data-entry-action=\"to_register\">Não tens conta? Registar</button></div>";
  } else if (view === "register") {
    html += "<h2 class=\"entry-title\">Criar conta</h2>";
    html += "<p class=\"entry-subtitle\">Regista uma conta profissional ou pessoal.</p>";
    html += "<form class=\"entry-form\" id=\"entryRegisterForm\">";
    html += "<label>Nome<input required type=\"text\" id=\"entryRegisterName\" class=\"input\" autocomplete=\"name\" /></label>";
    html += "<label>Email<input required type=\"email\" id=\"entryRegisterEmail\" class=\"input\" autocomplete=\"email\" /></label>";
    html += "<label>Palavra-passe<input required minlength=\"6\" type=\"password\" id=\"entryRegisterPassword\" class=\"input\" autocomplete=\"new-password\" /></label>";
    html += "<label>Tipo de conta<select id=\"entryRegisterType\" class=\"input\"><option value=\"professional\">Profissional</option><option value=\"common\">Conta pessoal</option></select></label>";
    if (entryUi.error) html += "<p class=\"entry-error\">" + esc(entryUi.error) + "</p>";
    if (entryUi.success) html += "<p class=\"entry-success\">" + esc(entryUi.success) + "</p>";
    html += "<div class=\"entry-form-actions\">";
    html += "<button type=\"button\" data-entry-action=\"back\">Voltar</button>";
    html += "<button type=\"submit\" class=\"entry-submit-btn\"" + (entryUi.pending ? " disabled" : "") + ">" + (entryUi.pending ? "A criar..." : "Criar conta") + "</button>";
    html += "</div></form>";
    html += "<div class=\"entry-link-row\"><button type=\"button\" class=\"entry-link-btn\" data-entry-action=\"to_login\">Ja tens conta? Entrar</button></div>";
  } else {
    html += "<h2 class=\"entry-title\">Descobrir e explorar</h2>";
    html += "<p class=\"entry-subtitle\">Entra para gerir perfil, ou continua como convidado para pesquisar.</p>";
    if (entryUi.error) html += "<p class=\"entry-error\">" + esc(entryUi.error) + "</p>";
    if (entryUi.success) html += "<p class=\"entry-success\">" + esc(entryUi.success) + "</p>";
    html += "<div class=\"entry-actions\">";
    html += "<button type=\"button\" class=\"entry-primary-btn\" data-entry-action=\"to_login\">Entrar</button>";
    html += "<button type=\"button\" data-entry-action=\"to_register\">Registar</button>";
    html += "<button type=\"button\" data-entry-action=\"guest\">Continuar como convidado</button>";
    html += "</div>";
  }
  html += "</div>";
  el.entryGate.innerHTML = html;
  el.entryGate.classList.add("active");
  el.appShell.classList.add("hidden");

  el.entryGate.querySelectorAll("button[data-entry-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = String(button.dataset.entryAction || "");
      entryUi.error = "";
      entryUi.success = "";
      if (action === "to_login") {
        setState({ authEntryView: "login" });
        renderEntryGate();
        return;
      }
      if (action === "to_register") {
        setState({ authEntryView: "register" });
        renderEntryGate();
        return;
      }
      if (action === "back") {
        setState({ authEntryView: "welcome" });
        renderEntryGate();
        return;
      }
      if (action === "guest") {
        setState({ guestMode: true, authEntryView: "welcome", currentTab: "home" });
        resetRecommendationsStore();
        renderAll();
      }
    });
  });

  const loginForm = el.entryGate.querySelector("#entryLoginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (entryUi.pending) return;
      const email = String((el.entryGate.querySelector("#entryLoginEmail") || {}).value || "").trim();
      const password = String((el.entryGate.querySelector("#entryLoginPassword") || {}).value || "");
      if (!email || !password) {
        entryUi.error = "Preenche email e palavra-passe.";
        renderEntryGate();
        return;
      }
      entryUi.pending = true;
      entryUi.error = "";
      entryUi.success = "";
      renderEntryGate();
      try {
        const data = await api.authLogin(email, password);
        const user = data && data.user ? data.user : null;
        if (!user) throw new Error("Resposta invalida");
        setState({
          authUser: user,
          guestMode: false,
          authEntryView: "welcome",
          currentTab: "home",
          notificationsFilter: "all",
          profileContext: String(user && user.account_type || "").toLowerCase() === "common" ? "personal" : "public",
        });
        settingsUi.credentials.email = String(user.email || "");
        settingsUi.view = "main";
        entryUi.pending = false;
        await refreshRecommendationsForCurrentUser({ force: true, silent: true });
        renderAll();
      } catch (err) {
        entryUi.pending = false;
        entryUi.error = (err && err.message) || "Falha no login.";
        renderEntryGate();
      }
    });
  }

  const registerForm = el.entryGate.querySelector("#entryRegisterForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (entryUi.pending) return;
      const name = String((el.entryGate.querySelector("#entryRegisterName") || {}).value || "").trim();
      const email = String((el.entryGate.querySelector("#entryRegisterEmail") || {}).value || "").trim();
      const password = String((el.entryGate.querySelector("#entryRegisterPassword") || {}).value || "");
      const accountType = String((el.entryGate.querySelector("#entryRegisterType") || {}).value || "professional");
      if (!name || !email || !password) {
        entryUi.error = "Preenche nome, email e palavra-passe.";
        renderEntryGate();
        return;
      }
      entryUi.pending = true;
      entryUi.error = "";
      entryUi.success = "";
      renderEntryGate();
      try {
        const data = await api.authRegister(name, email, password, accountType);
        const user = data && data.user ? data.user : null;
        if (!user) throw new Error("Resposta invalida");
        setState({
          authUser: user,
          guestMode: false,
          authEntryView: "welcome",
          currentTab: "home",
          notificationsFilter: "all",
          profileContext: String(user && user.account_type || "").toLowerCase() === "common" ? "personal" : "public",
        });
        settingsUi.credentials.email = String(user.email || "");
        settingsUi.view = "main";
        entryUi.pending = false;
        await refreshRecommendationsForCurrentUser({ force: true, silent: true });
        renderAll();
      } catch (err) {
        entryUi.pending = false;
        entryUi.error = (err && err.message) || "Falha no registo.";
        renderEntryGate();
      }
    });
  }
}

function setScreen(name) {
  if (!hasAccessSession()) {
    renderEntryGate();
    return;
  }
  if (itemModalState.open) closeItemModal();
  if (reviewsState.open) closeReviewsModal();
  const allowed = getAllowedTabs();
  const target = allowed.includes(name) ? name : (allowed[0] || "home");
  const prevTab = state.currentTab;
  if (target === "profile" && prevTab !== "profile" && prevTab !== "edit") {
    const nextReturn = prevTab === "explore" ? "explore" : (prevTab === "notifications" ? "notifications" : "home");
    setState({ profileReturnTab: nextReturn });
  }
  setState({ currentTab: target });
  el.screens.forEach((screen) => screen.classList.toggle("active", screen.id === target));
  if (el.nav) {
    el.nav.querySelectorAll("button[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === target));
  }
  if (target !== "explore" && state.exploreAdvancedOpen) {
    setState({ exploreAdvancedOpen: false });
    renderExploreAdvancedModal();
  }
  if (target === "profile") renderProfile();
  if (target === "notifications") renderNotifications();
  if (target === "settings") renderSettings();
  if (target === "edit") renderEdit();
}

function isGuestUser() {
  return !!state.guestMode && !state.authUser;
}

function isCommonUser() {
  const type = String((state.authUser && state.authUser.account_type) || "").toLowerCase();
  return !!state.authUser && type === "common";
}

function isProfessionalUser() {
  const type = getAccountType();
  return !!state.authUser && type !== "common";
}

function settingsRowHtml(label, hint = "", dataAction = "") {
  return (
    "<button type=\"button\" class=\"settings-row\" " + (dataAction ? ("data-settings-action=\"" + esc(dataAction) + "\"") : "") + ">" +
      "<span class=\"settings-row-main\">" +
        "<span class=\"settings-row-label\">" + esc(label) + "</span>" +
        (hint ? "<span class=\"settings-row-hint\">" + esc(hint) + "</span>" : "") +
      "</span>" +
      "<span class=\"settings-row-arrow\">&#8250;</span>" +
    "</button>"
  );
}

function settingsToggleHtml(label, key, value) {
  return (
    "<button type=\"button\" class=\"settings-row\" data-settings-toggle=\"" + esc(key) + "\">" +
      "<span class=\"settings-row-main\"><span class=\"settings-row-label\">" + esc(label) + "</span></span>" +
      "<span class=\"settings-toggle" + (value ? " on" : "") + "\"><span class=\"settings-toggle-dot\"></span></span>" +
    "</button>"
  );
}

function renderSettingsMain() {
  const guest = isGuestUser();
  const common = isCommonUser();
  const professional = isProfessionalUser();
  const email = String((state.authUser && state.authUser.email) || "");
  const name = String((state.authUser && state.authUser.name) || "Perfil");
  let html = "";
  html += "<div class=\"panel settings-hero\">";
  html += "<h3>Definições</h3>";
  html += "<p class=\"muted\">" + esc(guest ? "Modo convidado" : email) + "</p>";
  html += "<p class=\"muted\">" + esc(guest ? "Conta convidado" : (common ? "Conta pessoal" : "Conta profissional")) + "</p>";
  html += "</div>";

  if (guest) {
    html += "<div class=\"settings-section\"><h4>Conta</h4><div class=\"settings-card\">";
    html += "<p class=\"muted\">Entra para aceder a todas as definicoes.</p>";
    html += "</div></div>";
    el.settings.innerHTML = html;
    return;
  }

  if (professional) {
    html += "<div class=\"settings-section\"><h4>Conta</h4><div class=\"settings-card\">";
    html += "<div class=\"settings-row static\"><span class=\"settings-row-main\"><span class=\"settings-row-label\">" + esc(name) + "</span><span class=\"settings-row-hint\">Nome do negocio/perfil</span></span></div>";
    html += settingsRowHtml("Credenciais de acesso", email, "open_credentials");
    html += settingsRowHtml("Editar perfil", "Abrir edicao completa", "open_edit_profile");
    html += settingsToggleHtml("Perfil ativo", "profileActive", settingsUi.profileActive);
    html += "</div></div>";

    html += "<div class=\"settings-section\"><h4>Notificações</h4><div class=\"settings-card\">";
    html += settingsToggleHtml("Novas visitas ao perfil", "notifNewVisits", settingsUi.notifNewVisits);
    html += settingsToggleHtml("Novas partilhas do perfil", "notifShares", settingsUi.notifShares);
    html += settingsToggleHtml("Alertas de promoções", "notifPromos", settingsUi.notifPromos);
    html += "</div></div>";
  } else if (common) {
    html += "<div class=\"settings-section\"><h4>Conta pessoal</h4><div class=\"settings-card\">";
    html += settingsRowHtml("Credenciais de acesso", email, "open_credentials");
    html += settingsRowHtml("Abrir perfil pessoal", "Ir para o perfil", "open_profile");
    html += "</div></div>";
  }

  html += "<div class=\"settings-section\"><h4>App</h4><div class=\"settings-card\">";
  html += settingsRowHtml("Idioma", settingsUi.language === "en" ? "English" : settingsUi.language === "es" ? "Espanol" : "Portugues", "open_language");
  html += "<div class=\"settings-row static\"><span class=\"settings-row-main\"><span class=\"settings-row-label\">Tema</span><span class=\"settings-row-hint\">" + esc(settingsUi.theme === "escuro" ? "Escuro" : "Claro") + "</span></span></div>";
  html += settingsRowHtml("Limpar cache local", "Recarregar aplicacao", "clear_cache");
  html += "</div></div>";

  html += "<div class=\"settings-section\"><h4>Suporte e legal</h4><div class=\"settings-card\">";
  html += settingsRowHtml("Ajuda", "", "open_support");
  html += settingsRowHtml("Contacto", "", "open_support");
  html += settingsRowHtml("Termos e privacidade", "", "open_support");
  html += "</div></div>";

  html += "<button type=\"button\" class=\"settings-logout-btn\" data-settings-action=\"logout\">Terminar sessao</button>";
  if (settingsUi.message) html += "<p class=\"muted\">" + esc(settingsUi.message) + "</p>";
  el.settings.innerHTML = html;
}

function renderSettingsCredentials() {
  const email = String((state.authUser && state.authUser.email) || settingsUi.credentials.email || "");
  if (!settingsUi.credentials.email) settingsUi.credentials.email = email;
  let html = "";
  html += "<div class=\"panel settings-hero\">";
  html += "<div class=\"settings-subhead\"><button type=\"button\" class=\"profile-top-btn\" data-settings-action=\"back_main\">&#8592;</button><h3>Credenciais</h3></div>";
  html += "<p class=\"muted\">Alterar email e palavra-passe</p>";
  html += "</div>";
  html += "<div class=\"settings-section\"><div class=\"settings-card settings-form\">";
  html += "<label>Email</label><input id=\"settingsEmail\" class=\"input\" value=\"" + esc(settingsUi.credentials.email || "") + "\" />";
  html += "<label>Palavra-passe atual</label><input id=\"settingsCurrentPass\" type=\"password\" class=\"input\" value=\"" + esc(settingsUi.credentials.currentPassword || "") + "\" />";
  html += "<label>Nova palavra-passe</label><input id=\"settingsNewPass\" type=\"password\" class=\"input\" value=\"" + esc(settingsUi.credentials.newPassword || "") + "\" />";
  html += "<label>Repetir nova palavra-passe</label><input id=\"settingsRepeatPass\" type=\"password\" class=\"input\" value=\"" + esc(settingsUi.credentials.repeatPassword || "") + "\" />";
  html += "<button type=\"button\" class=\"settings-save-btn\" data-settings-action=\"save_credentials\">Guardar</button>";
  html += "</div></div>";
  if (settingsUi.message) html += "<p class=\"muted\">" + esc(settingsUi.message) + "</p>";
  el.settings.innerHTML = html;
}

function renderSettingsLanguage() {
  let html = "";
  html += "<div class=\"panel settings-hero\">";
  html += "<div class=\"settings-subhead\"><button type=\"button\" class=\"profile-top-btn\" data-settings-action=\"back_main\">&#8592;</button><h3>Idioma</h3></div>";
  html += "<p class=\"muted\">Seleciona o idioma da app</p>";
  html += "</div>";
  html += "<div class=\"settings-section\"><div class=\"settings-card\">";
  html += "<div class=\"chips\">";
  html += "<button type=\"button\" class=\"" + (settingsUi.language === "pt" ? "active" : "") + "\" data-settings-language=\"pt\">Portugues</button>";
  html += "<button type=\"button\" class=\"" + (settingsUi.language === "en" ? "active" : "") + "\" data-settings-language=\"en\">English</button>";
  html += "<button type=\"button\" class=\"" + (settingsUi.language === "es" ? "active" : "") + "\" data-settings-language=\"es\">Espanol</button>";
  html += "</div>";
  html += "<button type=\"button\" class=\"settings-save-btn\" data-settings-action=\"save_language\">Guardar</button>";
  html += "</div></div>";
  if (settingsUi.message) html += "<p class=\"muted\">" + esc(settingsUi.message) + "</p>";
  el.settings.innerHTML = html;
}

function bindSettingsEvents() {
  el.settings.querySelectorAll("button[data-settings-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = String(button.dataset.settingsToggle || "");
      if (!key || !(key in settingsUi)) return;
      settingsUi[key] = !settingsUi[key];
      settingsUi.message = "";
      renderSettings();
    });
  });
  el.settings.querySelectorAll("button[data-settings-language]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsUi.language = String(button.dataset.settingsLanguage || "pt");
      settingsUi.message = "";
      renderSettings();
    });
  });
  el.settings.querySelectorAll("button[data-settings-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = String(button.dataset.settingsAction || "");
      if (action === "open_credentials") {
        settingsUi.view = "credentials";
        settingsUi.message = "";
        renderSettings();
        return;
      }
      if (action === "open_language") {
        settingsUi.view = "language";
        settingsUi.message = "";
        renderSettings();
        return;
      }
      if (action === "open_edit_profile") {
        setScreen("edit");
        return;
      }
      if (action === "open_profile") {
        if (isCommonUser()) setState({ profileContext: "personal" });
        setScreen("profile");
        return;
      }
      if (action === "open_support") {
        settingsUi.message = "Seccao de suporte/termos em preparacao.";
        renderSettings();
        return;
      }
      if (action === "clear_cache") {
        settingsUi.message = "Cache limpo. A recarregar...";
        renderSettings();
        setTimeout(() => window.location.reload(), 200);
        return;
      }
      if (action === "save_language") {
        try { localStorage.setItem("vore_language", settingsUi.language); } catch (_e) {}
        settingsUi.message = "Idioma guardado.";
        settingsUi.view = "main";
        renderSettings();
        return;
      }
      if (action === "save_credentials") {
        const emailInput = el.settings.querySelector("#settingsEmail");
        const curInput = el.settings.querySelector("#settingsCurrentPass");
        const newInput = el.settings.querySelector("#settingsNewPass");
        const repInput = el.settings.querySelector("#settingsRepeatPass");
        settingsUi.credentials.email = String((emailInput && emailInput.value) || "").trim();
        settingsUi.credentials.currentPassword = String((curInput && curInput.value) || "");
        settingsUi.credentials.newPassword = String((newInput && newInput.value) || "");
        settingsUi.credentials.repeatPassword = String((repInput && repInput.value) || "");
        if (settingsUi.credentials.newPassword !== settingsUi.credentials.repeatPassword) {
        settingsUi.message = "Nova palavra-passe e repetição não coincidem.";
          renderSettings();
          return;
        }
        settingsUi.message = "Credenciais guardadas localmente. Endpoint de alteração ainda não disponível.";
        settingsUi.view = "main";
        renderSettings();
        return;
      }
      if (action === "logout") {
        try {
          await api.authLogout();
        } catch (_e) {}
        closeSharePicker();
        closeItemModal();
        closeReviewsModal();
        setState({ authUser: null, guestMode: false, authEntryView: "welcome", currentTab: "home", profileContext: "public", notificationsFilter: "all" });
        personalStore.loadedForUserId = 0;
        personalStore.data = null;
        notificationsStore.loadedForUserId = 0;
        notificationsStore.readKeys = [];
        resetRecommendationsStore();
        metricsStore.loadedForKey = "";
        metricsStore.dayKey = "";
        metricsStore.profileViews = {};
        settingsUi.message = "";
        settingsUi.view = "main";
        entryUi.error = "";
        entryUi.success = "";
        entryUi.pending = false;
        renderAll();
        return;
      }
      if (action === "back_main") {
        settingsUi.view = "main";
        settingsUi.message = "";
        renderSettings();
      }
    });
  });
}

function renderSettings() {
  if (!el.settings) return;
  const persistedLanguage = getStoredLanguage();
  if (persistedLanguage) settingsUi.language = persistedLanguage;
  if (state.authUser && state.authUser.email && !settingsUi.credentials.email) {
    settingsUi.credentials.email = String(state.authUser.email);
  }
  if (settingsUi.view === "credentials") renderSettingsCredentials();
  else if (settingsUi.view === "language") renderSettingsLanguage();
  else renderSettingsMain();
  bindSettingsEvents();
}

function setNotificationsNavCount(count) {
  if (!el.nav) return;
  const btn = el.nav.querySelector('button[data-tab="notifications"]');
  if (!btn) return;
  const safe = Math.max(0, Number(count || 0));
  btn.innerHTML = NAV_LABELS.notifications + (safe > 0 ? " <span class=\"nav-dot\">" + esc(safe > 99 ? "99+" : String(safe)) + "</span>" : "");
}

function buildNotificationsEntries() {
  if (!state.authUser) return [];
  const entries = [];
  const baseNow = Date.now();
  const inbox = getCurrentUserInboxEntries();
  inbox.forEach((share) => {
    const id = String(share && share.id || "");
    if (!id) return;
    const fromName = String((share && (share.fromName || share.fromEmail)) || "Utilizador");
    const title = String(share && share.title || "Partilha");
    const when = Number(share && share.createdAt || 0);
    const key = "share_" + id;
    entries.push({
      key,
      category: "shares",
      title: "Partilha de " + fromName,
      subtitle: title,
      time: when,
      sourceId: id,
      payload: deepClone(share),
      read: isNotificationRead(key) || (share && share.read === true),
    });
  });
  state.profiles.forEach((profile, profileIdx) => {
    const badge = getBadgeType(profile);
    const filter = resolveProfileFilter(profile);
    const candidateTimes = [
      profile && profile.updated_at,
      profile && profile.created_at,
      profile && profile.updatedAt,
      profile && profile.createdAt,
      profile && profile.data && profile.data.updatedAt,
      profile && profile.data && profile.data.createdAt,
      profile && profile.data && profile.data.updated_at,
      profile && profile.data && profile.data.created_at,
    ];
    let pseudoTime = 0;
    for (const candidate of candidateTimes) {
      const parsed = Date.parse(String(candidate || ""));
      if (Number.isFinite(parsed) && parsed > 0) {
        pseudoTime = parsed;
        break;
      }
    }
    if (!pseudoTime) pseudoTime = baseNow - (profileIdx * 1000);
    if (badge === "novo" || filter === "novidades") {
      const key = "new_profile_" + String(profile.id || "");
      entries.push({
        key,
        category: "new",
        title: "Novo perfil",
        subtitle: String(profile.name || "Perfil"),
        time: pseudoTime,
        profileId: Number(profile.id || 0),
        read: isNotificationRead(key),
      });
    }
    if (badge === "promo" || filter === "promocoes") {
      const key = "promo_profile_" + String(profile.id || "");
      entries.push({
        key,
        category: "promo",
        title: "Promoção ativa",
        subtitle: String(profile.name || "Perfil"),
        time: pseudoTime,
        profileId: Number(profile.id || 0),
        read: isNotificationRead(key),
      });
    }
  });
  return entries
    .sort((a, b) => Number(b.time || 0) - Number(a.time || 0))
    .slice(0, 160);
}

function openNotificationEntry(entry) {
  if (!entry || typeof entry !== "object") return;
  markNotificationRead(entry.key);
  if (entry.category === "shares") {
    markCurrentUserInboxEntryRead(entry.sourceId);
    openSharedEntry(entry.payload);
    return;
  }
  const pid = Number(entry.profileId || 0);
  if (pid > 0) {
    setState({ selectedProfileId: pid, profileContext: "public", profileReturnTab: "notifications" });
    incrementProfileView(pid);
    setScreen("profile");
    renderProfile();
  }
}

function notificationCategoryLabel(category) {
  const key = String(category || "").toLowerCase();
  if (key === "shares") return "Partilha";
  if (key === "new") return "Novo";
  if (key === "promo") return "Promoção";
  return "Alerta";
}

function notificationDayBucket(value) {
  const ts = toTimestampMs(value);
  if (!ts) return "older";
  const now = new Date();
  const target = new Date(ts);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.floor((startToday - startTarget) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  return "older";
}

function notificationBucketLabel(bucket) {
  if (bucket === "today") return "Hoje";
  if (bucket === "yesterday") return "Ontem";
  return "Anteriores";
}

function groupNotificationsByBucket(list) {
  const groups = { today: [], yesterday: [], older: [] };
  (Array.isArray(list) ? list : []).forEach((entry) => {
    const bucket = notificationDayBucket(entry && entry.time);
    if (!groups[bucket]) groups[bucket] = [];
    groups[bucket].push(entry);
  });
  return ["today", "yesterday", "older"]
    .map((bucket) => ({ bucket, label: notificationBucketLabel(bucket), items: groups[bucket] || [] }))
    .filter((group) => group.items.length > 0);
}

function renderNotifications() {
  if (!el.notificationsList || !el.notificationsFilters) return;
  if (!state.authUser) {
    el.notificationsFilters.innerHTML = "";
    el.notificationsList.innerHTML = "<p class=\"muted\">Entra para ver notificações.</p>";
    setNotificationsNavCount(0);
    return;
  }
  const allEntries = buildNotificationsEntries();
  const unreadCount = allEntries.filter((entry) => !entry.read).length;
  setNotificationsNavCount(unreadCount);
  const filter = String(state.notificationsFilter || "all");
  const filters = [
    { key: "all", label: "Todas" },
    { key: "shares", label: "Partilhas" },
    { key: "new", label: "Novos perfis" },
    { key: "promo", label: "Promoções" },
  ];
  el.notificationsFilters.innerHTML =
    filters.map((item) => "<button type=\"button\" class=\"" + (filter === item.key ? "active" : "") + "\" data-notif-filter=\"" + item.key + "\">" + esc(item.label) + "</button>").join("") +
    "<button type=\"button\" data-notif-mark-all=\"1\">Marcar tudo lido</button>";
  el.notificationsFilters.querySelectorAll("button[data-notif-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ notificationsFilter: String(button.dataset.notifFilter || "all") });
      renderNotifications();
    });
  });
  const markAllBtn = el.notificationsFilters.querySelector("button[data-notif-mark-all]");
  if (markAllBtn) {
    markAllBtn.addEventListener("click", () => {
      const scope = filter === "all" ? allEntries : allEntries.filter((entry) => entry.category === filter);
      scope.forEach((entry) => {
        markNotificationRead(entry.key);
        if (entry.category === "shares") markCurrentUserInboxEntryRead(entry.sourceId);
      });
      renderAll();
    });
  }
  const visible = filter === "all" ? allEntries : allEntries.filter((entry) => entry.category === filter);
  if (!visible.length) {
    el.notificationsList.innerHTML = "<p class=\"muted\">Sem notificações.</p>";
    return;
  }
  const grouped = groupNotificationsByBucket(visible);
  el.notificationsList.innerHTML = "<div class=\"notifications-list\">" + grouped.map((group) => (
    "<section class=\"notifications-group\">" +
      "<p class=\"notifications-group-title\">" + esc(group.label) + "</p>" +
      group.items.map((entry) => {
        const unread = !entry.read;
        const dot = unread ? "<span class=\"notifications-dot\"></span>" : "";
        const when = formatRelativeTime(entry && entry.time);
        const categoryLabel = notificationCategoryLabel(entry && entry.category);
        return (
          "<button type=\"button\" class=\"notifications-row" + (unread ? " unread" : "") + "\" data-notif-key=\"" + esc(String(entry && entry.key || "")) + "\">" +
            "<span class=\"notifications-main\">" +
              "<strong>" + esc(entry.title || "Notificação") + "</strong>" +
              "<span class=\"muted\">" + esc(entry.subtitle || "") + "</span>" +
              "<span class=\"notifications-meta\">" +
                "<span class=\"profile-thread-kind\">" + esc(categoryLabel) + "</span>" +
                (when ? "<span class=\"profile-thread-time\">" + esc(when) + "</span>" : "") +
              "</span>" +
            "</span>" +
            "<span class=\"notifications-right\">" + dot + "</span>" +
          "</button>"
        );
      }).join("") +
    "</section>"
  )).join("") + "</div>";
  el.notificationsList.querySelectorAll("button[data-notif-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = String(button.dataset.notifKey || "");
      const entry = visible.find((row) => String(row && row.key || "") === key);
      if (!entry) return;
      openNotificationEntry(entry);
      renderAll();
    });
  });
}

function ensureProfileTab(tabs) {
  const valid = (tabs || []).find((tab) => tab.id === state.profileTab);
  if (valid) return valid.id;
  const first = (tabs || [])[0];
  const next = first ? first.id : "sobre";
  setState({ profileTab: next, profileSubTab: "" });
  return next;
}

function ensureSubTab(sections) {
  if (!Array.isArray(sections) || !sections.length) return "";
  const valid = sections.find((section) => section.id === state.profileSubTab || section.label === state.profileSubTab);
  if (valid) return valid.id || valid.label;
  const first = sections[0];
  const next = first.id || first.label || "";
  setState({ profileSubTab: next });
  return next;
}
function renderCards(list, root, options = {}) {
  const compact = !!options.compact;
  const emptyText = options.emptyText || "Sem perfis.";
  const canSaveProfiles = isCommonUser();
  const inputList = Array.isArray(list) ? list : [];
  if (!inputList.length) {
    root.innerHTML = "<div class=\"panel\"><p class=\"muted\">" + esc(emptyText) + "</p></div>";
    return;
  }
  root.innerHTML = inputList
    .map((p) => (
      "<article class=\"card" + (compact ? " card-compact" : "") + "\" data-id=\"" + p.id + "\">" +
      (getBadgeType(p) ? ("<span class=\"card-badge card-badge-" + esc(getBadgeType(p)) + "\">" + esc(getBadgeType(p) === "promo" ? "Promo" : getBadgeType(p) === "novo" ? "Novo" : "Verif") + "</span>") : "") +
      (p.avatar ? "<img class=\"card-avatar\" src=\"" + esc(p.avatar) + "\" alt=\"" + esc(p.name || "Perfil") + "\" />" : "<div class=\"card-avatar placeholder\">" + esc((p.name || "P").slice(0,1).toUpperCase()) + "</div>") +
      "<h3>" + esc(p.name) + "</h3>" +
      "<p class=\"muted\">" + esc(p.category || PROFILE_TYPE_LABEL[p.type] || "Perfil") + "</p>" +
      "<p class=\"muted\">" + esc(p.location || "Sem localizacao") + "</p>" +
      (p.rating ? "<p class=\"rating\">&#9733; " + esc(p.rating) + "</p>" : "") +
      (canSaveProfiles ? "<button type=\"button\" class=\"card-save-btn" + (isProfileSaved(p.id) ? " active" : "") + "\" data-card-save=\"" + p.id + "\" title=\"Guardar perfil\">" + (isProfileSaved(p.id) ? "&#9733;" : "&#9734;") + "</button>" : "") +
      "</article>"
    ))
    .join("");

  root.querySelectorAll("button[data-card-save]").forEach((button) => {
    button.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const id = Number(button.dataset.cardSave || 0);
      if (!id) return;
      toggleSavedProfile(id);
      renderAll();
    });
  });

  root.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      const fromTab =
        state.currentTab === "explore"
          ? "explore"
          : (state.currentTab === "profile" && isCommonUser() && String(state.profileContext || "personal") !== "public")
            ? "profile"
            : "home";
      setState({ selectedProfileId: Number(card.dataset.id || 0) || null });
      setState({ profileReturnTab: fromTab });
      incrementProfileView(Number(card.dataset.id || 0) || 0);
      if (isCommonUser()) {
        setState({ profileContext: "public" });
        addRecentProfile(Number(card.dataset.id || 0) || 0);
      }
      renderProfile();
      setScreen("profile");
    });
  });
}

function renderItem(tabId, item, idx = 0) {
  const title = pick(item, ["name", "title", "label", "description"]) || "Item";
  const subtitle = pick(item, ["shortDescription", "description", "note", "notes"]);
  const promoEnabledItem = isOnFlag(item && item.promoEnabled);
  const quoteOnlyItem = isOnFlag(item && item.quoteOnly);
  const stockOutItem = String(item && item.stock || "").trim().toLowerCase() === "out";
  if (tabId === "horario") {
    const value = pick(item, ["time", "value", "description"]);
    return (
      "<article class=\"panel profile-item profile-schedule-card\" data-profile-item=\"" + idx + "\">" +
      "<div class=\"profile-schedule-day\">" + esc(title) + "</div>" +
      "<div class=\"profile-schedule-time\">" + esc(value || "-") + "</div>" +
      "</article>"
    );
  }
  if (tabId === "agenda") {
    const weekday = pick(item, ["weekday", "name"]);
    const day = pick(item, ["day", "date"]);
    const times = Array.isArray(item && item.times) ? item.times.join(" | ") : pick(item, ["times", "time"]);
    return (
      "<article class=\"panel profile-item profile-agenda-card\" data-profile-item=\"" + idx + "\">" +
      "<div class=\"profile-agenda-top\">" +
      "<strong>" + esc(weekday || title) + "</strong>" +
      (day ? "<span class=\"profile-agenda-date\">" + esc(day) + "</span>" : "") +
      "</div>" +
      (times ? "<p class=\"profile-agenda-times\">" + esc(times) + "</p>" : "<p class=\"profile-agenda-times\">-</p>") +
      "</article>"
    );
  }
  if (tabId === "parcerias") {
    const image = pick(item, ["image", "avatar", "logo"]);
    const href = pick(item, ["link", "url", "website"]);
    return (
      "<article class=\"panel profile-item profile-partner-card\" data-profile-item=\"" + idx + "\">" +
      (image
        ? "<img class=\"profile-partner-image\" src=\"" + esc(image) + "\" alt=\"" + esc(title) + "\" />"
        : "<div class=\"profile-partner-image placeholder\">P</div>") +
      "<strong class=\"profile-partner-name\">" + esc(title) + "</strong>" +
      (subtitle ? "<p class=\"muted profile-partner-subtitle\">" + esc(subtitle) + "</p>" : "") +
      (href ? "<p class=\"profile-partner-link\"><a href=\"" + esc(toOpenableUrl(href) || href) + "\" target=\"_blank\" rel=\"noopener noreferrer\">Abrir</a></p>" : "") +
      "</article>"
    );
  }
  if (tabId === "locais") {
    const address = pick(item, ["address", "description", "subtitle"]);
    const note = pick(item, ["note"]);
    const href = pick(item, ["link", "url"]);
    return (
      "<article class=\"panel profile-item profile-location-card\" data-profile-item=\"" + idx + "\">" +
      "<div class=\"profile-location-main\">" +
      "<strong>" + esc(title) + "</strong>" +
      (address ? "<p class=\"muted\">" + esc(address) + "</p>" : "") +
      (note ? "<p class=\"muted\">" + esc(note) + "</p>" : "") +
      "</div>" +
      "<div class=\"profile-location-side\">" +
      (href ? "<a class=\"campaign-link\" href=\"" + esc(toOpenableUrl(href) || href) + "\" target=\"_blank\" rel=\"noopener noreferrer\">Mapa</a>" : "<span class=\"muted\">Sem mapa</span>") +
      "</div>" +
      "</article>"
    );
  }
  if (tabId === "galeria") {
    const mediaUrl = pick(item, ["mediaUrl", "url", "image", "video"]);
    const mediaType = inferMediaType(mediaUrl, item && item.mediaType);
    const galleryView = normalizeGalleryView(item && item.galleryView);
    const mediaStyle = getGalleryViewStyle(galleryView, mediaType);
    const mediaBlock = mediaUrl
      ? (mediaType === "video"
          ? "<video class=\"item-preview profile-gallery-media\" controls preload=\"metadata\" src=\"" + esc(mediaUrl) + "\" style=\"" + esc(mediaStyle) + "\"></video>"
          : "<img class=\"item-preview profile-gallery-media\" src=\"" + esc(mediaUrl) + "\" alt=\"" + esc(title) + "\" style=\"" + esc(mediaStyle) + "\" />")
      : "";
    return (
      "<article class=\"panel profile-item profile-gallery-item\" data-profile-item=\"" + idx + "\">" +
      mediaBlock +
      "<p class=\"profile-gallery-caption\">" + esc(title) + "</p>" +
      "</article>"
    );
  }
  const price = pick(item, ["price", "priceNight", "nightlyPrice", "pricePerNight", "price_per_night", "nightRate", "rate", "promoNowPrice"]);
  const link = pick(item, ["link", "url", "website", "ctaLink"]);
  const mediaList = getItemMediaList(tabId, item);
  const itemImage = mediaList[0] && mediaList[0].type === "image" ? mediaList[0].url : "";
  const supportsInlineThumbs = (tabId === "casas" || tabId === "quartos" || tabId === "produtos" || tabId === "menu" || tabId === "portfolio");
  const imageThumbs = mediaList.filter((m) => m.type === "image").slice(0, 5);
  const minThumbCount = (tabId === "casas" || tabId === "quartos") ? 1 : 2;
  const inlineThumbs = (supportsInlineThumbs && imageThumbs.length >= minThumbCount)
    ? imageThumbs
        .map((m, i) => "<button type=\"button\" class=\"item-inline-thumb" + (i === 0 ? " active" : "") + "\" data-item-thumb-url=\"" + esc(m.url) + "\" aria-label=\"Imagem " + (i + 1) + "\"><img src=\"" + esc(m.url) + "\" alt=\"thumb " + (i + 1) + "\" /></button>")
        .join("")
    : "";
  const inlineThumbsBlock = inlineThumbs ? "<div class=\"item-inline-thumbs\">" + inlineThumbs + "</div>" : "";
  const details = [];
  const duration = pick(item, ["time", "duration"]);
  if (duration) details.push("Duracao: " + duration);
  const promoOld = String(pick(item, ["promoOldPrice"]) || "").trim();
  const promoNow = String(pick(item, ["promoNowPrice", "price", "priceNight"]) || "").trim();
  const hasPromoPrice = promoEnabledItem && !!promoOld && !!promoNow;
  const showPriceDefault = price && tabId !== "portfolio" && tabId !== "campanhas" && tabId !== "casas" && tabId !== "quartos" && !(tabId === "servicos" && quoteOnlyItem);
  const promoBlock = (tabId === "servicos" || tabId === "produtos" || tabId === "menu") && hasPromoPrice
    ? (
      "<div class=\"profile-item-promo\">" +
        "<span class=\"profile-item-promo-badge\">PROMO</span>" +
        "<span class=\"profile-item-price-old\">" + esc(promoOld) + "</span>" +
        "<strong class=\"profile-item-price-now\">" + esc(promoNow) + "</strong>" +
      "</div>"
    )
    : "";
  const priceBlock = !promoBlock && showPriceDefault
    ? ("<p class=\"profile-item-price\">" + esc(String(price)) + "</p>")
    : "";
  const flags = [];
  if (tabId === "servicos" && quoteOnlyItem) flags.push("<span class=\"profile-item-flag profile-item-flag-budget\">Sob orçamento</span>");
  if (tabId === "produtos") flags.push("<span class=\"profile-item-flag " + (stockOutItem ? "profile-item-flag-out" : "profile-item-flag-in") + "\">" + (stockOutItem ? "Esgotado" : "Em stock") + "</span>");
  const flagsBlock = flags.length ? "<div class=\"profile-item-flags\">" + flags.join("") + "</div>" : "";
  const serviceTypeMeta = resolveServiceTypeMeta(item && (item.serviceType || item.type));
  const serviceTypeLabel = serviceTypeMeta.id !== "general" ? serviceTypeMeta.label : "";
  const serviceExtra1 = String(item && (item.extra1 || item.detail1) || "").trim();
  const serviceExtra2 = String(item && (item.extra2 || item.detail2) || "").trim();
  const serviceNote = String(item && (item.note || item.notes) || "").trim();
  const serviceDetailsBlock = tabId === "servicos"
    ? (
      "<div class=\"profile-service-detail-list\">" +
      (serviceTypeLabel ? "<p class=\"profile-service-detail\">" + esc(serviceTypeLabel) + "</p>" : "") +
      (serviceExtra1 ? "<p class=\"profile-service-detail\">" + esc(serviceExtra1) + "</p>" : "") +
      (serviceExtra2 ? "<p class=\"profile-service-detail\">" + esc(serviceExtra2) + "</p>" : "") +
      (serviceNote ? "<p class=\"profile-service-note\">" + esc(serviceNote) + "</p>" : "") +
      "</div>"
    )
    : "";
  if (tabId === "servicos") {
    const durationLine = duration ? "<p class=\"profile-service-duration\">Duracao: " + esc(String(duration)) + "</p>" : "";
    const quoteBlock = quoteOnlyItem ? "<span class=\"profile-item-flag profile-item-flag-budget\">Sob orçamento</span>" : "";
    const priceRight = promoBlock || quoteBlock || priceBlock;
    return (
      "<article class=\"panel profile-item profile-service-item\" data-profile-item=\"" + idx + "\">" +
        "<div class=\"profile-service-top-row\">" +
          "<strong class=\"profile-service-title\" title=\"" + esc(title) + "\">" + esc(title) + "</strong>" +
          "<div class=\"profile-service-right\">" + priceRight + "</div>" +
        "</div>" +
        durationLine +
        serviceDetailsBlock +
      "</article>"
    );
  }
  if (tabId === "casas" || tabId === "quartos") {
    const cap = pick(item, ["capacity", "guests"]);
    const beds = pick(item, ["beds"]);
    const wc = pick(item, ["bathrooms", "wc"]);
    const availability = pick(item, ["availability"]);
    if (cap) details.push("Capacidade: " + cap);
    if (beds) details.push("Camas: " + beds);
    if (wc) details.push("WC: " + wc);
    if (availability) details.push("Disponibilidade: " + availability);
  }
  const detailsBlock = details.length ? "<p class=\"muted profile-item-details\">" + esc(details.join(" | ")) + "</p>" : "";
  const href = link && !/^https?:\/\//i.test(link) ? ("https://" + link.replace(/^\/+/, "")) : link;
  if (tabId === "campanhas") {
    const mediaUrl = pick(item, ["mediaUrl", "image", "cover", "thumbnail", "video"]);
    const mediaType = inferMediaType(mediaUrl, item && item.mediaType);
    const mediaBlock = !mediaUrl ? "" : (mediaType === "video" ? "<video class=\"campaign-preview\" controls preload=\"metadata\" src=\"" + esc(mediaUrl) + "\"></video>" : "<img class=\"campaign-preview\" src=\"" + esc(mediaUrl) + "\" alt=\"" + esc(title) + "\" />");
    const ctaLabel = pick(item, ["ctaLabel", "buttonLabel"]) || "Ver";
    const ctaBlock = href ? "<p><a class=\"campaign-link\" href=\"" + esc(href) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + esc(ctaLabel) + "</a></p>" : "";
    return "<article class=\"panel campaign-item profile-item\" data-profile-item=\"" + idx + "\"><strong>" + esc(title) + "</strong>" + mediaBlock + (subtitle ? "<p class=\"muted\">" + esc(subtitle) + "</p>" : "") + ctaBlock + "</article>";
  }
  const linkBlock = (tabId === "portfolio" && href)
    ? "<p class=\"muted\"><a href=\"" + esc(href) + "\" target=\"_blank\" rel=\"noopener noreferrer\">Abrir link</a></p>"
    : "";
  return (
    "<article class=\"panel profile-item\" data-profile-item=\"" + idx + "\">" +
    "<strong>" + esc(title) + "</strong>" +
    ((tabId === "casas" || tabId === "quartos") ? "<p class=\"item-night-price\">" + esc(price ? ((/(\u20AC|EUR)/i.test(String(price)) ? String(price) : (String(price) + " EUR")) + " / noite") : "Sob consulta") + "</p>" : "") +
    (itemImage ? "<img class=\"item-preview item-main-image\" src=\"" + esc(itemImage) + "\" alt=\"" + esc(title) + "\" />" : "") +
    inlineThumbsBlock +
    (subtitle ? "<p class=\"muted\">" + esc(subtitle) + "</p>" : "") +
    promoBlock +
    priceBlock +
    flagsBlock +
    serviceDetailsBlock +
    detailsBlock +
    linkBlock +
    "</article>"
  );
}

function ensureItemModalRoot() {
  let root = document.getElementById("itemModalRoot");
  if (root) return root;
  root = document.createElement("div");
  root.id = "itemModalRoot";
  root.className = "item-modal-root";
  root.innerHTML = (
    "<div class=\"item-modal-backdrop\" data-modal-close=\"1\"></div>" +
    "<div class=\"item-modal-panel\">" +
      "<div class=\"item-modal-top\">" +
        "<button type=\"button\" data-modal-prev=\"1\">&#8249;</button>" +
        "<button type=\"button\" data-modal-next=\"1\">&#8250;</button>" +
        "<button type=\"button\" data-modal-share=\"1\">Partilhar</button>" +
        "<button type=\"button\" data-modal-save=\"1\">Guardar</button>" +
        "<button type=\"button\" data-modal-close=\"1\">&times;</button>" +
      "</div>" +
      "<div id=\"itemModalBody\" class=\"item-modal-body\"></div>" +
    "</div>"
  );
  document.body.appendChild(root);
  root.querySelectorAll("[data-modal-close]").forEach((btn) => btn.addEventListener("click", closeItemModal));
  root.querySelector("[data-modal-prev]").addEventListener("click", () => stepItemModal(-1));
  root.querySelector("[data-modal-next]").addEventListener("click", () => stepItemModal(1));
  root.querySelector("[data-modal-share]").addEventListener("click", () => {
    if (!isCommonUser()) return;
    const payload = getCurrentModalSharePayload();
    if (!payload) return;
    openSharePicker(payload);
  });
  root.querySelector("[data-modal-save]").addEventListener("click", () => {
    toggleCurrentModalSave();
    renderItemModal();
    renderProfile();
    renderAll();
  });
  bindItemModalGestures(root);
  return root;
}

function isSwipeGestureBlockedTarget(target) {
  if (!target || !target.closest) return false;
  return !!target.closest("button, a, input, textarea, select, label, [contenteditable='true']");
}

function bindItemModalGestures(root) {
  if (!root || root.dataset.itemSwipeBound === "1") return;
  root.dataset.itemSwipeBound = "1";
  const panel = root.querySelector(".item-modal-panel");
  if (!panel) return;
  let tracking = false;
  let blocked = false;
  let startX = 0;
  let startY = 0;
  let startScrollTop = 0;
  const reset = () => {
    tracking = false;
    blocked = false;
    startX = 0;
    startY = 0;
    startScrollTop = 0;
  };
  panel.addEventListener("touchstart", (ev) => {
    if (!itemModalState.open) return;
    const touch = ev.touches && ev.touches[0];
    if (!touch) return;
    tracking = true;
    blocked = isSwipeGestureBlockedTarget(ev.target);
    startX = Number(touch.clientX || 0);
    startY = Number(touch.clientY || 0);
    const body = root.querySelector("#itemModalBody");
    startScrollTop = body ? Number(body.scrollTop || 0) : 0;
  }, { passive: true });
  panel.addEventListener("touchcancel", reset, { passive: true });
  panel.addEventListener("touchend", (ev) => {
    if (!tracking) return;
    const touch = ev.changedTouches && ev.changedTouches[0];
    if (!touch) {
      reset();
      return;
    }
    const dx = Number(touch.clientX || 0) - startX;
    const dy = Number(touch.clientY || 0) - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (!blocked) {
      if (dy >= 100 && absDy > absDx * 1.2 && startScrollTop <= 2) {
        closeItemModal();
        reset();
        return;
      }
      if (absDx >= 70 && absDx > absDy * 1.25) {
        const direction = dx > 0 ? -1 : 1;
        const itemCount = Array.isArray(itemModalState.items) ? itemModalState.items.length : 0;
        if (itemCount > 1) {
          stepItemModal(direction);
          reset();
          return;
        }
        const currentItem = itemModalState.items[itemModalState.index] || {};
        const mediaList = getItemMediaList(itemModalState.tabId, currentItem);
        const mediaLen = Array.isArray(mediaList) ? mediaList.length : 0;
        if (mediaLen > 1) {
          itemModalState.mediaIndex = (itemModalState.mediaIndex + direction + mediaLen) % mediaLen;
          renderItemModal();
          reset();
          return;
        }
      }
    }
    reset();
  }, { passive: true });
}

function closeItemModal() {
  itemModalState.open = false;
  const root = document.getElementById("itemModalRoot");
  if (root) root.classList.remove("open");
  setModalBodyLock(false);
}

function stepItemModal(delta) {
  const len = itemModalState.items.length;
  if (!len) return;
  itemModalState.index = (itemModalState.index + delta + len) % len;
  itemModalState.mediaIndex = 0;
  renderItemModal();
}

function openItemModal(tabId, items, index, context = {}) {
  if (!Array.isArray(items) || !items.length) return;
  const selected = selectedProfile();
  const fallbackProfileId = Number((selected && selected.id) || 0);
  const fallbackProfileName = String((selected && selected.name) || "Perfil");
  itemModalState.open = true;
  itemModalState.tabId = tabId;
  itemModalState.items = items;
  itemModalState.index = Math.max(0, Math.min(Number(index || 0), items.length - 1));
  itemModalState.mediaIndex = 0;
  itemModalState.profileId = Number(context.profileId || fallbackProfileId || 0);
  itemModalState.profileName = String(context.profileName || fallbackProfileName || "Perfil");
  setModalBodyLock(true);
  renderItemModal();
}

function renderItemModal() {
  const root = ensureItemModalRoot();
  if (!itemModalState.open) {
    root.classList.remove("open");
    return;
  }
  const item = itemModalState.items[itemModalState.index] || {};
  const tabId = itemModalState.tabId;
  const title = pick(item, ["name", "title", "label", "description"]) || "Item";
  const subtitle = pick(item, ["shortDescription", "description", "note", "notes"]);
  const price = pick(item, ["price", "priceNight", "nightlyPrice", "pricePerNight", "price_per_night", "nightRate", "rate", "promoNowPrice"]);
  const duration = pick(item, ["time", "duration"]);
  const link = pick(item, ["link", "url", "website", "ctaLink"]);
  const href = link && !/^https?:\/\//i.test(link) ? ("https://" + link.replace(/^\/+/, "")) : link;
  const quoteOnly = isOnFlag(item && item.quoteOnly);
  const promoEnabled = isOnFlag(item && item.promoEnabled);
  const promoOld = pick(item, ["promoOldPrice"]);
  const promoNow = pick(item, ["promoNowPrice"]);
  const isServiceModalEarly = tabId === "servicos";
  const isCatalogModalEarly = tabId === "produtos" || tabId === "menu";

  const bits = [];
  if (duration && !isServiceModalEarly) bits.push("Duracao: " + duration);
  if (tabId === "servicos" && quoteOnly && !isServiceModalEarly) bits.push("Sob orçamento");
  if (price && !isServiceModalEarly && !isCatalogModalEarly && tabId !== "portfolio" && tabId !== "campanhas" && tabId !== "casas" && tabId !== "quartos") bits.push("Preco: " + price);
  if (promoEnabled && promoOld && promoNow && !isServiceModalEarly && !isCatalogModalEarly) bits.push("Promoção: " + promoOld + " -> " + promoNow);
  if (tabId === "casas" || tabId === "quartos") {
    const cap = pick(item, ["capacity", "guests"]);
    const beds = pick(item, ["beds"]);
    const wc = pick(item, ["bathrooms", "wc"]);
    const checkIn = pick(item, ["checkIn"]);
    const checkOut = pick(item, ["checkOut"]);
    const availability = pick(item, ["availability"]);
    if (cap) bits.push("Capacidade: " + cap);
    if (beds) bits.push("Camas: " + beds);
    if (wc) bits.push("WC: " + wc);
    if (checkIn) bits.push("Check-in: " + checkIn);
    if (checkOut) bits.push("Check-out: " + checkOut);
    if (availability) bits.push("Disponibilidade: " + availability);
  }

  const extraFields = Array.isArray(item && item.extraFields) ? item.extraFields : [];
  const extraBlock = extraFields.length
    ? "<div class=\"item-modal-extra\">" + extraFields.map((field, idx) => {
        const rawName = String((field && (field.name || field.label || field.key)) || "").trim();
        const rawValue = String(field && field.value || "").trim();
        const rawDesc = String(field && field.description || "").trim();
        const hasAny = !!(rawName || rawValue || rawDesc);
        if (!hasAny) return "";
        const name = esc(rawName || ("Campo " + String(idx + 1)));
        const value = esc(rawValue);
        const desc = esc(rawDesc);
        return "<div class=\"item-modal-extra-row\">" +
          "<div class=\"item-modal-extra-head\">" + name + "</div>" +
          (value ? "<div class=\"item-modal-extra-value\">" + value + "</div>" : "") +
          (desc ? "<div class=\"item-modal-extra-desc\">" + desc + "</div>" : "") +
        "</div>";
      }).filter(Boolean).join("") + "</div>"
    : "";

  const mediaList = getItemMediaList(tabId, item);
  if (itemModalState.mediaIndex < 0 || itemModalState.mediaIndex >= mediaList.length) itemModalState.mediaIndex = 0;
  const currentMedia = mediaList[itemModalState.mediaIndex] || null;
  const mediaUrl = currentMedia ? currentMedia.url : "";
  const mediaType = currentMedia ? currentMedia.type : "image";
  const mediaStyle = currentMedia && currentMedia.galleryView ? getGalleryViewStyle(currentMedia.galleryView, mediaType) : "";
  const mediaBlock = !mediaUrl
    ? ""
    : (mediaType === "video"
        ? "<video class=\"item-modal-media\" controls preload=\"metadata\" src=\"" + esc(mediaUrl) + "\" style=\"" + esc(mediaStyle) + "\"></video>"
        : "<img class=\"item-modal-media\" src=\"" + esc(mediaUrl) + "\" alt=\"" + esc(title) + "\" style=\"" + esc(mediaStyle) + "\" />");
  const thumbsBlock = mediaList.length > 1
    ? "<div class=\"item-modal-thumbs\">" + mediaList.map((m, i) => {
        const active = i === itemModalState.mediaIndex ? " active" : "";
        const inner = m.type === "video"
          ? "<span class=\"item-modal-thumb-label\">Video " + (i + 1) + "</span>"
          : "<img src=\"" + esc(m.url) + "\" alt=\"media " + (i + 1) + "\" />";
        return "<button type=\"button\" class=\"item-modal-thumb" + active + "\" data-modal-media-idx=\"" + i + "\">" + inner + "</button>";
      }).join("") + "</div>"
    : "";
  const amenities = toArrayList((item && (item.amenities || item.comodities || item.comodidades || item.features)) || "");
  const houseRules = toArrayList((item && (item.houseRules || item.regras || item.rules)) || "");
  const amenitiesBlock = (tabId === "casas" || tabId === "quartos") && amenities.length
    ? "<div class=\"lodging-amenities\"><p class=\"muted\"><strong>Comodidades</strong></p><div class=\"item-modal-meta\">" + amenities.map((a) => "<span class=\"lodging-amenity-chip\">" + esc(a) + "</span>").join("") + "</div></div>"
    : "";
  const rulesBlock = (tabId === "casas" || tabId === "quartos") && houseRules.length
    ? "<div class=\"lodging-amenities\"><p class=\"muted\"><strong>Regras</strong></p><div class=\"item-modal-meta\">" + houseRules.map((a) => "<span class=\"lodging-amenity-chip\">" + esc(a) + "</span>").join("") + "</div></div>"
    : "";
  const isServiceModal = tabId === "servicos";
  const isCatalogModal = tabId === "produtos" || tabId === "menu";
  const hasPromo = promoEnabled && promoOld && promoNow;
  const modalPriceBlock = hasPromo
    ? (
      "<div class=\"profile-item-promo profile-item-promo-grid\">" +
        "<span class=\"profile-item-promo-badge\">PROMO</span>" +
        "<span class=\"profile-item-price-old\">" + esc(String(promoOld || "")) + "</span>" +
        "<strong class=\"profile-item-price-now\">" + esc(String(promoNow || "")) + "</strong>" +
      "</div>"
    )
    : ((price && !(isServiceModal && quoteOnly))
      ? "<p class=\"profile-item-price profile-item-price-grid\">" + esc(String(price)) + "</p>"
      : (isServiceModal && quoteOnly ? "<span class=\"profile-item-flag profile-item-flag-budget\">Sob orçamento</span>" : ""));
  const serviceMeta = resolveServiceTypeMeta(item && (item.serviceType || item.type));
  const serviceExtra1 = String(item && (item.extra1 || item.detail1) || "").trim();
  const serviceExtra2 = String(item && (item.extra2 || item.detail2) || "").trim();
  const serviceNote = String(item && (item.note || item.notes) || "").trim();
  const serviceDetailHtml = isServiceModal
    ? (
      "<div class=\"item-modal-service-details\">" +
        (serviceMeta.id !== "general" ? "<p class=\"item-modal-service-line\">" + esc(serviceMeta.label) + "</p>" : "") +
        (serviceExtra1 ? "<p class=\"item-modal-service-line\">" + esc(serviceMeta.extra1 + ": " + serviceExtra1) + "</p>" : "") +
        (serviceExtra2 ? "<p class=\"item-modal-service-line\">" + esc(serviceMeta.extra2 + ": " + serviceExtra2) + "</p>" : "") +
        (duration ? "<p class=\"item-modal-service-line\"><strong>Duracao:</strong> " + esc(String(duration)) + "</p>" : "") +
      "</div>" +
      (serviceNote ? "<p class=\"item-modal-service-note\">" + esc(serviceNote) + "</p>" : "")
    )
    : "";
  const modalHead = (isServiceModal || isCatalogModal)
    ? (
      "<div class=\"item-modal-head\">" +
        "<div class=\"item-modal-head-left\">" +
          "<strong class=\"item-modal-head-title\">" + esc(title) + "</strong>" +
        "</div>" +
        "<div class=\"item-modal-head-right\">" + modalPriceBlock + "</div>" +
      "</div>"
    )
    : ("<strong>" + esc(title) + "</strong>");
  const body = root.querySelector("#itemModalBody");
  body.innerHTML = (
    "<article class=\"panel\">" +
      "<p class=\"muted\">" + esc(String(itemModalState.index + 1) + " / " + String(itemModalState.items.length)) + "</p>" +
      ((tabId === "casas" || tabId === "quartos") ? "<div class=\"lodging-price\">" + esc(price ? (/(\u20AC|EUR)/i.test(String(price)) ? String(price) : (String(price) + " EUR")) : "Sob consulta") + "<span>/noite</span></div>" : "") +
      modalHead +
      thumbsBlock +
      mediaBlock +
      (subtitle ? "<p class=\"muted\">" + esc(subtitle) + "</p>" : "") +
      serviceDetailHtml +
      (bits.length ? "<div class=\"item-modal-meta\">" + bits.map((bit) => "<span class=\"item-modal-chip\">" + esc(bit) + "</span>").join("") + "</div>" : "") +
      amenitiesBlock +
      rulesBlock +
      extraBlock +
      (href ? "<p><a class=\"campaign-link\" href=\"" + esc(href) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + esc(tabId === "campanhas" ? (pick(item, ["ctaLabel", "buttonLabel"]) || "Ver") : "Abrir link") + "</a></p>" : "") +
    "</article>"
  );
  const canMove = itemModalState.items.length > 1;
  const canSave = isCommonUser();
  const canShare = isCommonUser();
  const alreadySaved = canSave ? isCurrentModalSaved() : false;
  const prevBtn = root.querySelector("[data-modal-prev]");
  const nextBtn = root.querySelector("[data-modal-next]");
  const shareBtn = root.querySelector("[data-modal-share]");
  const saveBtn = root.querySelector("[data-modal-save]");
  if (prevBtn) prevBtn.style.display = canMove ? "inline-flex" : "none";
  if (nextBtn) nextBtn.style.display = canMove ? "inline-flex" : "none";
  if (shareBtn) {
    shareBtn.style.display = canShare ? "inline-flex" : "none";
  }
  if (saveBtn) {
    saveBtn.style.display = canSave ? "inline-flex" : "none";
    saveBtn.textContent = alreadySaved ? "Guardado" : "Guardar";
    saveBtn.classList.toggle("active", alreadySaved);
  }
  body.querySelectorAll("button[data-modal-media-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      itemModalState.mediaIndex = Number(btn.dataset.modalMediaIdx || 0);
      renderItemModal();
    });
  });
  root.classList.add("open");
}

function ensureReviewsModalRoot() {
  let root = document.getElementById("reviewsModalRoot");
  if (root) return root;
  root = document.createElement("div");
  root.id = "reviewsModalRoot";
  root.className = "reviews-modal-root";
  root.innerHTML = (
    "<div class=\"reviews-modal-backdrop\" data-reviews-close=\"1\"></div>" +
    "<div class=\"reviews-modal-panel\">" +
      "<div class=\"reviews-modal-header\">" +
        "<strong>Avaliações</strong>" +
        "<button type=\"button\" data-reviews-close=\"1\">&times;</button>" +
      "</div>" +
      "<div id=\"reviewsModalBody\" class=\"reviews-modal-body\"></div>" +
    "</div>"
  );
  document.body.appendChild(root);
  root.querySelectorAll("[data-reviews-close]").forEach((btn) =>
    btn.addEventListener("click", closeReviewsModal)
  );
  bindReviewsModalGestures(root);
  return root;
}

function bindReviewsModalGestures(root) {
  if (!root || root.dataset.reviewsSwipeBound === "1") return;
  root.dataset.reviewsSwipeBound = "1";
  const panel = root.querySelector(".reviews-modal-panel");
  if (!panel) return;
  let tracking = false;
  let blocked = false;
  let startX = 0;
  let startY = 0;
  let startScrollTop = 0;
  const reset = () => {
    tracking = false;
    blocked = false;
    startX = 0;
    startY = 0;
    startScrollTop = 0;
  };
  panel.addEventListener("touchstart", (ev) => {
    if (!reviewsState.open) return;
    const touch = ev.touches && ev.touches[0];
    if (!touch) return;
    tracking = true;
    blocked = isSwipeGestureBlockedTarget(ev.target);
    startX = Number(touch.clientX || 0);
    startY = Number(touch.clientY || 0);
    const body = root.querySelector(".reviews-modal-body");
    startScrollTop = body ? Number(body.scrollTop || 0) : 0;
  }, { passive: true });
  panel.addEventListener("touchcancel", reset, { passive: true });
  panel.addEventListener("touchend", (ev) => {
    if (!tracking) return;
    const touch = ev.changedTouches && ev.changedTouches[0];
    if (!touch) {
      reset();
      return;
    }
    const dx = Number(touch.clientX || 0) - startX;
    const dy = Number(touch.clientY || 0) - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (!blocked && dy >= 100 && absDy > absDx * 1.2 && startScrollTop <= 2) {
      closeReviewsModal();
      reset();
      return;
    }
    reset();
  }, { passive: true });
}

function closeReviewsModal() {
  reviewsState.open = false;
  const root = document.getElementById("reviewsModalRoot");
  if (root) root.classList.remove("open");
  setModalBodyLock(false);
}

function applyReviewsSummary(summaryRaw) {
  const summary = summaryRaw && typeof summaryRaw === "object" ? summaryRaw : {};
  const dist = summary.distribution && typeof summary.distribution === "object" ? summary.distribution : {};
  reviewsState.summary = {
    average: Number(summary.average || 0),
    total: Number(summary.total || 0),
    distribution: {
      "1": Number(dist["1"] || 0),
      "2": Number(dist["2"] || 0),
      "3": Number(dist["3"] || 0),
      "4": Number(dist["4"] || 0),
      "5": Number(dist["5"] || 0),
    },
  };
}

function syncProfileRatingFromReviews(profileId, average) {
  const targetId = Number(profileId || 0);
  if (!targetId) return;
  const avg = Number(average || 0);
  const next = state.profiles.map((p) => {
    if (Number(p.id || 0) !== targetId && Number(p.remoteId || 0) !== targetId) return p;
    const ratingValue = Number.isFinite(avg) && avg > 0 ? avg.toFixed(1) : String(p.rating || "");
    return Object.assign({}, p, { rating: ratingValue });
  });
  setState({ profiles: next });
}

async function loadReviews() {
  if (!reviewsState.profileId && !reviewsState.slug) return;
  reviewsState.loading = true;
  reviewsState.error = "";
  renderReviewsModal();
  try {
    const resp = await api.profileReviewsList({
      profileId: reviewsState.profileId || undefined,
      slug: reviewsState.slug || undefined,
    });
    applyReviewsSummary(resp && resp.summary);
    reviewsState.list = Array.isArray(resp && resp.reviews) ? resp.reviews : [];
    const viewer = resp && resp.viewer && typeof resp.viewer === "object" ? resp.viewer : {};
    reviewsState.canRate = !!viewer.can_rate;
    if (viewer.review && typeof viewer.review === "object") {
      reviewsState.rating = Number(viewer.review.rating || 0);
      reviewsState.comment = String(viewer.review.comment || "");
    } else {
      reviewsState.rating = 0;
      reviewsState.comment = "";
    }
    syncProfileRatingFromReviews(reviewsState.profileId, reviewsState.summary.average);
    renderAll();
  } catch (err) {
    reviewsState.error = String((err && err.message) || err || "Erro ao carregar avaliacoes.");
  } finally {
    reviewsState.loading = false;
    renderReviewsModal();
  }
}

async function submitReview() {
  if (!reviewsState.canRate || reviewsState.saving) return;
  const rating = Math.max(1, Math.min(5, Number(reviewsState.rating || 0)));
  if (!rating) {
    reviewsState.error = "Seleciona uma classificacao.";
    renderReviewsModal();
    return;
  }
  reviewsState.saving = true;
  reviewsState.error = "";
  renderReviewsModal();
  try {
    await api.profileReviewsUpsert({
      profileId: reviewsState.profileId || undefined,
      slug: reviewsState.slug || undefined,
      rating,
      comment: reviewsState.comment || "",
    });
    await loadReviews();
  } catch (err) {
    reviewsState.error = String((err && err.message) || err || "Não foi possível guardar avaliação.");
    renderReviewsModal();
  } finally {
    reviewsState.saving = false;
    renderReviewsModal();
  }
}

function renderReviewsModal() {
  const root = ensureReviewsModalRoot();
  if (!reviewsState.open) {
    root.classList.remove("open");
    return;
  }
  const body = root.querySelector("#reviewsModalBody");
  const summary = reviewsState.summary;
  const total = Math.max(0, Number(summary.total || 0));
  const average = Number(summary.average || 0);
  const listWithComment = (Array.isArray(reviewsState.list) ? reviewsState.list : []).filter((entry) => String(entry && entry.comment || "").trim());
  const sorted = listWithComment.slice().sort((a, b) => {
    if (reviewsState.sortMode === "top") {
      const byRating = Number((b && b.rating) || 0) - Number((a && a.rating) || 0);
      if (byRating !== 0) return byRating;
    }
    const ad = Date.parse(String((a && (a.updated_at || a.created_at)) || ""));
    const bd = Date.parse(String((b && (b.updated_at || b.created_at)) || ""));
    return (Number.isFinite(bd) ? bd : 0) - (Number.isFinite(ad) ? ad : 0);
  });
  body.innerHTML =
    "<div class=\"reviews-summary-box\">" +
      "<p class=\"reviews-summary-avg\">" + esc(average.toFixed(1)) + "</p>" +
      "<p class=\"reviews-summary-count\">" + esc(String(total)) + " avaliacoes</p>" +
      "<div class=\"reviews-dist-wrap\">" +
        [5, 4, 3, 2, 1].map((stars) => {
          const count = Math.max(0, Number(summary.distribution[String(stars)] || 0));
          const pct = total > 0 ? Math.max(0, Math.min(100, (count / total) * 100)) : 0;
          return (
            "<div class=\"reviews-dist-row\">" +
              "<span class=\"reviews-dist-label\">" + stars + "&#9733;</span>" +
              "<span class=\"reviews-dist-track\"><span class=\"reviews-dist-fill\" style=\"width:" + pct + "%\"></span></span>" +
              "<span class=\"reviews-dist-count\">" + count + "</span>" +
            "</div>"
          );
        }).join("") +
      "</div>" +
    "</div>" +
    (reviewsState.error ? "<p class=\"reviews-error\">" + esc(reviewsState.error) + "</p>" : "") +
    (reviewsState.canRate
      ? ("<div class=\"reviews-composer\">" +
          "<p class=\"reviews-composer-title\">Deixar avaliacao</p>" +
          "<div class=\"reviews-stars-row\">" +
            [1, 2, 3, 4, 5].map((value) =>
              "<button type=\"button\" class=\"reviews-star-btn\" data-review-star=\"" + value + "\">" + (reviewsState.rating >= value ? "&#9733;" : "&#9734;") + "</button>"
            ).join("") +
          "</div>" +
          "<textarea id=\"reviewsCommentInput\" class=\"input reviews-comment-input\" placeholder=\"Comentario (opcional)\" maxlength=\"1200\">" + esc(reviewsState.comment || "") + "</textarea>" +
          "<p class=\"muted reviews-comment-count\">" + esc(String((reviewsState.comment || "").length)) + "/1200</p>" +
          "<button type=\"button\" class=\"reviews-send-btn\" data-review-submit=\"1\">" + (reviewsState.saving ? "A guardar..." : "Enviar") + "</button>" +
        "</div>")
      : "<p class=\"muted\">So contas pessoais podem comentar este perfil.</p>") +
    (reviewsState.loading
      ? "<div class=\"reviews-loading\">A carregar...</div>"
      : ("<div class=\"reviews-sort-row\">" +
          "<button type=\"button\" class=\"" + (reviewsState.sortMode === "recent" ? "active" : "") + "\" data-reviews-sort=\"recent\">Mais recentes</button>" +
          "<button type=\"button\" class=\"" + (reviewsState.sortMode === "top" ? "active" : "") + "\" data-reviews-sort=\"top\">Melhor avaliados</button>" +
        "</div>" +
        "<div class=\"reviews-list\">" +
          (sorted.length
            ? sorted.map((item, idx) => {
                const userName = String((item && item.user && item.user.name) || "Utilizador").trim();
                const rating = Math.max(1, Math.min(5, Number((item && item.rating) || 0)));
                const comment = String((item && item.comment) || "").trim();
                const when = String((item && (item.updated_at || item.created_at)) || "").trim();
                const whenTs = Date.parse(when);
                const whenText = Number.isFinite(whenTs) ? new Date(whenTs).toLocaleDateString() : "";
                return (
                  "<article class=\"reviews-item\" data-review-item=\"" + idx + "\">" +
                    "<div class=\"reviews-item-head\">" +
                      "<div class=\"reviews-item-user-wrap\">" +
                        "<strong class=\"reviews-item-user\">" + esc(userName) + "</strong>" +
                        "<span class=\"reviews-item-stars\">" + "&#9733;".repeat(rating) + "&#9734;".repeat(5 - rating) + "</span>" +
                      "</div>" +
                      (whenText ? "<span class=\"reviews-item-date\">" + esc(whenText) + "</span>" : "") +
                    "</div>" +
                    (comment ? "<p class=\"reviews-item-comment\">" + esc(comment) + "</p>" : "") +
                  "</article>"
                );
              }).join("")
            : "<p class=\"muted\">Sem comentarios ainda.</p>") +
        "</div>"))
    ;

  body.querySelectorAll("button[data-review-star]").forEach((btn) => {
    btn.addEventListener("click", () => {
      reviewsState.rating = Number(btn.dataset.reviewStar || 0);
      renderReviewsModal();
    });
  });
  const commentInput = body.querySelector("#reviewsCommentInput");
  if (commentInput) {
    commentInput.addEventListener("input", () => {
      reviewsState.comment = commentInput.value || "";
      const countNode = body.querySelector(".reviews-comment-count");
      if (countNode) countNode.textContent = String(reviewsState.comment.length) + "/1200";
    });
  }
  const submitBtn = body.querySelector("button[data-review-submit]");
  if (submitBtn) submitBtn.addEventListener("click", submitReview);
  body.querySelectorAll("button[data-reviews-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      reviewsState.sortMode = btn.dataset.reviewsSort || "recent";
      renderReviewsModal();
    });
  });

  root.classList.add("open");
}

async function openReviewsModal() {
  const profile = selectedProfile();
  if (!profile) return;
  reviewsState.profileId = Number(profile.remoteId || profile.id || 0);
  reviewsState.slug = String(profile.slug || "");
  reviewsState.profileName = String(profile.name || "Perfil");
  reviewsState.open = true;
  reviewsState.error = "";
  reviewsState.sortMode = "recent";
  setModalBodyLock(true);
  renderReviewsModal();
  await loadReviews();
}

function ensureExploreAdvancedRoot() {
  let root = document.getElementById("exploreAdvancedRoot");
  if (root) return root;
  root = document.createElement("div");
  root.id = "exploreAdvancedRoot";
  root.className = "explore-advanced-root";
  root.innerHTML = (
    "<div class=\"explore-advanced-backdrop\" data-explore-adv-close=\"1\"></div>" +
    "<div class=\"explore-advanced-sheet\">" +
      "<div class=\"explore-advanced-handle\"></div>" +
      "<div class=\"explore-advanced-header\">" +
        "<strong>Filtros avancados</strong>" +
        "<div class=\"explore-advanced-header-actions\">" +
          "<button type=\"button\" data-explore-adv-clear=\"1\">Limpar</button>" +
          "<button type=\"button\" data-explore-adv-close=\"1\" aria-label=\"Fechar\">&times;</button>" +
        "</div>" +
      "</div>" +
      "<div id=\"exploreAdvancedBody\" class=\"explore-advanced-body\"></div>" +
      "<div class=\"explore-advanced-footer\">" +
        "<button type=\"button\" class=\"explore-advanced-apply\" data-explore-adv-close=\"1\">Aplicar</button>" +
      "</div>" +
    "</div>"
  );
  document.body.appendChild(root);
  root.querySelectorAll("[data-explore-adv-close]").forEach((btn) =>
    btn.addEventListener("click", () => {
      setState({ exploreAdvancedOpen: false });
      renderExploreAdvancedModal();
    })
  );
  const clearBtn = root.querySelector("[data-explore-adv-clear]");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      setState({
        exploreDiscoveryFilter: "all",
        exploreCategoryFilters: [],
        exploreSortBy: "relevance",
        exploreCategorySearch: "",
      });
      renderAll();
      renderExploreAdvancedModal();
    });
  }
  return root;
}

function renderExploreAdvancedModal() {
  const root = ensureExploreAdvancedRoot();
  const open = !!state.exploreAdvancedOpen;
  if (!open) {
    root.classList.remove("open");
    return;
  }
  const categorySearch = normalizeText(state.exploreCategorySearch || "");
  const visibleCategoryOptions = CATEGORY_TAXONOMY.filter((item) => {
    if (!categorySearch) return true;
    return normalizeText(item.label).includes(categorySearch);
  });
  const body = root.querySelector("#exploreAdvancedBody");
  body.innerHTML =
    "<p class=\"explore-advanced-label\">Descoberta</p>" +
    "<div class=\"explore-advanced-chips\">" +
      EXPLORE_DISCOVERY_OPTIONS.map((item) => {
        const active = String(state.exploreDiscoveryFilter || "all") === item.key;
        return "<button type=\"button\" class=\"" + (active ? "active" : "") + "\" data-explore-discovery=\"" + item.key + "\">" + esc(item.label) + "</button>";
      }).join("") +
    "</div>" +
    "<p class=\"explore-advanced-label\">Ordenar por</p>" +
    "<div class=\"explore-advanced-chips\">" +
      EXPLORE_SORT_OPTIONS.map((item) => {
        const active = String(state.exploreSortBy || "relevance") === item.key;
        return "<button type=\"button\" class=\"" + (active ? "active" : "") + "\" data-explore-sort-modal=\"" + item.key + "\">" + esc(item.label) + "</button>";
      }).join("") +
    "</div>" +
    "<p class=\"explore-advanced-label\">Categoria</p>" +
    "<div class=\"explore-category-search-box\">" +
      "<span>&#128269;</span>" +
      "<input id=\"exploreCategorySearchInput\" class=\"input\" placeholder=\"Pesquisar categoria...\" value=\"" + esc(state.exploreCategorySearch || "") + "\" />" +
    "</div>" +
    "<div class=\"explore-category-list\">" +
      (visibleCategoryOptions.length
        ? visibleCategoryOptions.map((item) => {
            const selected = (Array.isArray(state.exploreCategoryFilters) ? state.exploreCategoryFilters : []).includes(item.key);
            return "<button type=\"button\" class=\"explore-category-row" + (selected ? " active" : "") + "\" data-explore-category=\"" + item.key + "\"><span>" + esc(item.label) + "</span><span>" + (selected ? "&#9745;" : "&#9744;") + "</span></button>";
          }).join("")
        : "<div class=\"panel\"><p class=\"muted\">Sem categorias para este termo.</p></div>") +
    "</div>";

  body.querySelectorAll("button[data-explore-discovery]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ exploreDiscoveryFilter: button.dataset.exploreDiscovery || "all" });
      renderAll();
      renderExploreAdvancedModal();
    });
  });
  body.querySelectorAll("button[data-explore-sort-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ exploreSortBy: button.dataset.exploreSortModal || "relevance" });
      renderAll();
      renderExploreAdvancedModal();
    });
  });
  const categoryInput = body.querySelector("#exploreCategorySearchInput");
  if (categoryInput) {
    categoryInput.addEventListener("input", () => {
      setState({ exploreCategorySearch: categoryInput.value || "" });
      renderExploreAdvancedModal();
    });
  }
  body.querySelectorAll("button[data-explore-category]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = String(button.dataset.exploreCategory || "");
      const prev = Array.isArray(state.exploreCategoryFilters) ? state.exploreCategoryFilters : [];
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      setState({ exploreCategoryFilters: next });
      renderAll();
      renderExploreAdvancedModal();
    });
  });
  root.classList.add("open");
}

function normalizeUrlList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || "").trim()).filter(Boolean);
}

function uniqueUrlList(list) {
  const next = [];
  const seen = new Set();
  (Array.isArray(list) ? list : []).forEach((entry) => {
    const key = String(entry || "").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    next.push(key);
  });
  return next;
}

function getProfileGalleryLists(profileData) {
  const gallery = profileData && typeof profileData.gallery === "object" ? profileData.gallery : {};
  const photos = normalizeUrlList(gallery.photos || profileData.photos);
  const videos = uniqueUrlList([
    ...normalizeUrlList(gallery.videos || profileData.videos),
    ...normalizeUrlList(gallery.reels || profileData.reels),
  ]);
  const reels = [];
  return { photos, videos, reels };
}

function getProfileGalleryViews(profileData) {
  const data = profileData && typeof profileData === "object" ? profileData : {};
  const lists = getProfileGalleryLists(data);
  const galleryViews = data.galleryViews && typeof data.galleryViews === "object" ? data.galleryViews : {};
  return {
    photos: ensureGalleryViewLength(lists.photos, galleryViews.photos),
    videos: ensureGalleryViewLength(lists.videos, galleryViews.videos),
    reels: ensureGalleryViewLength(lists.reels, galleryViews.reels),
  };
}

function bindProfileContentInteractions(tabId, items) {
  el.content.querySelectorAll("button[data-item-thumb-url]").forEach((thumbBtn) => {
    thumbBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const url = String(thumbBtn.dataset.itemThumbUrl || "").trim();
      if (!url) return;
      const card = thumbBtn.closest(".profile-item");
      if (!card) return;
      const mainImage = card.querySelector(".item-main-image");
      if (!mainImage) return;
      mainImage.setAttribute("src", url);
      card.querySelectorAll(".item-inline-thumb").forEach((n) => n.classList.remove("active"));
      thumbBtn.classList.add("active");
    });
  });
  el.content.querySelectorAll(".profile-item[data-profile-item]").forEach((card) => {
    card.addEventListener("click", (ev) => {
      if (ev.target.closest("a,button,input,select,textarea,video")) return;
      const idx = Number(card.dataset.profileItem || -1);
      if (idx < 0 || idx >= items.length) return;
      openItemModal(tabId, items, idx);
    });
  });
}

function buildCatalogGridCard(tabId, item, idx) {
  const title = pick(item, ["name", "title", "label", "description"]) || "Item";
  const desc = pick(item, ["shortDescription", "description", "note", "notes"]) || "";
  const media = getItemMediaList(tabId, item).find((entry) => entry && entry.type === "image");
  const image = media ? media.url : "";
  const promoEnabled = isOnFlag(item && item.promoEnabled);
  const promoOld = String(pick(item, ["promoOldPrice"]) || "").trim();
  const promoNow = String(pick(item, ["promoNowPrice", "price", "priceNight"]) || "").trim();
  const showPromo = promoEnabled && promoOld && promoNow;
  const price = String(pick(item, ["price", "priceNight", "promoNowPrice"]) || "").trim();
  const priceBlock = showPromo
    ? (
      "<div class=\"profile-item-promo profile-item-promo-grid\">" +
        "<span class=\"profile-item-promo-badge\">PROMO</span>" +
        "<span class=\"profile-item-price-old\">" + esc(promoOld) + "</span>" +
        "<strong class=\"profile-item-price-now\">" + esc(promoNow) + "</strong>" +
      "</div>"
    )
    : (price ? "<p class=\"profile-item-price profile-item-price-grid\">" + esc(price) + "</p>" : "");
  return (
    "<article class=\"panel profile-item profile-catalog-grid-item\" data-profile-item=\"" + idx + "\">" +
      (image ? "<img class=\"profile-catalog-grid-image\" src=\"" + esc(image) + "\" alt=\"" + esc(title) + "\" />" : "<div class=\"profile-catalog-grid-image placeholder\"></div>") +
      "<div class=\"profile-catalog-grid-body\">" +
        "<h4 class=\"profile-catalog-grid-title\" title=\"" + esc(title) + "\">" + esc(title) + "</h4>" +
        (desc ? "<p class=\"profile-catalog-grid-desc\">" + esc(desc) + "</p>" : "") +
        "<div class=\"profile-catalog-grid-price-slot\">" + priceBlock + "</div>" +
      "</div>" +
    "</article>"
  );
}

function buildCatalogListCard(tabId, item, idx) {
  const title = pick(item, ["name", "title", "label", "description"]) || "Item";
  const desc = pick(item, ["shortDescription", "description", "note", "notes"]) || "";
  const media = getItemMediaList(tabId, item).find((entry) => entry && entry.type === "image");
  const image = media ? media.url : "";
  const promoEnabled = isOnFlag(item && item.promoEnabled);
  const promoOld = String(pick(item, ["promoOldPrice"]) || "").trim();
  const promoNow = String(pick(item, ["promoNowPrice", "price", "priceNight"]) || "").trim();
  const showPromo = promoEnabled && promoOld && promoNow;
  const price = String(pick(item, ["price", "priceNight", "promoNowPrice"]) || "").trim();
  const priceBlock = showPromo
    ? (
      "<div class=\"profile-item-promo profile-item-promo-grid\">" +
        "<span class=\"profile-item-promo-badge\">PROMO</span>" +
        "<span class=\"profile-item-price-old\">" + esc(promoOld) + "</span>" +
        "<strong class=\"profile-item-price-now\">" + esc(promoNow) + "</strong>" +
      "</div>"
    )
    : (price ? "<p class=\"profile-item-price profile-item-price-grid\">" + esc(price) + "</p>" : "");
  return (
    "<article class=\"panel profile-item profile-catalog-list-item\" data-profile-item=\"" + idx + "\">" +
      (image ? "<img class=\"profile-catalog-list-image\" src=\"" + esc(image) + "\" alt=\"" + esc(title) + "\" />" : "<div class=\"profile-catalog-list-image placeholder\"></div>") +
      "<div class=\"profile-catalog-list-body\">" +
        "<div class=\"profile-catalog-list-top\">" +
          "<h4 class=\"profile-catalog-list-title\" title=\"" + esc(title) + "\">" + esc(title) + "</h4>" +
          "<div class=\"profile-catalog-list-price-slot\">" + priceBlock + "</div>" +
        "</div>" +
        (desc ? "<p class=\"profile-catalog-list-desc\">" + esc(desc) + "</p>" : "") +
      "</div>" +
    "</article>"
  );
}

function renderProfileCatalogTab(tabId, activeSection, items) {
  const isProducts = tabId === "produtos";
  const viewMode = isProducts ? String(state.profileProductsView || "list") : String(state.profileMenuView || "list");
  const useGrid = viewMode === "grid";
  const head = (
    "<div class=\"profile-catalog-head\">" +
      "<strong class=\"profile-catalog-title\">" + esc(activeSection && (activeSection.label || activeSection.id) || (isProducts ? "Produtos" : "Menu")) + "</strong>" +
      "<div class=\"profile-catalog-toggle\">" +
        "<button type=\"button\" class=\"" + (useGrid ? "" : "active") + "\" data-catalog-view=\"list\" title=\"Lista\">&#9776;</button>" +
        "<button type=\"button\" class=\"" + (useGrid ? "active" : "") + "\" data-catalog-view=\"grid\" title=\"Grelha\">&#9638;</button>" +
      "</div>" +
    "</div>"
  );
  const body = useGrid
    ? "<div class=\"profile-catalog-grid\">" + items.map((item, idx) => buildCatalogGridCard(tabId, item, idx)).join("") + "</div>"
    : "<div class=\"profile-catalog-list\">" + items.map((item, idx) => buildCatalogListCard(tabId, item, idx)).join("") + "</div>";
  el.content.innerHTML = head + body;
  el.content.querySelectorAll("button[data-catalog-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.catalogView === "grid" ? "grid" : "list";
      if (isProducts) setState({ profileProductsView: next });
      else setState({ profileMenuView: next });
      renderProfile();
    });
  });
  bindProfileContentInteractions(tabId, items);
}

function renderProfileLodgingTab(tabId, sections, subId) {
  const activeSection = sections.find((section) => (section.id || section.label) === subId) || sections[0] || null;
  const items = activeSection && Array.isArray(activeSection.items) ? activeSection.items.filter((item) => isEnabledFlag(item && item.enabled)) : [];
  if (!activeSection || !items.length) {
    el.content.innerHTML = "<p class=\"muted\">Sem itens nesta aba.</p>";
    return;
  }
  const itemState = Object.assign({ casas: 0, quartos: 0 }, state.profileLodgingItemIndex || {});
  const mediaState = Object.assign({ casas: 0, quartos: 0 }, state.profileLodgingMediaIndex || {});
  const amenitiesExpandedState = Object.assign({ casas: false, quartos: false }, state.profileLodgingAmenitiesExpanded || {});
  const safeItemIndex = clampNumber(itemState[tabId], 0, Math.max(0, items.length - 1), 0);
  const currentItem = items[safeItemIndex] || items[0];
  const mediaList = getItemMediaList(tabId, currentItem).filter((entry) => entry && entry.type === "image");
  const safeMediaIndex = clampNumber(mediaState[tabId], 0, Math.max(0, mediaList.length - 1), 0);
  const currentMedia = mediaList[safeMediaIndex] || null;
  const title = pick(currentItem, ["name", "title", "label"]) || ((tabId === "casas" ? "Casa " : "Quarto ") + String(safeItemIndex + 1));
  const price = String(pick(currentItem, ["priceNight", "price", "promoNowPrice"]) || "").trim();
  const promoEnabled = isOnFlag(currentItem && currentItem.promoEnabled);
  const promoOld = String(pick(currentItem, ["promoOldPrice"]) || "").trim();
  const promoNow = String(pick(currentItem, ["promoNowPrice"]) || "").trim();
  const hasPromo = promoEnabled && promoOld && promoNow;
  const summary = [
    { label: "Capacidade", value: String(pick(currentItem, ["capacity", "guests"]) || "").trim() },
    { label: "Camas", value: String(pick(currentItem, ["beds"]) || "").trim() },
    { label: "WC", value: String(pick(currentItem, ["bathrooms", "wc"]) || "").trim() },
  ].filter((row) => row.value);
  const stay = [
    { label: "Disponibilidade", value: String(pick(currentItem, ["availability"]) || "").trim() },
    { label: "Check-in", value: String(pick(currentItem, ["checkIn"]) || "").trim() },
    { label: "Check-out", value: String(pick(currentItem, ["checkOut"]) || "").trim() },
  ].filter((row) => row.value);
  const amenities = toArrayList(currentItem && currentItem.amenities);
  const rules = toArrayList(currentItem && currentItem.houseRules);
  const showAllAmenities = !!amenitiesExpandedState[tabId];
  const visibleAmenities = showAllAmenities ? amenities : amenities.slice(0, 8);
  const thumbs = mediaList.length > 1
    ? "<div class=\"profile-lodging-thumbs\">" + mediaList.map((entry, idx) => (
      "<button type=\"button\" class=\"profile-lodging-thumb" + (idx === safeMediaIndex ? " active" : "") + "\" data-lodging-thumb=\"" + idx + "\"><img src=\"" + esc(entry.url) + "\" alt=\"thumb " + (idx + 1) + "\" /></button>"
    )).join("") + "</div>"
    : "";
  const itemSelector = "<div class=\"chips profile-lodging-item-tabs\">" + items.map((entry, idx) => (
    "<button type=\"button\" class=\"" + (idx === safeItemIndex ? "active" : "") + "\" data-lodging-item=\"" + idx + "\">" + esc(pick(entry, ["name", "title", "label"]) || ((tabId === "casas" ? "Casa " : "Quarto ") + String(idx + 1))) + "</button>"
  )).join("") + "</div>";
  const summaryBlock = summary.length
    ? "<div class=\"profile-lodging-facts\">" + summary.map((row) => "<div class=\"profile-lodging-fact\"><span>" + esc(row.label) + "</span><strong>" + esc(row.value) + "</strong></div>").join("") + "</div>"
    : "";
  const stayBlock = stay.length
    ? "<div class=\"profile-lodging-facts\">" + stay.map((row) => "<div class=\"profile-lodging-fact\"><span>" + esc(row.label) + "</span><strong>" + esc(row.value) + "</strong></div>").join("") + "</div>"
    : "";
  const rulesBlock = rules.length ? "<p class=\"profile-lodging-rules\"><strong>Regras:</strong> " + esc(rules.join(" | ")) + "</p>" : "";
  const amenitiesBlock = visibleAmenities.length
    ? (
      "<div class=\"profile-lodging-amenities\">" +
      visibleAmenities.map((entry) => "<span class=\"lodging-amenity-chip\">" + esc(entry) + "</span>").join("") +
      "</div>" +
      (amenities.length > 8 ? "<button type=\"button\" class=\"profile-lodging-more\" data-lodging-amenities-toggle=\"1\">" + (showAllAmenities ? "Ver menos" : ("Ver mais (" + amenities.length + ")")) + "</button>" : "")
    )
    : "";
  el.content.innerHTML = (
    "<div class=\"profile-lodging-wrap\">" +
      itemSelector +
      "<article class=\"panel profile-lodging-card\" data-profile-item=\"" + safeItemIndex + "\">" +
        "<div class=\"profile-lodging-head\">" +
          "<h4>" + esc(title) + "</h4>" +
          (hasPromo
            ? ("<div class=\"profile-item-promo profile-item-promo-grid\"><span class=\"profile-item-promo-badge\">PROMO</span><span class=\"profile-item-price-old\">" + esc(promoOld) + "</span><strong class=\"profile-item-price-now\">" + esc(promoNow) + "</strong></div>")
            : (price ? "<div class=\"lodging-price\">" + esc(price) + "<span>/noite</span></div>" : "")) +
        "</div>" +
        (currentMedia ? "<button type=\"button\" class=\"profile-lodging-main\" data-lodging-open-modal=\"1\"><img class=\"profile-lodging-main-image\" src=\"" + esc(currentMedia.url) + "\" alt=\"" + esc(title) + "\" /></button>" : "<div class=\"profile-lodging-main placeholder\">Sem imagem</div>") +
        thumbs +
        (String(currentItem && currentItem.description || "").trim() ? "<p class=\"profile-lodging-description\">" + esc(String(currentItem.description || "")) + "</p>" : "") +
        summaryBlock +
        stayBlock +
        rulesBlock +
        amenitiesBlock +
      "</article>" +
    "</div>"
  );
  el.content.querySelectorAll("button[data-lodging-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextIndex = clampNumber(button.dataset.lodgingItem, 0, Math.max(0, items.length - 1), 0);
      setState({
        profileLodgingItemIndex: Object.assign({}, itemState, { [tabId]: nextIndex }),
        profileLodgingMediaIndex: Object.assign({}, mediaState, { [tabId]: 0 }),
      });
      renderProfile();
    });
  });
  el.content.querySelectorAll("button[data-lodging-thumb]").forEach((button) => {
    button.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const nextIndex = clampNumber(button.dataset.lodgingThumb, 0, Math.max(0, mediaList.length - 1), 0);
      setState({ profileLodgingMediaIndex: Object.assign({}, mediaState, { [tabId]: nextIndex }) });
      renderProfile();
    });
  });
  const toggleBtn = el.content.querySelector("button[data-lodging-amenities-toggle]");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      setState({
        profileLodgingAmenitiesExpanded: Object.assign({}, amenitiesExpandedState, { [tabId]: !showAllAmenities }),
      });
      renderProfile();
    });
  }
  const openBtn = el.content.querySelector("button[data-lodging-open-modal]");
  if (openBtn) {
    openBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openItemModal(tabId, items, safeItemIndex);
    });
  }
}

function renderProfileGalleryTab(profileData) {
  const gallery = getProfileGalleryLists(profileData || {});
  const galleryViews = getProfileGalleryViews(profileData || {});
  const groups = [
    { id: "photos", label: "Fotos", mediaType: "image", list: gallery.photos },
    { id: "videos", label: "Videos", mediaType: "video", list: gallery.videos },
  ];
  const nonEmpty = groups.filter((group) => group.list.length > 0);
  const available = nonEmpty.length ? nonEmpty : groups;
  const active = available.find((group) => group.id === state.profileSubTab) || available[0];
  setState({ profileSubTab: active.id });
  el.subtabs.innerHTML = available
    .map((group) => "<button class=\"" + (group.id === active.id ? "active" : "") + "\" data-profile-subtab=\"" + group.id + "\">" + esc(group.label) + "</button>")
    .join("");
  el.subtabs.querySelectorAll("button[data-profile-subtab]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ profileSubTab: button.dataset.profileSubtab || "photos" });
      renderProfile();
    });
  });
  const items = active.list.map((url, idx) => ({
    name: active.label.slice(0, -1) + " " + (idx + 1),
    mediaUrl: url,
    mediaType: active.mediaType,
    galleryView: (galleryViews[active.id] && galleryViews[active.id][idx]) || galleryDefaultView(),
  }));
  el.content.innerHTML = items.length
    ? "<div class=\"profile-gallery-grid\">" + items.map((item, idx) => renderItem("galeria", item, idx)).join("") + "</div>"
    : "<p class=\"muted\">Sem itens nesta aba.</p>";
  bindProfileContentInteractions("galeria", items);
}

function renderProfileScheduleTab(profileData) {
  const schedule = profileData && typeof profileData.schedule === "object" ? profileData.schedule : {};
  const weekdays = [
    ["seg", "Segunda"],
    ["ter", "Terca"],
    ["qua", "Quarta"],
    ["qui", "Quinta"],
    ["sex", "Sexta"],
    ["sab", "Sabado"],
    ["dom", "Domingo"],
  ];
  const items = weekdays
    .map(([key, label]) => ({ name: label, time: String(schedule[key] || "").trim() }))
    .filter((row) => row.time);
  el.subtabs.innerHTML = "";
  el.content.innerHTML = items.length
    ? "<div class=\"profile-schedule-list\">" + items.map((item, idx) => renderItem("horario", item, idx)).join("") + "</div>"
    : "<p class=\"muted\">Sem horario definido.</p>";
}

function renderProfileAgendaTab(profileData) {
  const agenda = profileData && typeof profileData.agenda === "object" ? profileData.agenda : {};
  const slots = Array.isArray(agenda.slots) ? agenda.slots : [];
  const reserveUrl = toOpenableUrl(agenda.reserveLink);
  const items = slots.map((slot, idx) => ({
    name: String((slot && (slot.weekday || slot.displayDay || slot.day)) || ("Dia " + (idx + 1))),
    day: String((slot && (slot.day || slot.date || slot.rawDay)) || ""),
    times: Array.isArray(slot && slot.times) ? slot.times : [],
  }));
  el.subtabs.innerHTML = "";
  const description = String(agenda.description || "").trim();
  const topBlock = description
    ? "<article class=\"panel profile-agenda-head\"><strong>Agenda</strong><p class=\"muted\">" + esc(description) + "</p></article>"
    : "";
  const reserveBlock = reserveUrl
    ? "<article class=\"panel profile-agenda-foot\"><a class=\"campaign-link\" href=\"" + esc(reserveUrl) + "\" target=\"_blank\" rel=\"noopener noreferrer\">Reservar</a></article>"
    : "";
  const listBlock = items.length
    ? "<div class=\"profile-agenda-list\">" + items.map((item, idx) => renderItem("agenda", item, idx)).join("") + "</div>"
    : "<p class=\"muted\">Sem agenda definida.</p>";
  el.content.innerHTML = topBlock + listBlock + reserveBlock;
}

function buildLocationOpenUrl(location) {
  const explicit = toOpenableUrl(location && location.link);
  if (explicit) return explicit;
  const coords = String(location && location.coords || "").trim();
  if (coords) return "https://maps.google.com/?q=" + encodeURIComponent(coords);
  const address = String(location && location.address || "").trim();
  if (address) return "https://maps.google.com/?q=" + encodeURIComponent(address);
  return "";
}

function renderProfilePartnersTab(profileData) {
  const partners = Array.isArray(profileData && profileData.partners) ? profileData.partners : [];
  el.subtabs.innerHTML = "";
  el.content.innerHTML = partners.length
    ? "<div class=\"profile-partners-grid\">" + partners.map((item, idx) => renderItem("parcerias", item, idx)).join("") + "</div>"
    : "<p class=\"muted\">Sem parcerias adicionadas.</p>";
}

function renderProfileLocationsTab(profileData) {
  const locations = Array.isArray(profileData && profileData.locations) ? profileData.locations : [];
  el.subtabs.innerHTML = "";
  if (!locations.length) {
    el.content.innerHTML = "<p class=\"muted\">Sem locais adicionados.</p>";
    return;
  }
  el.content.innerHTML = "<div class=\"profile-locations-list\">" + locations.map((loc, idx) => {
    const target = buildLocationOpenUrl(loc);
    const title = String(loc && loc.title || "Local");
    const address = String(loc && loc.address || "");
    const note = String(loc && loc.note || "");
    return (
      "<article class=\"panel profile-item\" data-profile-item=\"" + idx + "\">" +
      "<strong>" + esc(title) + "</strong>" +
      (address ? "<p class=\"muted\">" + esc(address) + "</p>" : "") +
      (note ? "<p class=\"muted\">" + esc(note) + "</p>" : "") +
      (target ? "<p><a class=\"campaign-link\" href=\"" + esc(target) + "\" target=\"_blank\" rel=\"noopener noreferrer\">Ver mapa</a></p>" : "") +
      "</article>"
    );
  }).join("") + "</div>";
}

function openSavedMediaModal(index, sourceList = null) {
  ensurePersonalStoreLoaded();
  const list = Array.isArray(sourceList)
    ? sourceList
    : ((personalStore.data && Array.isArray(personalStore.data.savedMedia)) ? personalStore.data.savedMedia : []);
  if (!list.length) return;
  const items = list.map((entry) => ({
    name: String(entry && entry.title || "Media"),
    mediaUrl: String(entry && entry.mediaUrl || ""),
    mediaType: String(entry && entry.mediaType || "image"),
  }));
  const safeIndex = Math.max(0, Math.min(Number(index || 0), items.length - 1));
  const context = list[safeIndex] || {};
  openItemModal("galeria", items, safeIndex, {
    profileId: Number(context.profileId || 0),
    profileName: String(context.profileName || "Perfil"),
  });
}

function openSavedItemModal(index, sourceList = null) {
  ensurePersonalStoreLoaded();
  const list = Array.isArray(sourceList)
    ? sourceList
    : ((personalStore.data && Array.isArray(personalStore.data.savedItems)) ? personalStore.data.savedItems : []);
  if (!list.length) return;
  const safeIndex = Math.max(0, Math.min(Number(index || 0), list.length - 1));
  const target = list[safeIndex] || {};
  const item = deepClone(target.item || {});
  if (!item || typeof item !== "object") return;
  openItemModal(String(target.tabId || "produtos"), [item], 0, {
    profileId: Number(target.profileId || 0),
    profileName: String(target.profileName || "Perfil"),
  });
}

function renderCommonProfileContent() {
  ensurePersonalStoreLoaded();
  if (!personalStore.data) {
    el.subtabs.innerHTML = "";
    el.content.innerHTML = "<p class=\"muted\">Sem dados de conta pessoal.</p>";
    return;
  }
  const tab = String(state.commonProfileTab || "guardados");
  if (tab === "partilhas") {
    if (isCommonUser()) {
      void refreshRecommendationsForCurrentUser({ silent: true });
    }
    const shareSub = String(state.commonShareSubTab || "recebidos");
    const activeThreadKey = String(state.commonShareThreadKey || "");
    const shareSearchRaw = String(state.commonShareSearch || "");
    const shareSearch = normalizeText(shareSearchRaw);
    el.subtabs.innerHTML =
      "<button class=\"" + (shareSub === "recebidos" ? "active" : "") + "\" data-common-share-tab=\"recebidos\">Recebidos</button>" +
      "<button class=\"" + (shareSub === "enviados" ? "active" : "") + "\" data-common-share-tab=\"enviados\">Enviados</button>";
    el.subtabs.querySelectorAll("button[data-common-share-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        setState({ commonShareSubTab: String(button.dataset.commonShareTab || "recebidos"), commonShareThreadKey: "", commonShareSearch: "" });
        renderProfile();
      });
    });
    const list = shareSub === "enviados"
      ? (Array.isArray(recommendationsStore.sent) ? recommendationsStore.sent : [])
      : (Array.isArray(recommendationsStore.inbox) ? recommendationsStore.inbox : []);
    const pendingPermissions = Array.isArray(recommendationsStore.pendingPermissions) ? recommendationsStore.pendingPermissions : [];
    const hasPending = shareSub === "recebidos" && pendingPermissions.length > 0;
    const pendingHtml = hasPending
      ? (
        "<div class=\"panel profile-common-item\">" +
          "<strong>Pedidos de permissão</strong>" +
          "<div class=\"profile-common-list\">" +
            pendingPermissions.map((req) => (
              "<div class=\"panel profile-item\" data-permission-item=\"" + esc(String(req.sender_user_id || 0)) + "\">" +
                "<strong>" + esc(String(req.sender_name || req.sender_email || "Utilizador")) + "</strong>" +
                "<p class=\"muted\">" + esc(String(req.sender_email || "")) + "</p>" +
                "<div class=\"chips\">" +
                  "<button type=\"button\" data-permission-action=\"approve\" data-permission-sender=\"" + esc(String(req.sender_user_id || 0)) + "\">Aceitar</button>" +
                  "<button type=\"button\" data-permission-action=\"reject\" data-permission-sender=\"" + esc(String(req.sender_user_id || 0)) + "\">Recusar</button>" +
                "</div>" +
              "</div>"
            )).join("") +
          "</div>" +
        "</div>"
      )
      : "";
    if (recommendationsStore.loading && !list.length && !hasPending) {
      el.content.innerHTML = "<p class=\"muted\">A carregar partilhas...</p>";
      return;
    }
    if (!Array.isArray(list) || !list.length) {
      const errorHtml = recommendationsStore.error ? ("<p class=\"muted\">" + esc(recommendationsStore.error) + "</p>") : "";
      el.content.innerHTML = pendingHtml + errorHtml + "<p class=\"muted\">Sem partilhas nesta secao.</p>";
      el.content.querySelectorAll("button[data-permission-action]").forEach((button) => {
        button.addEventListener("click", async () => {
          const action = String(button.dataset.permissionAction || "");
          const senderUserId = Number(button.dataset.permissionSender || 0);
          if (!action || senderUserId <= 0) return;
          await handleRecommendationPermissionAction(action, senderUserId);
          renderProfile();
        });
      });
      return;
    }
    const threads = buildShareThreads(list, shareSub);
    if (activeThreadKey) {
      const thread = threads.find((entry) => String(entry.key) === activeThreadKey);
      if (!thread) {
        setState({ commonShareThreadKey: "" });
        renderProfile();
        return;
      }
      const cName = String(thread.counterpart && thread.counterpart.name || "Utilizador");
      el.content.innerHTML =
        "<div class=\"profile-thread-head\">" +
          "<button type=\"button\" class=\"profile-top-btn\" data-common-thread-back=\"1\">&#8592;</button>" +
          "<strong>" + esc(cName) + "</strong>" +
        "</div>" +
        "<div class=\"profile-common-list\">" + thread.entries.map((entry) => {
          const kind = String(entry && entry.kind || "item");
          const kindLabel = getShareKindLabel(entry);
          const when = formatRelativeTime(entry && entry.createdAt);
          const previewImage = getShareEntryPreviewImage(entry);
          const subtitle = kind === "profile"
            ? ("Perfil - " + String(entry && entry.profileName || "Perfil"))
            : kind === "media"
              ? ("Media - " + String(entry && entry.profileName || "Perfil"))
              : ("Item - " + String(entry && entry.profileName || "Perfil"));
          const recommendationId = Number(entry && entry.id || 0);
          const currentReaction = String(entry && entry.reaction || "").trim().toLowerCase();
          const reactionRead = reactionToEmoji(currentReaction);
          const canReact = shareSub === "recebidos" && recommendationId > 0;
          const reactionBar = canReact
            ? (
              "<div class=\"share-reaction-row\">" +
                "<button type=\"button\" class=\"share-reaction-btn" + (currentReaction === "like" ? " active" : "") + "\" data-common-reaction-id=\"" + recommendationId + "\" data-common-reaction=\"like\" data-common-reaction-current=\"" + esc(currentReaction) + "\" aria-label=\"Gosto\">&#128077;</button>" +
                "<button type=\"button\" class=\"share-reaction-btn" + (currentReaction === "fire" ? " active" : "") + "\" data-common-reaction-id=\"" + recommendationId + "\" data-common-reaction=\"fire\" data-common-reaction-current=\"" + esc(currentReaction) + "\" aria-label=\"Top\">&#128293;</button>" +
                "<button type=\"button\" class=\"share-reaction-btn" + (currentReaction === "wow" ? " active" : "") + "\" data-common-reaction-id=\"" + recommendationId + "\" data-common-reaction=\"wow\" data-common-reaction-current=\"" + esc(currentReaction) + "\" aria-label=\"Incrivel\">&#129321;</button>" +
                "<button type=\"button\" class=\"share-reaction-btn" + (currentReaction === "love" ? " active" : "") + "\" data-common-reaction-id=\"" + recommendationId + "\" data-common-reaction=\"love\" data-common-reaction-current=\"" + esc(currentReaction) + "\" aria-label=\"Adorei\">&#10084;&#65039;</button>" +
              "</div>"
            )
            : (reactionRead ? "<p class=\"muted share-reaction-read\">Reacao: " + reactionRead + "</p>" : "");
          return (
            "<article class=\"panel profile-item profile-common-item\" data-common-share-item=\"" + esc(String(entry && entry.id || "")) + "\">" +
            "<div class=\"profile-shared-entry-row\">" +
              (previewImage
                ? "<img class=\"profile-shared-entry-thumb\" src=\"" + esc(previewImage) + "\" alt=\"preview\" />"
                : "<div class=\"profile-shared-entry-thumb placeholder\">" + esc(kindLabel.slice(0, 1)) + "</div>") +
              "<div class=\"profile-shared-entry-main\">" +
                "<div class=\"profile-shared-entry-head\">" +
                  "<strong>" + esc(String(entry && entry.title || "Partilha")) + "</strong>" +
                  (when ? "<span class=\"profile-thread-time\">" + esc(when) + "</span>" : "") +
                "</div>" +
                "<p class=\"muted\">" + esc(String(entry && entry.subtitle || subtitle)) + "</p>" +
                "<span class=\"profile-thread-kind\">" + esc(kindLabel) + "</span>" +
              "</div>" +
            "</div>" +
            reactionBar +
            "</article>"
          );
        }).join("") + "</div>";
      const backBtn = el.content.querySelector("button[data-common-thread-back]");
      if (backBtn) {
        backBtn.addEventListener("click", () => {
          setState({ commonShareThreadKey: "" });
          renderProfile();
        });
      }
      el.content.querySelectorAll("[data-common-share-item]").forEach((card) => {
        card.addEventListener("click", () => {
          const id = String(card.dataset.commonShareItem || "");
          const entry = thread.entries.find((item) => String(item && item.id || "") === id);
          if (!entry) return;
          openSharedEntry(entry);
        });
      });
      el.content.querySelectorAll("button[data-common-reaction-id]").forEach((button) => {
        button.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          const rid = Number(button.dataset.commonReactionId || 0);
          const reaction = String(button.dataset.commonReaction || "").trim().toLowerCase();
          const current = String(button.dataset.commonReactionCurrent || "").trim().toLowerCase();
          if (rid <= 0 || !reaction) return;
          const nextReaction = current === reaction ? "" : reaction;
          button.disabled = true;
          await handleRecommendationReaction(rid, nextReaction);
          renderProfile();
        });
      });
      return;
    }
    const filteredThreads = !shareSearch
      ? threads
      : threads.filter((thread) => {
          const name = normalizeText(thread.counterpart && thread.counterpart.name || "");
          const email = normalizeText(thread.counterpart && thread.counterpart.email || "");
          return name.includes(shareSearch) || email.includes(shareSearch);
        });
    el.content.innerHTML =
      pendingHtml +
      "<div class=\"profile-thread-search-box\">" +
        "<span class=\"profile-thread-search-icon\">&#128269;</span>" +
        "<input id=\"commonShareSearchInput\" class=\"input\" placeholder=\"Pesquisar conversa por nome ou email\" value=\"" + esc(shareSearchRaw) + "\" />" +
      "</div>" +
      "<div class=\"profile-thread-list\">" + filteredThreads.map((thread) => {
      const latest = thread.entries[0] || {};
      const latestKind = getShareKindLabel(latest);
      const latestWhen = formatRelativeTime(latest && latest.createdAt);
      const title = String(latest && latest.title || "Partilha");
      const name = String(thread.counterpart && thread.counterpart.name || thread.counterpart.email || "Utilizador");
      const first = (name || "U").slice(0, 1).toUpperCase();
      const unread = Number(thread.unread || 0);
      return (
        "<button type=\"button\" class=\"panel profile-thread-row\" data-common-thread=\"" + esc(String(thread.key || "")) + "\">" +
          "<span class=\"profile-thread-avatar\">" + esc(first) + "</span>" +
          "<span class=\"profile-thread-meta\">" +
            "<strong>" + esc(name) + "</strong>" +
            "<span class=\"muted\">" + esc(title) + "</span>" +
            "<span class=\"profile-thread-kind\">" + esc(latestKind) + "</span>" +
          "</span>" +
          "<span class=\"profile-thread-right\">" +
            (latestWhen ? "<span class=\"profile-thread-time\">" + esc(latestWhen) + "</span>" : "") +
            (unread > 0 ? "<span class=\"explore-active-filter-chip\">" + unread + "</span>" : "") +
          "</span>" +
        "</button>"
      );
    }).join("") + "</div>" +
    (!filteredThreads.length ? "<p class=\"muted\">Sem conversas para esta pesquisa.</p>" : "");
    const searchInput = el.content.querySelector("#commonShareSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        setState({ commonShareSearch: String(searchInput.value || "") });
        renderProfile();
      });
    }
    el.content.querySelectorAll("[data-common-thread]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = String(button.dataset.commonThread || "");
        markThreadRead(key, shareSub);
        setState({ commonShareThreadKey: key });
        renderProfile();
      });
    });
    el.content.querySelectorAll("button[data-permission-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = String(button.dataset.permissionAction || "");
        const senderUserId = Number(button.dataset.permissionSender || 0);
        if (!action || senderUserId <= 0) return;
        await handleRecommendationPermissionAction(action, senderUserId);
        renderProfile();
      });
    });
    return;
  }
  if (tab === "sugestoes") {
    el.subtabs.innerHTML = "";
    const savedSet = new Set(personalStore.data.savedProfiles);
    const recentSet = new Set(personalStore.data.recentProfiles);
    const suggestions = state.profiles
      .filter((p) => !savedSet.has(Number(p.id || 0)) && !recentSet.has(Number(p.id || 0)))
      .slice(0, 12);
    renderCards(suggestions, el.content, { compact: true, emptyText: "Sem sugestoes neste momento." });
    return;
  }

  const savedSub = String(state.commonSavedSubTab || "perfis");
  const savedSearchRaw = String(state.commonSavedSearch || "");
  const savedSearch = normalizeText(savedSearchRaw);
  const savedMediaFilter = String(state.commonSavedMediaFilter || "all");
  const savedItemFilter = String(state.commonSavedItemFilter || "all");
  el.subtabs.innerHTML =
    "<button class=\"" + (savedSub === "perfis" ? "active" : "") + "\" data-common-saved-tab=\"perfis\">Perfis</button>" +
    "<button class=\"" + (savedSub === "media" ? "active" : "") + "\" data-common-saved-tab=\"media\">Media</button>" +
    "<button class=\"" + (savedSub === "itens" ? "active" : "") + "\" data-common-saved-tab=\"itens\">Itens</button>";
  el.subtabs.querySelectorAll("button[data-common-saved-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({
        commonSavedSubTab: String(button.dataset.commonSavedTab || "perfis"),
        commonSavedSearch: "",
        commonSavedMediaFilter: "all",
        commonSavedItemFilter: "all",
      });
      renderProfile();
    });
  });

  if (savedSub === "media") {
    const mediaList = Array.isArray(personalStore.data.savedMedia) ? personalStore.data.savedMedia : [];
    const filteredMedia = mediaList.filter((entry) => {
      const type = String(entry && entry.mediaType || "image").toLowerCase();
      const byType = savedMediaFilter === "all" ? true : (savedMediaFilter === "image" ? type !== "video" : type === "video");
      if (!byType) return false;
      if (!savedSearch) return true;
      const haystack = normalizeText([
        entry && entry.title,
        entry && entry.profileName,
      ].join(" "));
      return haystack.includes(savedSearch);
    });
    el.content.innerHTML =
      "<div class=\"profile-thread-search-box\">" +
        "<span class=\"profile-thread-search-icon\">&#128269;</span>" +
        "<input id=\"commonSavedSearchInput\" class=\"input\" placeholder=\"Pesquisar media guardada\" value=\"" + esc(savedSearchRaw) + "\" />" +
      "</div>" +
      "<div class=\"chips profile-saved-filter-row\">" +
        "<button type=\"button\" class=\"" + (savedMediaFilter === "all" ? "active" : "") + "\" data-common-saved-media-filter=\"all\">Tudo</button>" +
        "<button type=\"button\" class=\"" + (savedMediaFilter === "image" ? "active" : "") + "\" data-common-saved-media-filter=\"image\">Fotos</button>" +
        "<button type=\"button\" class=\"" + (savedMediaFilter === "video" ? "active" : "") + "\" data-common-saved-media-filter=\"video\">Videos</button>" +
      "</div>" +
      (filteredMedia.length
        ? "<div class=\"profile-gallery-grid\">" + filteredMedia.map((entry, idx) => {
      const title = String(entry && entry.title || "Media");
      const profileName = String(entry && entry.profileName || "Perfil");
      const mediaUrl = String(entry && entry.mediaUrl || "");
      const mediaType = String(entry && entry.mediaType || "image");
      const mediaBlock = mediaType === "video"
        ? "<video class=\"item-preview profile-gallery-media\" controls preload=\"metadata\" src=\"" + esc(mediaUrl) + "\"></video>"
        : "<img class=\"item-preview profile-gallery-media\" src=\"" + esc(mediaUrl) + "\" alt=\"" + esc(title) + "\" />";
      return (
        "<article class=\"panel profile-item profile-gallery-item\" data-common-media-item=\"" + idx + "\">" +
        mediaBlock +
        "<p class=\"profile-gallery-caption\">" + esc(title + " - " + profileName) + "</p>" +
        "</article>"
      );
    }).join("") + "</div>"
        : "<p class=\"muted\">Sem media guardada para este filtro.</p>");
    const mediaSearchInput = el.content.querySelector("#commonSavedSearchInput");
    if (mediaSearchInput) {
      mediaSearchInput.addEventListener("input", () => {
        setState({ commonSavedSearch: String(mediaSearchInput.value || "") });
        renderProfile();
      });
    }
    el.content.querySelectorAll("button[data-common-saved-media-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        setState({ commonSavedMediaFilter: String(button.dataset.commonSavedMediaFilter || "all") });
        renderProfile();
      });
    });
    el.content.querySelectorAll("[data-common-media-item]").forEach((card) => {
      card.addEventListener("click", () => openSavedMediaModal(Number(card.dataset.commonMediaItem || 0), filteredMedia));
    });
    return;
  }

  if (savedSub === "itens") {
    const itemList = Array.isArray(personalStore.data.savedItems) ? personalStore.data.savedItems : [];
    const tabOptions = Array.from(new Set(itemList.map((entry) => String(entry && entry.tabId || "").trim().toLowerCase()).filter(Boolean)));
    const filteredItems = itemList.filter((entry) => {
      const tabId = String(entry && entry.tabId || "").trim().toLowerCase();
      const byTab = savedItemFilter === "all" ? true : tabId === savedItemFilter;
      if (!byTab) return false;
      if (!savedSearch) return true;
      const haystack = normalizeText([
        entry && entry.title,
        entry && entry.profileName,
        entry && entry.tabId,
      ].join(" "));
      return haystack.includes(savedSearch);
    });
    el.content.innerHTML =
      "<div class=\"profile-thread-search-box\">" +
        "<span class=\"profile-thread-search-icon\">&#128269;</span>" +
        "<input id=\"commonSavedSearchInput\" class=\"input\" placeholder=\"Pesquisar itens guardados\" value=\"" + esc(savedSearchRaw) + "\" />" +
      "</div>" +
      "<div class=\"chips profile-saved-filter-row\">" +
        "<button type=\"button\" class=\"" + (savedItemFilter === "all" ? "active" : "") + "\" data-common-saved-item-filter=\"all\">Tudo</button>" +
        tabOptions.map((tabId) => {
          const label = tabIdToLabel(tabId || "item");
          return "<button type=\"button\" class=\"" + (savedItemFilter === tabId ? "active" : "") + "\" data-common-saved-item-filter=\"" + esc(tabId) + "\">" + esc(label) + "</button>";
        }).join("") +
      "</div>" +
      (filteredItems.length
        ? "<div class=\"profile-common-list profile-saved-item-list\">" + filteredItems.map((entry, idx) => {
      const title = String(entry && entry.title || "Item");
      const profileName = String(entry && entry.profileName || "Perfil");
      const tabName = tabIdToLabel(entry && entry.tabId || "item");
      const previewImage = getSavedItemPreviewImage(entry);
      const when = formatRelativeTime(entry && entry.savedAt);
      return (
        "<article class=\"panel profile-item profile-common-item profile-saved-item-card\" data-common-saved-item=\"" + idx + "\">" +
        "<div class=\"profile-saved-item-row\">" +
          (previewImage
            ? "<img class=\"profile-saved-item-thumb\" src=\"" + esc(previewImage) + "\" alt=\"item\" />"
            : "<div class=\"profile-saved-item-thumb placeholder\">" + esc(tabName.slice(0, 1)) + "</div>") +
          "<div class=\"profile-saved-item-main\">" +
            "<div class=\"profile-saved-item-head\">" +
              "<strong title=\"" + esc(title) + "\">" + esc(title) + "</strong>" +
              (when ? "<span class=\"profile-thread-time\">" + esc(when) + "</span>" : "") +
            "</div>" +
            "<p class=\"muted\">" + esc(profileName) + "</p>" +
            "<span class=\"profile-thread-kind\">" + esc(tabName) + "</span>" +
          "</div>" +
        "</div>" +
        "</article>"
      );
    }).join("") + "</div>"
        : "<p class=\"muted\">Sem itens guardados para este filtro.</p>");
    const itemSearchInput = el.content.querySelector("#commonSavedSearchInput");
    if (itemSearchInput) {
      itemSearchInput.addEventListener("input", () => {
        setState({ commonSavedSearch: String(itemSearchInput.value || "") });
        renderProfile();
      });
    }
    el.content.querySelectorAll("button[data-common-saved-item-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        setState({ commonSavedItemFilter: String(button.dataset.commonSavedItemFilter || "all") });
        renderProfile();
      });
    });
    el.content.querySelectorAll("[data-common-saved-item]").forEach((card) => {
      card.addEventListener("click", () => openSavedItemModal(Number(card.dataset.commonSavedItem || 0), filteredItems));
    });
    return;
  }

  const savedIds = Array.isArray(personalStore.data.savedProfiles) ? personalStore.data.savedProfiles : [];
  const savedProfiles = savedIds
    .map((id) => state.profiles.find((p) => Number(p.id || 0) === Number(id || 0)))
    .filter(Boolean)
    .filter((profile) => {
      if (!savedSearch) return true;
      const haystack = normalizeText([
        profile && profile.name,
        profile && profile.category,
        profile && profile.location,
      ].join(" "));
      return haystack.includes(savedSearch);
    });
  el.content.innerHTML =
    "<div class=\"profile-thread-search-box\">" +
      "<span class=\"profile-thread-search-icon\">&#128269;</span>" +
      "<input id=\"commonSavedSearchInput\" class=\"input\" placeholder=\"Pesquisar perfis guardados\" value=\"" + esc(savedSearchRaw) + "\" />" +
    "</div>" +
    "<div id=\"commonSavedProfilesGrid\"></div>";
  const profileSearchInput = el.content.querySelector("#commonSavedSearchInput");
  if (profileSearchInput) {
    profileSearchInput.addEventListener("input", () => {
      setState({ commonSavedSearch: String(profileSearchInput.value || "") });
      renderProfile();
    });
  }
  const savedProfilesRoot = el.content.querySelector("#commonSavedProfilesGrid");
  if (savedProfilesRoot) renderCards(savedProfiles, savedProfilesRoot, { emptyText: "Sem perfis guardados para esta pesquisa." });
}

function renderCommonProfile() {
  const user = state.authUser || {};
  const name = String(user.name || "Conta pessoal");
  const email = String(user.email || "");
  const tab = String(state.commonProfileTab || "guardados");
  const unreadShares = countUnreadShares();
  el.head.innerHTML =
    "<div class=\"panel profile-common-head\">" +
      "<div class=\"profile-head-avatar-wrap\">" +
        "<div class=\"profile-head-avatar placeholder\">" + esc((name || "U").slice(0, 1).toUpperCase()) + "</div>" +
      "</div>" +
      "<div class=\"profile-head-main\">" +
        "<h3>" + esc(name) + "</h3>" +
        "<p class=\"muted\">" + esc(email || "Conta pessoal") + "</p>" +
      "</div>" +
    "</div>";
  el.tabs.innerHTML =
    "<button class=\"" + (tab === "partilhas" ? "active" : "") + "\" data-common-tab=\"partilhas\">Partilhas" + (unreadShares > 0 ? " (" + unreadShares + ")" : "") + "</button>" +
    "<button class=\"" + (tab === "guardados" ? "active" : "") + "\" data-common-tab=\"guardados\">Guardados</button>" +
    "<button class=\"" + (tab === "sugestoes" ? "active" : "") + "\" data-common-tab=\"sugestoes\">Sugestões</button>";
  el.tabs.querySelectorAll("button[data-common-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ commonProfileTab: String(button.dataset.commonTab || "guardados"), commonShareThreadKey: "" });
      renderProfile();
    });
  });
  renderCommonProfileContent();
  centerActiveChip(el.tabs);
  centerActiveChip(el.subtabs);
  updateProfileStickyOffsets();
}

function renderProfile() {
  if (isCommonUser() && String(state.profileContext || "personal") !== "public") {
    renderCommonProfile();
    return;
  }
  const profile = selectedProfile();
  if (!profile) {
    if (isCommonUser()) {
      setState({ profileContext: "personal" });
      renderCommonProfile();
      return;
    }
    el.head.innerHTML = "<p class=\"muted\">Sem perfil selecionado.</p>";
    el.tabs.innerHTML = "";
    el.subtabs.innerHTML = "";
    el.content.innerHTML = "<p class=\"muted\">Sem conteudo.</p>";
    return;
  }
  const tabs = getTabsForProfile(profile);
  const tabId = ensureProfileTab(tabs);
  let sections = profileSections(profile, tabId);
  const subId = ensureSubTab(sections);
  const profileData = profile.data || {};
  const avatar = String(profile.avatar || profileData.avatar || "").trim();
  const category = profile.category || PROFILE_TYPE_LABEL[profile.type] || "Perfil";
  const location = String(profile.location || profileData.location || "").trim();
  const rating = String(profile.rating || profileData.rating || "").trim();
  const socialItems = getSocialItems(profileData);
  const badgeType = getBadgeType(profile);
  const isVerified = badgeType === "verif" || profileData.verified === true;
  const badgeText = badgeType === "promo" ? "Promoção" : badgeType === "novo" ? "Novo" : "";
  const authUserId = Number((state.authUser && state.authUser.id) || 0);
  const profileUserId = Number(profile.userId || (profileData && profileData.user_id) || 0);
  const canEditProfile = authUserId > 0 && profileUserId > 0 && authUserId === profileUserId;
  const canSaveProfile = isCommonUser() && !canEditProfile;
  const returnTab =
    state.profileReturnTab === "explore"
      ? "explore"
      : state.profileReturnTab === "notifications"
        ? "notifications"
      : state.profileReturnTab === "profile"
        ? "profile"
        : "home";
  const socialHtml = socialItems.map((item) => (
    "<a class=\"profile-social-btn social-" + esc(item.icon) + "\" href=\"" + esc(item.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + esc(item.icon) + "</a>"
  )).join("");
  el.head.innerHTML = (
    "<div class=\"profile-head-top-actions\">" +
      "<button type=\"button\" class=\"profile-top-btn\" data-profile-back=\"1\" title=\"Voltar\">&#8592;</button>" +
      "<div class=\"profile-head-top-right\">" +
        "<button type=\"button\" class=\"profile-top-btn\" data-profile-share=\"1\" title=\"Partilhar\">&#9993;</button>" +
        (canSaveProfile ? "<button type=\"button\" class=\"profile-top-btn\" data-profile-save=\"1\" title=\"Guardar\">" + (isProfileSaved(profile.id) ? "&#9733;" : "&#9734;") + "</button>" : "") +
        (canEditProfile ? "<button type=\"button\" class=\"profile-top-btn\" data-profile-edit=\"1\" title=\"Editar\">&#8942;</button>" : "") +
      "</div>" +
    "</div>" +
    "<div class=\"profile-head-wrap\">" +
      "<div class=\"profile-head-avatar-wrap\">" +
        (avatar ? "<img class=\"profile-head-avatar\" src=\"" + esc(avatar) + "\" alt=\"" + esc(profile.name || "Perfil") + "\" />" : "<div class=\"profile-head-avatar placeholder\">" + esc((profile.name || "P").slice(0, 1).toUpperCase()) + "</div>") +
      "</div>" +
      "<div class=\"profile-head-main\">" +
        "<div class=\"profile-head-name-row\">" +
          "<h3>" + esc(profile.name) + "</h3>" +
          (isVerified ? "<span class=\"profile-verified\" title=\"Verificado\">&#10004;</span>" : "") +
        "</div>" +
        (badgeText ? "<p class=\"profile-inline-badge profile-inline-badge-" + esc(badgeType) + "\">" + esc(badgeText) + "</p>" : "") +
        "<p class=\"muted\">" + esc(category) + "</p>" +
        "<div class=\"profile-meta-row\">" +
          "<span class=\"profile-meta-pill\">&#128205; " + esc(location || "Sem localizacao") + "</span>" +
          "<button type=\"button\" class=\"profile-meta-pill profile-rating-pill\">&#9733; " + esc(rating || "-") + "</button>" +
        "</div>" +
        (socialHtml ? "<div class=\"profile-social-row\">" + socialHtml + "</div>" : "") +
      "</div>" +
    "</div>"
  );
  const ratingBtn = el.head.querySelector(".profile-rating-pill");
  if (ratingBtn) {
    ratingBtn.addEventListener("click", () => {
      openReviewsModal();
    });
  }
  const backBtn = el.head.querySelector("button[data-profile-back]");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (returnTab === "profile" && isCommonUser()) {
        setState({ profileContext: "personal" });
      }
      setScreen(returnTab);
    });
  }
  const shareBtn = el.head.querySelector("button[data-profile-share]");
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      if (isCommonUser()) {
        openSharePicker({
          kind: "profile",
          title: profile.name || "Perfil",
          subtitle: profile.category || "Perfil profissional",
          profileId: Number(profile.id || 0),
          profileName: profile.name || "Perfil",
          tabId: "profile",
        });
        return;
      }
      shareProfile(profile);
    });
  }
  const saveBtn = el.head.querySelector("button[data-profile-save]");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      toggleSavedProfile(profile.id);
      renderProfile();
    });
  }
  const editBtn = el.head.querySelector("button[data-profile-edit]");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      setScreen("edit");
    });
  }

  el.tabs.innerHTML = tabs
    .map((tab) => "<button class=\"" + (tab.id === tabId ? "active" : "") + "\" data-profile-tab=\"" + tab.id + "\">" + esc(tab.label || tab.id) + "</button>")
    .join("");

  el.tabs.querySelectorAll("button[data-profile-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ profileTab: button.dataset.profileTab, profileSubTab: "" });
      renderProfile();
    });
  });
  centerActiveChip(el.tabs);

  if (tabId === "sobre") {
    el.subtabs.innerHTML = "";
    const aboutHtml = sanitizeRichHtml(profile.about || profile.data.about || "");
    el.content.innerHTML = "<div class=\"panel profile-about-content\">" + (aboutHtml || "<p class=\"muted\">Sem descricao</p>") + "</div>";
    updateProfileStickyOffsets();
    return;
  }
  if (tabId === "galeria") {
    renderProfileGalleryTab(profileData);
    centerActiveChip(el.subtabs);
    updateProfileStickyOffsets();
    return;
  }
  if (tabId === "horario") {
    renderProfileScheduleTab(profileData);
    centerActiveChip(el.subtabs);
    updateProfileStickyOffsets();
    return;
  }
  if (tabId === "agenda") {
    renderProfileAgendaTab(profileData);
    centerActiveChip(el.subtabs);
    updateProfileStickyOffsets();
    return;
  }
  if (tabId === "parcerias") {
    renderProfilePartnersTab(profileData);
    centerActiveChip(el.subtabs);
    updateProfileStickyOffsets();
    return;
  }
  if (tabId === "locais") {
    renderProfileLocationsTab(profileData);
    centerActiveChip(el.subtabs);
    updateProfileStickyOffsets();
    return;
  }
  el.subtabs.innerHTML = sections
    .map((section) => {
      const key = section.id || section.label;
      return "<button class=\"" + (key === subId ? "active" : "") + "\" data-profile-subtab=\"" + key + "\">" + esc(section.label || key) + "</button>";
    })
    .join("");

  el.subtabs.querySelectorAll("button[data-profile-subtab]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ profileSubTab: button.dataset.profileSubtab });
      renderProfile();
    });
  });
  centerActiveChip(el.subtabs);

  const activeSection = sections.find((s) => (s.id || s.label) === subId) || sections[0] || null;
  const items = activeSection && Array.isArray(activeSection.items) ? activeSection.items : [];
  const visibleItems = items.filter((item) => isEnabledFlag(item && item.enabled));
  if (tabId === "produtos" || tabId === "menu") {
    renderProfileCatalogTab(tabId, activeSection || { id: "geral", label: "Geral" }, visibleItems);
    updateProfileStickyOffsets();
    return;
  }
  if (tabId === "casas" || tabId === "quartos") {
    renderProfileLodgingTab(tabId, sections, subId);
    updateProfileStickyOffsets();
    return;
  }
  el.content.innerHTML = visibleItems.length
    ? visibleItems.map((item, idx) => renderItem(tabId, item, idx)).join("")
    : "<p class=\"muted\">Sem itens nesta aba.</p>";
  bindProfileContentInteractions(tabId, visibleItems);
  updateProfileStickyOffsets();
}

const SIMPLE_EDIT_TABS = ["galeria", "horario", "agenda", "parcerias", "locais"];

function isSimpleEditTab(tabId) {
  return SIMPLE_EDIT_TABS.includes(String(tabId || "").toLowerCase());
}

function linesToList(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(list) {
  return (Array.isArray(list) ? list : [])
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .join("\n");
}

function getDraftGalleryLists() {
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

function getDraftGalleryViews() {
  const data = editor.draft && editor.draft.data ? editor.draft.data : {};
  const lists = getDraftGalleryLists();
  const views = data.galleryViews && typeof data.galleryViews === "object" ? data.galleryViews : {};
  return {
    photos: ensureGalleryViewLength(lists.photos, views.photos),
    videos: ensureGalleryViewLength(lists.videos, views.videos),
    reels: ensureGalleryViewLength(lists.reels, views.reels),
  };
}

function setDraftGalleryLists(nextLists) {
  if (!editor.draft || !editor.draft.data) return;
  const data = editor.draft.data;
  const gallery = data.gallery && typeof data.gallery === "object" ? Object.assign({}, data.gallery) : {};
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

function setDraftGalleryViews(nextViews) {
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

function scheduleToObject(raw) {
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

function renderSimpleEditTab(tabId) {
  const data = editor.draft && editor.draft.data ? editor.draft.data : {};
  if (tabId === "galeria") {
    const gallery = getDraftGalleryLists();
    const mediaTabs = [
      { id: "photos", label: "Fotos" },
      { id: "videos", label: "Videos" },
    ];
    const activeMediaTab = mediaTabs.some((tab) => tab.id === editor.activeSubByTab.galeria)
      ? editor.activeSubByTab.galeria
      : "photos";
    editor.activeSubByTab.galeria = activeMediaTab;
    const list = gallery[activeMediaTab] || [];
    const views = getDraftGalleryViews();
    const viewList = views[activeMediaTab] || [];
    const cards = list.map((url, idx) => {
      const mediaType = activeMediaTab === "photos" ? "image" : "video";
      const view = normalizeGalleryView(viewList[idx]);
      const mediaStyle = getGalleryViewStyle(view, mediaType);
      const preview = url
        ? (mediaType === "image"
            ? "<img class=\"item-preview\" src=\"" + esc(url) + "\" alt=\"media " + (idx + 1) + "\" style=\"" + esc(mediaStyle) + "\" />"
            : "<video class=\"item-preview\" controls preload=\"metadata\" src=\"" + esc(url) + "\" style=\"" + esc(mediaStyle) + "\"></video>")
        : "<div class=\"panel\"><p class=\"muted\">Sem media</p></div>";
      return (
        "<article class=\"panel edit-item-card\">" +
        "<div class=\"edit-item-header\">" +
        "<strong class=\"edit-item-title\">#" + (idx + 1) + " " + esc(mediaTabs.find((tab) => tab.id === activeMediaTab).label.slice(0, -1)) + "</strong>" +
        "<div class=\"chips edit-item-actions\">" +
        "<button type=\"button\" data-gallery-preview=\"" + idx + "\">Ver modal</button>" +
        "<button type=\"button\" data-gallery-remove=\"" + idx + "\">Remover</button>" +
        "</div></div>" +
        preview +
        "<label>URL<input class=\"input\" data-gallery-url=\"" + idx + "\" value=\"" + esc(url) + "\" /></label>" +
        "<div class=\"edit-gallery-view-grid\">" +
        "<label>Ajuste<select class=\"input\" data-gallery-fit=\"" + idx + "\"><option value=\"cover\"" + (view.fit === "cover" ? " selected" : "") + ">Cortar</option><option value=\"contain\"" + (view.fit === "contain" ? " selected" : "") + ">Encaixar</option></select></label>" +
        "<label>Zoom<input class=\"input\" type=\"range\" min=\"80\" max=\"220\" step=\"1\" data-gallery-zoom=\"" + idx + "\" value=\"" + esc(String(view.zoom)) + "\" /></label>" +
        "<label>Posicao X<input class=\"input\" type=\"range\" min=\"0\" max=\"100\" step=\"1\" data-gallery-posx=\"" + idx + "\" value=\"" + esc(String(view.posX)) + "\" /></label>" +
        "<label>Posicao Y<input class=\"input\" type=\"range\" min=\"0\" max=\"100\" step=\"1\" data-gallery-posy=\"" + idx + "\" value=\"" + esc(String(view.posY)) + "\" /></label>" +
        "</div>" +
        "</article>"
      );
    }).join("");
    return (
      "<div class=\"panel edit-simple-section edit-simple-gallery\">" +
      "<p class=\"muted\">Galeria</p>" +
      "<div class=\"chips edit-subtabs-row\">" +
      mediaTabs.map((tab) => "<button type=\"button\" class=\"" + (tab.id === activeMediaTab ? "active" : "") + "\" data-gallery-tab=\"" + tab.id + "\">" + esc(tab.label) + "</button>").join("") +
      "</div>" +
      (cards || "<p class=\"muted\">Sem media nesta sub-aba.</p>") +
      "<div class=\"chips edit-actions-row edit-gallery-actions\">" +
      "<button type=\"button\" data-gallery-add-url=\"1\">Adicionar URL</button>" +
      "<label class=\"edit-gallery-upload\">" +
      "<span>Carregar ficheiro</span>" +
      "<input type=\"file\" class=\"edit-gallery-upload-input\" data-gallery-upload=\"1\" accept=\"" + (activeMediaTab === "photos" ? "image/*" : "video/*") + "\" />" +
      "</label>" +
      "</div>" +
      "</div>"
    );
  }
  if (tabId === "horario") {
    const schedule = scheduleToObject(data.schedule);
    return (
      "<div class=\"panel edit-simple-section edit-simple-schedule\">" +
      "<p class=\"muted\">Horario</p>" +
      "<div class=\"edit-form-grid edit-basic-grid\">" +
      "<label>Segunda<input class=\"input\" data-simple-field=\"schedule_seg\" value=\"" + esc(schedule.seg) + "\" /></label>" +
      "<label>Terca<input class=\"input\" data-simple-field=\"schedule_ter\" value=\"" + esc(schedule.ter) + "\" /></label>" +
      "<label>Quarta<input class=\"input\" data-simple-field=\"schedule_qua\" value=\"" + esc(schedule.qua) + "\" /></label>" +
      "<label>Quinta<input class=\"input\" data-simple-field=\"schedule_qui\" value=\"" + esc(schedule.qui) + "\" /></label>" +
      "<label>Sexta<input class=\"input\" data-simple-field=\"schedule_sex\" value=\"" + esc(schedule.sex) + "\" /></label>" +
      "<label>Sabado<input class=\"input\" data-simple-field=\"schedule_sab\" value=\"" + esc(schedule.sab) + "\" /></label>" +
      "<label>Domingo<input class=\"input\" data-simple-field=\"schedule_dom\" value=\"" + esc(schedule.dom) + "\" /></label>" +
      "</div>" +
      "</div>"
    );
  }
  if (tabId === "agenda") {
    const agenda = data.agenda && typeof data.agenda === "object" ? data.agenda : {};
    const slots = Array.isArray(agenda.slots) ? agenda.slots : [];
    const slotsHtml = slots.map((slot, idx) => {
      const day = String(slot && (slot.day || slot.date || slot.rawDay) || "").trim();
      const weekday = String(slot && (slot.weekday || slot.displayDay) || "").trim();
      const times = Array.isArray(slot && slot.times) ? slot.times.join(", ") : "";
      return (
        "<article class=\"panel edit-item-card\">" +
        "<div class=\"edit-item-header\">" +
        "<strong class=\"edit-item-title\">Slot " + (idx + 1) + "</strong>" +
        "<div class=\"chips edit-item-actions\"><button type=\"button\" data-agenda-remove-slot=\"" + idx + "\">Remover</button></div>" +
        "</div>" +
        "<div class=\"edit-form-grid edit-basic-grid\">" +
        "<label>Dia<input class=\"input\" data-agenda-slot-day=\"" + idx + "\" value=\"" + esc(day) + "\" /></label>" +
        "<label>Dia da semana<input class=\"input\" data-agenda-slot-weekday=\"" + idx + "\" value=\"" + esc(weekday) + "\" /></label>" +
        "<label>Horas (10h, 12h)<input class=\"input\" data-agenda-slot-times=\"" + idx + "\" value=\"" + esc(times) + "\" /></label>" +
        "</div>" +
        "</article>"
      );
    }).join("");
    return (
      "<div class=\"panel edit-simple-section edit-simple-agenda\">" +
      "<p class=\"muted\">Agenda</p>" +
      "<label>Descricao<textarea class=\"input\" rows=\"3\" data-simple-field=\"agenda_description\">" + esc(String(agenda.description || "")) + "</textarea></label>" +
      "<label>Link de reserva<input class=\"input\" data-simple-field=\"agenda_reserveLink\" value=\"" + esc(String(agenda.reserveLink || "")) + "\" /></label>" +
      "<p class=\"muted\">Slots</p>" +
      (slotsHtml || "<p class=\"muted\">Sem slots definidos.</p>") +
      "<div class=\"chips edit-actions-row\"><button type=\"button\" data-agenda-add-slot=\"1\">Adicionar slot</button></div>" +
      "</div>"
    );
  }
  if (tabId === "parcerias") {
    const rows = Array.isArray(data.partners) ? data.partners : [];
    const cards = rows.map((row, idx) => {
      const name = String(row && row.name || "").trim();
      const image = String(row && row.image || "").trim();
      const link = String(row && (row.link || row.url) || "").trim();
      return (
        "<article class=\"panel edit-item-card\">" +
        "<div class=\"edit-item-header\">" +
        "<strong class=\"edit-item-title\">Parceria " + (idx + 1) + "</strong>" +
        "<div class=\"chips edit-item-actions\"><button type=\"button\" data-partner-remove=\"" + idx + "\">Remover</button></div>" +
        "</div>" +
        (image ? "<img class=\"item-preview\" src=\"" + esc(image) + "\" alt=\"" + esc(name || ("Parceiro " + (idx + 1))) + "\" />" : "") +
        "<div class=\"edit-form-grid edit-basic-grid\">" +
        "<label>Nome<input class=\"input\" data-partner-name=\"" + idx + "\" value=\"" + esc(name) + "\" /></label>" +
        "<label>Imagem URL<input class=\"input\" data-partner-image=\"" + idx + "\" value=\"" + esc(image) + "\" /></label>" +
        "<label>Link<input class=\"input\" data-partner-link=\"" + idx + "\" value=\"" + esc(link) + "\" /></label>" +
        "</div>" +
        "</article>"
      );
    }).join("");
    return (
      "<div class=\"panel edit-simple-section edit-simple-partners\">" +
      "<p class=\"muted\">Parcerias</p>" +
      (cards || "<p class=\"muted\">Sem parcerias adicionadas.</p>") +
      "<div class=\"chips edit-actions-row\"><button type=\"button\" data-partner-add=\"1\">Adicionar parceria</button></div>" +
      "</div>"
    );
  }
  if (tabId === "locais") {
    const rows = Array.isArray(data.locations) ? data.locations : [];
    const cards = rows.map((row, idx) => {
      const title = String(row && row.title || "").trim();
      const address = String(row && row.address || "").trim();
      const note = String(row && row.note || "").trim();
      const coords = String(row && row.coords || "").trim();
      const link = String(row && row.link || "").trim();
      return (
        "<article class=\"panel edit-item-card\">" +
        "<div class=\"edit-item-header\">" +
        "<strong class=\"edit-item-title\">Local " + (idx + 1) + "</strong>" +
        "<div class=\"chips edit-item-actions\"><button type=\"button\" data-location-remove=\"" + idx + "\">Remover</button></div>" +
        "</div>" +
        "<div class=\"edit-form-grid edit-basic-grid\">" +
        "<label>Titulo<input class=\"input\" data-location-title=\"" + idx + "\" value=\"" + esc(title) + "\" /></label>" +
        "<label>Morada<input class=\"input\" data-location-address=\"" + idx + "\" value=\"" + esc(address) + "\" /></label>" +
        "<label>Nota<input class=\"input\" data-location-note=\"" + idx + "\" value=\"" + esc(note) + "\" /></label>" +
        "<label>Coordenadas<input class=\"input\" data-location-coords=\"" + idx + "\" value=\"" + esc(coords) + "\" /></label>" +
        "<label>Link mapa<input class=\"input\" data-location-link=\"" + idx + "\" value=\"" + esc(link) + "\" /></label>" +
        "</div>" +
        "</article>"
      );
    }).join("");
    return (
      "<div class=\"panel edit-simple-section edit-simple-locations\">" +
      "<p class=\"muted\">Locais</p>" +
      (cards || "<p class=\"muted\">Sem locais adicionados.</p>") +
      "<div class=\"chips edit-actions-row\"><button type=\"button\" data-location-add=\"1\">Adicionar local</button></div>" +
      "</div>"
    );
  }
  return "";
}

function bindSimpleEditTabEvents(tabId) {
  if (!editor.draft || !editor.draft.data) return;
  const data = editor.draft.data;
  if (tabId === "galeria") {
    el.edit.querySelectorAll("button[data-gallery-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        editor.activeSubByTab.galeria = String(button.dataset.galleryTab || "photos");
        renderEdit();
      });
    });
    el.edit.querySelectorAll("button[data-gallery-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        const idx = Number(button.dataset.galleryRemove || -1);
        const active = String(editor.activeSubByTab.galeria || "photos");
        const next = getDraftGalleryLists();
        const nextViews = getDraftGalleryViews();
        const list = Array.isArray(next[active]) ? next[active].slice() : [];
        const viewList = Array.isArray(nextViews[active]) ? nextViews[active].slice() : [];
        if (idx >= 0 && idx < list.length) list.splice(idx, 1);
        if (idx >= 0 && idx < viewList.length) viewList.splice(idx, 1);
        next[active] = list;
        nextViews[active] = viewList;
        setDraftGalleryLists(next);
        setDraftGalleryViews(nextViews);
        renderEdit();
      });
    });
    el.edit.querySelectorAll("button[data-gallery-preview]").forEach((button) => {
      button.addEventListener("click", () => {
        const idx = Number(button.dataset.galleryPreview || -1);
        const active = String(editor.activeSubByTab.galeria || "photos");
        const next = getDraftGalleryLists();
        const views = getDraftGalleryViews();
        const list = Array.isArray(next[active]) ? next[active] : [];
        const viewList = Array.isArray(views[active]) ? views[active] : [];
        if (idx < 0 || idx >= list.length) return;
        const mediaType = active === "photos" ? "image" : "video";
        const items = list.map((url, i) => ({
          name: (active === "photos" ? "Foto " : "Video ") + (i + 1),
          mediaUrl: url,
          mediaType,
          galleryView: normalizeGalleryView(viewList[i]),
        }));
        openItemModal("galeria", items, idx);
      });
    });
    el.edit.querySelectorAll("input[data-gallery-url]").forEach((input) => {
      const apply = () => {
        const idx = Number(input.dataset.galleryUrl || -1);
        const active = String(editor.activeSubByTab.galeria || "photos");
        const next = getDraftGalleryLists();
        const list = Array.isArray(next[active]) ? next[active].slice() : [];
        if (idx < 0 || idx >= list.length) return;
        list[idx] = String(input.value || "").trim();
        next[active] = list.filter((entry) => String(entry || "").trim() !== "");
        setDraftGalleryLists(next);
      };
      input.addEventListener("input", apply);
      input.addEventListener("change", apply);
    });
    const bindGalleryViewField = (selector, key) => {
      el.edit.querySelectorAll(selector).forEach((input) => {
        const apply = () => {
          const idx = Number(
            input.dataset.galleryFit ||
            input.dataset.galleryZoom ||
            input.dataset.galleryPosx ||
            input.dataset.galleryPosy || -1
          );
          const active = String(editor.activeSubByTab.galeria || "photos");
          const lists = getDraftGalleryLists();
          const nextViews = getDraftGalleryViews();
          const list = Array.isArray(lists[active]) ? lists[active] : [];
          const viewList = ensureGalleryViewLength(list, nextViews[active]);
          if (idx < 0 || idx >= viewList.length) return;
          const current = normalizeGalleryView(viewList[idx]);
          let nextValue = input.value;
          if (key === "zoom" || key === "posX" || key === "posY") {
            nextValue = Number(input.value || 0);
          }
          current[key] = nextValue;
          viewList[idx] = normalizeGalleryView(current);
          nextViews[active] = viewList;
          setDraftGalleryViews(nextViews);
          renderEdit();
        };
        input.addEventListener("input", apply);
        input.addEventListener("change", apply);
      });
    };
    bindGalleryViewField("select[data-gallery-fit]", "fit");
    bindGalleryViewField("input[data-gallery-zoom]", "zoom");
    bindGalleryViewField("input[data-gallery-posx]", "posX");
    bindGalleryViewField("input[data-gallery-posy]", "posY");
    const addUrlBtn = el.edit.querySelector("button[data-gallery-add-url]");
    if (addUrlBtn) {
      addUrlBtn.addEventListener("click", () => {
        const url = window.prompt("URL da media:");
        if (!url) return;
        const clean = String(url || "").trim();
        if (!clean) return;
        const active = String(editor.activeSubByTab.galeria || "photos");
        const next = getDraftGalleryLists();
        const nextViews = getDraftGalleryViews();
        const list = Array.isArray(next[active]) ? next[active].slice() : [];
        const viewList = ensureGalleryViewLength(list, nextViews[active]).slice();
        list.push(clean);
        viewList.push(galleryDefaultView());
        next[active] = list;
        nextViews[active] = viewList;
        setDraftGalleryLists(next);
        setDraftGalleryViews(nextViews);
        renderEdit();
      });
    }
    const uploadInput = el.edit.querySelector("input[data-gallery-upload]");
    if (uploadInput) {
      uploadInput.addEventListener("change", async () => {
        const file = uploadInput.files && uploadInput.files[0];
        if (!file) return;
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const active = String(editor.activeSubByTab.galeria || "photos");
          const next = getDraftGalleryLists();
          const nextViews = getDraftGalleryViews();
          const list = Array.isArray(next[active]) ? next[active].slice() : [];
          const viewList = ensureGalleryViewLength(list, nextViews[active]).slice();
          list.push(dataUrl);
          viewList.push(galleryDefaultView());
          next[active] = list;
          nextViews[active] = viewList;
          setDraftGalleryLists(next);
          setDraftGalleryViews(nextViews);
          renderEdit();
        } catch (_err) {
          alert("Erro ao carregar ficheiro.");
        }
      });
    }
    return;
  }

  if (tabId === "agenda") {
    const getAgenda = () => (data.agenda && typeof data.agenda === "object") ? Object.assign({}, data.agenda) : { description: "", reserveLink: "", slots: [] };
    const persistAgenda = (nextAgenda) => {
      data.agenda = nextAgenda;
    };
    const addSlotBtn = el.edit.querySelector("button[data-agenda-add-slot]");
    if (addSlotBtn) {
      addSlotBtn.addEventListener("click", () => {
        const agenda = getAgenda();
        const slots = Array.isArray(agenda.slots) ? agenda.slots.slice() : [];
        slots.push({ rawDay: "", day: "", date: "", weekday: "", displayDay: "", times: [] });
        agenda.slots = slots;
        persistAgenda(agenda);
        renderEdit();
      });
    }
    el.edit.querySelectorAll("button[data-agenda-remove-slot]").forEach((button) => {
      button.addEventListener("click", () => {
        const idx = Number(button.dataset.agendaRemoveSlot || -1);
        const agenda = getAgenda();
        const slots = Array.isArray(agenda.slots) ? agenda.slots.slice() : [];
        if (idx >= 0 && idx < slots.length) slots.splice(idx, 1);
        agenda.slots = slots;
        persistAgenda(agenda);
        renderEdit();
      });
    });
    el.edit.querySelectorAll("[data-agenda-slot-day],[data-agenda-slot-weekday],[data-agenda-slot-times]").forEach((input) => {
      const apply = () => {
        const agenda = getAgenda();
        const slots = Array.isArray(agenda.slots) ? agenda.slots.slice() : [];
        const idx =
          Number(input.dataset.agendaSlotDay || input.dataset.agendaSlotWeekday || input.dataset.agendaSlotTimes || -1);
        if (idx < 0 || idx >= slots.length) return;
        const current = Object.assign({}, slots[idx] || {});
        if (input.hasAttribute("data-agenda-slot-day")) {
          const value = String(input.value || "").trim();
          current.rawDay = value;
          current.day = value;
          current.date = value;
        } else if (input.hasAttribute("data-agenda-slot-weekday")) {
          const value = String(input.value || "").trim();
          current.weekday = value;
          current.displayDay = value;
        } else if (input.hasAttribute("data-agenda-slot-times")) {
          const value = String(input.value || "").trim();
          current.times = value ? value.split(",").map((entry) => entry.trim()).filter(Boolean) : [];
        }
        slots[idx] = current;
        agenda.slots = slots;
        persistAgenda(agenda);
      };
      input.addEventListener("input", apply);
      input.addEventListener("change", apply);
    });
  }

  if (tabId === "parcerias") {
    const setRows = (nextRows) => { data.partners = nextRows; };
    const addBtn = el.edit.querySelector("button[data-partner-add]");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const current = Array.isArray(data.partners) ? data.partners.slice() : [];
        setRows([...current, { name: "", image: "", link: "" }]);
        renderEdit();
      });
    }
    el.edit.querySelectorAll("button[data-partner-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        const idx = Number(button.dataset.partnerRemove || -1);
        const next = Array.isArray(data.partners) ? data.partners.slice() : [];
        if (idx >= 0 && idx < next.length) next.splice(idx, 1);
        setRows(next);
        renderEdit();
      });
    });
    el.edit.querySelectorAll("[data-partner-name],[data-partner-image],[data-partner-link]").forEach((input) => {
      const apply = () => {
        const idx = Number(
          input.dataset.partnerName || input.dataset.partnerImage || input.dataset.partnerLink || -1
        );
        const next = Array.isArray(data.partners) ? data.partners.slice() : [];
        if (idx < 0 || idx >= next.length) return;
        const row = Object.assign({}, next[idx] || {});
        if (input.hasAttribute("data-partner-name")) row.name = String(input.value || "").trim();
        else if (input.hasAttribute("data-partner-image")) row.image = String(input.value || "").trim();
        else if (input.hasAttribute("data-partner-link")) row.link = String(input.value || "").trim();
        next[idx] = row;
        setRows(next);
      };
      input.addEventListener("input", apply);
      input.addEventListener("change", apply);
    });
  }

  if (tabId === "locais") {
    const setRows = (nextRows) => { data.locations = nextRows; };
    const addBtn = el.edit.querySelector("button[data-location-add]");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const next = Array.isArray(data.locations) ? data.locations.slice() : [];
        next.push({ title: "", address: "", note: "", coords: "", link: "" });
        setRows(next);
        renderEdit();
      });
    }
    el.edit.querySelectorAll("button[data-location-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        const idx = Number(button.dataset.locationRemove || -1);
        const next = Array.isArray(data.locations) ? data.locations.slice() : [];
        if (idx >= 0 && idx < next.length) next.splice(idx, 1);
        setRows(next);
        renderEdit();
      });
    });
    el.edit.querySelectorAll("[data-location-title],[data-location-address],[data-location-note],[data-location-coords],[data-location-link]").forEach((input) => {
      const apply = () => {
        const idx = Number(
          input.dataset.locationTitle ||
          input.dataset.locationAddress ||
          input.dataset.locationNote ||
          input.dataset.locationCoords ||
          input.dataset.locationLink ||
          -1
        );
        const next = Array.isArray(data.locations) ? data.locations.slice() : [];
        if (idx < 0 || idx >= next.length) return;
        const row = Object.assign({}, next[idx] || {});
        if (input.hasAttribute("data-location-title")) row.title = String(input.value || "").trim();
        else if (input.hasAttribute("data-location-address")) row.address = String(input.value || "").trim();
        else if (input.hasAttribute("data-location-note")) row.note = String(input.value || "").trim();
        else if (input.hasAttribute("data-location-coords")) row.coords = String(input.value || "").trim();
        else if (input.hasAttribute("data-location-link")) row.link = String(input.value || "").trim();
        next[idx] = row;
        setRows(next);
      };
      input.addEventListener("input", apply);
      input.addEventListener("change", apply);
    });
  }

  el.edit.querySelectorAll("[data-simple-field]").forEach((field) => {
    const apply = () => {
      const key = String(field.dataset.simpleField || "");
      if (tabId === "horario") {
        const schedule = scheduleToObject(data.schedule);
        const scheduleKey = key.replace("schedule_", "");
        if (Object.prototype.hasOwnProperty.call(schedule, scheduleKey)) schedule[scheduleKey] = String(field.value || "").trim();
        data.schedule = schedule;
        return;
      }
      if (tabId === "agenda") {
        const agenda = data.agenda && typeof data.agenda === "object" ? Object.assign({}, data.agenda) : {};
        if (key === "agenda_description") agenda.description = String(field.value || "").trim();
        else if (key === "agenda_reserveLink") agenda.reserveLink = String(field.value || "").trim();
        data.agenda = agenda;
        return;
      }
    };
    field.addEventListener("input", apply);
    field.addEventListener("change", apply);
  });
}

function tabKeyMap(tabId) {
  if (tabId === "servicos") return { section: "servicesSections", flat: "services" };
  if (tabId === "produtos") return { section: "productsSections", flat: "products" };
  if (tabId === "menu") return { section: "menuSections", flat: "menu" };
  if (tabId === "portfolio") return { section: "portfolioSections", flat: "portfolio" };
  if (tabId === "casas") return { section: "housesSections", flat: "houses" };
  if (tabId === "quartos") return { section: "roomsSections", flat: "rooms" };
  if (tabId === "campanhas") return { section: "campaignSections", flat: "campaigns" };
  if (tabId === "galeria") return { section: "gallerySections", flat: "gallerySections" };
  if (tabId === "horario") return { section: "scheduleSections", flat: "scheduleSections" };
  if (tabId === "agenda") return { section: "agendaSections", flat: "agendaSections" };
  if (tabId === "parcerias") return { section: "partnersSections", flat: "partnersSections" };
  if (tabId === "locais") return { section: "locationsSections", flat: "locationsSections" };
  return { section: "", flat: "" };
}
function isEnabledFlag(value) {
  if (value === false) return false;
  if (value === true) return true;
  if (typeof value === "number") return value !== 0;
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return true;
  if (["false", "0", "no", "off", "nao"].includes(raw)) return false;
  return true;
}

function isOnFlag(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "number") return value !== 0;
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return false;
  return ["true", "1", "yes", "on", "sim", "y"].includes(raw);
}

function normalizeSectionsForEditor(tabId, rawSections, rawFlat) {
  const fallbackLabel = tabId === "servicos" ? "Servicos"
    : tabId === "produtos" ? "Produtos"
      : tabId === "menu" ? "Menu"
        : tabId === "portfolio" ? "Portfolio"
          : tabId === "casas" ? "Casas"
            : tabId === "quartos" ? "Quartos"
              : tabId === "campanhas" ? "Campanhas"
                : "Categoria";
  const byItemLabel = tabId === "casas" ? "Casa" : (tabId === "quartos" ? "Quarto" : "Item");
  const sourceSections = Array.isArray(rawSections) ? rawSections : [];
  const sourceFlat = Array.isArray(rawFlat) ? rawFlat : [];
  let sections = [];

  const hasNested = sourceSections.some((item) => Array.isArray(item && item.items));
  if (hasNested) {
    sections = sourceSections.map((section, idx) => {
      const label = String((section && (section.label || section.name)) || (fallbackLabel + " " + (idx + 1))).trim() || (fallbackLabel + " " + (idx + 1));
      const id = String((section && section.id) || slugify(label) || ("categoria-" + (idx + 1)));
      const items = Array.isArray(section && section.items) ? section.items.map((item) => deepClone(item || {})) : [];
      return {
        id,
        label,
        items,
        enabled: isEnabledFlag(section && section.enabled),
      };
    }).filter((section) => section.enabled !== false);
  } else {
    const flat = sourceSections.length ? sourceSections : sourceFlat;
    if (tabId === "casas" || tabId === "quartos") {
      sections = flat
        .map((item, idx) => {
          const name = String((item && (item.name || item.title || item.label)) || "").trim();
          const label = name || (byItemLabel + " " + (idx + 1));
          return {
            id: slugify(label) || (slugify(byItemLabel) + "-" + (idx + 1)),
            label,
            items: [deepClone(item || {})],
            enabled: isEnabledFlag(item && item.enabled),
          };
        })
        .filter((section) => section.enabled !== false);
    } else {
      const grouped = {};
      flat.forEach((item) => {
        const label = String((item && (item.category || item.label)) || fallbackLabel).trim() || fallbackLabel;
        if (!grouped[label]) grouped[label] = [];
        grouped[label].push(deepClone(item || {}));
      });
      sections = Object.keys(grouped).map((label, idx) => ({
        id: slugify(label) || ("categoria-" + (idx + 1)),
        label,
        items: grouped[label],
        enabled: true,
      }));
    }
  }

  if (!sections.length) {
    sections = [{ id: "base", label: fallbackLabel, items: [], enabled: true }];
  }
  if (tabId === "casas" || tabId === "quartos") {
    const expanded = [];
    sections.forEach((section, secIdx) => {
      const items = Array.isArray(section && section.items) ? section.items : [];
      if (items.length <= 1) {
        expanded.push(section);
        return;
      }
      items.forEach((item, itemIdx) => {
        const name = String((item && (item.name || item.title || item.label)) || "").trim();
        const label = name || (byItemLabel + " " + (expanded.length + 1));
        expanded.push({
          id: slugify((section && section.id ? String(section.id) + "-" : "") + label) || (slugify(byItemLabel) + "-" + (secIdx + 1) + "-" + (itemIdx + 1)),
          label,
          items: [deepClone(item || {})],
          enabled: isEnabledFlag(item && item.enabled),
        });
      });
    });
    sections = expanded.length ? expanded : sections;
  }
  if (tabId === "campanhas") {
    const merged = sections.flatMap((section) => Array.isArray(section.items) ? section.items : []);
    sections = [{ id: "campanha", label: "Campanha", items: merged, enabled: true }];
  }
  return sections;
}

function getDraftSections(tabId) {
  const keys = tabKeyMap(tabId);
  if (!keys.section) return [];
  const data = editor.draft.data || {};
  return normalizeSectionsForEditor(tabId, data[keys.section], data[keys.flat]);
}

function setDraftSections(tabId, sections) {
  const keys = tabKeyMap(tabId);
  if (!keys.section) return;
  const nextSections = Array.isArray(sections) ? sections : [];
  const flatItems = nextSections.flatMap((section) => (Array.isArray(section && section.items) ? section.items : []));
  editor.draft.data[keys.section] = nextSections;
  editor.draft.data[keys.flat] = flatItems;
}
function blankItem(tabId) {
  if (tabId === "servicos") return { name: "", imageUrl: "", images: [], serviceType: "general", time: "", price: "", quoteOnly: "no", promoEnabled: "no", promoOldPrice: "", promoNowPrice: "", extra1: "", extra2: "", note: "", description: "", extraFields: [], enabled: true };
  if (tabId === "produtos") return { name: "", imageUrl: "", images: [], price: "", stock: "in", promoEnabled: "no", promoOldPrice: "", promoNowPrice: "", description: "", extraFields: [], enabled: true };
  if (tabId === "menu") return { name: "", imageUrl: "", images: [], price: "", promoEnabled: "no", promoOldPrice: "", promoNowPrice: "", description: "", extraFields: [], enabled: true };
  if (tabId === "portfolio") return { name: "", imageUrl: "", images: [], link: "", description: "", extraFields: [], enabled: true };
  if (tabId === "casas" || tabId === "quartos") return { name: "", imageUrl: "", images: [], priceNight: "", promoEnabled: "no", promoOldPrice: "", promoNowPrice: "", capacity: "", beds: "", bathrooms: "", checkIn: "", checkOut: "", availability: "Disponivel", amenities: [], houseRules: [], description: "", enabled: true };
  if (tabId === "campanhas") return { name: "", description: "", mediaUrl: "", mediaType: "image", ctaLabel: "Ver", ctaLink: "", enabled: true };
  if (tabId === "galeria") return { name: "", mediaUrl: "", mediaType: "image", enabled: true };
  if (tabId === "horario") return { name: "", time: "", enabled: true };
  if (tabId === "agenda") return { name: "", day: "", weekday: "", times: [], enabled: true };
  if (tabId === "parcerias") return { name: "", image: "", link: "", enabled: true };
  if (tabId === "locais") return { title: "", address: "", note: "", coords: "", link: "", enabled: true };
  return { name: "", price: "", description: "" };
}

function renderEditItemCard(editTab, item, idx, options = {}) {
  const t = pick(item, ["name","title","label","description"]);
  const d = pick(item,["description","shortDescription","note"]);
  const tm = pick(item,["time","duration"]);
  const p = pick(item,["price","priceNight","promoNowPrice","nightlyPrice","pricePerNight","price_per_night"]);
  const lk = pick(item,["link","url","website"]);
  const cap = pick(item,["capacity","guests"]);
  const beds = pick(item,["beds"]);
  const wc = pick(item,["bathrooms"]);
  const promoEnabled = isOnFlag(item?.promoEnabled);
  const quoteOnly = isOnFlag(item?.quoteOnly);
  const stock = String(item?.stock || "in").toLowerCase() === "out" ? "out" : "in";
  const extraFields = Array.isArray(item?.extraFields) ? item.extraFields : [];
  const itemEnabled = isEnabledFlag(item?.enabled);
  const collapsed = !!options.collapsed;
  const hasModalPreview = editTab !== "sobre";
  let card = "<article class=\"panel edit-item-card" + (itemEnabled ? "" : " edit-item-card-disabled") + "\">";
  card += "<div class=\"edit-item-header\">";
  card += "<button type=\"button\" class=\"edit-collapse-btn\" data-toggle-item-collapse=\"" + idx + "\">" + (collapsed ? "â–¸" : "â–¾") + "</button>";
  card += "<strong class=\"edit-item-title\">#" + (idx + 1) + " " + esc(t || "Item sem titulo") + "</strong>";
  card += "<div class=\"chips edit-item-actions\">";
  if (hasModalPreview) card += "<button type=\"button\" data-preview-item=\"" + idx + "\">Ver modal</button>";
  card += "<button type=\"button\" data-toggle-item-enabled=\"" + idx + "\">" + (itemEnabled ? "Ocultar" : "Ativar") + "</button>";
  card += "<button data-dup-item=\"" + idx + "\">Duplicar</button><button data-remove-item=\"" + idx + "\">Remover</button>";
  card += "</div>";
  card += "</div>";
  if (collapsed) {
    card += "</article>";
    return card;
  }
  card += "<label>Titulo<input class=\"input\" data-item-field=\"name\" data-item-idx=\"" + idx + "\" value=\"" + esc(t) + "\" /></label>";
  if (editTab === "servicos" || editTab === "produtos" || editTab === "menu" || editTab === "portfolio" || editTab === "casas" || editTab === "quartos") {
    const mergedImages = getMergedItemImages(item);
    const itemImage = mergedImages[0] || "";
    if (itemImage) card += "<img class=\"item-preview\" src=\"" + esc(itemImage) + "\" alt=\"" + esc(t || "Item") + "\" />";
    if (mergedImages.length) {
      card += "<div class=\"edit-item-thumbs\">" + mergedImages.map((src, imageIdx) => (
        "<div class=\"edit-item-thumb-wrap\">" +
          "<img class=\"edit-item-thumb\" src=\"" + esc(src) + "\" alt=\"img " + (imageIdx + 1) + "\" />" +
          "<div class=\"edit-item-thumb-actions\">" +
            "<button type=\"button\" data-set-cover-image=\"" + idx + "\" data-image-idx=\"" + imageIdx + "\">Capa</button>" +
            "<button type=\"button\" data-move-item-image-up=\"" + idx + "\" data-image-idx=\"" + imageIdx + "\">&#8593;</button>" +
            "<button type=\"button\" data-move-item-image-down=\"" + idx + "\" data-image-idx=\"" + imageIdx + "\">&#8595;</button>" +
            "<button type=\"button\" data-remove-item-image=\"" + idx + "\" data-image-idx=\"" + imageIdx + "\">Remover</button>" +
          "</div>" +
        "</div>"
      )).join("") + "</div>";
    }
    card += "<label>Imagem URL<input class=\"input\" data-item-field=\"imageUrl\" data-item-idx=\"" + idx + "\" value=\"" + esc(itemImage) + "\" /></label>";
    card += "<label>Carregar imagem<input type=\"file\" accept=\"image/*\" data-upload-item=\"" + idx + "\" /></label>";
  }
  if (editTab === "servicos") {
    const typeMeta = resolveServiceTypeMeta(item && (item.serviceType || item.type));
    card += "<label>Tipo de servico<select class=\"input\" data-item-field=\"serviceType\" data-item-idx=\"" + idx + "\">" + SERVICE_TYPE_META.map((type) => "<option value=\"" + esc(type.id) + "\"" + (type.id === typeMeta.id ? " selected" : "") + ">" + esc(type.label) + "</option>").join("") + "</select></label>";
    card += "<label>Duracao<input class=\"input\" data-item-field=\"time\" data-item-idx=\"" + idx + "\" value=\"" + esc(tm) + "\" /></label>";
    card += "<label>Sob orçamento<select class=\"input\" data-item-field=\"quoteOnly\" data-item-idx=\"" + idx + "\"><option value=\"no\"" + (!quoteOnly ? " selected" : "") + ">Não</option><option value=\"yes\"" + (quoteOnly ? " selected" : "") + ">Sim</option></select></label>";
    card += "<label>" + esc(typeMeta.extra1) + "<input class=\"input\" data-item-field=\"extra1\" data-item-idx=\"" + idx + "\" value=\"" + esc(String(item && (item.extra1 || item.detail1) || "")) + "\" /></label>";
    card += "<label>" + esc(typeMeta.extra2) + "<input class=\"input\" data-item-field=\"extra2\" data-item-idx=\"" + idx + "\" value=\"" + esc(String(item && (item.extra2 || item.detail2) || "")) + "\" /></label>";
    card += "<label>Nota<textarea class=\"input\" data-item-field=\"note\" data-item-idx=\"" + idx + "\">" + esc(String(item && (item.note || item.notes) || "")) + "</textarea></label>";
  }
  if (editTab !== "portfolio" && editTab !== "campanhas" && !(editTab === "servicos" && quoteOnly)) {
    const priceLabel = (editTab === "casas" || editTab === "quartos") ? "Preco por noite" : "Preco";
    const priceField = (editTab === "casas" || editTab === "quartos") ? "priceNight" : "price";
    card += "<label>" + priceLabel + "<input class=\"input\" data-item-field=\"" + priceField + "\" data-item-idx=\"" + idx + "\" value=\"" + esc(p) + "\" /></label>";
  }
  if (editTab === "produtos") card += "<label>Stock<select class=\"input\" data-item-field=\"stock\" data-item-idx=\"" + idx + "\"><option value=\"in\"" + (stock === "in" ? " selected" : "") + ">Em stock</option><option value=\"out\"" + (stock === "out" ? " selected" : "") + ">Esgotado</option></select></label>";
  if (editTab === "servicos" || editTab === "produtos" || editTab === "menu" || editTab === "casas" || editTab === "quartos") {
    card += "<label>Promoção<select class=\"input\" data-item-field=\"promoEnabled\" data-item-idx=\"" + idx + "\"><option value=\"no\"" + (!promoEnabled ? " selected" : "") + ">Desativada</option><option value=\"yes\"" + (promoEnabled ? " selected" : "") + ">Ativada</option></select></label>";
    if (promoEnabled) {
      card += "<label>Preco antigo<input class=\"input\" data-item-field=\"promoOldPrice\" data-item-idx=\"" + idx + "\" value=\"" + esc(String(item?.promoOldPrice || "")) + "\" /></label>";
      card += "<label>Preco promocao<input class=\"input\" data-item-field=\"promoNowPrice\" data-item-idx=\"" + idx + "\" value=\"" + esc(String(item?.promoNowPrice || "")) + "\" /></label>";
    }
  }
  if (editTab === "casas" || editTab === "quartos") {
    card += "<label>Capacidade<input class=\"input\" data-item-field=\"capacity\" data-item-idx=\"" + idx + "\" value=\"" + esc(cap) + "\" /></label>";
    card += "<label>Camas<input class=\"input\" data-item-field=\"beds\" data-item-idx=\"" + idx + "\" value=\"" + esc(beds) + "\" /></label>";
    card += "<label>WC<input class=\"input\" data-item-field=\"bathrooms\" data-item-idx=\"" + idx + "\" value=\"" + esc(wc) + "\" /></label>";
    card += "<label>Check-in<input class=\"input\" data-item-field=\"checkIn\" data-item-idx=\"" + idx + "\" value=\"" + esc(String(item?.checkIn || "")) + "\" /></label>";
    card += "<label>Check-out<input class=\"input\" data-item-field=\"checkOut\" data-item-idx=\"" + idx + "\" value=\"" + esc(String(item?.checkOut || "")) + "\" /></label>";
    card += "<label>Disponibilidade<select class=\"input\" data-item-field=\"availability\" data-item-idx=\"" + idx + "\"><option value=\"Disponivel\"" + (String(item?.availability || "").trim().toLowerCase() !== "indisponivel" ? " selected" : "") + ">Disponivel</option><option value=\"Indisponivel\"" + (String(item?.availability || "").trim().toLowerCase() === "indisponivel" ? " selected" : "") + ">Indisponivel</option></select></label>";
    card += "<label>Comodidades (uma por linha)<textarea class=\"input\" data-item-field=\"amenities\" data-item-idx=\"" + idx + "\">" + esc(listToLines(toArrayList(item?.amenities))) + "</textarea></label>";
    card += "<label>Regras (uma por linha)<textarea class=\"input\" data-item-field=\"houseRules\" data-item-idx=\"" + idx + "\">" + esc(listToLines(toArrayList(item?.houseRules))) + "</textarea></label>";
  }
  if (editTab === "portfolio") card += "<label>Link<input class=\"input\" data-item-field=\"link\" data-item-idx=\"" + idx + "\" value=\"" + esc(lk) + "\" /></label>";
  if (editTab === "campanhas") {
    const mediaUrl = pick(item, ["mediaUrl", "image", "cover", "thumbnail", "video"]);
    const mediaType = inferMediaType(mediaUrl, item?.mediaType);
    if (mediaUrl) {
      card += mediaType === "video" ? "<video class=\"campaign-preview\" controls preload=\"metadata\" src=\"" + esc(mediaUrl) + "\"></video>" : "<img class=\"campaign-preview\" src=\"" + esc(mediaUrl) + "\" alt=\"" + esc(t || "Campanha") + "\" />";
    }
    card += "<label>Media URL<input class=\"input\" data-item-field=\"mediaUrl\" data-item-idx=\"" + idx + "\" value=\"" + esc(mediaUrl) + "\" /></label>";
    card += "<label>Carregar ficheiro<input type=\"file\" accept=\"image/*,video/*\" data-upload-campaign=\"" + idx + "\" /></label>";
    card += "<label>Tipo media<select class=\"input\" data-item-field=\"mediaType\" data-item-idx=\"" + idx + "\"><option value=\"image\"" + (mediaType === "image" ? " selected" : "") + ">Imagem</option><option value=\"video\"" + (mediaType === "video" ? " selected" : "") + ">Video</option></select></label>";
    card += "<label>Texto botao<input class=\"input\" data-item-field=\"ctaLabel\" data-item-idx=\"" + idx + "\" value=\"" + esc(String(item?.ctaLabel || "Ver")) + "\" /></label>";
    card += "<label>Link botao<input class=\"input\" data-item-field=\"ctaLink\" data-item-idx=\"" + idx + "\" value=\"" + esc(String(item?.ctaLink || "")) + "\" /></label>";
  }
  card += "<label>Descricao<textarea class=\"input\" data-item-field=\"description\" data-item-idx=\"" + idx + "\">" + esc(d) + "</textarea></label>";
  if (editTab === "servicos" || editTab === "produtos" || editTab === "menu" || editTab === "portfolio") {
    card += "<p class=\"muted\">Campos extra (modal)</p>";
    extraFields.forEach((field, fieldIdx) => {
      const name = String(field?.name || "");
      const value = String(field?.value || "");
      const description = String(field?.description || "");
      card += "<div class=\"extra-row\">" +
        "<input class=\"input\" placeholder=\"Campo\" data-item-idx=\"" + idx + "\" data-extra-idx=\"" + fieldIdx + "\" data-extra-field=\"name\" value=\"" + esc(name) + "\" />" +
        "<input class=\"input\" placeholder=\"Valor\" data-item-idx=\"" + idx + "\" data-extra-idx=\"" + fieldIdx + "\" data-extra-field=\"value\" value=\"" + esc(value) + "\" />" +
        "<input class=\"input\" placeholder=\"Descricao\" data-item-idx=\"" + idx + "\" data-extra-idx=\"" + fieldIdx + "\" data-extra-field=\"description\" value=\"" + esc(description) + "\" />" +
        "<button data-remove-extra=\"" + idx + "\" data-extra-idx=\"" + fieldIdx + "\">Remover</button>" +
      "</div>";
    });
    card += "<button data-add-extra=\"" + idx + "\">Adicionar campo</button>";
  }
  card += "</article>";
  return card;
}

function upsertProfile(nextProfile) {
  const next = state.profiles.slice();
  const idx = next.findIndex((p) => p.id === nextProfile.id);
  if (idx >= 0) next[idx] = nextProfile;
  else next.unshift(nextProfile);
  setState({ profiles: next, selectedProfileId: nextProfile.id });
}

async function saveEditDraft() {
  if (!editor.draft) return;
  const safeAbout = sanitizeRichHtml(editor.draft.about || "");
  editor.draft.about = safeAbout;
  if (editor.draft && editor.draft.data) {
    const data = editor.draft.data;
    const galleryLists = getDraftGalleryLists();
    const galleryViews = getDraftGalleryViews();
    data.gallery = {
      photos: galleryLists.photos.slice(),
      videos: galleryLists.videos.slice(),
      reels: galleryLists.reels.slice(),
    };
    data.galleryViews = {
      photos: ensureGalleryViewLength(galleryLists.photos, galleryViews.photos),
      videos: ensureGalleryViewLength(galleryLists.videos, galleryViews.videos),
      reels: ensureGalleryViewLength(galleryLists.reels, galleryViews.reels),
    };
  }
  const payloadData = Object.assign({}, editor.draft.data || {}, {
    name: editor.draft.name || "",
    category: editor.draft.category || "",
    role: editor.draft.category || "",
    location: editor.draft.location || "",
    about: safeAbout,
  });
  const payload = { name: editor.draft.name || "Perfil", type: editor.draft.type || "service_pro", data: payloadData };
  try {
    const res = await api.profileUpdate(payload);
    if (res && res.profile) {
      const mapped = mapProfileRow(res.profile);
      upsertProfile(mapped);
      renderAll();
      setScreen("profile");
    }
  } catch (err) {
    const msg = String((err && err.message) || err || "");
  if (msg.includes("404") || msg.toLowerCase().includes("nao encontrado") || msg.toLowerCase().includes("não encontrado")) {
      const createRes = await api.profileCreate(Object.assign({ slug: slugify(editor.draft.name || "perfil") }, payload));
      if (createRes && createRes.profile) {
        const mappedCreate = mapProfileRow(createRes.profile);
        upsertProfile(mappedCreate);
        renderAll();
        setScreen("profile");
        return;
      }
    }
    throw err;
  }
}
function bindEditTopEvents() {
  el.edit.querySelectorAll("button[data-edit-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ editTab: button.dataset.editTab });
      renderEdit();
    });
  });
  el.edit.querySelectorAll("[data-edit-field]").forEach((field) => {
    field.addEventListener("input", () => {
      editor.draft[field.dataset.editField] = field.value;
    });
  });
}

function renderEdit() {
  const authUserId = Number((state.authUser && state.authUser.id) || 0);
  if (!authUserId) {
    el.edit.innerHTML = "<div class=\"panel\"><p class=\"muted\">Inicia sessao para editar o teu perfil.</p></div>";
    return;
  }
  const ownProfile = state.profiles.find((p) => Number(p && p.userId || 0) === authUserId) || null;
  if (!ownProfile) {
    el.edit.innerHTML = "<div class=\"panel\"><p class=\"muted\">Ainda não tens perfil criado nesta conta.</p></div>";
    return;
  }
  let profile = selectedProfile();
  if (!profile || Number(profile.userId || 0) !== authUserId) {
    setState({ selectedProfileId: ownProfile.id });
    profile = ownProfile;
    renderProfile();
  }
  if (!profile) { el.edit.innerHTML = "Sem perfil selecionado"; return; }
  if (editor.profileId !== profile.id || !editor.draft) {
    editor.profileId = profile.id;
    editor.draft = { name: profile.name || "", type: profile.type || "service_pro", category: profile.category || "", location: profile.location || "", about: profile.about || ((profile.data && profile.data.about) || ""), data: deepClone(profile.data || {}) };
    editor.activeSubByTab = {};
    editor.collapsedItemsBySection = {};
  }
  const tabs = getTabsForProfile({ type: editor.draft.type, data: editor.draft.data });
  const validEdit = tabs.find((t) => t.id === state.editTab);
  const editTab = validEdit ? validEdit.id : ((tabs[0] && tabs[0].id) || "sobre");
  const simpleEditTab = isSimpleEditTab(editTab);
  setState({ editTab });

  let sections = [];
  if (editTab !== "sobre" && !simpleEditTab) {
    sections = getDraftSections(editTab);
    if (editTab === "campanhas") {
      const mergedItems = sections.flatMap((section) => Array.isArray(section.items) ? section.items : []);
      sections = [{ id: "campanha", label: "Campanha", items: mergedItems }];
    }
    if (!sections.length) sections = [{ id: "geral", label: "Geral", items: [] }];
    setDraftSections(editTab, sections);
    if (!editor.activeSubByTab[editTab] || !sections.some((s) => (s.id || s.label) === editor.activeSubByTab[editTab])) {
      editor.activeSubByTab[editTab] = sections[0].id || sections[0].label;
    }
  }

  const categoryOptions = PROFILE_CATEGORY_OPTIONS[editor.draft.type] || [];
  const categoryListId = "edit-category-options";
  let html = "<div class=\"panel edit-root\"><h3>Editar Perfil</h3>";
  html += "<p class=\"muted edit-section-caption\">Informação básica</p>";
  html += "<div class=\"chips edit-tabs-row\">" + tabs.map((tab) => "<button class=\"" + (tab.id === editTab ? "active" : "") + "\" data-edit-tab=\"" + tab.id + "\">" + esc(tab.label || tab.id) + "</button>").join("") + "</div>";
  html += "<div class=\"edit-form-grid edit-basic-grid\">";
  html += "<label>Nome<input class=\"input\" data-edit-field=\"name\" value=\"" + esc(editor.draft.name) + "\" /></label>";
  html += "<label>Tipo<select class=\"input\" data-edit-field=\"type\">" + PROFILE_TYPE_OPTIONS.map((type) => "<option value=\"" + type + "\"" + (editor.draft.type === type ? " selected" : "") + ">" + esc(PROFILE_TYPE_LABEL[type] || type) + "</option>").join("") + "</select></label>";
  html += "<label>Categoria<input class=\"input\" list=\"" + categoryListId + "\" data-edit-field=\"category\" value=\"" + esc(editor.draft.category) + "\" /></label>";
  html += "<datalist id=\"" + categoryListId + "\">" + categoryOptions.map((opt) => "<option value=\"" + esc(opt) + "\"></option>").join("") + "</datalist>";
  html += "<label>Localização<input class=\"input\" data-edit-field=\"location\" value=\"" + esc(editor.draft.location) + "\" /></label>";
  html += "</div>";
  if (editTab === "sobre") {
    const aboutHtml = sanitizeRichHtml(editor.draft.about || "");
    html += "<div class=\"edit-about-wrap\">";
    html += "<p class=\"muted\">Texto principal do perfil.</p>";
    html += "<div class=\"chips edit-about-toolbar\">";
    html += "<button type=\"button\" data-about-cmd=\"bold\"><strong>B</strong></button>";
    html += "<button type=\"button\" data-about-cmd=\"italic\"><em>I</em></button>";
    html += "<button type=\"button\" data-about-cmd=\"underline\"><span style=\"text-decoration:underline\">U</span></button>";
    html += "<button type=\"button\" data-about-cmd=\"insertUnorderedList\">&#8226; Lista</button>";
    html += "<button type=\"button\" data-about-cmd=\"insertOrderedList\">1. Lista</button>";
    html += "</div>";
    html += "<div class=\"input edit-about-editor\" contenteditable=\"true\" data-about-editor=\"1\">" + aboutHtml + "</div>";
    html += "<textarea class=\"input edit-about-hidden\" data-edit-field=\"about\">" + esc(aboutHtml) + "</textarea>";
    html += "</div>";
  } else if (simpleEditTab) {
    html += "<p class=\"muted edit-section-caption\">Editar conteudo da aba selecionada.</p>";
    html += renderSimpleEditTab(editTab);
  } else {
    html += "<p class=\"muted edit-section-caption\">Editar conteudo da aba selecionada.</p>";
  }
  if (editTab !== "sobre" && !simpleEditTab) {
    const activeSub = editor.activeSubByTab[editTab];
    const activeSection = sections.find((s) => (s.id || s.label) === activeSub) || sections[0];
    const items = Array.isArray(activeSection.items) ? activeSection.items : [];
    const addItemLabel = editTab === "servicos" ? "Adicionar servico" : editTab === "produtos" ? "Adicionar produto" : editTab === "menu" ? "Adicionar item" : editTab === "portfolio" ? "Adicionar projeto" : editTab === "campanhas" ? "Adicionar campanha" : (editTab === "casas" || editTab === "quartos") ? "Adicionar local" : "Adicionar item";
    html += "<p class=\"muted edit-section-caption\">Categorias</p>";
    html += "<div class=\"chips edit-subtabs-row\">" +
      sections.map((s) => { const key = s.id || s.label; return "<button class=\"" + (key === activeSub ? "active" : "") + "\" data-edit-subtab=\"" + key + "\">" + esc(s.label || key) + "</button>"; }).join("") +
      (editTab === "campanhas" ? "" : (
        "<button data-add-category=\"1\">+ Categoria</button>" +
        "<button data-remove-category=\"1\">Remover</button>" +
        "<button data-move-category-left=\"1\" title=\"Mover categoria para a esquerda\">&#8592;</button>" +
        "<button data-move-category-right=\"1\" title=\"Mover categoria para a direita\">&#8594;</button>"
      )) +
    "</div>";
    html += items.map((item, idx) => renderEditItemCard(editTab, item, idx, { collapsed: isEditItemCollapsed(editTab, activeSub, idx) })).join("");
    html += "<div class=\"chips edit-actions-row\"><button data-add-item=\"1\">" + esc(addItemLabel) + "</button></div>";
  }

  html += "<div class=\"chips edit-save-row\"><button class=\"edit-save-btn\" data-edit-save=\"1\">Guardar</button></div></div>";
  el.edit.innerHTML = html;
  bindEditTopEvents();
  if (editTab === "sobre") {
    const aboutInput = el.edit.querySelector("textarea[data-edit-field=\"about\"]");
    const aboutEditor = el.edit.querySelector("[data-about-editor]");
    const syncAboutField = () => {
      if (!aboutInput || !aboutEditor) return;
      const safeHtml = sanitizeRichHtml(aboutEditor.innerHTML || "");
      aboutInput.value = safeHtml;
      editor.draft.about = safeHtml;
    };
    if (aboutEditor) {
      aboutEditor.addEventListener("input", syncAboutField);
      aboutEditor.addEventListener("blur", syncAboutField);
    }
    el.edit.querySelectorAll("button[data-about-cmd]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!aboutEditor) return;
        aboutEditor.focus();
        const cmd = String(button.dataset.aboutCmd || "");
        if (!cmd) return;
        try {
          document.execCommand(cmd, false, null);
        } catch (_e) {}
        syncAboutField();
      });
    });
  }
  const typeField = el.edit.querySelector("[data-edit-field=\"type\"]");
  if (typeField) {
    typeField.addEventListener("change", () => {
      editor.draft.type = typeField.value || "service_pro";
      const pool = PROFILE_CATEGORY_OPTIONS[editor.draft.type] || [];
      if (!pool.includes(editor.draft.category)) editor.draft.category = pool[0] || "";
      renderEdit();
    });
  }
  if (simpleEditTab) {
    bindSimpleEditTabEvents(editTab);
  }
  if (editTab !== "sobre" && !simpleEditTab) {
    el.edit.querySelectorAll("button[data-edit-subtab]").forEach((button) => button.addEventListener("click", () => { editor.activeSubByTab[editTab] = button.dataset.editSubtab; renderEdit(); }));
    const addCategoryBtn = el.edit.querySelector("button[data-add-category]"); if (addCategoryBtn) addCategoryBtn.addEventListener("click", () => { const label = window.prompt("Nome da categoria:", "Nova categoria"); if (!label) return; const next = getDraftSections(editTab); const cleanLabel = String(label || "").trim(); if (!cleanLabel) return; const baseId = slugify(cleanLabel); let nextId = baseId; let cursor = 2; while (next.some((s) => String(s && (s.id || s.label) || "") === nextId)) { nextId = baseId + "-" + cursor; cursor += 1; } next.push({ id: nextId, label: cleanLabel, items: [blankItem(editTab)] }); setDraftSections(editTab, next); editor.activeSubByTab[editTab] = nextId; renderEdit(); });
    const removeCategoryBtn = el.edit.querySelector("button[data-remove-category]"); if (removeCategoryBtn) removeCategoryBtn.addEventListener("click", () => { const next = getDraftSections(editTab); if (next.length <= 1) return; const activeSub = editor.activeSubByTab[editTab]; const idx = next.findIndex((s) => (s.id || s.label) === activeSub); if (idx >= 0) next.splice(idx, 1); setDraftSections(editTab, next); editor.activeSubByTab[editTab] = (next[0] && (next[0].id || next[0].label)) || ""; renderEdit(); });
    const moveCategoryLeftBtn = el.edit.querySelector("button[data-move-category-left]"); if (moveCategoryLeftBtn) moveCategoryLeftBtn.addEventListener("click", () => { const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const idx = next.findIndex((s) => (s.id || s.label) === activeSub); if (idx <= 0) return; const temp = next[idx - 1]; next[idx - 1] = next[idx]; next[idx] = temp; setDraftSections(editTab, next); renderEdit(); });
    const moveCategoryRightBtn = el.edit.querySelector("button[data-move-category-right]"); if (moveCategoryRightBtn) moveCategoryRightBtn.addEventListener("click", () => { const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const idx = next.findIndex((s) => (s.id || s.label) === activeSub); if (idx < 0 || idx >= next.length - 1) return; const temp = next[idx + 1]; next[idx + 1] = next[idx]; next[idx] = temp; setDraftSections(editTab, next); renderEdit(); });
    const addItemBtn = el.edit.querySelector("button[data-add-item]"); if (addItemBtn) addItemBtn.addEventListener("click", () => { const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!Array.isArray(sec.items)) sec.items = []; sec.items.push(blankItem(editTab)); setDraftSections(editTab, next); renderEdit(); });
    el.edit.querySelectorAll("button[data-toggle-item-collapse]").forEach((button) => button.addEventListener("click", () => { const idx = Number(button.dataset.toggleItemCollapse || -1); const activeSub = editor.activeSubByTab[editTab]; if (idx < 0) return; const current = isEditItemCollapsed(editTab, activeSub, idx); setEditItemCollapsed(editTab, activeSub, idx, !current); renderEdit(); }));
    el.edit.querySelectorAll("button[data-toggle-item-enabled]").forEach((button) => button.addEventListener("click", () => { const idx = Number(button.dataset.toggleItemEnabled || -1); const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items) || idx < 0 || idx >= sec.items.length) return; const row = Object.assign({}, sec.items[idx] || {}); row.enabled = !isEnabledFlag(row.enabled); sec.items[idx] = row; setDraftSections(editTab, next); renderEdit(); }));
    el.edit.querySelectorAll("button[data-preview-item]").forEach((button) => button.addEventListener("click", () => { const idx = Number(button.dataset.previewItem || -1); const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items) || idx < 0 || idx >= sec.items.length) return; openItemModal(editTab, sec.items, idx); }));
    el.edit.querySelectorAll("button[data-dup-item]").forEach((button) => button.addEventListener("click", () => { const idx = Number(button.dataset.dupItem || -1); const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items) || idx < 0 || idx >= sec.items.length) return; sec.items.splice(idx + 1, 0, deepClone(sec.items[idx])); setDraftSections(editTab, next); renderEdit(); }));
    el.edit.querySelectorAll("button[data-remove-item]").forEach((button) => button.addEventListener("click", () => { const idx = Number(button.dataset.removeItem || -1); const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items)) return; if (idx >= 0 && idx < sec.items.length) sec.items.splice(idx, 1); setDraftSections(editTab, next); renderEdit(); }));
    el.edit.querySelectorAll("button[data-add-extra]").forEach((button) => button.addEventListener("click", () => { const idx = Number(button.dataset.addExtra || -1); const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items) || !sec.items[idx]) return; if (!Array.isArray(sec.items[idx].extraFields)) sec.items[idx].extraFields = []; sec.items[idx].extraFields.push({ name: "", value: "", description: "" }); setDraftSections(editTab, next); renderEdit(); }));
    el.edit.querySelectorAll("button[data-remove-extra]").forEach((button) => button.addEventListener("click", () => { const idx = Number(button.dataset.removeExtra || -1); const extraIdx = Number(button.dataset.extraIdx || -1); const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items) || !sec.items[idx]) return; if (!Array.isArray(sec.items[idx].extraFields)) sec.items[idx].extraFields = []; if (extraIdx >= 0 && extraIdx < sec.items[idx].extraFields.length) sec.items[idx].extraFields.splice(extraIdx, 1); setDraftSections(editTab, next); renderEdit(); }));
    el.edit.querySelectorAll("[data-extra-field]").forEach((field) => { const applyExtra = () => { const idx = Number(field.dataset.itemIdx || -1); const extraIdx = Number(field.dataset.extraIdx || -1); const key = field.dataset.extraField; const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items) || !sec.items[idx]) return; if (!Array.isArray(sec.items[idx].extraFields)) sec.items[idx].extraFields = []; if (!sec.items[idx].extraFields[extraIdx]) sec.items[idx].extraFields[extraIdx] = { name: "", value: "", description: "" }; sec.items[idx].extraFields[extraIdx][key] = field.value; setDraftSections(editTab, next); }; field.addEventListener("input", applyExtra); field.addEventListener("change", applyExtra); });
    el.edit.querySelectorAll("input[data-upload-item]").forEach((input) => input.addEventListener("change", async () => { const idx = Number(input.dataset.uploadItem || -1); const file = input.files && input.files[0]; if (!file) return; const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items) || !sec.items[idx]) return; try { const dataUrl = await readFileAsDataUrl(file); const merged = getMergedItemImages(sec.items[idx]); merged.push(dataUrl); applyMergedItemImages(sec.items[idx], merged); setDraftSections(editTab, next); renderEdit(); } catch (err) { alert("Erro ao carregar imagem"); } }));
    el.edit.querySelectorAll("button[data-set-cover-image]").forEach((button) => button.addEventListener("click", () => { const idx = Number(button.dataset.setCoverImage || -1); const imageIdx = Number(button.dataset.imageIdx || -1); const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items) || !sec.items[idx]) return; const merged = getMergedItemImages(sec.items[idx]); if (imageIdx < 0 || imageIdx >= merged.length) return; const [picked] = merged.splice(imageIdx, 1); merged.unshift(picked); applyMergedItemImages(sec.items[idx], merged); setDraftSections(editTab, next); renderEdit(); }));
    el.edit.querySelectorAll("button[data-move-item-image-up]").forEach((button) => button.addEventListener("click", () => { const idx = Number(button.dataset.moveItemImageUp || -1); const imageIdx = Number(button.dataset.imageIdx || -1); const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items) || !sec.items[idx]) return; const merged = getMergedItemImages(sec.items[idx]); if (imageIdx <= 0 || imageIdx >= merged.length) return; const temp = merged[imageIdx - 1]; merged[imageIdx - 1] = merged[imageIdx]; merged[imageIdx] = temp; applyMergedItemImages(sec.items[idx], merged); setDraftSections(editTab, next); renderEdit(); }));
    el.edit.querySelectorAll("button[data-move-item-image-down]").forEach((button) => button.addEventListener("click", () => { const idx = Number(button.dataset.moveItemImageDown || -1); const imageIdx = Number(button.dataset.imageIdx || -1); const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items) || !sec.items[idx]) return; const merged = getMergedItemImages(sec.items[idx]); if (imageIdx < 0 || imageIdx >= merged.length - 1) return; const temp = merged[imageIdx + 1]; merged[imageIdx + 1] = merged[imageIdx]; merged[imageIdx] = temp; applyMergedItemImages(sec.items[idx], merged); setDraftSections(editTab, next); renderEdit(); }));
    el.edit.querySelectorAll("button[data-remove-item-image]").forEach((button) => button.addEventListener("click", () => { const idx = Number(button.dataset.removeItemImage || -1); const imageIdx = Number(button.dataset.imageIdx || -1); const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items) || !sec.items[idx]) return; const merged = getMergedItemImages(sec.items[idx]); if (imageIdx >= 0 && imageIdx < merged.length) merged.splice(imageIdx, 1); applyMergedItemImages(sec.items[idx], merged); setDraftSections(editTab, next); renderEdit(); }));
    el.edit.querySelectorAll("input[data-upload-campaign]").forEach((input) => input.addEventListener("change", async () => { const idx = Number(input.dataset.uploadCampaign || -1); const file = input.files && input.files[0]; if (!file) return; const next = getDraftSections(editTab); const activeSub = editor.activeSubByTab[editTab]; const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0]; if (!sec || !Array.isArray(sec.items) || !sec.items[idx]) return; try { const dataUrl = await readFileAsDataUrl(file); sec.items[idx].mediaUrl = dataUrl; sec.items[idx].mediaType = String(file.type || "").toLowerCase().startsWith("video/") ? "video" : "image"; setDraftSections(editTab, next); renderEdit(); } catch (err) { alert("Erro ao carregar ficheiro"); } }));
    el.edit.querySelectorAll("[data-item-field]").forEach((field) => {
      const applyField = () => {
        const idx = Number(field.dataset.itemIdx || -1);
        const key = String(field.dataset.itemField || "");
        const next = getDraftSections(editTab);
        const activeSub = editor.activeSubByTab[editTab];
        const sec = next.find((s) => (s.id || s.label) === activeSub) || next[0];
        if (!sec || !Array.isArray(sec.items)) return;
        if (!sec.items[idx]) sec.items[idx] = blankItem(editTab);
        const value = String(field.value || "");
        if (key === "promoEnabled" || key === "quoteOnly") {
          sec.items[idx][key] = (value.trim().toLowerCase() === "yes" ? "yes" : "no");
        } else if (key === "serviceType") {
          const normalizedType = String(value || "general").trim().toLowerCase() || "general";
          sec.items[idx].serviceType = normalizedType;
          sec.items[idx].type = normalizedType;
        } else if ((editTab === "casas" || editTab === "quartos") && (key === "amenities" || key === "houseRules")) {
          sec.items[idx][key] = toArrayList(value);
        } else {
          sec.items[idx][key] = value;
        }
        if (key === "imageUrl") {
          const url = String(field.value || "").trim();
          const merged = getMergedItemImages(sec.items[idx]);
          if (url) {
            const nextMerged = [url, ...merged.filter((v) => v !== url)];
            applyMergedItemImages(sec.items[idx], nextMerged);
          } else {
            applyMergedItemImages(sec.items[idx], merged.filter((_, i) => i !== 0));
          }
        }
        setDraftSections(editTab, next);
        if (key === "promoEnabled" || key === "quoteOnly" || key === "mediaType" || key === "mediaUrl" || key === "imageUrl" || key === "availability") renderEdit();
      };
      field.addEventListener("input", applyField);
      field.addEventListener("change", applyField);
    });
  }
  const saveBtn = el.edit.querySelector("button[data-edit-save]"); if (saveBtn) saveBtn.addEventListener("click", async () => { saveBtn.disabled = true; saveBtn.textContent = "A guardar..."; try { await saveEditDraft(); } catch (err) { alert("Erro ao guardar: " + ((err && err.message) || err)); saveBtn.disabled = false; saveBtn.textContent = "Guardar"; } });
}
function renderAll() {
  applyNavigationAccess();
  renderEntryGate();
  if (!hasAccessSession()) {
    setNotificationsNavCount(0);
    if (el.status) el.status.textContent = "Seleciona Entrar, Registar ou Convidado.";
    return;
  }
  ensurePersonalStoreLoaded();
  mergeIncomingSharesForCurrentUser();
  ensureMetricsStoreLoaded();
  const allowed = getAllowedTabs();
  if (!allowed.includes(state.currentTab) && allowed[0]) {
    setState({ currentTab: allowed[0] });
  }
  el.screens.forEach((screen) => screen.classList.toggle("active", screen.id === state.currentTab));
  if (el.nav) {
    el.nav.querySelectorAll("button[data-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === state.currentTab);
    });
  }
  if (el.search && el.search.value !== String(state.exploreSearch || "")) {
    el.search.value = String(state.exploreSearch || "");
  }
  const activeHomeFilter = String(state.homeFilter || "destaques");
  const homeRaw = state.profiles.filter((p) => (activeHomeFilter === "destaques" ? true : resolveProfileFilter(p) === activeHomeFilter));
  const homeList = [...homeRaw].sort((a, b) => scoreLocal(b) - scoreLocal(a));
  const suggested = [...state.profiles].sort((a, b) => scoreLocal(b) - scoreLocal(a)).slice(0, 6);
  const exploreList = getExploreFilteredProfiles();
  const exploreVisibleList = getExploreVisibleProfiles(exploreList);

  renderHomeFilters();
  renderHomeInsights();
  renderCards(homeList, el.home, { emptyText: "Sem perfis para este filtro." });
  if (el.homeSuggested) renderCards(suggested, el.homeSuggested, { compact: true, emptyText: "Sem sugestoes." });
  renderExploreSortChips();
  if (el.exploreOpenFilters) {
    el.exploreOpenFilters.classList.toggle("active", !!state.exploreAdvancedOpen);
  }
  if (el.exploreMetaText) {
    const count = exploreList.length;
    el.exploreMetaText.textContent = count + " " + (count === 1 ? "resultado" : "resultados");
  }
  renderExploreTrend(exploreList);
  renderExploreActiveFilters();
  renderCards(exploreVisibleList, el.explore, { emptyText: "Sem resultados para os filtros atuais." });
  renderExplorePager(exploreList.length, exploreVisibleList.length);
  renderExploreAdvancedModal();
  renderNotifications();
  renderProfile();
  renderSettings();
}
async function bootstrap() {
  el.status.textContent = "A carregar...";
  try {
    const storedLanguage = getStoredLanguage();
    if (storedLanguage) settingsUi.language = storedLanguage;
    setState({ authEntryView: "loading", authLoading: true });
    renderEntryGate();
    const me = await api.authMe();
    if (me && me.authenticated && me.user) {
      setState({
        authUser: me.user,
        guestMode: false,
        authEntryView: "welcome",
        authLoading: false,
        notificationsFilter: "all",
        profileContext: String(me && me.user && me.user.account_type || "").toLowerCase() === "common" ? "personal" : "public",
      });
      settingsUi.credentials.email = String(me.user.email || "");
    } else {
      setState({ authUser: null, guestMode: false, authEntryView: "welcome", authLoading: false, profileContext: "public", notificationsFilter: "all" });
      resetRecommendationsStore();
    }
    const feed = await api.profilesFeed(120);
    const profiles = ((feed && feed.profiles) || []).map(mapProfileRow);
    setState({ profiles, selectedProfileId: profiles[0] ? profiles[0].id : null });
    if (me && me.authenticated && me.user && String(me.user.account_type || "").toLowerCase() === "common") {
      await refreshRecommendationsForCurrentUser({ force: true, silent: true });
    } else {
      resetRecommendationsStore();
    }
    renderAll();
    if (hasAccessSession()) el.status.textContent = "Perfis carregados: " + profiles.length;
    else el.status.textContent = "Seleciona Entrar, Registar ou Convidado.";
  } catch (err) {
    setState({ authLoading: false, authEntryView: "welcome", guestMode: false, authUser: null, profileContext: "public", notificationsFilter: "all" });
    resetRecommendationsStore();
    renderEntryGate();
    el.status.textContent = "Erro: " + esc((err && err.message) || err);
  }
}
if (el.nav) {
  el.nav.addEventListener("click", (ev) => {
    const button = ev.target.closest("button[data-tab]");
    if (button) {
      const tab = String(button.dataset.tab || "");
      if (tab === "profile" && isCommonUser()) {
        setState({ profileContext: "personal" });
      }
      setScreen(tab);
    }
  });
}
if (el.search) {
  el.search.addEventListener("input", () => {
    setState({ exploreSearch: el.search.value || "" });
    renderAll();
  });
}
if (el.exploreOpenFilters) {
  el.exploreOpenFilters.addEventListener("click", () => {
    setState({ exploreAdvancedOpen: !state.exploreAdvancedOpen });
    renderAll();
  });
}
document.addEventListener("keydown", (ev) => {
  if (ev.key !== "Escape") return;
  closeItemModal();
  closeReviewsModal();
  closeSharePicker();
  if (state.exploreAdvancedOpen) {
    setState({ exploreAdvancedOpen: false });
    renderAll();
  }
});
window.addEventListener("resize", () => {
  updateProfileStickyOffsets();
});
window.addEventListener("orientationchange", () => {
  updateProfileStickyOffsets();
});
if (!el.status || !el.nav || !el.home || !el.explore || !el.explorePager || !el.head || !el.tabs || !el.subtabs || !el.content || !el.notificationsFilters || !el.notificationsList || !el.edit || !el.settings || !el.entryGate || !el.appShell) {
  if (el.status) el.status.textContent = "Erro: elementos base do layout em falta.";
} else {
  setupExploreSentinelObserver();
  renderEntryGate();
  setState({ currentTab: "home" });
  bootstrap();
}




















