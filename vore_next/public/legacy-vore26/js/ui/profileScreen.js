function normalizeProfileSectionKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function shouldCollapseSingleLodgingSection(tabType, sections) {
  if (tabType !== "casas" && tabType !== "quartos") return false;
  if (!Array.isArray(sections) || sections.length !== 1) return false;
  const section = sections[0] || {};
  const sectionId = normalizeProfileSectionKey(section.id || "");
  const sectionLabel = normalizeProfileSectionKey(section.label || section.name || "");
  return sectionId === tabType || sectionLabel === tabType;
}

export function renderProfileScreen(ctx) {
  const {
    state,
    setState,
    el,
    isCommonUser,
    renderCommonProfile,
    selectedProfile,
    getTabsForProfile,
    ensureProfileTab,
    profileSections,
    ensureSubTab,
    PROFILE_TYPE_LABEL,
    getSocialItems,
    getBadgeType,
    getSocialIconLabel,
    getSocialIconSvg,
    esc,
    isProfileSaved,
    toggleSavedProfile,
    setScreen,
    openSharePicker,
    shareProfile,
    sanitizeRichHtml,
    renderProfileGalleryTab,
    renderProfileScheduleTab,
    renderProfileAgendaTab,
    renderProfilePartnersTab,
    renderProfileLocationsTab,
    centerActiveChip,
    updateProfileStickyOffsets,
    isEnabledFlag,
    renderProfileCatalogTab,
    renderProfileLodgingTab,
    renderItem,
    bindProfileContentInteractions,
    openReviewsModal,
    onRenderProfile,
  } = ctx || {};

  const rerender = () => {
    if (typeof onRenderProfile === "function") onRenderProfile();
  };

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
    el.head.innerHTML = renderProfileState("empty", "Sem perfil selecionado.", esc);
    el.tabs.innerHTML = "";
    el.subtabs.innerHTML = "";
    el.content.innerHTML = renderProfileState("empty", "Sem conteudo.", esc);
    return;
  }
  const tabs = getTabsForProfile(profile);
  const tabId = ensureProfileTab(tabs);
  const tabMeta = tabs.find((tab) => tab.id === tabId) || tabs.find((tab) => tab.type === tabId) || null;
  const tabType = String((tabMeta && (tabMeta.type || tabMeta.id)) || tabId || "").toLowerCase();
  const sections = profileSections(profile, tabId);
  let subId = ensureSubTab(sections);
  const profileData = profile.data || {};
  const avatar = String(profile.avatar || profileData.avatar || "").trim();
  const category = profile.category || PROFILE_TYPE_LABEL[profile.type] || "Perfil";
  const location = String(profile.location || profileData.location || "").trim();
  const rating = String(profile.rating || profileData.rating || "").trim();
  const socialItems = getSocialItems(profileData);
  const badgeType = getBadgeType(profile);
  const isVerified = badgeType === "verif" || profileData.verified === true;
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
  const socialHtml = socialItems.map((item) => {
    const iconKey = String(item.icon || "website").toLowerCase();
    const iconLabel = getSocialIconLabel(iconKey);
    const iconSvg = getSocialIconSvg(iconKey);
    if (!String(item.url || "").trim()) {
      return (
        "<span class=\"profile-social-btn social-" + esc(iconKey) + " is-empty\" title=\"" + esc(iconLabel) + "\" aria-label=\"" + esc(iconLabel) + "\" style=\"width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;line-height:1\">" +
          "<span class=\"profile-social-glyph\" aria-hidden=\"true\" style=\"width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center\">" + iconSvg + "</span>" +
        "</span>"
      );
    }
    return (
      "<a class=\"profile-social-btn social-" + esc(iconKey) + "\" href=\"" + esc(item.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\" title=\"" + esc(iconLabel) + "\" aria-label=\"" + esc(iconLabel) + "\" style=\"width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;line-height:1\">" +
        "<span class=\"profile-social-glyph\" aria-hidden=\"true\" style=\"width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center\">" + iconSvg + "</span>" +
      "</a>"
    );
  }).join("");
  el.head.innerHTML = (
    "<div class=\"profile-head-top-actions\">" +
      "<button type=\"button\" class=\"profile-top-btn\" data-profile-back=\"1\" title=\"Voltar\">&#8592;</button>" +
      "<div class=\"profile-head-top-right\">" +
        "<button type=\"button\" class=\"profile-top-btn\" data-profile-share=\"1\" title=\"Partilhar\"><span class=\"profile-top-icon\" aria-hidden=\"true\"><svg viewBox='0 0 24 24' fill='none'><path d='M22 2 11 13' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M22 2 15 22 11 13 2 9 22 2Z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg></span></button>" +
        (canSaveProfile ? "<button type=\"button\" class=\"profile-top-btn\" data-profile-save=\"1\" title=\"Guardar\">" + (isProfileSaved(profile.id) ? "&#9733;" : "&#9734;") + "</button>" : "") +
        (canEditProfile ? "<button type=\"button\" class=\"profile-top-btn profile-edit-action\" data-profile-edit=\"1\" title=\"Editar Perfil\" aria-label=\"Editar Perfil\"><span class=\"profile-edit-action-desktop\" aria-hidden=\"true\">&#8942;</span><span class=\"profile-edit-action-mobile\"><span class=\"profile-edit-action-icon\" aria-hidden=\"true\"><svg viewBox='0 0 24 24' fill='none'><path d='M12 20h9' stroke='currentColor' stroke-width='2' stroke-linecap='round'/><path d='m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/></svg></span><span class=\"profile-edit-action-label\">Editar</span></span></button>" : "") +
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
      rerender();
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
      rerender();
    });
  });
  centerActiveChip(el.tabs);

  if (tabType === "sobre") {
    el.subtabs.innerHTML = "";
    const aboutHtml = sanitizeRichHtml(profile.about || profileData.about || "");
    el.content.innerHTML = "<div class=\"profile-about-content\">" + (aboutHtml || renderProfileState("empty", "Sem descricao.", esc)) + "</div>";
    updateProfileStickyOffsets();
    return;
  }
  if (tabType === "galeria") {
    renderProfileGalleryTab(profileData);
    centerActiveChip(el.subtabs);
    updateProfileStickyOffsets();
    return;
  }
  if (tabType === "horario") {
    renderProfileScheduleTab(profileData);
    centerActiveChip(el.subtabs);
    updateProfileStickyOffsets();
    return;
  }
  if (tabType === "agenda") {
    renderProfileAgendaTab(profileData);
    centerActiveChip(el.subtabs);
    updateProfileStickyOffsets();
    return;
  }
  if (tabType === "parcerias") {
    renderProfilePartnersTab(profileData);
    centerActiveChip(el.subtabs);
    updateProfileStickyOffsets();
    return;
  }
  if (tabType === "locais") {
    renderProfileLocationsTab(profileData);
    centerActiveChip(el.subtabs);
    updateProfileStickyOffsets();
    return;
  }
  const collapseSingleLodgingSection = shouldCollapseSingleLodgingSection(tabType, sections);
  if (collapseSingleLodgingSection) {
    const onlySection = sections[0] || {};
    subId = onlySection.id || onlySection.label || subId;
    el.subtabs.innerHTML = "";
  } else {
    el.subtabs.innerHTML = sections
      .map((section) => {
        const key = section.id || section.label;
        return "<button class=\"" + (key === subId ? "active" : "") + "\" data-profile-subtab=\"" + key + "\">" + esc(section.label || key) + "</button>";
      })
      .join("");

    el.subtabs.querySelectorAll("button[data-profile-subtab]").forEach((button) => {
      button.addEventListener("click", () => {
        setState({ profileSubTab: button.dataset.profileSubtab });
        rerender();
      });
    });
    centerActiveChip(el.subtabs);
  }

  const activeSection = sections.find((s) => (s.id || s.label) === subId) || sections[0] || null;
  const items = activeSection && Array.isArray(activeSection.items) ? activeSection.items : [];
  const visibleItems = items
    .filter((item) => isEnabledFlag(item && item.enabled));
  if (tabType === "produtos" || tabType === "menu") {
    renderProfileCatalogTab(tabType, activeSection || { id: "geral", label: "Geral" }, visibleItems);
    updateProfileStickyOffsets();
    return;
  }
  if (tabType === "casas" || tabType === "quartos") {
    renderProfileLodgingTab(tabType, sections, subId);
    updateProfileStickyOffsets();
    return;
  }
  el.content.innerHTML = visibleItems.length
    ? (tabType === "campanhas"
        ? "<div class=\"profile-campaign-grid\">" + visibleItems.map((item, idx) => renderItem(tabType, item, idx)).join("") + "</div>"
        : visibleItems.map((item, idx) => renderItem(tabType, item, idx)).join(""))
    : renderProfileState("empty", "Sem itens nesta aba.", esc);
  bindProfileContentInteractions(tabType, visibleItems);
  updateProfileStickyOffsets();
}

