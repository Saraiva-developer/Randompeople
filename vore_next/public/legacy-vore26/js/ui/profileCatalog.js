export function normalizeUrlListUi(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || "").trim()).filter(Boolean);
}

export function uniqueUrlListUi(list) {
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

export function getProfileGalleryListsUi(ctx, profileData) {
  const { normalizeUrlList, uniqueUrlList } = ctx || {};
  const gallery = profileData && typeof profileData.gallery === "object" ? profileData.gallery : {};
  const photos = normalizeUrlList(gallery.photos || profileData.photos);
  const videos = uniqueUrlList([
    ...normalizeUrlList(gallery.videos || profileData.videos),
    ...normalizeUrlList(gallery.reels || profileData.reels),
  ]);
  const reels = [];
  return { photos, videos, reels };
}

export function getProfileGalleryViewsUi(ctx, profileData) {
  const {
    ensureGalleryViewLength,
    getProfileGalleryLists,
  } = ctx || {};
  const data = profileData && typeof profileData === "object" ? profileData : {};
  const lists = getProfileGalleryLists(data);
  const galleryViews = data.galleryViews && typeof data.galleryViews === "object" ? data.galleryViews : {};
  return {
    photos: ensureGalleryViewLength(lists.photos, galleryViews.photos),
    videos: ensureGalleryViewLength(lists.videos, galleryViews.videos),
    reels: ensureGalleryViewLength(lists.reels, galleryViews.reels),
  };
}

function formatEuroPrice(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.includes("€")) return text;
  if (/\bEUR\b/i.test(text)) return text.replace(/\s*EUR\b/ig, " €").replace(/\s+€/g, " €").trim();
  if (/^\d+(?:[.,]\d{1,2})?$/.test(text)) return text + " €";
  return text;
}

