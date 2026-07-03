function formatEuroPrice(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.indexOf("\u20AC") >= 0) return text;
  if (/\bEUR\b/i.test(text)) return text.replace(/\s*EUR\b/ig, " \u20AC").replace(/\s+\u20AC/g, " \u20AC").trim();
  if (/^\d+(?:[.,]\d{1,2})?$/.test(text)) return text + " \u20AC";
  return text;
}
export function renderCardsUi(ctx, list, root, options = {}) {
  const {
    isCommonUser,
    esc,
    getBadgeType,
    isProfileSaved,
    toggleSavedProfile,
    onRenderAll,
    resolveProfileOriginTab,
    openPublicProfile,
    PROFILE_TYPE_LABEL,
  } = ctx || {};

  const compact = !!options.compact;
  const emptyText = options.emptyText || "Sem perfis.";
  const canSaveProfiles = isCommonUser();
  const inputList = Array.isArray(list) ? list : [];
  if (!inputList.length) {
    root.innerHTML = "<div class=\"panel\"><p class=\"muted\">" + esc(emptyText) + "</p></div>";
    return;
  }
  root.innerHTML = inputList
    .map((p) => {
      const badgeType = getBadgeType(p);
      const showBadge = badgeType && badgeType !== "verif";
      const verifiedIcon = badgeType === "verif"
        ? "<span class=\"card-avatar-verif\" title=\"Verificado\">&#10004;</span>"
        : "";
      return (
        "<article class=\"card" + (compact ? " card-compact" : "") + "\" data-id=\"" + p.id + "\">" +
        (showBadge ? ("<span class=\"card-badge card-badge-" + esc(badgeType) + "\">" + esc(badgeType === "promo" ? "Promo" : "Novo") + "</span>") : "") +
        "<div class=\"card-avatar-wrap\">" +
        (p.avatar ? "<img class=\"card-avatar\" src=\"" + esc(p.avatar) + "\" alt=\"" + esc(p.name || "Perfil") + "\" />" : "<div class=\"card-avatar placeholder\">" + esc((p.name || "P").slice(0,1).toUpperCase()) + "</div>") +
        verifiedIcon +
        "</div>" +
        "<div class=\"card-name-row\"><h3>" + esc(p.name) + "</h3></div>" +
        "<p class=\"muted\">" + esc(p.category || PROFILE_TYPE_LABEL[p.type] || "Perfil") + "</p>" +
        "<p class=\"muted\">" + esc(p.location || "Sem localizacao") + "</p>" +
        (p.rating ? "<p class=\"rating\">&#9733; " + esc(p.rating) + "</p>" : "") +
        (canSaveProfiles ? "<button type=\"button\" class=\"card-save-btn" + (isProfileSaved(p.id) ? " active" : "") + "\" data-card-save=\"" + p.id + "\" title=\"Guardar perfil\">" + (isProfileSaved(p.id) ? "&#9733;" : "&#9734;") + "</button>" : "") +
        "</article>"
      );
    })
    .join("");

  root.querySelectorAll("button[data-card-save]").forEach((button) => {
    button.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const id = Number(button.dataset.cardSave || 0);
      if (!id) return;
      toggleSavedProfile(id);
      onRenderAll();
    });
  });

  root.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      const fromTab = resolveProfileOriginTab();
      openPublicProfile(Number(card.dataset.id || 0) || null, { fromTab });
    });
  });
}