export function openSavedMediaModalUi(ctx, index, sourceList = null) {
  const {
    ensurePersonalStoreLoaded,
    personalStore,
    openItemModal,
  } = ctx || {};
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

export function openSavedItemModalUi(ctx, index, sourceList = null) {
  const {
    ensurePersonalStoreLoaded,
    personalStore,
    deepClone,
    openItemModal,
  } = ctx || {};
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

export function renderProfileGalleryTabUi(ctx, profileData) {
  const {
    getProfileGalleryLists,
    getProfileGalleryViews,
    state,
    setState,
    el,
    esc,
    renderItem,
    bindProfileContentInteractions,
    onRenderProfile,
  } = ctx || {};
  const rerender = () => {
    if (typeof onRenderProfile === "function") onRenderProfile();
  };
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
      rerender();
    });
  });
  const items = active.list.map((url, idx) => ({
    name: active.label.slice(0, -1) + " " + (idx + 1),
    mediaUrl: url,
    mediaType: active.mediaType,
    galleryView: (galleryViews[active.id] && galleryViews[active.id][idx]) || { fit: "cover", zoom: 100, posX: 50, posY: 50 },
  }));
  el.content.innerHTML = items.length
    ? "<div class=\"profile-gallery-grid\">" + items.map((item, idx) => renderItem("galeria", item, idx)).join("") + "</div>"
    : renderProfileState("empty", "Sem itens nesta aba.", esc);
  bindProfileContentInteractions("galeria", items);
}

