export const EDIT_TAB_TEMPLATES = [
  { type: "sobre", label: "Sobre" },
  { type: "servicos", label: "Servicos" },
  { type: "menu", label: "Menu" },
  { type: "produtos", label: "Produtos" },
  { type: "campanhas", label: "Campanhas" },
  { type: "galeria", label: "Galeria" },
  { type: "agenda", label: "Agenda" },
  { type: "horario", label: "Horario" },
  { type: "locais", label: "Localizacao" },
  { type: "parcerias", label: "Parcerias" },
  { type: "portfolio", label: "Portfolio" },
  { type: "casas", label: "Casas" },
  { type: "quartos", label: "Quartos" },
];

export const LINK_TYPE_OPTIONS = [
  "website",
  "instagram",
  "whatsapp",
  "facebook",
  "x",
  "youtube",
  "tiktok",
  "linkedin",
  "outro",
];

export const LINK_TYPE_META = {
  website: { label: "Website" },
  instagram: { label: "Instagram" },
  whatsapp: { label: "WhatsApp" },
  facebook: { label: "Facebook" },
  x: { label: "X" },
  youtube: { label: "YouTube" },
  tiktok: { label: "TikTok" },
  linkedin: { label: "LinkedIn" },
  outro: { label: "Outro" },
};

export function getLinkTypeLabel(type) {
  const key = String(type || "").trim().toLowerCase();
  const meta = LINK_TYPE_META[key];
  if (!meta) return key || "Link";
  return meta.label;
}

export function getLinkTypeIconHtml(type, getSocialIconSvg) {
  if (typeof getSocialIconSvg !== "function") return "";
  const key = String(type || "").trim().toLowerCase();
  const iconKey = key && key !== "outro" ? key : "website";
  return "<span class=\"edit-link-type-icon social-" + iconKey + "\" aria-hidden=\"true\">" + getSocialIconSvg(iconKey) + "</span>";
}

export function getTabVisibilityIconSvg(enabled) {
  if (enabled) {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><circle cx='12' cy='12' r='3' stroke='currentColor' stroke-width='2'/></svg>";
  }
  return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M3 3 21 21' stroke='currentColor' stroke-width='2' stroke-linecap='round'/><path d='M10.6 6.2A10.9 10.9 0 0 1 12 6c6.5 0 10 6 10 6a17.7 17.7 0 0 1-4.3 4.7M6.5 8.4C3.9 10.3 2 12 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.9-.8M9.9 9.9A3 3 0 0 0 12 15a3 3 0 0 0 2.1-.9' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
}

export function getTabRemoveIconSvg() {
  return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M4 7h16' stroke='currentColor' stroke-width='2' stroke-linecap='round'/><path d='M9 7V5h6v2M8 10v8m4-8v8m4-8v8' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M6 7l1 13h10l1-13' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/></svg>";
}

export function getSectionCollapseIconSvg(expanded) {
  if (expanded) {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M6 14l6-6 6 6' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
  }
  return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M6 10l6 6 6-6' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
}

export function getTabTemplateLabel(type) {
  const key = String(type || "").trim().toLowerCase();
  return (EDIT_TAB_TEMPLATES.find((item) => item.type === key) || {}).label || "Aba";
}

export function normalizeLinksForEditor(rawLinks) {
  if (!Array.isArray(rawLinks)) return [];
  return rawLinks
    .map((entry, idx) => ({
      key: String((entry && (entry.key || entry.id)) || ("link-" + (idx + 1))),
      type: String((entry && entry.type) || "website").trim().toLowerCase() || "website",
      url: String((entry && (entry.url || entry.value)) || "").trim(),
      label: String((entry && entry.label) || "").trim(),
    }))
    .filter((entry) => entry.type || entry.url || entry.label);
}