export function bindProfileContentInteractionsUi(ctx, tabId, items) {
  const { el, openItemModal } = ctx || {};
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

export function buildCatalogGridCardUi(ctx, tabId, item, idx) {
  const { pick, getItemMediaList, isOnFlag, esc } = ctx || {};
  const title = pick(item, ["name", "title", "label", "description"]) || "Item";
  const desc = pick(item, ["shortDescription", "description", "note", "notes"]) || "";
  const media = getItemMediaList(tabId, item).find((entry) => entry && entry.type === "image");
  const image = media ? media.url : "";
  const promoEnabled = isOnFlag(item && item.promoEnabled);
  const promoOld = String(pick(item, ["promoOldPrice"]) || "").trim();
  const promoNow = String(pick(item, ["promoNowPrice", "price", "priceNight"]) || "").trim();
  const showPromo = promoEnabled && promoOld && promoNow;
  const price = String(pick(item, ["price", "priceNight", "promoNowPrice"]) || "").trim();
  const stock = String(pick(item, ["stock"]) || "").trim().toLowerCase();
  const isProducts = tabId === "produtos";
  const outOfStock = stock === "out" || stock === "esgotado" || stock === "0";
  const stockBadge = isProducts
    ? ("<span class=\"profile-catalog-stock " + (outOfStock ? "is-out" : "is-in") + "\">" + (outOfStock ? "Esgotado" : "Em stock") + "</span>")
    : "";
  const priceBlock = showPromo
    ? (
      "<div class=\"profile-item-promo profile-item-promo-grid\">" +
        "<span class=\"profile-item-promo-badge\">PROMO</span>" +
        "<span class=\"profile-item-price-old\">" + esc(formatEuroPrice(promoOld)) + "</span>" +
        "<strong class=\"profile-item-price-now\">" + esc(formatEuroPrice(promoNow)) + "</strong>" +
      "</div>"
    )
    : (price ? "<p class=\"profile-item-price profile-item-price-grid\">" + esc(formatEuroPrice(price)) + "</p>" : "");
  return (
    "<article class=\"panel profile-item profile-catalog-grid-item\" data-profile-item=\"" + idx + "\">" +
      (image ? "<img class=\"profile-catalog-grid-image\" src=\"" + esc(image) + "\" alt=\"" + esc(title) + "\" />" : "<div class=\"profile-catalog-grid-image placeholder\"></div>") +
      "<div class=\"profile-catalog-grid-body\">" +
        "<div class=\"profile-catalog-grid-top\">" +
          "<h4 class=\"profile-catalog-grid-title\" title=\"" + esc(title) + "\">" + esc(title) + "</h4>" +
          stockBadge +
        "</div>" +
        (desc ? "<p class=\"profile-catalog-grid-desc\">" + esc(desc) + "</p>" : "") +
        "<div class=\"profile-catalog-grid-price-slot\">" + priceBlock + "</div>" +
      "</div>" +
    "</article>"
  );
}

export function buildCatalogListCardUi(ctx, tabId, item, idx) {
  const { pick, getItemMediaList, isOnFlag, esc } = ctx || {};
  const title = pick(item, ["name", "title", "label", "description"]) || "Item";
  const desc = pick(item, ["shortDescription", "description", "note", "notes"]) || "";
  const media = getItemMediaList(tabId, item).find((entry) => entry && entry.type === "image");
  const image = media ? media.url : "";
  const promoEnabled = isOnFlag(item && item.promoEnabled);
  const promoOld = String(pick(item, ["promoOldPrice"]) || "").trim();
  const promoNow = String(pick(item, ["promoNowPrice", "price", "priceNight"]) || "").trim();
  const showPromo = promoEnabled && promoOld && promoNow;
  const price = String(pick(item, ["price", "priceNight", "promoNowPrice"]) || "").trim();
  const stock = String(pick(item, ["stock"]) || "").trim().toLowerCase();
  const isProducts = tabId === "produtos";
  const outOfStock = stock === "out" || stock === "esgotado" || stock === "0";
  const stockBadge = isProducts
    ? ("<span class=\"profile-catalog-stock " + (outOfStock ? "is-out" : "is-in") + "\">" + (outOfStock ? "Esgotado" : "Em stock") + "</span>")
    : "";
  const priceBlock = showPromo
    ? (
      "<div class=\"profile-item-promo profile-item-promo-grid\">" +
        "<span class=\"profile-item-promo-badge\">PROMO</span>" +
        "<span class=\"profile-item-price-old\">" + esc(formatEuroPrice(promoOld)) + "</span>" +
        "<strong class=\"profile-item-price-now\">" + esc(formatEuroPrice(promoNow)) + "</strong>" +
      "</div>"
    )
    : (price ? "<p class=\"profile-item-price profile-item-price-grid\">" + esc(formatEuroPrice(price)) + "</p>" : "");
  return (
    "<article class=\"panel profile-item profile-catalog-list-item\" data-profile-item=\"" + idx + "\">" +
      (image ? "<img class=\"profile-catalog-list-image\" src=\"" + esc(image) + "\" alt=\"" + esc(title) + "\" />" : "<div class=\"profile-catalog-list-image placeholder\"></div>") +
      "<div class=\"profile-catalog-list-body\">" +
        "<div class=\"profile-catalog-list-top\">" +
          "<div class=\"profile-catalog-list-title-wrap\">" +
            "<h4 class=\"profile-catalog-list-title\" title=\"" + esc(title) + "\">" + esc(title) + "</h4>" +
            stockBadge +
          "</div>" +
          "<div class=\"profile-catalog-list-price-slot\">" + priceBlock + "</div>" +
        "</div>" +
        (desc ? "<p class=\"profile-catalog-list-desc\">" + esc(desc) + "</p>" : "") +
      "</div>" +
    "</article>"
  );
}

export function renderProfileCatalogTabUi(ctx, tabId, activeSection, items) {
  const {
    state,
    setState,
    el,
    esc,
    renderProfile,
    bindProfileContentInteractions,
    buildCatalogGridCard,
    buildCatalogListCard,
  } = ctx || {};
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
    ? "<div class=\"profile-catalog-grid" + (isProducts ? " profile-catalog-grid-products" : "") + "\">" + items.map((item, idx) => buildCatalogGridCard(tabId, item, idx)).join("") + "</div>"
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

export function renderProfileLodgingTabUi(ctx, tabId, sections, subId) {
  const {
    state,
    setState,
    el,
    pick,
    isEnabledFlag,
    clampNumber,
    getItemMediaList,
    isOnFlag,
    toArrayList,
    esc,
    renderProfile,
    openItemModal,
  } = ctx || {};
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
  const mediaEntries = mediaList.map((entry, idx) => ({ entry, idx }));
  const currentEntry = mediaEntries[safeMediaIndex] || mediaEntries[0] || null;
  const alternateEntries = mediaEntries.filter((entry) => entry.idx !== (currentEntry ? currentEntry.idx : -1));
  const mediaCount = mediaEntries.length;
  const gallery = currentEntry
    ? (() => {
      if (mediaCount === 1) {
        return (
          "<div class=\"profile-lodging-gallery profile-lodging-gallery-single\">" +
            "<button type=\"button\" class=\"profile-lodging-gallery-main\" data-lodging-thumb=\"" + currentEntry.idx + "\" data-lodging-open-modal=\"1\">" +
              "<img class=\"profile-lodging-gallery-main-image\" src=\"" + esc(currentEntry.entry.url) + "\" alt=\"" + esc(title) + "\" />" +
            "</button>" +
          "</div>"
        );
      }
      if (mediaCount === 2) {
        const duoEntries = [currentEntry, alternateEntries[0]].filter(Boolean);
        return (
          "<div class=\"profile-lodging-gallery profile-lodging-gallery-duo\">" +
            duoEntries.map((entry, idx) => (
              "<button type=\"button\" class=\"profile-lodging-gallery-duo-item\" data-lodging-thumb=\"" + entry.idx + "\" data-lodging-open-modal=\"1\">" +
                "<img src=\"" + esc(entry.entry.url) + "\" alt=\"foto " + String(idx + 1) + "\" />" +
              "</button>"
            )).join("") +
          "</div>"
        );
      }
      const sideLimit = mediaCount >= 5 ? 4 : Math.min(2, alternateEntries.length);
      const sideEntries = alternateEntries.slice(0, sideLimit);
      const remainingCount = Math.max(0, alternateEntries.length - sideEntries.length);
      const sideClass = sideEntries.length >= 3 ? " profile-lodging-gallery-side-grid" : "";
      const sideHtml = sideEntries.map((entry, slotIndex) => {
        const isLastVisible = slotIndex === sideEntries.length - 1;
        const showMore = remainingCount > 0 && isLastVisible;
        return (
          "<button type=\"button\" class=\"profile-lodging-gallery-side-item\" data-lodging-thumb=\"" + entry.idx + "\"" + (showMore ? " data-lodging-open-modal=\"1\"" : "") + ">" +
            "<img src=\"" + esc(entry.entry.url) + "\" alt=\"foto " + String(slotIndex + 2) + "\" />" +
            (showMore ? "<span class=\"profile-lodging-gallery-more-overlay\">+" + String(remainingCount) + " fotos</span>" : "") +
          "</button>"
        );
      }).join("");
      return (
        "<div class=\"profile-lodging-gallery profile-lodging-gallery-mosaic\">" +
          "<button type=\"button\" class=\"profile-lodging-gallery-main\" data-lodging-thumb=\"" + currentEntry.idx + "\" data-lodging-open-modal=\"1\">" +
            "<img class=\"profile-lodging-gallery-main-image\" src=\"" + esc(currentEntry.entry.url) + "\" alt=\"" + esc(title) + "\" />" +
          "</button>" +
          "<div class=\"profile-lodging-gallery-side" + sideClass + "\">" + (sideHtml || "<div class=\"profile-lodging-gallery-side-placeholder\"></div>") + "</div>" +
        "</div>"
      );
    })()
    : "<div class=\"profile-lodging-main placeholder\">Sem imagem</div>";
  const itemSelector = items.length > 1
    ? ("<div class=\"chips profile-lodging-item-tabs\">" + items.map((entry, idx) => (
      "<button type=\"button\" class=\"" + (idx === safeItemIndex ? "active" : "") + "\" data-lodging-item=\"" + idx + "\">" + esc(pick(entry, ["name", "title", "label"]) || ((tabId === "casas" ? "Casa " : "Quarto ") + String(idx + 1))) + "</button>"
    )).join("") + "</div>")
    : "";
  const shouldUseSubtabSlot = !!itemSelector && el.subtabs && !String(el.subtabs.innerHTML || "").trim();
  if (shouldUseSubtabSlot) {
    el.subtabs.innerHTML = itemSelector;
  }
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
      (shouldUseSubtabSlot ? "" : itemSelector) +
      "<article class=\"panel profile-lodging-card\" data-profile-item=\"" + safeItemIndex + "\">" +
        "<div class=\"profile-lodging-head\">" +
          "<h4>" + esc(title) + "</h4>" +
          (hasPromo
            ? ("<div class=\"profile-item-promo profile-item-promo-grid\"><span class=\"profile-item-promo-badge\">PROMO</span><span class=\"profile-item-price-old\">" + esc(formatEuroPrice(promoOld)) + "</span><strong class=\"profile-item-price-now\">" + esc(formatEuroPrice(promoNow)) + "</strong></div>")
            : (price ? "<div class=\"lodging-price\">" + esc(formatEuroPrice(price)) + "<span>/noite</span></div>" : "")) +
        "</div>" +
        gallery +
        (String(currentItem && currentItem.description || "").trim() ? "<p class=\"profile-lodging-description\">" + esc(String(currentItem.description || "")) + "</p>" : "") +
        summaryBlock +
        stayBlock +
        rulesBlock +
        amenitiesBlock +
      "</article>" +
    "</div>"
  );
  [
    ...(el.subtabs ? Array.from(el.subtabs.querySelectorAll("button[data-lodging-item]")) : []),
    ...Array.from(el.content.querySelectorAll("button[data-lodging-item]")),
  ].forEach((button) => {
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
      if (button.hasAttribute("data-lodging-open-modal")) return;
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
  el.content.querySelectorAll("button[data-lodging-open-modal]").forEach((openBtn) => {
    openBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openItemModal(tabId, items, safeItemIndex);
    });
  });
}