export function renderProfileScheduleTabUi(ctx, profileData) {
  const {
    el,
    renderItem,
  } = ctx || {};
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
    : renderProfileState("empty", "Sem horario definido.", esc);
}

export function renderProfileAgendaTabUi(ctx, profileData) {
  const {
    el,
    esc,
    renderItem,
    toOpenableUrl,
  } = ctx || {};
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
    : renderProfileState("empty", "Sem agenda definida.", esc);
  el.content.innerHTML = topBlock + listBlock + reserveBlock;
}

export function renderProfilePartnersTabUi(ctx, profileData) {
  const {
    el,
    renderItem,
  } = ctx || {};
  const partners = Array.isArray(profileData && profileData.partners) ? profileData.partners : [];
  el.subtabs.innerHTML = "";
  el.content.innerHTML = partners.length
    ? "<div class=\"profile-partners-grid\">" + partners.map((item, idx) => renderItem("parcerias", item, idx)).join("") + "</div>"
    : renderProfileState("empty", "Sem parcerias adicionadas.", esc);
}

function buildLocationOpenUrlLocal(toOpenableUrl, location) {
  const explicit = toOpenableUrl(location && location.link);
  if (explicit) return explicit;
  const coords = String(location && location.coords || "").trim();
  if (coords) return "https://maps.google.com/?q=" + encodeURIComponent(coords);
  const address = String(location && location.address || "").trim();
  if (address) return "https://maps.google.com/?q=" + encodeURIComponent(address);
  return "";
}