export function normalizeTabsForEditor(rawTabs, fallbackTabs, slugify) {
  const TAB_LABEL_MAX_LENGTH = 32;
  const toSlug = typeof slugify === "function"
    ? slugify
    : (value) => String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const sanitizeTabLabel = (value, fallbackLabel) => {
    let out = String(value || "").replace(/\s+/g, " ").trim();
    if (!out) out = String(fallbackLabel || "Aba").trim();
    if (out.length > TAB_LABEL_MAX_LENGTH) out = out.slice(0, TAB_LABEL_MAX_LENGTH).trim();
    if (!out) out = String(fallbackLabel || "Aba").trim() || "Aba";
    return out;
  };
  const source = Array.isArray(rawTabs) && rawTabs.length ? rawTabs : (Array.isArray(fallbackTabs) ? fallbackTabs : []);
  const mapped = source.map((tab, idx) => {
    const type = String((tab && (tab.type || tab.id)) || "").trim().toLowerCase() || "sobre";
    const defaultLabel = getTabTemplateLabel(type) || ("Aba " + (idx + 1));
    const label = sanitizeTabLabel((tab && (tab.label || tab.name)) || defaultLabel, defaultLabel);
    const id = String((tab && tab.id) || toSlug((type || "tab") + "-" + label) || ("tab-" + (idx + 1)));
    const enabledRaw = tab && tab.enabled;
    const enabled = !(enabledRaw === false || String(enabledRaw || "").trim().toLowerCase() === "false");
    return { id, type, label, enabled };
  });
  const usedIds = new Set();
  return mapped.map((tab, idx) => {
    let nextId = String((tab && tab.id) || "").trim() || ("tab-" + (idx + 1));
    if (usedIds.has(nextId)) {
      const baseId = nextId;
      let cursor = 2;
      while (usedIds.has(baseId + "-" + cursor)) cursor += 1;
      nextId = baseId + "-" + cursor;
    }
    usedIds.add(nextId);
    return Object.assign({}, tab, { id: nextId });
  });
}

export function ensureUniqueTabId(base, tabs, slugify) {
  const cleanBase = slugify(base || "tab") || "tab";
  const used = new Set((Array.isArray(tabs) ? tabs : []).map((tab) => String((tab && tab.id) || "")));
  if (!used.has(cleanBase)) return cleanBase;
  let cursor = 2;
  while (used.has(cleanBase + "-" + cursor)) cursor += 1;
  return cleanBase + "-" + cursor;
}

