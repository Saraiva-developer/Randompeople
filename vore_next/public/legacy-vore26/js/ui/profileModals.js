function formatEuroPrice(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.indexOf("\u20AC") >= 0) return text;
  if (/\bEUR\b/i.test(text)) return text.replace(/\s*EUR\b/ig, " \u20AC").replace(/\s+\u20AC/g, " \u20AC").trim();
  if (/^\d+(?:[.,]\d{1,2})?$/.test(text)) return text + " \u20AC";
  return text;
}
export function createProfileModals(ctx) {
  const {
    itemModalState,
    reviewsState,
    selectedProfile,
    setModalBodyLock,
    isCommonUser,
    getCurrentModalSharePayload,
    openSharePicker,
    toggleCurrentModalSave,
    renderProfile,
    renderAll,
    getItemMediaList,
    pick,
    isOnFlag,
    toArrayList,
    getGalleryViewStyle,
    resolveServiceTypeMeta,
    esc,
    isCurrentModalSaved,
    api,
    setState,
    state,
  } = ctx || {};

function ensureItemModalRoot() {
  let root = document.getElementById("itemModalRoot");
  if (root) return root;
  root = document.createElement("div");
  root.id = "itemModalRoot";
  root.className = "item-modal-root";
  root.innerHTML = (
    "<div class=\"item-modal-backdrop\" data-modal-close=\"1\"></div>" +
    "<div class=\"item-modal-panel\">" +
      "<div class=\"item-modal-top\">" +        "<button type=\"button\" data-modal-share=\"1\">Partilhar</button>" +
        "<button type=\"button\" data-modal-save=\"1\">Guardar</button>" +
        "<button type=\"button\" data-modal-close=\"1\">&times;</button>" +
      "</div>" +
      "<div id=\"itemModalBody\" class=\"item-modal-body\"></div>" +
    "</div>"
  );
  document.body.appendChild(root);
  root.querySelectorAll("[data-modal-close]").forEach((btn) => btn.addEventListener("click", closeItemModal));
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
  bindItemModalKeyboard(root);
  return root;
}

function bindItemModalKeyboard(root) { if (!root || root.dataset.itemKeyBound === "1") return; root.dataset.itemKeyBound = "1"; }

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
  document.addEventListener("keydown", (ev) => { if (!itemModalState.open) return; const key = String(ev && ev.key || ""); if (key === "Escape") { ev.preventDefault(); if (itemModalState.photoMode) { itemModalState.photoMode = false; renderItemModal(); return; } closeItemModal(); return; } if (key !== "ArrowLeft" && key !== "ArrowRight") return; const dir = key === "ArrowLeft" ? -1 : 1; if (itemModalState.tabId === "galeria") { if (Array.isArray(itemModalState.items) && itemModalState.items.length > 1) { ev.preventDefault(); stepGalleryItem(dir); } return; } const currentItem = itemModalState.items[itemModalState.index] || {}; const mediaList = getItemMediaList(itemModalState.tabId, currentItem); if (Array.isArray(mediaList) && mediaList.length > 1) { ev.preventDefault(); stepItemMedia(dir); } }, true);
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
  itemModalState.photoMode = false;
  itemModalState.open = false;
  const root = document.getElementById("itemModalRoot");
  if (root) root.classList.remove("open");
  setModalBodyLock(false);
}

function stepItemMedia(delta) {
  const item = itemModalState.items[itemModalState.index] || {};
  const mediaList = getItemMediaList(itemModalState.tabId, item);
  const len = Array.isArray(mediaList) ? mediaList.length : 0;
  if (len <= 1) return;
  itemModalState.mediaIndex = (itemModalState.mediaIndex + delta + len) % len;
  renderItemModal();
}