export function renderProfileLocationsTabUi(ctx, profileData) {
  const {
    el,
    esc,
    toOpenableUrl,
  } = ctx || {};
  const locations = Array.isArray(profileData && profileData.locations) ? profileData.locations : [];
  el.subtabs.innerHTML = "";
  if (!locations.length) {
    el.content.innerHTML = renderProfileState("empty", "Sem locais adicionados.", esc);
    return;
  }
  el.content.innerHTML = "<div class=\"profile-locations-list\">" + locations.map((loc, idx) => {
    const target = buildLocationOpenUrlLocal(toOpenableUrl, loc);
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

export function renderCommonProfileScreen(ctx) {
  const {
    state,
    setState,
    el,
    esc,
    countUnreadShares,
    renderCommonProfileContent,
    centerActiveChip,
    updateProfileStickyOffsets,
    onRenderProfile,
  } = ctx || {};

  const rerender = () => {
    if (typeof onRenderProfile === "function") onRenderProfile();
  };

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
      rerender();
    });
  });
  renderCommonProfileContent();
  centerActiveChip(el.tabs);
  centerActiveChip(el.subtabs);
  updateProfileStickyOffsets();
}


export function renderCommonProfileContentScreen(ctx) {
  const {
    state,
    setState,
    el,
    esc,
    renderProfile,
    isCommonUser,
    ensurePersonalStoreLoaded,
    personalStore,
    recommendationsStore,
    refreshRecommendationsForCurrentUser,
    normalizeText,
    formatRelativeTime,
    buildShareThreads,
    markThreadRead,
    getShareKindLabel,
    getShareEntryPreviewImage,
    reactionToEmoji,
    handleRecommendationReaction,
    handleRecommendationPermissionAction,
    openSharedEntry,
    renderCards,
    tabIdToLabel,
    getSavedItemPreviewImage,
    openSavedMediaModal,
    openSavedItemModal,
  } = ctx || {};

  ensurePersonalStoreLoaded();
  if (!personalStore.data) {
    el.subtabs.innerHTML = "";
    el.content.innerHTML = renderProfileState("empty", "Sem dados de conta pessoal.", esc);
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
      el.content.innerHTML = renderProfileState("loading", "A carregar partilhas...", esc);
      return;
    }
    if (!Array.isArray(list) || !list.length) {
      const errorHtml = recommendationsStore.error ? renderProfileState("error", recommendationsStore.error, esc) : "";
      el.content.innerHTML = pendingHtml + errorHtml + renderProfileState("empty", "Sem partilhas nesta secao.", esc);
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
    (!filteredThreads.length ? renderProfileState("empty", "Sem conversas para esta pesquisa.", esc) : "");
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
        : renderProfileState("empty", "Sem media guardada para este filtro.", esc));
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
        : renderProfileState("empty", "Sem itens guardados para este filtro.", esc));
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




function renderProfileState(kind, text, esc) {
  const safeKind = String(kind || "empty").toLowerCase();
  const icon = safeKind === "loading" ? "&#9203;" : (safeKind === "error" ? "&#9888;" : "&#9633;");
  return (
    "<div class=\"profile-state profile-state-" + safeKind + "\" style=\"display:grid;justify-items:center;gap:8px;padding:18px 12px;border:1px dashed #d4deec;border-radius:12px;background:#f8fbff;text-align:center\">" +
      "<span class=\"profile-state-icon\" aria-hidden=\"true\" style=\"display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:#e6edf8;color:#32455f;font-size:14px;font-weight:800;line-height:1\">" + icon + "</span>" +
      "<p class=\"profile-state-text\" style=\"margin:0;color:#5c6b80;font-size:13px;line-height:1.45\">" + esc(String(text || "")) + "</p>" +
    "</div>"
  );
}