export function parseTagReferences(value) {
  const text = Array.isArray(value) ? value.join(" ") : String(value || "");
  const tokens = text
    .split(/[\s,;]+/)
    .map((entry) => String(entry || "").trim().replace(/^#+/, ""))
    .map((entry) => entry.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    .map((entry) => entry.toLowerCase())
    .map((entry) => entry.replace(/[^a-z0-9_-]/g, ""))
    .map((entry) => entry.slice(0, 24))
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  tokens.forEach((entry) => {
    if (seen.has(entry)) return;
    seen.add(entry);
    out.push(entry);
  });
  return out.slice(0, 24);
}

export function tagsToInput(value) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((entry) => String(entry || "").trim().replace(/^#+/, ""))
    .filter(Boolean)
    .map((entry) => "#" + entry)
    .join(" ");
}

export function extractAboutPlainText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function getEditAutosaveKey(profileId) {
  return "vore-edit-autosave-v2-" + String(profileId || 0);
}

export function safeParseAutosave(raw) {
  try {
    const parsed = JSON.parse(String(raw || ""));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_err) {
    return null;
  }
}

export function buildEditorSnapshot(editor, deepClone) {
  return {
    draft: deepClone(editor.draft || {}),
    activeSubByTab: deepClone(editor.activeSubByTab || {}),
    collapsedItemsBySection: deepClone(editor.collapsedItemsBySection || {}),
    collapsedTopSections: deepClone(editor.collapsedTopSections || {}),
    previewNav: deepClone(editor.previewNav || {}),
    manageTabId: String(editor.manageTabId || ""),
    newTabDraft: deepClone(editor.newTabDraft || { type: "servicos", label: "" }),
    newLinkDraft: deepClone(editor.newLinkDraft || { type: "", url: "", label: "" }),
    galleryPagerByTab: deepClone(editor.galleryPagerByTab || {}),
    gallerySelectedByTab: deepClone(editor.gallerySelectedByTab || {}),
  };
}

export function applyEditorSnapshot(editor, snapshot, deepClone) {
  if (!snapshot || typeof snapshot !== "object") return;
  if (snapshot.draft && typeof snapshot.draft === "object") editor.draft = deepClone(snapshot.draft);
  editor.activeSubByTab = deepClone(snapshot.activeSubByTab || {});
  editor.collapsedItemsBySection = deepClone(snapshot.collapsedItemsBySection || {});
  editor.collapsedTopSections = deepClone(snapshot.collapsedTopSections || {});
  editor.previewNav = deepClone(snapshot.previewNav || { tabId: "", subByTab: {}, catalogView: {} });
  editor.manageTabId = String(snapshot.manageTabId || "");
  editor.newTabDraft = deepClone(snapshot.newTabDraft || { type: "servicos", label: "" });
  editor.newLinkDraft = deepClone(snapshot.newLinkDraft || { type: "", url: "", label: "" });
  editor.galleryPagerByTab = deepClone(snapshot.galleryPagerByTab || {});
  editor.gallerySelectedByTab = deepClone(snapshot.gallerySelectedByTab || {});
}

export function isLikelyUrlForLink(raw, type) {
  const value = String(raw || "").trim();
  if (!value) return true;
  if (value.startsWith("@")) return true;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return true;
  const lowerType = String(type || "").trim().toLowerCase();
  if (lowerType === "whatsapp" && (/^(\+?\d{7,})$/.test(value.replace(/\s+/g, "")) || /^wa\.me\//i.test(value))) return true;
  if (lowerType === "instagram" || lowerType === "tiktok" || lowerType === "x") return /^[a-z0-9._-]{2,}$/i.test(value);
  if (lowerType === "website" || lowerType === "facebook" || lowerType === "youtube" || lowerType === "linkedin" || lowerType === "outro") {
    return /[a-z0-9-]+\.[a-z]{2,}/i.test(value);
  }
  return value.length >= 3;
}

export function validateEditorDraft(editor, getDraftSections, isSimpleEditTab) {
  const errors = [];
  const name = String((editor && editor.draft && editor.draft.name) || "").trim();
  if (!name) errors.push("O nome do perfil e obrigatorio.");

  const data = (editor && editor.draft && editor.draft.data) || {};
  const links = normalizeLinksForEditor(data.links);
  links.forEach((link, idx) => {
    const value = String(link.url || "").trim();
    if (!value) return;
    if (!isLikelyUrlForLink(value, link.type)) {
      errors.push("Link " + (idx + 1) + " parece invalido (" + getLinkTypeLabel(link.type) + ").");
    }
  });

  const tabs = Array.isArray(data.tabs) ? data.tabs : [];
  if (!tabs.length) errors.push("Adiciona pelo menos uma aba.");
  if (tabs.length && !tabs.some((tab) => tab && tab.enabled !== false)) {
    errors.push("Ativa pelo menos uma aba no perfil.");
  }
  const seenLabels = new Set();
  tabs.forEach((tab) => {
    const label = String((tab && tab.label) || "").trim().toLowerCase();
    if (!label) return;
    if (seenLabels.has(label)) {
      errors.push("Existem abas com o mesmo nome. Usa nomes unicos para evitar confusao.");
    }
    seenLabels.add(label);
  });

  const checkNumeric = (value, contextLabel) => {
    const text = String(value || "").trim();
    if (!text) return;
    const stripped = text.replace(/\s+/g, "").replace(",", ".").replace("€", "").replace(/EUR/ig, "");
    if (!/^-?\d+(\.\d+)?(\/[a-z]+)?$/i.test(stripped)) {
      errors.push(contextLabel + " deve usar formato numerico simples (ex: 29.90 ou 85/noite).");
    }
  };
  tabs.forEach((tab) => {
    const tabId = String((tab && tab.id) || "").trim().toLowerCase();
    if (!tabId || tabId === "sobre" || isSimpleEditTab(tabId)) return;
    const sections = getDraftSections(tabId);
    (Array.isArray(sections) ? sections : []).forEach((section) => {
      const sectionName = String((section && (section.label || section.id)) || "Categoria").trim();
      const items = Array.isArray(section && section.items) ? section.items : [];
      items.forEach((item, idx) => {
        checkNumeric(item && item.price, sectionName + " item " + (idx + 1) + " (preco)");
        checkNumeric(item && item.priceNight, sectionName + " item " + (idx + 1) + " (preco noite)");
        checkNumeric(item && item.promoOldPrice, sectionName + " item " + (idx + 1) + " (promo antiga)");
        checkNumeric(item && item.promoNowPrice, sectionName + " item " + (idx + 1) + " (promo atual)");
      });
    });
  });

  return errors;
}

export function formatEditStatusTime(ts) {
  const time = Number(ts || 0);
  if (!time) return "";
  try {
    return new Date(time).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  } catch (_err) {
    return "";
  }
}

export function buildSimplePreviewSections(tabId, editor, getDraftGalleryLists) {
  const key = String(tabId || "").trim().toLowerCase();
  const data = (editor && editor.draft && editor.draft.data) || {};
  if (key === "galeria") {
    const galleryLists = typeof getDraftGalleryLists === "function"
      ? getDraftGalleryLists()
      : {
          photos: (data.gallery && Array.isArray(data.gallery.photos)) ? data.gallery.photos : [],
          videos: (data.gallery && Array.isArray(data.gallery.videos)) ? data.gallery.videos : [],
          reels: (data.gallery && Array.isArray(data.gallery.reels)) ? data.gallery.reels : [],
        };
    return [
      { id: "photos", label: "Fotos", items: (galleryLists.photos || []).map((url, idx) => ({ name: "Foto " + (idx + 1), mediaUrl: url, mediaType: "image" })) },
      { id: "videos", label: "Videos", items: (galleryLists.videos || []).map((url, idx) => ({ name: "Video " + (idx + 1), mediaUrl: url, mediaType: "video" })) },
    ];
  }
  if (key === "horario") {
    const schedule = (data.schedule && typeof data.schedule === "object") ? data.schedule : {};
    const weekdays = [
      ["seg", "Segunda"],
      ["ter", "Terca"],
      ["qua", "Quarta"],
      ["qui", "Quinta"],
      ["sex", "Sexta"],
      ["sab", "Sabado"],
      ["dom", "Domingo"],
    ];
    return [{
      id: "horario",
      label: "Horario",
      items: weekdays
        .map(([day, name]) => ({ day, name, time: String(schedule[day] || "").trim() }))
        .filter((row) => row.time),
    }];
  }
  if (key === "agenda") {
    const agenda = (data.agenda && typeof data.agenda === "object") ? data.agenda : {};
    const slots = Array.isArray(agenda.slots) ? agenda.slots : [];
    return [{
      id: "agenda",
      label: "Agenda",
      items: slots.map((slot, idx) => ({
        name: String(slot && (slot.weekday || slot.displayDay || slot.day)) || ("Slot " + (idx + 1)),
        day: String(slot && (slot.day || slot.date || slot.rawDay) || ""),
        weekday: String(slot && (slot.weekday || slot.displayDay) || ""),
        times: Array.isArray(slot && slot.times) ? slot.times : [],
        description: String(agenda.description || ""),
        reserveLink: String(agenda.reserveLink || ""),
      })),
    }];
  }
  if (key === "parcerias") {
    return [{ id: "parcerias", label: "Parcerias", items: Array.isArray(data.partners) ? data.partners : [] }];
  }
  if (key === "locais") {
    return [{ id: "locais", label: "Locais", items: Array.isArray(data.locations) ? data.locations : [] }];
  }
  return [];
}

export function getPreviewContentWrapperClass(tabId) {
  const key = String(tabId || "").trim().toLowerCase();
  if (key === "galeria") return "profile-gallery-grid";
  if (key === "horario") return "profile-schedule-list";
  if (key === "agenda") return "profile-agenda-list";
  if (key === "parcerias") return "profile-partners-grid";
  if (key === "locais") return "profile-locations-list";
  if (key === "campanhas") return "profile-campaign-grid";
  return "edit-preview-items";
}