function stepGalleryItem(delta) {
  const len = Array.isArray(itemModalState.items) ? itemModalState.items.length : 0;
  if (len <= 1) return;
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
  itemModalState.photoMode = false;
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
  const title = (tabId === "servicos" ? pick(item, ["name", "title", "label"]) : pick(item, ["name", "title", "label", "description"])) || "Item";
  const subtitle = tabId === "servicos"
    ? pick(item, ["description", "shortDescription", "note", "notes"])
    : pick(item, ["shortDescription", "description", "note", "notes"]);
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
  const isGalleryModal = tabId === "galeria";
  const isLodgingModal = tabId === "casas" || tabId === "quartos";

  const bits = [];
  if (duration && !isServiceModalEarly) bits.push("Duracao: " + duration);
  if (tabId === "servicos" && quoteOnly && !isServiceModalEarly) bits.push("Sob orcamento");
  if (price && !isServiceModalEarly && !isCatalogModalEarly && tabId !== "portfolio" && tabId !== "campanhas" && tabId !== "casas" && tabId !== "quartos") bits.push("Preco: " + formatEuroPrice(price));
  if (promoEnabled && promoOld && promoNow && !isServiceModalEarly && !isCatalogModalEarly) bits.push("Promoção: " + promoOld + " -> " + promoNow);
  if (isLodgingModal) {
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
  const preloadImage = (u) => { if (!u || /\.(mp4|webm|mov|ogg)(\?|$)/i.test(String(u))) return; const img = new Image(); img.src = String(u); };
  if (itemModalState.mediaIndex < 0 || itemModalState.mediaIndex >= mediaList.length) itemModalState.mediaIndex = 0;
  const currentMedia = mediaList[itemModalState.mediaIndex] || null;
  const mediaUrl = currentMedia ? currentMedia.url : "";
  const mediaType = currentMedia ? currentMedia.type : "image";
  const mediaStyle = (currentMedia && currentMedia.galleryView)
    ? getGalleryViewStyle(currentMedia.galleryView, mediaType)
    : (isGalleryModal ? "object-fit:contain;object-position:center center;" : "");
  const isPhotoMode = !!itemModalState.photoMode && !isGalleryModal && !!mediaUrl;
  const photoOpenAttr = (!isGalleryModal && mediaUrl && mediaType !== "video" && !isPhotoMode) ? " data-modal-photo-open=\"1\" title=\"Ver foto em ecra grande\"" : "";
  const mediaInner = !mediaUrl
    ? ""
    : (mediaType === "video"
        ? "<video class=\"item-modal-media\" controls preload=\"metadata\" src=\"" + esc(mediaUrl) + "\" style=\"" + esc(mediaStyle) + "\"></video>"
        : "<img class=\"item-modal-media\"" + photoOpenAttr + " src=\"" + esc(mediaUrl) + "\" alt=\"" + esc(title) + "\" style=\"" + esc(mediaStyle) + "\" />");
  const mediaCanMove = isGalleryModal ? (itemModalState.items.length > 1) : (mediaList.length > 1);
  const mediaCounter = isGalleryModal && mediaCanMove
    ? "<span class=\"item-modal-media-count\">" + esc(String(itemModalState.index + 1) + " / " + String(itemModalState.items.length)) + "</span>"
    : "";
  const mediaBlock = mediaInner
    ? ("<div class=\"item-modal-media-wrap\">" +
        (mediaCanMove ? "<button type=\"button\" class=\"item-modal-media-nav prev\" data-modal-prev=\"1\" aria-label=\"Imagem anterior\">&#8249;</button>" : "") +
        mediaInner +
        mediaCounter +
        (mediaCanMove ? "<button type=\"button\" class=\"item-modal-media-nav next\" data-modal-next=\"1\" aria-label=\"Imagem seguinte\">&#8250;</button>" : "") +
      "</div>")
    : "";
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
  const amenitiesBlock = isLodgingModal && amenities.length
    ? "<div class=\"lodging-amenities\"><p class=\"muted\"><strong>Comodidades</strong></p><div class=\"item-modal-meta\">" + amenities.map((a) => "<span class=\"lodging-amenity-chip\">" + esc(a) + "</span>").join("") + "</div></div>"
    : "";
  const rulesBlock = isLodgingModal && houseRules.length
    ? "<div class=\"lodging-amenities\"><p class=\"muted\"><strong>Regras</strong></p><div class=\"item-modal-meta\">" + houseRules.map((a) => "<span class=\"lodging-amenity-chip\">" + esc(a) + "</span>").join("") + "</div></div>"
    : "";
  const isServiceModal = tabId === "servicos";
  const isCatalogModal = tabId === "produtos" || tabId === "menu";
  const isCompactItemModal = isServiceModal || isCatalogModal || tabId === "portfolio";
  const hasPromo = promoEnabled && promoOld && promoNow;
  const modalPriceBlock = hasPromo
    ? (
      "<div class=\"profile-item-promo profile-item-promo-grid\">" +
        "<span class=\"profile-item-promo-badge\">PROMO</span>" +
        "<span class=\"profile-item-price-old\">" + esc(formatEuroPrice(promoOld)) + "</span>" +
        "<strong class=\"profile-item-price-now\">" + esc(formatEuroPrice(promoNow)) + "</strong>" +
      "</div>"
    )
    : ((price && !(isServiceModal && quoteOnly))
      ? "<p class=\"profile-item-price profile-item-price-grid\">" + esc(formatEuroPrice(price)) + "</p>"
      : (isServiceModal && quoteOnly ? "<span class=\"profile-item-flag profile-item-flag-budget\">Sob orcamento</span>" : ""));
  const rawServiceType = String(item && (item.serviceTypeLabel || item.serviceType || item.type) || "").trim();
  const serviceMeta = resolveServiceTypeMeta(item && (item.serviceType || item.type));
  const serviceTypeLabel = serviceMeta.id !== "general" ? serviceMeta.label : (/^(general|geral)$/i.test(rawServiceType) ? "" : rawServiceType);
  const serviceNote = String(item && (item.note || item.notes) || "").trim();
  const serviceDetailRows = [];
  if (serviceTypeLabel) serviceDetailRows.push(["Tipo", serviceTypeLabel]);
  if (duration) serviceDetailRows.push(["Duracao", String(duration)]);
  const serviceDescriptionHtml = isServiceModal && subtitle
    ? "<section class=\"item-modal-section\"><h3>Descricao</h3><p class=\"item-modal-description\">" + esc(subtitle) + "</p></section>"
    : "";
  const serviceDetailHtml = isServiceModal && (serviceDetailRows.length || serviceNote)
    ? (
      "<section class=\"item-modal-section\"><h3>Detalhes</h3>" +
      (serviceDetailRows.length ? "<div class=\"item-modal-detail-grid\">" + serviceDetailRows.map((row) => "<div class=\"item-modal-detail-row\"><span>" + esc(row[0]) + "</span><strong>" + esc(row[1]) + "</strong></div>").join("") + "</div>" : "") +
      (serviceNote ? "<p class=\"item-modal-service-note\">" + esc(serviceNote) + "</p>" : "") +
      "</section>"
    )
    : "";
  const lodgingPriceBlock = isLodgingModal
    ? "<div class=\"lodging-price item-modal-lodging-price\">" + esc(price ? formatEuroPrice(price) : "Sob consulta") + "<span>/noite</span></div>"
    : "";
  const modalHead = (isServiceModal || isCatalogModal || isLodgingModal)
    ? (
      "<div class=\"item-modal-head\">" +
        "<div class=\"item-modal-head-left\">" +
          "<strong class=\"item-modal-head-title\">" + esc(title) + "</strong>" +
        "</div>" +
        "<div class=\"item-modal-head-right\">" + (isLodgingModal ? lodgingPriceBlock : modalPriceBlock) + "</div>" +
      "</div>"
    )
    : (isGalleryModal ? "" : ("<strong>" + esc(title) + "</strong>"));
  const body = root.querySelector("#itemModalBody");
  if (body && body.classList) {
    body.classList.toggle("gallery-mode", isGalleryModal);
    body.classList.toggle("photo-mode", isPhotoMode);
  }
  const panelEl = root.querySelector(".item-modal-panel");
  if (panelEl && panelEl.classList) {
    panelEl.classList.toggle("gallery-mode", isGalleryModal);
    panelEl.classList.toggle("lodging-mode", isLodgingModal);
    panelEl.classList.toggle("compact-item-mode", isCompactItemModal && !isPhotoMode);
    panelEl.classList.toggle("photo-mode", isPhotoMode);
  }
  const articleClass = isPhotoMode ? "item-modal-photo-view" : (isGalleryModal ? "item-modal-gallery" : "panel");
  body.innerHTML = isPhotoMode ? (
    "<article class=\"" + articleClass + "\">" +
      "<div class=\"item-modal-photo-stage\">" + mediaBlock + "</div>" +
      thumbsBlock +
    "</article>"
  ) : (
    "<article class=\"" + articleClass + "\">" +
      modalHead +
      (isGalleryModal ? (mediaBlock + thumbsBlock) : (isLodgingModal ? (mediaBlock + thumbsBlock) : (thumbsBlock + mediaBlock))) +
      (isServiceModal ? serviceDescriptionHtml : (subtitle && !isGalleryModal ? "<p class=\"muted\">" + esc(subtitle) + "</p>" : "")) +
      serviceDetailHtml +
      (bits.length ? "<div class=\"item-modal-meta\">" + bits.map((bit) => "<span class=\"item-modal-chip\">" + esc(bit) + "</span>").join("") + "</div>" : "") +
      amenitiesBlock +
      rulesBlock +
      extraBlock +
      (href ? "<p><a class=\"campaign-link\" href=\"" + esc(href) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + esc(tabId === "campanhas" ? (pick(item, ["ctaLabel", "buttonLabel"]) || "Ver") : "Abrir link") + "</a></p>" : "") +
    "</article>"
  );
  const canMove = mediaCanMove;
  const canSave = isCommonUser();
  const canShare = isCommonUser();
  const alreadySaved = canSave ? isCurrentModalSaved() : false;
  const prevBtn = body.querySelector("[data-modal-prev]");
  const nextBtn = body.querySelector("[data-modal-next]");
  const shareBtn = root.querySelector("[data-modal-share]");
  const saveBtn = root.querySelector("[data-modal-save]");
  if (prevBtn) prevBtn.style.display = canMove ? "inline-flex" : "none";
  if (prevBtn) prevBtn.onclick = canMove ? (() => (isGalleryModal ? stepGalleryItem(-1) : stepItemMedia(-1))) : null;
  if (nextBtn) nextBtn.style.display = canMove ? "inline-flex" : "none";
  if (nextBtn) nextBtn.onclick = canMove ? (() => (isGalleryModal ? stepGalleryItem(1) : stepItemMedia(1))) : null;
  if (shareBtn) {
    shareBtn.style.display = canShare ? "inline-flex" : "none";
  }
  if (saveBtn) {
    saveBtn.style.display = canSave ? "inline-flex" : "none";
    saveBtn.textContent = alreadySaved ? "Guardado" : "Guardar";
    saveBtn.classList.toggle("active", alreadySaved);
  }
  body.querySelectorAll("[data-modal-photo-open]").forEach((node) => {
    node.addEventListener("click", () => {
      itemModalState.photoMode = true;
      renderItemModal();
    });
  });
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
    reviewsState.error = String((err && err.message) || err || "Erro ao carregar Avaliações.");
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
      "<p class=\"reviews-summary-count\">" + esc(String(total)) + " Avaliações</p>" +
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

  return {
    closeItemModal,
    openItemModal,
    renderItemModal,
    closeReviewsModal,
    loadReviews,
    submitReview,
    renderReviewsModal,
    openReviewsModal,
  };
}














