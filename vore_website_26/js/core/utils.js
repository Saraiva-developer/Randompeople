export function escUi(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

export function deepCloneUi(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

export function clampNumberUi(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function isLikelyHtmlUi(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

export function sanitizeRichHtmlUi(ctx, value) {
  const { documentRef, esc, isLikelyHtml } = ctx || {};
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parser = new DOMParser();
  const wrapped = isLikelyHtml(raw)
    ? raw
    : raw
        .split(/\r?\n/)
        .map((line) => "<p>" + esc(line) + "</p>")
        .join("");
  const doc = parser.parseFromString("<div>" + wrapped + "</div>", "text/html");
  const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "BR", "P", "DIV", "UL", "OL", "LI", "SPAN"]);
  const walker = (documentRef || document).createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
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

export function galleryDefaultViewUi() {
  return { fit: "contain", zoom: 100, posX: 50, posY: 50 };
}

export function normalizeGalleryViewUi(ctx, raw) {
  const { clampNumber } = ctx || {};
  const base = raw && typeof raw === "object" ? raw : {};
  const fit = String(base.fit || "").trim().toLowerCase() === "contain" ? "contain" : "cover";
  const zoom = clampNumber(base.zoom, 80, 220, 100);
  const posX = clampNumber(base.posX, 0, 100, 50);
  const posY = clampNumber(base.posY, 0, 100, 50);
  return { fit, zoom, posX, posY };
}

export function ensureGalleryViewLengthUi(ctx, list, viewList) {
  const { normalizeGalleryView } = ctx || {};
  const mediaList = Array.isArray(list) ? list : [];
  const source = Array.isArray(viewList) ? viewList : [];
  const next = mediaList.map((_, idx) => normalizeGalleryView(source[idx]));
  return next;
}

export function getGalleryViewStyleUi(ctx, view, mediaType) {
  const { normalizeGalleryView } = ctx || {};
  const safe = normalizeGalleryView(view);
  if (mediaType === "video") return "object-fit:" + safe.fit + ";";
  const scale = Math.max(0.8, safe.zoom / 100);
  const tx = (safe.posX - 50).toFixed(2);
  const ty = (safe.posY - 50).toFixed(2);
  return (
    "object-fit:" +
    safe.fit +
    ";object-position:center center;transform:translate(" +
    tx +
    "%," +
    ty +
    "%) scale(" +
    scale.toFixed(2) +
    ");"
  );
}

export function normalizeTextUi(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyUi(value) {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "perfil"
  );
}

export function setModalBodyLockUi(ctx, forceLock) {
  const { documentRef, itemModalState, reviewsState } = ctx || {};
  const shouldLock = !!forceLock || !!itemModalState.open || !!reviewsState.open;
  if (documentRef && documentRef.body) {
    documentRef.body.classList.toggle("modal-lock", shouldLock);
  }
}

export function centerActiveChipUi(container, selector = "button.active") {
  if (!container) return;
  const node = container.querySelector(selector);
  if (!node || typeof node.scrollIntoView !== "function") return;
  try {
    node.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" });
  } catch (_e) {}
}

export function updateProfileStickyOffsetsUi(ctx) {
  const { documentRef, el } = ctx || {};
  const topbar = documentRef.querySelector(".topbar");
  const tabs = el && el.tabs ? el.tabs : null;
  const topbarHeight = Math.max(
    48,
    Math.ceil((topbar && topbar.getBoundingClientRect && topbar.getBoundingClientRect().height) || 56)
  );
  const tabsHeight = Math.max(
    36,
    Math.ceil((tabs && tabs.getBoundingClientRect && tabs.getBoundingClientRect().height) || 42)
  );
  documentRef.documentElement.style.setProperty("--profile-sticky-top", String(topbarHeight) + "px");
  documentRef.documentElement.style.setProperty("--profile-subtabs-sticky-top", String(topbarHeight + tabsHeight) + "px");
}

export function pickUi(obj, keys) {
  for (const key of keys) {
    const value = obj && obj[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return "";
}

export function inferMediaTypeUi(url, rawType = "") {
  const t = String(rawType || "").trim().toLowerCase();
  if (t === "video" || t === "image") return t;
  const src = String(url || "").toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|$)/.test(src)) return "video";
  return "image";
}

export function readFileAsDataUrlUi(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha a ler ficheiro"));
    reader.readAsDataURL(file);
  });
}

export function toArrayListUi(value) {
  if (Array.isArray(value)) return value.map((v) => String(v || "").trim()).filter(Boolean);
  const raw = String(value || "").trim();
  if (!raw) return [];
  return raw.split(/[;,|]/).map((v) => v.trim()).filter(Boolean);
}

export function normalizeEmailUi(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmailUi(ctx, value) {
  const { normalizeEmail } = ctx || {};
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function linesToListUi(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function listToLinesUi(list) {
  return (Array.isArray(list) ? list : [])
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .join("\n");
}