export function renderItemUi(ctx, tabId, item, idx = 0) {
  const {
    pick,
    isOnFlag,
    esc,
    toOpenableUrl,
    inferMediaType,
    normalizeGalleryView,
    getGalleryViewStyle,
    getItemMediaList,
    resolveServiceTypeMeta,
  } = ctx || {};

  const title = (tabId === "servicos" ? pick(item, ["name", "title", "label"]) : pick(item, ["name", "title", "label", "description"])) || "Item";
  const subtitle = tabId === "servicos" ? pick(item, ["shortDescription", "summary", "note", "notes"]) : pick(item, ["shortDescription", "description", "note", "notes"]);
  const promoEnabledItem = isOnFlag(item && item.promoEnabled);
  const quoteOnlyItem = isOnFlag(item && item.quoteOnly);
  const stockOutItem = String(item && item.stock || "").trim().toLowerCase() === "out";
  if (tabId === "horario") {
    const value = pick(item, ["time", "value", "description"]);
    const valueText = String(value || "-").trim();
    const closedValue = /^(fechado|closed|encerrado)$/i.test(valueText);
    return (
      "<article class=\"panel profile-item profile-schedule-card\" data-profile-item=\"" + idx + "\">" +
      "<div class=\"profile-schedule-day\">" + esc(title) + "</div>" +
      "<div class=\"profile-schedule-time" + (closedValue ? " is-closed" : "") + "\">" + esc(valueText || "-") + "</div>" +
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
    const image = pick(item, ["avatar", "image", "logo"]);
    const name = pick(item, ["name", "title", "label"]) || "Parceiro";
    const category = pick(item, ["category", "subtitle", "type"]) || (/distribuidor pro/i.test(name) ? "Loja de Tenis" : (/marca prime/i.test(name) ? "Club Night" : "Parceiro"));
    const location = pick(item, ["location", "city", "address"]) || (/distribuidor pro/i.test(name) ? "Porto" : (/marca prime/i.test(name) ? "Setubal" : "Portugal"));
    const rating = pick(item, ["rating", "score"]) || (/distribuidor pro/i.test(name) ? "4.4" : (/marca prime/i.test(name) ? "4.5" : "4.5"));
    const verified = !!(item && (item.verified === true || String(item.badge || "").toLowerCase() === "verif" || /distribuidor pro|marca prime/i.test(name)));
    const initials = String(name || "P").trim().slice(0, 1).toUpperCase() || "P";
    return (
      "<article class=\"card\" data-profile-item=\"" + idx + "\">" +
      "<div class=\"card-avatar-wrap\">" +
      (image
        ? "<img class=\"card-avatar\" src=\"" + esc(image) + "\" alt=\"" + esc(name) + "\" />"
        : "<div class=\"card-avatar placeholder\">" + esc(initials) + "</div>") +
      (verified ? "<span class=\"card-avatar-verif\" title=\"Verificado\">&#10004;</span>" : "") +
      "</div>" +
      "<div class=\"card-name-row\"><h3>" + esc(name) + "</h3></div>" +
      (category ? "<p class=\"muted\">" + esc(category) + "</p>" : "") +
      (location ? "<p class=\"muted\">" + esc(location) + "</p>" : "") +
      (rating ? "<p class=\"rating\">&#9733; " + esc(String(rating)) + "</p>" : "") +
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
      "<article class=\"profile-item profile-gallery-item\" data-profile-item=\"" + idx + "\">" +
      mediaBlock +
      "" +
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
        "<span class=\"profile-item-price-old\">" + esc(formatEuroPrice(promoOld)) + "</span>" +
        "<strong class=\"profile-item-price-now\">" + esc(formatEuroPrice(promoNow)) + "</strong>" +
      "</div>"
    )
    : "";
  const priceBlock = !promoBlock && showPriceDefault
    ? ("<p class=\"profile-item-price\">" + esc(formatEuroPrice(price)) + "</p>")
    : "";
  const flags = [];
  if (tabId === "servicos" && quoteOnlyItem) flags.push("<span class=\"profile-item-flag profile-item-flag-budget\">Sob orcamento</span>");
  if (tabId === "produtos") flags.push("<span class=\"profile-item-flag " + (stockOutItem ? "profile-item-flag-out" : "profile-item-flag-in") + "\">" + (stockOutItem ? "Esgotado" : "Em stock") + "</span>");
  const flagsBlock = flags.length ? "<div class=\"profile-item-flags\">" + flags.join("") + "</div>" : "";
  const rawServiceType = String(item && (item.serviceTypeLabel || item.serviceType || item.type) || "").trim();
  const serviceTypeMeta = resolveServiceTypeMeta(item && (item.serviceType || item.type));
  const serviceTypeLabel = serviceTypeMeta.id !== "general" ? serviceTypeMeta.label : (/^(general|geral)$/i.test(rawServiceType) ? "" : rawServiceType);
  const serviceNote = String(item && (item.note || item.notes) || "").trim();
  const serviceSummary = String(item && (item.shortDescription || item.summary) || "").trim();
  const serviceMetaBlock = tabId === "servicos" && (duration || serviceTypeLabel)
    ? "<div class=\"profile-service-meta-row\">" +
      (duration ? "<span class=\"profile-service-meta\"><strong>Duracao</strong> " + esc(String(duration)) + "</span>" : "") +
      (serviceTypeLabel ? "<span class=\"profile-service-type-badge\">" + esc(serviceTypeLabel) + "</span>" : "") +
      "</div>"
    : "";
  const serviceDetailsBlock = tabId === "servicos" && serviceSummary
    ? "<p class=\"profile-service-summary\">" + esc(serviceSummary) + "</p>"
    : "";
  if (tabId === "servicos") {
    const quoteBlock = quoteOnlyItem ? "<span class=\"profile-item-flag profile-item-flag-budget\">Sob orcamento</span>" : "";
    const priceRight = promoBlock || quoteBlock || priceBlock;
    const serviceMediaBlock = itemImage
      ? "<div class=\"profile-service-media\"><img src=\"" + esc(itemImage) + "\" alt=\"" + esc(title) + "\" /></div>"
      : "";
    return (
      "<article class=\"panel profile-item profile-service-item" + (serviceMediaBlock ? " has-media" : "") + "\" data-profile-item=\"" + idx + "\">" +
        serviceMediaBlock +
        "<div class=\"profile-service-body\">" +
          "<div class=\"profile-service-top-row\">" +
            "<strong class=\"profile-service-title\" title=\"" + esc(title) + "\">" + esc(title) + "</strong>" +
            "<div class=\"profile-service-right\">" + priceRight + "</div>" +
          "</div>" +
          serviceMetaBlock +
          serviceDetailsBlock +
        "</div>" +
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
    ((tabId === "casas" || tabId === "quartos") ? "<p class=\"item-night-price\">" + esc(price ? (formatEuroPrice(price) + " / noite") : "Sob consulta") + "</p>" : "") +
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

