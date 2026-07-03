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

function normalizeSectionsForEditor(tabId, rawSections, rawFlat, helpers) {
  const { slugify, deepClone, isEnabledFlag } = helpers || {};
  const SECTION_LABEL_MAX_LENGTH = 40;
  const toSlug = typeof slugify === "function"
    ? slugify
    : (value) => String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const sanitizeSectionLabel = (value, fallbackValue) => {
    let out = String(value || "").replace(/\s+/g, " ").trim();
    if (!out) out = String(fallbackValue || "Categoria").trim();
    if (out.length > SECTION_LABEL_MAX_LENGTH) out = out.slice(0, SECTION_LABEL_MAX_LENGTH).trim();
    if (!out) out = String(fallbackValue || "Categoria").trim() || "Categoria";
    return out;
  };
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
      const label = sanitizeSectionLabel((section && (section.label || section.name)) || (fallbackLabel + " " + (idx + 1)), (fallbackLabel + " " + (idx + 1)));
      const id = String((section && section.id) || toSlug(label) || ("categoria-" + (idx + 1)));
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
          const label = sanitizeSectionLabel(name || (byItemLabel + " " + (idx + 1)), (byItemLabel + " " + (idx + 1)));
          return {
            id: toSlug(label) || (toSlug(byItemLabel) + "-" + (idx + 1)),
            label,
            items: [deepClone(item || {})],
            enabled: isEnabledFlag(item && item.enabled),
          };
        })
        .filter((section) => section.enabled !== false);
    } else {
      const grouped = {};
      flat.forEach((item) => {
        const label = sanitizeSectionLabel((item && (item.category || item.label)) || fallbackLabel, fallbackLabel);
        if (!grouped[label]) grouped[label] = [];
        grouped[label].push(deepClone(item || {}));
      });
      sections = Object.keys(grouped).map((label, idx) => ({
        id: toSlug(label) || ("categoria-" + (idx + 1)),
        label: sanitizeSectionLabel(label, fallbackLabel),
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
        const label = sanitizeSectionLabel(name || (byItemLabel + " " + (expanded.length + 1)), (byItemLabel + " " + (expanded.length + 1)));
        expanded.push({
          id: toSlug((section && section.id ? String(section.id) + "-" : "") + label) || (toSlug(byItemLabel) + "-" + (secIdx + 1) + "-" + (itemIdx + 1)),
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
  const usedIds = new Set();
  return sections.map((section, idx) => {
    const fallbackSectionLabel = tabId === "casas"
      ? ("Casa " + (idx + 1))
      : tabId === "quartos"
        ? ("Quarto " + (idx + 1))
        : (fallbackLabel + " " + (idx + 1));
    const label = sanitizeSectionLabel(section && section.label, fallbackSectionLabel);
    let id = String((section && section.id) || "").trim() || toSlug(label) || ("categoria-" + (idx + 1));
    if (usedIds.has(id)) {
      const baseId = id;
      let cursor = 2;
      while (usedIds.has(baseId + "-" + cursor)) cursor += 1;
      id = baseId + "-" + cursor;
    }
    usedIds.add(id);
    return Object.assign({}, section, { id, label });
  });
}

export function getDraftSectionsUi(ctx, tabId) {
  const { editor, slugify, deepClone, isEnabledFlag } = ctx || {};
  const keys = tabKeyMap(tabId);
  if (!keys.section) return [];
  const data = (editor && editor.draft && editor.draft.data) ? editor.draft.data : {};
  return normalizeSectionsForEditor(tabId, data[keys.section], data[keys.flat], {
    slugify,
    deepClone,
    isEnabledFlag,
  });
}

export function setDraftSectionsUi(ctx, tabId, sections) {
  const { editor } = ctx || {};
  const keys = tabKeyMap(tabId);
  if (!keys.section || !editor || !editor.draft || !editor.draft.data) return;
  const SECTION_LABEL_MAX_LENGTH = 40;
  const sanitizeSectionLabel = (value, fallbackValue) => {
    let out = String(value || "").replace(/\s+/g, " ").trim();
    if (!out) out = String(fallbackValue || "Categoria").trim();
    if (out.length > SECTION_LABEL_MAX_LENGTH) out = out.slice(0, SECTION_LABEL_MAX_LENGTH).trim();
    if (!out) out = String(fallbackValue || "Categoria").trim() || "Categoria";
    return out;
  };
  const slugifyLocal = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const isEnabledValue = (value) => !(value === false || String(value || "").trim().toLowerCase() === "false");

  const sourceSections = Array.isArray(sections) ? sections : [];
  const normalizedSections = sourceSections.map((section, idx) => {
    const fallbackLabel = "Categoria " + (idx + 1);
    const label = sanitizeSectionLabel(section && (section.label || section.name), fallbackLabel);
    const items = Array.isArray(section && section.items) ? section.items : [];
    const enabled = isEnabledValue(section && section.enabled);
    return {
      id: String((section && section.id) || slugifyLocal(label) || ("categoria-" + (idx + 1))),
      label,
      items,
      enabled,
    };
  });

  const usedIds = new Set();
  const nextSections = normalizedSections.map((section, idx) => {
    let nextId = String((section && section.id) || "").trim() || ("categoria-" + (idx + 1));
    if (usedIds.has(nextId)) {
      const baseId = nextId;
      let cursor = 2;
      while (usedIds.has(baseId + "-" + cursor)) cursor += 1;
      nextId = baseId + "-" + cursor;
    }
    usedIds.add(nextId);
    return Object.assign({}, section, { id: nextId });
  });

  const flatItems = nextSections.flatMap((section) => (Array.isArray(section && section.items) ? section.items : []));
  editor.draft.data[keys.section] = nextSections;
  editor.draft.data[keys.flat] = flatItems;
}

export function blankItemUi(tabId) {
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

export function renderEditItemCardUi(ctx, editTab, item, idx, options = {}) {
  const {
    pick,
    isOnFlag,
    isEnabledFlag,
    getMergedItemImages,
    esc,
    resolveServiceTypeMeta,
    SERVICE_TYPE_META,
    listToLines,
    toArrayList,
    inferMediaType,
  } = ctx || {};

  const t = pick(item, ["name", "title", "label", "description"]);
  const d = pick(item, ["description", "shortDescription", "note"]);
  const tm = pick(item, ["time", "duration"]);
  const p = pick(item, ["price", "priceNight", "promoNowPrice", "nightlyPrice", "pricePerNight", "price_per_night"]);
  const lk = pick(item, ["link", "url", "website"]);
  const cap = pick(item, ["capacity", "guests"]);
  const beds = pick(item, ["beds"]);
  const wc = pick(item, ["bathrooms"]);
  const promoEnabled = isOnFlag(item?.promoEnabled);
  const quoteOnly = isOnFlag(item?.quoteOnly);
  const stock = String(item?.stock || "in").toLowerCase() === "out" ? "out" : "in";
  const isProductTab = editTab === "produtos";
  const extraFields = Array.isArray(item?.extraFields) ? item.extraFields : [];
  const itemEnabled = isEnabledFlag(item?.enabled);
  const collapsed = !!options.collapsed;
  const hasModalPreview = editTab !== "sobre";
  const iconEye = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><circle cx='12' cy='12' r='3' stroke='currentColor' stroke-width='2'/></svg>";
  const iconEyeOff = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M3 3 21 21' stroke='currentColor' stroke-width='2' stroke-linecap='round'/><path d='M10.6 6.2A10.9 10.9 0 0 1 12 6c6.5 0 10 6 10 6a17.7 17.7 0 0 1-4.3 4.7M6.5 8.4C3.9 10.3 2 12 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.9-.8M9.9 9.9A3 3 0 0 0 12 15a3 3 0 0 0 2.1-.9' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
  const iconCopy = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><rect x='9' y='9' width='11' height='11' rx='2' stroke='currentColor' stroke-width='2'/><rect x='4' y='4' width='11' height='11' rx='2' stroke='currentColor' stroke-width='2'/></svg>";
  const iconTrash = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M4 7h16' stroke='currentColor' stroke-width='2' stroke-linecap='round'/><path d='M9 7V5h6v2M8 10v8m4-8v8m4-8v8' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M6 7l1 13h10l1-13' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/></svg>";
  const iconChevronUp = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M6 14l6-6 6 6' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
  const iconChevronDown = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M6 10l6 6 6-6' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
  let card = "<article class=\"panel edit-item-card" + (itemEnabled ? "" : " edit-item-card-disabled") + (collapsed ? " edit-item-card-collapsed" : "") + "\">";
  card += "<div class=\"edit-item-header\">";
  card += "<button type=\"button\" class=\"edit-collapse-btn\" data-toggle-item-collapse=\"" + idx + "\" title=\"" + (collapsed ? "Expandir" : "Recolher") + "\" aria-label=\"" + (collapsed ? "Expandir item" : "Recolher item") + "\">" + (collapsed ? iconChevronDown : iconChevronUp) + "</button>";
  card += "<strong class=\"edit-item-title\">#" + (idx + 1) + " " + esc(t || "Item sem titulo") + "</strong>";
  card += "<div class=\"chips edit-item-actions\">";
  if (hasModalPreview) card += "<button type=\"button\" class=\"edit-item-icon-btn\" data-preview-item=\"" + idx + "\" title=\"Ver modal\" aria-label=\"Ver modal\">" + iconEye + "</button>";
  card += "<button type=\"button\" class=\"edit-item-icon-btn\" data-toggle-item-enabled=\"" + idx + "\" title=\"" + (itemEnabled ? "Ocultar item" : "Ativar item") + "\" aria-label=\"" + (itemEnabled ? "Ocultar item" : "Ativar item") + "\">" + (itemEnabled ? iconEyeOff : iconEye) + "</button>";
  card += "<button type=\"button\" class=\"edit-item-icon-btn\" data-dup-item=\"" + idx + "\" title=\"Duplicar\" aria-label=\"Duplicar item\">" + iconCopy + "</button>";
  card += "<button type=\"button\" class=\"edit-item-icon-btn is-danger\" data-remove-item=\"" + idx + "\" title=\"Remover\" aria-label=\"Remover item\">" + iconTrash + "</button>";
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
    if (!isProductTab && itemImage) {
      card += "<img class=\"item-preview\" src=\"" + esc(itemImage) + "\" alt=\"" + esc(t || "Item") + "\" />";
    }
    const coverImage = mergedImages[0] || "";
    card += "<div class=\"edit-media-manager" + (coverImage ? "" : " is-empty") + "\">";
    card += "<div class=\"edit-media-cover-wrap\">";
    card += coverImage
      ? "<img class=\"edit-media-cover\" src=\"" + esc(coverImage) + "\" alt=\"Capa\" />"
      : "<div class=\"edit-media-cover placeholder\">Sem imagem</div>";
    card += "<span class=\"edit-media-cover-badge\">Capa</span>";
    card += "</div>";
    card += "<div class=\"edit-media-strip\">";
    card += mergedImages.map((src, imageIdx) => (
      "<div class=\"edit-media-thumb-wrap" + (imageIdx === 0 ? " is-cover" : "") + "\">" +
        "<button type=\"button\" class=\"edit-media-thumb-btn\" data-set-cover-image=\"" + idx + "\" data-image-idx=\"" + imageIdx + "\" title=\"" + (imageIdx === 0 ? "Imagem de capa" : "Definir como capa") + "\" aria-label=\"" + (imageIdx === 0 ? "Imagem de capa" : "Definir como capa") + "\">" +
          "<img class=\"edit-media-thumb\" src=\"" + esc(src) + "\" alt=\"img " + (imageIdx + 1) + "\" />" +
        "</button>" +
        "<button type=\"button\" class=\"edit-media-thumb-remove\" data-remove-item-image=\"" + idx + "\" data-image-idx=\"" + imageIdx + "\" title=\"Remover\" aria-label=\"Remover imagem\">&times;</button>" +
      "</div>"
    )).join("");
    card += "<label class=\"edit-media-add\" title=\"Adicionar imagem\">+<input type=\"file\" accept=\"image/*\" data-upload-item=\"" + idx + "\" /></label>";
    card += "</div>";
    card += "</div>";
    if (isProductTab) {
      card += "<details class=\"edit-item-advanced\">";
      card += "<summary>Opcoes avancadas da imagem</summary>";
      card += "<div class=\"edit-item-advanced-body\">";
      card += "<label>Imagem URL<input class=\"input\" data-item-field=\"imageUrl\" data-item-idx=\"" + idx + "\" value=\"" + esc(itemImage) + "\" placeholder=\"https://...\" /></label>";
      card += "</div>";
      card += "</details>";
    } else {
      card += "<label>Imagem URL<input class=\"input\" data-item-field=\"imageUrl\" data-item-idx=\"" + idx + "\" value=\"" + esc(itemImage) + "\" /></label>";
    }
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
  if (editTab !== "produtos" && editTab !== "portfolio" && editTab !== "campanhas" && !(editTab === "servicos" && quoteOnly)) {
    const priceLabel = (editTab === "casas" || editTab === "quartos") ? "Preco por noite" : "Preco";
    const priceField = (editTab === "casas" || editTab === "quartos") ? "priceNight" : "price";
    card += "<label>" + priceLabel + "<input class=\"input\" data-item-field=\"" + priceField + "\" data-item-idx=\"" + idx + "\" value=\"" + esc(p) + "\" /></label>";
  }
  if (isProductTab) {
    card += "<div class=\"edit-product-key-grid\">";
    card += "<label>Preco<input class=\"input\" data-item-field=\"price\" data-item-idx=\"" + idx + "\" value=\"" + esc(p) + "\" placeholder=\"Ex: 19,90 EUR\" /></label>";
    card += "<label>Stock<select class=\"input\" data-item-field=\"stock\" data-item-idx=\"" + idx + "\"><option value=\"in\"" + (stock === "in" ? " selected" : "") + ">Em stock</option><option value=\"out\"" + (stock === "out" ? " selected" : "") + ">Esgotado</option></select></label>";
    card += "<label>Promocao<select class=\"input\" data-item-field=\"promoEnabled\" data-item-idx=\"" + idx + "\"><option value=\"no\"" + (!promoEnabled ? " selected" : "") + ">Desativada</option><option value=\"yes\"" + (promoEnabled ? " selected" : "") + ">Ativada</option></select></label>";
    if (promoEnabled) {
      card += "<label>Preco antigo<input class=\"input\" data-item-field=\"promoOldPrice\" data-item-idx=\"" + idx + "\" value=\"" + esc(String(item?.promoOldPrice || "")) + "\" placeholder=\"Ex: 29,90 EUR\" /></label>";
      card += "<label>Preco promocao<input class=\"input\" data-item-field=\"promoNowPrice\" data-item-idx=\"" + idx + "\" value=\"" + esc(String(item?.promoNowPrice || "")) + "\" placeholder=\"Ex: 19,90 EUR\" /></label>";
    }
    card += "</div>";
  }
  if (editTab === "servicos" || editTab === "menu" || editTab === "casas" || editTab === "quartos") {
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
  if (isProductTab) {
    card += "<label>Descricao curta<textarea class=\"input\" data-item-field=\"description\" data-item-idx=\"" + idx + "\" placeholder=\"Resumo rapido do produto para aparecer no cartao\" maxlength=\"220\">" + esc(d) + "</textarea></label>";
  } else {
    card += "<label>Descricao<textarea class=\"input\" data-item-field=\"description\" data-item-idx=\"" + idx + "\">" + esc(d) + "</textarea></label>";
  }
  if (editTab === "servicos" || editTab === "produtos" || editTab === "menu" || editTab === "portfolio") {
    if (isProductTab) {
      card += "<details class=\"edit-item-advanced\">";
      card += "<summary>Campos extra do modal (opcional)</summary>";
      card += "<div class=\"edit-item-advanced-body\">";
    } else {
      card += "<p class=\"muted\">Campos extra (modal)</p>";
    }
    extraFields.forEach((field, fieldIdx) => {
      const name = String(field?.name || "");
      const value = String(field?.value || "");
      const description = String(field?.description || "");
      card += "<div class=\"extra-row\">" +
        "<input class=\"input\" placeholder=\"Campo\" data-item-idx=\"" + idx + "\" data-extra-idx=\"" + fieldIdx + "\" data-extra-field=\"name\" value=\"" + esc(name) + "\" />" +
        "<input class=\"input\" placeholder=\"Valor\" data-item-idx=\"" + idx + "\" data-extra-idx=\"" + fieldIdx + "\" data-extra-field=\"value\" value=\"" + esc(value) + "\" />" +
        "<input class=\"input\" placeholder=\"Descricao\" data-item-idx=\"" + idx + "\" data-extra-idx=\"" + fieldIdx + "\" data-extra-field=\"description\" value=\"" + esc(description) + "\" />" +
        "<button type=\"button\" data-remove-extra=\"" + idx + "\" data-extra-idx=\"" + fieldIdx + "\" title=\"Remover campo extra\" aria-label=\"Remover campo extra " + (fieldIdx + 1) + "\">Remover</button>" +
      "</div>";
    });
    card += "<button type=\"button\" data-add-extra=\"" + idx + "\" title=\"Adicionar campo extra\" aria-label=\"Adicionar campo extra\">Adicionar campo</button>";
    if (isProductTab) {
      card += "</div>";
      card += "</details>";
    }
  }
  card += "</article>";
  return card;
}
