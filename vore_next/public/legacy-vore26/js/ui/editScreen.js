import {
  EDIT_TAB_TEMPLATES,
  LINK_TYPE_OPTIONS,
  getEditAutosaveKey,
  safeParseAutosave,
  buildEditorSnapshot,
  applyEditorSnapshot,
  isLikelyUrlForLink,
  validateEditorDraft,
  formatEditStatusTime,
  buildSimplePreviewSections,
  getPreviewContentWrapperClass,
  getLinkTypeLabel,
  getLinkTypeIconHtml,
  getTabVisibilityIconSvg,
  getTabRemoveIconSvg,
  getSectionCollapseIconSvg,
  getTabTemplateLabel,
  normalizeLinksForEditor,
  normalizeTabsForEditor,
  ensureUniqueTabId,
  parseTagReferences,
  tagsToInput,
  extractAboutPlainText,
} from "./editScreenUtils.js";

const TAB_LABEL_MAX_LENGTH = 32;
const CATEGORY_LABEL_MAX_LENGTH = 32;
const PROFILE_NAME_MAX_LENGTH = 80;
const PROFILE_CATEGORY_MAX_LENGTH = 64;
const PROFILE_LOCATION_MAX_LENGTH = 90;
const PROFILE_CUSTOM_CATEGORY_MAX_LENGTH = 64;
const LINK_URL_MAX_LENGTH = 320;
const LINK_LABEL_MAX_LENGTH = 40;
const ABOUT_SUMMARY_MAX_LENGTH = 120;

function sanitizeAboutSummaryText(value) {
  let out = String(value || "").replace(/\s+/g, " ").trim();
  if (out.length > ABOUT_SUMMARY_MAX_LENGTH) out = out.slice(0, ABOUT_SUMMARY_MAX_LENGTH).trim();
  return out;
}

export function renderEditScreen(ctx) {
  const {
    state,
    el,
    setState,
    selectedProfile,
    renderProfile,
    editor,
    deepClone,
    getTabsForProfile,
    isSimpleEditTab,
    getDraftSections,
    setDraftSections,
    PROFILE_CATEGORY_OPTIONS,
    esc,
    sanitizeRichHtml,
    renderSimpleEditTab,
    renderEditItemCard,
    isEditItemCollapsed,
    bindEditTopEvents,
    slugify,
    blankItem,
    setEditItemCollapsed,
    isEnabledFlag,
    openItemModal,
    readFileAsDataUrl,
    api,
    getMergedItemImages,
    applyMergedItemImages,
    toArrayList,
    saveEditDraft,
    bindSimpleEditTabEvents,
    PROFILE_TYPE_OPTIONS,
    SERVICE_TYPE_META,
    PROFILE_TYPE_LABEL,
    getSocialIconSvg,
    renderItem,
    getSocialItems,
    getDraftGalleryLists,
    getDraftGalleryViews,
    setDraftGalleryLists,
    setDraftGalleryViews,
    buildCatalogGridCard,
    buildCatalogListCard,
  } = ctx || {};

  const authUserId = Number((state.authUser && state.authUser.id) || 0);
  if (!authUserId) {
    el.edit.innerHTML = "<div class=\"panel\"><p class=\"muted\">Inicia sessao para editar o teu perfil.</p></div>";
    return;
  }
  const readUploadedMediaUrl = async (file, context) => {
    return readFileAsDataUrl(file);
  };
  const replaceWithUploadedMediaUrl = async (file, context, onUploaded) => {
    if (api && typeof api.mediaUpload === "function") {
      try {
        const uploaded = await api.mediaUpload(file, context);
        const url = String((uploaded && uploaded.url) || "").trim();
        if (url && typeof onUploaded === "function") onUploaded(url);
      } catch (_err) {}
    }
  };
  const ownProfile = state.profiles.find((p) => Number((p && p.userId) || 0) === authUserId) || null;
  if (!ownProfile) {
    el.edit.innerHTML = "<div class=\"panel\"><p class=\"muted\">Ainda nao tens perfil criado nesta conta.</p></div>";
    return;
  }

  let profile = selectedProfile();
  if (!profile || Number(profile.userId || 0) !== authUserId) {
    setState({ selectedProfileId: ownProfile.id });
    profile = ownProfile;
    renderProfile();
  }
  if (!profile) {
    if (editor && editor.autosaveTimer) {
      try {
        clearTimeout(editor.autosaveTimer);
      } catch (_err) {}
      editor.autosaveTimer = 0;
    }
    el.edit.innerHTML = "Sem perfil selecionado";
    return;
  }

  const profileUpdatedAtKey = String(profile.updatedAt || profile.updated_at || "");
  const profileUpdatedAtMs = Date.parse(profileUpdatedAtKey) || 0;

  if (editor.profileId !== profile.id || editor.profileUpdatedAt !== profileUpdatedAtKey || !editor.draft) {
    if (editor && editor.autosaveTimer) {
      try {
        clearTimeout(editor.autosaveTimer);
      } catch (_err) {}
    }
    editor.profileId = profile.id;
    editor.profileUpdatedAt = profileUpdatedAtKey;
    editor.draft = {
      name: profile.name || "",
      type: profile.type || "service_pro",
      category: profile.category || "",
      location: profile.location || "",
      about: profile.about || ((profile.data && profile.data.about) || ""),
      data: deepClone(profile.data || {}),
    };
    editor.activeSubByTab = {};
    editor.collapsedItemsBySection = {};
    editor.collapsedTopSections = {};
    editor.previewNav = { tabId: "", subByTab: {}, catalogView: {} };
    editor.manageTabId = "";
    editor.newTabDraft = { type: "servicos", label: "" };
    editor.newLinkDraft = { type: "", url: "", label: "" };
    editor.history = { past: [], future: [] };
    editor.lastChangeAt = 0;
    editor.lastAutosaveAt = 0;
    editor.statusText = "";
    editor.autosaveHydratedFor = 0;
    editor.autosaveTimer = 0;
    editor.isSaving = false;
  }

  if (!editor.history || typeof editor.history !== "object") editor.history = { past: [], future: [] };
  if (!Array.isArray(editor.history.past)) editor.history.past = [];
  if (!Array.isArray(editor.history.future)) editor.history.future = [];
  if (typeof editor.statusText !== "string") editor.statusText = "";
  if (!Number.isFinite(Number(editor.lastChangeAt))) editor.lastChangeAt = 0;
  if (!Number.isFinite(Number(editor.lastAutosaveAt))) editor.lastAutosaveAt = 0;
  if (!Number.isFinite(Number(editor.lastServerSaveAt))) editor.lastServerSaveAt = 0;
  if (typeof editor.isSaving !== "boolean") editor.isSaving = false;

  const autosaveKey = getEditAutosaveKey(profile.id);
  if (Number(editor.autosaveHydratedFor || 0) !== Number(profile.id)) {
    let autosaveRaw = "";
    try {
      autosaveRaw = window.localStorage.getItem(autosaveKey);
    } catch (_err) {}
    const payload = safeParseAutosave(autosaveRaw);
    if (payload && payload.snapshot) {
      const autosaveUpdatedAtMs = Number(payload.updatedAt || 0) || 0;
      if (!profileUpdatedAtMs || autosaveUpdatedAtMs >= profileUpdatedAtMs) {
        applyEditorSnapshot(editor, payload.snapshot, deepClone);
        const stamp = formatEditStatusTime(payload.updatedAt);
        editor.statusText = stamp ? ("Rascunho recuperado (" + stamp + ")") : "Rascunho recuperado";
        editor.lastAutosaveAt = autosaveUpdatedAtMs;
      } else {
        try {
          window.localStorage.removeItem(autosaveKey);
        } catch (_err) {}
        editor.statusText = "Rascunho antigo ignorado";
        editor.lastAutosaveAt = 0;
      }
    }
    editor.autosaveHydratedFor = Number(profile.id || 0);
    editor.history = { past: [buildEditorSnapshot(editor, deepClone)], future: [] };
  } else if (!editor.history.past.length) {
    editor.history.past.push(buildEditorSnapshot(editor, deepClone));
  }

  if (!editor.draft.data || typeof editor.draft.data !== "object") editor.draft.data = {};
  if (!editor.draft.data.social || typeof editor.draft.data.social !== "object") editor.draft.data.social = {};
  if (typeof editor.draft.data.customCategory !== "string") editor.draft.data.customCategory = "";
  if (typeof editor.draft.data.avatar !== "string") editor.draft.data.avatar = "";
  editor.draft.data.links = normalizeLinksForEditor(editor.draft.data.links);
  const initialTags = parseTagReferences(editor.draft.data.contentCategories || editor.draft.data.tags || "");
  editor.draft.data.contentCategories = initialTags;
  editor.draft.data.tags = initialTags.slice();

  const fallbackTabs = getTabsForProfile({ type: editor.draft.type, data: editor.draft.data });
  editor.draft.data.tabs = normalizeTabsForEditor(editor.draft.data.tabs, fallbackTabs, slugify);
  const allTabs = editor.draft.data.tabs.slice();
  const activeTabs = allTabs.filter((tab) => tab.enabled !== false);
  const tabsForEditor = activeTabs.length ? activeTabs : allTabs;

  const validEdit = tabsForEditor.find((tab) => tab.id === state.editTab);
  const editTab = validEdit ? validEdit.id : ((tabsForEditor[0] && tabsForEditor[0].id) || "sobre");
  const editTabMeta = tabsForEditor.find((tab) => tab.id === editTab) || tabsForEditor.find((tab) => tab.type === editTab) || null;
  const editTabType = String((editTabMeta && (editTabMeta.type || editTabMeta.id)) || editTab || "sobre").toLowerCase();
  const simpleEditTab = isSimpleEditTab(editTab);
  setState({ editTab });

  if (!editor.manageTabId || !allTabs.some((tab) => tab.id === editor.manageTabId)) {
    editor.manageTabId = editTab;
  }
  const manageTabIndex = allTabs.findIndex((tab) => tab.id === editor.manageTabId);
  const manageTab = manageTabIndex >= 0 ? allTabs[manageTabIndex] : allTabs[0];
  const manageCanMoveUp = manageTabIndex > 0;
  const manageCanMoveDown = manageTabIndex >= 0 && manageTabIndex < allTabs.length - 1;

  if (!editor.newTabDraft || typeof editor.newTabDraft !== "object") {
    editor.newTabDraft = { type: "servicos", label: "" };
  }
  if (!editor.newLinkDraft || typeof editor.newLinkDraft !== "object") {
    editor.newLinkDraft = { type: "", url: "", label: "" };
  }
  if (!editor.previewNav || typeof editor.previewNav !== "object") {
    editor.previewNav = { tabId: "", subByTab: {}, catalogView: {} };
  }
  if (!editor.previewNav.subByTab || typeof editor.previewNav.subByTab !== "object") {
    editor.previewNav.subByTab = {};
  }
  if (!editor.previewNav.catalogView || typeof editor.previewNav.catalogView !== "object") {
    editor.previewNav.catalogView = {};
  }
  if (!editor.collapsedTopSections || typeof editor.collapsedTopSections !== "object") {
    editor.collapsedTopSections = {};
  }
  const newTabType = String(editor.newTabDraft.type || "servicos").trim().toLowerCase() || "servicos";
  const newLinkType = String(editor.newLinkDraft.type || "").trim().toLowerCase();
  const isAvatarCollapsed = editor.collapsedTopSections.avatar === true;
  const isBasicCollapsed = editor.collapsedTopSections.basic === true;
  const isLinksCollapsed = editor.collapsedTopSections.links === true;
  const isTabsCollapsed = editor.collapsedTopSections.tabs === true;
  const canUndo = editor.history.past.length > 1;
  const canRedo = editor.history.future.length > 0;
  const autoTime = formatEditStatusTime(editor.lastAutosaveAt);
  const saveTime = formatEditStatusTime(editor.lastServerSaveAt);
  const statusText = String(
    editor.statusText ||
    (saveTime ? ("Guardado no servidor " + saveTime) : (autoTime ? ("Auto-guardado " + autoTime) : "Sem alteracoes por guardar"))
  );

  let sections = [];
  if (editTabType !== "sobre" && !simpleEditTab) {
    sections = getDraftSections(editTab);
    if (editTabType === "campanhas") {
      const mergedItems = sections.flatMap((section) => (Array.isArray(section.items) ? section.items : []));
      sections = [{ id: "campanha", label: "Campanha", items: mergedItems }];
    }
    if (!sections.length) sections = [{ id: "geral", label: "Geral", items: [] }];
    setDraftSections(editTab, sections);
    if (!editor.activeSubByTab[editTab] || !sections.some((section) => (section.id || section.label) === editor.activeSubByTab[editTab])) {
      editor.activeSubByTab[editTab] = sections[0].id || sections[0].label;
    }
  }

  const categoryOptions = PROFILE_CATEGORY_OPTIONS[editor.draft.type] || [];
  const categoryListId = "edit-category-options";
  const avatarValue = String(editor.draft.data.avatar || "").trim();
  const hashtagsInput = tagsToInput(editor.draft.data.contentCategories || []);
  const links = normalizeLinksForEditor(editor.draft.data.links);

  let html = "<div class=\"edit-studio-layout\">";
  html += "<div class=\"edit-studio-main\">";
  html += "<div class=\"panel edit-root\">";

  html += "<section class=\"edit-section-card edit-avatar-section" + (isAvatarCollapsed ? " is-collapsed" : "") + "\">";
  html += "<div class=\"edit-section-header\">";
  html += "<h4 class=\"edit-section-title\">Foto de perfil</h4>";
  html += "<button type=\"button\" class=\"edit-section-toggle\" data-edit-collapse-section=\"avatar\" aria-expanded=\"" + (isAvatarCollapsed ? "false" : "true") + "\" aria-label=\"" + (isAvatarCollapsed ? "Expandir secao" : "Minimizar secao") + "\" title=\"" + (isAvatarCollapsed ? "Expandir secao" : "Minimizar secao") + "\">" + getSectionCollapseIconSvg(!isAvatarCollapsed) + "</button>";
  html += "</div>";
  if (!isAvatarCollapsed) {
    html += "<div class=\"edit-avatar-layout\">";
    html += avatarValue
      ? ("<img class=\"edit-avatar-preview\" src=\"" + esc(avatarValue) + "\" alt=\"Avatar\" />")
      : ("<div class=\"edit-avatar-preview placeholder\">" + esc((editor.draft.name || "P").slice(0, 1).toUpperCase()) + "</div>");
    html += "<div class=\"edit-avatar-actions\">";
    html += "<label class=\"edit-upload-btn\">Carregar foto<input class=\"edit-upload-input\" type=\"file\" accept=\"image/*\" data-avatar-upload=\"1\" /></label>";
    html += "<button type=\"button\" class=\"edit-upload-btn\" data-avatar-remove=\"1\">Remover</button>";
    html += "</div>";
    html += "</div>";
  }
  html += "</section>";

  html += "<section class=\"edit-section-card" + (isBasicCollapsed ? " is-collapsed" : "") + "\">";
  html += "<div class=\"edit-section-header\">";
  html += "<h4 class=\"edit-section-title\">Informacao basica</h4>";
  html += "<button type=\"button\" class=\"edit-section-toggle\" data-edit-collapse-section=\"basic\" aria-expanded=\"" + (isBasicCollapsed ? "false" : "true") + "\" aria-label=\"" + (isBasicCollapsed ? "Expandir secao" : "Minimizar secao") + "\" title=\"" + (isBasicCollapsed ? "Expandir secao" : "Minimizar secao") + "\">" + getSectionCollapseIconSvg(!isBasicCollapsed) + "</button>";
  html += "</div>";
  if (!isBasicCollapsed) {
    html += "<div class=\"edit-form-grid edit-basic-grid\">";
    html += "<label>Nome<input class=\"input\" data-edit-field=\"name\" maxlength=\"" + PROFILE_NAME_MAX_LENGTH + "\" value=\"" + esc(editor.draft.name) + "\" /></label>";
    html += "<label>Tipo<select class=\"input\" data-edit-field=\"type\">" + PROFILE_TYPE_OPTIONS.map((type) => "<option value=\"" + type + "\"" + (editor.draft.type === type ? " selected" : "") + ">" + esc(PROFILE_TYPE_LABEL[type] || type) + "</option>").join("") + "</select></label>";
    html += "<label>Categoria principal<input class=\"input\" list=\"" + categoryListId + "\" data-edit-field=\"category\" maxlength=\"" + PROFILE_CATEGORY_MAX_LENGTH + "\" value=\"" + esc(editor.draft.category) + "\" /></label>";
    html += "<label>Categoria personalizada (opcional)<input class=\"input\" data-custom-category=\"1\" maxlength=\"" + PROFILE_CUSTOM_CATEGORY_MAX_LENGTH + "\" value=\"" + esc(editor.draft.data.customCategory || "") + "\" placeholder=\"Ex: Personal Trainer\" /></label>";
    html += "<label>Localizacao<input class=\"input\" data-edit-field=\"location\" maxlength=\"" + PROFILE_LOCATION_MAX_LENGTH + "\" value=\"" + esc(editor.draft.location) + "\" /></label>";
    html += "<label>Referencias (#hashtags)<input class=\"input\" data-content-categories=\"1\" value=\"" + esc(hashtagsInput) + "\" placeholder=\"#massagem #depilacao #maquilhagem\" /></label>";
    html += "</div>";
    html += "<datalist id=\"" + categoryListId + "\">" + categoryOptions.map((opt) => "<option value=\"" + esc(opt) + "\"></option>").join("") + "</datalist>";
    html += "<p class=\"muted\">Se a categoria personalizada estiver preenchida, ela substitui a categoria principal.</p>";
    if (Array.isArray(editor.draft.data.contentCategories) && editor.draft.data.contentCategories.length) {
      html += "<div class=\"chips\">" + editor.draft.data.contentCategories.map((tag) => "<span class=\"pill\">#" + esc(tag) + "</span>").join("") + "</div>";
    }
  }
  html += "</section>";

  html += "<section class=\"edit-section-card" + (isLinksCollapsed ? " is-collapsed" : "") + "\">";
  html += "<div class=\"edit-section-header\">";
  html += "<h4 class=\"edit-section-title\">Redes e links</h4>";
  html += "<button type=\"button\" class=\"edit-section-toggle\" data-edit-collapse-section=\"links\" aria-expanded=\"" + (isLinksCollapsed ? "false" : "true") + "\" aria-label=\"" + (isLinksCollapsed ? "Expandir secao" : "Minimizar secao") + "\" title=\"" + (isLinksCollapsed ? "Expandir secao" : "Minimizar secao") + "\">" + getSectionCollapseIconSvg(!isLinksCollapsed) + "</button>";
  html += "</div>";
  if (!isLinksCollapsed) {
    html += "<p class=\"muted\">Adiciona apenas as redes que queres mostrar no perfil.</p>";
    html += "<div class=\"edit-links-create\">";
    html += "<p class=\"edit-links-subtitle\">Adicionar novo link</p>";
    html += "<div class=\"edit-link-row edit-link-row-new\">";
    html += "<div class=\"edit-link-type-wrap\">" + getLinkTypeIconHtml(newLinkType || "website", getSocialIconSvg) + "<select class=\"input\" data-new-link-type=\"1\"><option value=\"\"" + (!newLinkType ? " selected" : "") + ">Selecionar rede</option>" + LINK_TYPE_OPTIONS.map((opt) => "<option value=\"" + esc(opt) + "\"" + (newLinkType === opt ? " selected" : "") + ">" + esc(getLinkTypeLabel(opt)) + "</option>").join("") + "</select></div>";
    html += "<input class=\"input\" data-new-link-url=\"1\" maxlength=\"" + LINK_URL_MAX_LENGTH + "\" value=\"" + esc(editor.newLinkDraft.url || "") + "\" placeholder=\"https://... ou @utilizador\" />";
    html += "<input class=\"input\" data-new-link-label=\"1\" maxlength=\"" + LINK_LABEL_MAX_LENGTH + "\" value=\"" + esc(editor.newLinkDraft.label || "") + "\" placeholder=\"Nome (opcional)\" />";
    html += "<button type=\"button\" data-add-link=\"1\">+ Adicionar link</button>";
    html += "</div>";
    html += "</div>";
    html += "<div class=\"edit-links-divider\" aria-hidden=\"true\"></div>";
    html += "<div class=\"edit-links-existing\">";
    html += "<p class=\"edit-links-subtitle\">Links ja adicionados</p>";
    html += "<div class=\"edit-links-list\">";
    html += links.length
      ? links.map((item, idx) => (
        "<div class=\"edit-link-row\">" +
          "<div class=\"edit-link-type-wrap\">" + getLinkTypeIconHtml(item.type || "website", getSocialIconSvg) + "<select class=\"input\" data-link-type=\"" + idx + "\">" +
            LINK_TYPE_OPTIONS.map((opt) => "<option value=\"" + esc(opt) + "\"" + (String(item.type || "").toLowerCase() === opt ? " selected" : "") + ">" + esc(getLinkTypeLabel(opt)) + "</option>").join("") +
          "</select></div>" +
          "<input class=\"input\" data-link-url=\"" + idx + "\" maxlength=\"" + LINK_URL_MAX_LENGTH + "\" value=\"" + esc(item.url) + "\" placeholder=\"https://... ou @utilizador\" />" +
          "<input class=\"input\" data-link-label=\"" + idx + "\" maxlength=\"" + LINK_LABEL_MAX_LENGTH + "\" value=\"" + esc(item.label) + "\" placeholder=\"Nome (opcional)\" />" +
          "<button type=\"button\" class=\"edit-link-icon-btn is-danger\" data-remove-link=\"" + idx + "\" title=\"Remover\" aria-label=\"Remover link\">" + getTabRemoveIconSvg() + "</button>" +
        "</div>"
      )).join("")
      : "<p class=\"muted\">Ainda nao tens links adicionados.</p>";
    html += "</div>";
    html += "</div>";
  }
  html += "</section>";

  html += "<section class=\"edit-section-card edit-tab-manager-section" + (isTabsCollapsed ? " is-collapsed" : "") + "\">";
  html += "<div class=\"edit-tab-manager-header edit-section-header\">";
  html += "<h4 class=\"edit-section-title\">Abas do perfil</h4>";
  html += "<div class=\"edit-section-header-actions\">";
  html += "<button type=\"button\" class=\"edit-section-toggle\" data-edit-collapse-section=\"tabs\" aria-expanded=\"" + (isTabsCollapsed ? "false" : "true") + "\" aria-label=\"" + (isTabsCollapsed ? "Expandir secao" : "Minimizar secao") + "\" title=\"" + (isTabsCollapsed ? "Expandir secao" : "Minimizar secao") + "\">" + getSectionCollapseIconSvg(!isTabsCollapsed) + "</button>";
  html += "</div>";
  html += "</div>";
  if (!isTabsCollapsed) {
    html += "<p class=\"muted\">Ativa, desativa, remove e reordena as abas como na app.</p>";
    html += "<div class=\"edit-tabs-create\">";
    html += "<p class=\"edit-tabs-subtitle\">Adicionar nova aba</p>";
    html += "<div class=\"edit-tab-add-row\">";
    html += "<select class=\"input\" data-new-tab-type=\"1\">" + EDIT_TAB_TEMPLATES.map((item) => "<option value=\"" + esc(item.type) + "\"" + (newTabType === item.type ? " selected" : "") + ">" + esc(item.label) + "</option>").join("") + "</select>";
    html += "<input class=\"input\" data-new-tab-label=\"1\" maxlength=\"" + TAB_LABEL_MAX_LENGTH + "\" value=\"" + esc(editor.newTabDraft.label || "") + "\" placeholder=\"Nome da nova aba (opcional)\" />";
    html += "<button type=\"button\" class=\"edit-primary-action\" data-add-tab=\"1\" style=\"background:#111827;color:#fff;border-color:#111827;font-weight:700;\">+ Adicionar aba</button>";
    html += "</div>";
    html += "</div>";
    html += "<div class=\"edit-tabs-divider\" aria-hidden=\"true\"></div>";
    html += "<div class=\"edit-tabs-existing\">";
    html += "<div class=\"edit-tabs-existing-head\">";
    html += "<p class=\"edit-tabs-subtitle\">Abas ja adicionadas</p>";
    html += "<div class=\"chips edit-tab-manager-move\">";
    html += "<button type=\"button\" data-manage-tab-move=\"-1\" title=\"Mover para cima\" aria-label=\"Mover para cima\"" + (manageCanMoveUp ? "" : " disabled") + ">&#8593;</button>";
    html += "<button type=\"button\" data-manage-tab-move=\"1\" title=\"Mover para baixo\" aria-label=\"Mover para baixo\"" + (manageCanMoveDown ? "" : " disabled") + ">&#8595;</button>";
    html += "</div>";
    html += "</div>";
    html += "<div class=\"edit-tab-manager-list\">";
    html += allTabs.map((tab, idx) => {
      const isSelected = manageTab && tab.id === manageTab.id;
      const isEnabled = tab.enabled !== false;
      return (
        "<div class=\"edit-tab-manager-item" + (isSelected ? " active" : "") + (isEnabled ? "" : " disabled") + "\" draggable=\"true\" data-tab-drag-index=\"" + String(idx) + "\">" +
          "<span class=\"edit-drag-handle\" aria-hidden=\"true\">&#8942;&#8942;</span>" +
          "<button type=\"button\" class=\"edit-tab-manager-select\" data-manage-tab-select=\"" + esc(tab.id) + "\">" + esc(tab.label || tab.id) + "</button>" +
          "<button type=\"button\" class=\"edit-tab-icon-btn\" data-tab-toggle=\"" + esc(tab.id) + "\" title=\"" + (isEnabled ? "Ocultar" : "Mostrar") + "\" aria-label=\"" + (isEnabled ? "Ocultar aba" : "Mostrar aba") + "\">" + getTabVisibilityIconSvg(isEnabled) + "</button>" +
          "<button type=\"button\" class=\"edit-tab-icon-btn is-danger\" data-tab-remove=\"" + esc(tab.id) + "\" title=\"Remover\" aria-label=\"Remover aba\">" + getTabRemoveIconSvg() + "</button>" +
        "</div>"
      );
    }).join("");
    html += "</div>";
    html += "</div>";
  }
  html += "</section>";

  html += "<section class=\"edit-section-card edit-content-editor\">";
  html += "<p class=\"muted edit-section-caption\">Conteudo da aba ativa</p>";
  html += "<div class=\"chips edit-tabs-row\">" + tabsForEditor.map((tab) => "<button type=\"button\" class=\"" + (tab.id === editTab ? "active" : "") + "\" data-edit-tab=\"" + esc(tab.id) + "\">" + esc(tab.label || tab.id) + "</button>").join("") + "</div>";
  if (editTabType === "sobre") {
    const aboutHtml = sanitizeRichHtml(editor.draft.about || "");
    const aboutSummary = sanitizeAboutSummaryText((editor.draft.data && editor.draft.data.aboutSummary) || "");
    if (editor.draft.data) editor.draft.data.aboutSummary = aboutSummary;
    const aboutPlainText = extractAboutPlainText(aboutHtml);
    const aboutCharCount = aboutPlainText.length;
    const aboutSummaryCount = aboutSummary.length;
    html += "<div class=\"edit-about-wrap\">";
    html += "<p class=\"muted\">Texto principal do perfil. Mantem objetivo e facil de ler.</p>";
    html += "<div class=\"edit-about-summary-row\">";
    html += "<input class=\"input\" data-about-summary=\"1\" maxlength=\"" + ABOUT_SUMMARY_MAX_LENGTH + "\" value=\"" + esc(aboutSummary) + "\" placeholder=\"Resumo curto para destaque (opcional)\" />";
    html += "<p class=\"edit-about-counter\"><span data-about-summary-count=\"1\">" + esc(String(aboutSummaryCount)) + "</span>/" + ABOUT_SUMMARY_MAX_LENGTH + " resumo</p>";
    html += "</div>";
    html += "<div class=\"edit-about-layout\">";
    html += "<div class=\"edit-about-main\">";
    html += "<div class=\"chips edit-about-toolbar\">";
    html += "<button type=\"button\" data-about-cmd=\"bold\"><strong>B</strong></button>";
    html += "<button type=\"button\" data-about-cmd=\"italic\"><em>I</em></button>";
    html += "<button type=\"button\" data-about-cmd=\"underline\"><span style=\"text-decoration:underline\">U</span></button>";
    html += "<button type=\"button\" data-about-cmd=\"insertUnorderedList\">&#8226; Lista</button>";
    html += "<button type=\"button\" data-about-cmd=\"insertOrderedList\">1. Lista</button>";
    html += "</div>";
    html += "<div class=\"input edit-about-editor\" contenteditable=\"true\" data-about-editor=\"1\">" + aboutHtml + "</div>";
    html += "<textarea class=\"input edit-about-hidden\" data-edit-field=\"about\">" + esc(aboutHtml) + "</textarea>";
    html += "<p class=\"edit-about-counter\"><span data-about-count=\"1\">" + esc(String(aboutCharCount)) + "</span> caracteres</p>";
    html += "</div>";
    html += "<aside class=\"edit-about-preview\">";
    html += "<p class=\"edit-about-preview-label\">Preview rapido</p>";
    html += "<h5 class=\"edit-about-preview-title\" data-about-preview-title=\"1\">" + esc(aboutSummary || "Sobre") + "</h5>";
    html += "<div class=\"edit-about-preview-body profile-about-content\" data-about-preview-body=\"1\">" + (aboutHtml || "<p class=\"edit-about-preview-empty\">Sem descricao ainda.</p>") + "</div>";
    html += "</aside>";
    html += "</div>";
    html += "</div>";
  } else if (simpleEditTab) {
    html += "<p class=\"muted edit-section-caption\">Editar conteudo da aba selecionada.</p>";
    html += renderSimpleEditTab(editTab);
  } else {
    html += "<p class=\"muted edit-section-caption\">Editar conteudo da aba selecionada.</p>";
    const activeSub = editor.activeSubByTab[editTab];
    const activeSection = sections.find((section) => (section.id || section.label) === activeSub) || sections[0];
    const items = Array.isArray(activeSection.items) ? activeSection.items : [];
    const addItemLabel =
      editTabType === "servicos" ? "Adicionar servico" :
      editTabType === "produtos" ? "Adicionar produto" :
      editTabType === "menu" ? "Adicionar item" :
      editTabType === "portfolio" ? "Adicionar projeto" :
      editTabType === "campanhas" ? "Adicionar campanha" :
      (editTabType === "casas" || editTabType === "quartos") ? "Adicionar local" : "Adicionar item";
    html += "<p class=\"muted edit-section-caption\">Categorias</p>";
    html += "<div class=\"chips edit-subtabs-row\">" +
      sections.map((section) => {
        const key = section.id || section.label;
        return "<button type=\"button\" class=\"" + (key === activeSub ? "active" : "") + "\" data-edit-subtab=\"" + esc(key) + "\">" + esc(section.label || key) + "</button>";
      }).join("") +
      (editTabType === "campanhas" ? "" : (
        "<button type=\"button\" data-add-category=\"1\">+ Categoria</button>" +
        "<button type=\"button\" data-remove-category=\"1\">Remover</button>" +
        "<button type=\"button\" data-move-category-left=\"1\" title=\"Mover categoria para a esquerda\" aria-label=\"Mover categoria para a esquerda\">&#8592;</button>" +
        "<button type=\"button\" data-move-category-right=\"1\" title=\"Mover categoria para a direita\" aria-label=\"Mover categoria para a direita\">&#8594;</button>"
      )) +
    "</div>";
    if (activeSection && editTabType !== "campanhas") {
      html += "<label class=\"edit-category-label-field\">Nome da categoria<input class=\"input\" data-category-label=\"1\" maxlength=\"" + CATEGORY_LABEL_MAX_LENGTH + "\" value=\"" + esc(activeSection.label || activeSection.id || "") + "\" /></label>";
    }
    const serviceTypeOptions = editTabType === "servicos"
      ? Array.from(new Set([].concat(
          (SERVICE_TYPE_META || []).map((type) => String(type && type.label || "").trim()).filter((label) => label && label.toLowerCase() !== "geral"),
          sections.flatMap((section) => Array.isArray(section && section.items)
            ? section.items.map((item) => String(item && (item.serviceTypeLabel || item.serviceType || item.type) || "").trim()).filter((label) => label && label.toLowerCase() !== "general" && label.toLowerCase() !== "geral")
            : [])
        )))
      : [];
    html += items.map((item, idx) => renderEditItemCard(editTab, item, idx, { collapsed: isEditItemCollapsed(editTab, activeSub, idx), serviceTypeOptions })).join("");
    html += "<div class=\"chips edit-actions-row\"><button type=\"button\" data-add-item=\"1\">" + esc(addItemLabel) + "</button></div>";
  }
  html += "</section>";

  html += "<div class=\"edit-save-row\">";
  html += "<div class=\"chips edit-save-actions\">";
  html += "<button type=\"button\" class=\"edit-history-btn\" data-edit-undo=\"1\" title=\"Desfazer (Ctrl+Z)\" aria-label=\"Desfazer\"" + (canUndo ? "" : " disabled") + ">&#8630;</button>";
  html += "<button type=\"button\" class=\"edit-history-btn\" data-edit-redo=\"1\" title=\"Refazer (Ctrl+Y)\" aria-label=\"Refazer\"" + (canRedo ? "" : " disabled") + ">&#8631;</button>";
  html += "<button type=\"button\" class=\"edit-save-btn\" data-edit-save=\"1\"" + (editor.isSaving ? " disabled" : "") + ">" + (editor.isSaving ? "A guardar..." : "Guardar") + "</button>";
  html += "</div>";
  html += "<p class=\"muted edit-save-status\" data-edit-status=\"1\" role=\"status\" aria-live=\"polite\">" + esc(statusText) + "</p>";
  html += "</div>";
  html += "</div>";
  html += "</div>";
  html += "<aside class=\"edit-studio-preview\">";
  html += "<div class=\"edit-studio-preview-sticky\">";
  html += "<div class=\"edit-studio-preview-header\">";
  html += "<h4>Preview do perfil</h4>";
  html += "<p class=\"muted\">Atualizacao em tempo real</p>";
  html += "</div>";
  html += "<div class=\"edit-studio-preview-shell\" data-edit-preview-body=\"1\"></div>";
  html += "</div>";
  html += "</aside>";
  html += "</div>";

  el.edit.innerHTML = html;
  bindEditTopEvents();
  if (typeof editor.simpleMutationHandler === "function") {
    el.edit.removeEventListener("click", editor.simpleMutationHandler, true);
    editor.simpleMutationHandler = null;
  }

  const setEditorStatus = (message) => {
    editor.statusText = String(message || "");
    const statusNode = el.edit.querySelector("[data-edit-status]");
    if (statusNode) statusNode.textContent = editor.statusText;
  };
  const persistAutosave = () => {
    try {
      const snapshot = buildEditorSnapshot(editor, deepClone);
      const now = Date.now();
      window.localStorage.setItem(autosaveKey, JSON.stringify({ updatedAt: now, snapshot }));
      editor.lastAutosaveAt = now;
      const stamp = formatEditStatusTime(now);
      setEditorStatus(stamp ? ("Auto-guardado " + stamp) : "Auto-guardado");
    } catch (_err) {
      setEditorStatus("Edicao local (auto-save indisponivel)");
    }
  };
  const queueAutosave = () => {
    editor.lastChangeAt = Date.now();
    if (editor.autosaveTimer) clearTimeout(editor.autosaveTimer);
    editor.autosaveTimer = window.setTimeout(() => {
      editor.autosaveTimer = 0;
      persistAutosave();
    }, 900);
  };
  const pushHistorySnapshot = () => {
    const nextSnapshot = buildEditorSnapshot(editor, deepClone);
    const nextHash = JSON.stringify(nextSnapshot);
    const lastSnapshot = editor.history.past[editor.history.past.length - 1];
    const lastHash = lastSnapshot ? JSON.stringify(lastSnapshot) : "";
    if (nextHash === lastHash) return;
    editor.history.past.push(nextSnapshot);
    if (editor.history.past.length > 80) editor.history.past.shift();
    editor.history.future = [];
  };
  const rerenderEditor = (options = {}) => {
    if (options.record !== false) pushHistorySnapshot();
    if (options.autosave !== false) {
      queueAutosave();
      setEditorStatus("Alteracoes por guardar");
    }
    renderEditScreen(ctx);
  };
  const applyHistoryUndo = () => {
    if (!editor.history || !Array.isArray(editor.history.past) || editor.history.past.length <= 1) return;
    const current = editor.history.past.pop();
    if (current) editor.history.future.unshift(current);
    const previous = editor.history.past[editor.history.past.length - 1];
    if (!previous) return;
    applyEditorSnapshot(editor, previous, deepClone);
    setEditorStatus("Alteracao desfeita");
    queueAutosave();
    renderEditScreen(ctx);
  };
  const applyHistoryRedo = () => {
    if (!editor.history || !Array.isArray(editor.history.future) || !editor.history.future.length) return;
    const next = editor.history.future.shift();
    if (!next) return;
    editor.history.past.push(deepClone(next));
    applyEditorSnapshot(editor, next, deepClone);
    setEditorStatus("Alteracao refeita");
    queueAutosave();
    renderEditScreen(ctx);
  };
  if (typeof editor.addActionsDelegatedHandler === "function") {
    el.edit.removeEventListener("click", editor.addActionsDelegatedHandler, true);
    editor.addActionsDelegatedHandler = null;
  }
  const cleanInlineLabel = (value, maxLength) => {
    const limit = Number(maxLength || 0) > 0 ? Number(maxLength) : 32;
    let out = String(value || "").replace(/\s+/g, " ").trim();
    if (out.length > limit) out = out.slice(0, limit).trim();
    return out;
  };
  const comparableInlineText = (value) => {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  };
  const addLinkFromEditorFields = () => {
    const typeField = el.edit.querySelector("select[data-new-link-type]");
    const urlField = el.edit.querySelector("input[data-new-link-url]");
    const labelField = el.edit.querySelector("input[data-new-link-label]");
    const type = String((typeField && typeField.value) || (editor.newLinkDraft && editor.newLinkDraft.type) || "website").trim().toLowerCase() || "website";
    const url = String((urlField && urlField.value) || (editor.newLinkDraft && editor.newLinkDraft.url) || "").trim().slice(0, LINK_URL_MAX_LENGTH);
    const label = cleanInlineLabel((labelField && labelField.value) || (editor.newLinkDraft && editor.newLinkDraft.label) || "", LINK_LABEL_MAX_LENGTH);
    const nextLinks = normalizeLinksForEditor(editor.draft.data.links);
    nextLinks.push({ key: "link-" + Date.now() + "-" + nextLinks.length, type, url, label });
    editor.draft.data.links = nextLinks;
    editor.newLinkDraft = { type: "", url: "", label: "" };
    setEditorStatus("Link adicionado");
    rerenderEditor();
  };
  const addTabFromEditorFields = () => {
    const typeField = el.edit.querySelector("select[data-new-tab-type]");
    const labelField = el.edit.querySelector("input[data-new-tab-label]");
    const type = String((typeField && typeField.value) || (editor.newTabDraft && editor.newTabDraft.type) || "servicos").trim().toLowerCase() || "servicos";
    const draftLabel = cleanInlineLabel((labelField && labelField.value) || (editor.newTabDraft && editor.newTabDraft.label) || "", TAB_LABEL_MAX_LENGTH);
    const cleanLabel = draftLabel || getTabTemplateLabel(type);
    const nextTabs = normalizeTabsForEditor(editor.draft.data.tabs, [], slugify);
    const duplicatedLabel = nextTabs.some((tab) => comparableInlineText(tab && tab.label) === comparableInlineText(cleanLabel));
    if (duplicatedLabel) {
      setEditorStatus("Ja existe uma aba com esse nome.");
      return;
    }
    const nextId = ensureUniqueTabId(type + "-" + cleanLabel, nextTabs, slugify);
    nextTabs.push({ id: nextId, type, label: cleanLabel, enabled: true });
    editor.draft.data.tabs = nextTabs;
    editor.newTabDraft = { type: "servicos", label: "" };
    editor.manageTabId = nextId;
    setState({ editTab: nextId });
    setEditorStatus("Aba adicionada");
    rerenderEditor();
  };
  const addItemToActiveSection = () => {
    if (simpleEditTab || editTabType === "sobre") return false;
    const nextSections = getDraftSections(editTab);
    const activeSub = editor.activeSubByTab[editTab];
    const section = nextSections.find((entry) => (entry.id || entry.label) === activeSub) || nextSections[0];
    if (!section) return false;
    if (!Array.isArray(section.items)) section.items = [];
    section.items.push(blankItem(editTab));
    setDraftSections(editTab, nextSections);
    setEditorStatus("Item adicionado");
    rerenderEditor();
    return true;
  };
  const addCategoryToActiveTab = () => {
    if (simpleEditTab || editTabType === "sobre") return false;
    const cleanLabel = "Nova categoria";
    const nextSections = getDraftSections(editTab);
    let nextId = slugify(cleanLabel);
    let cursor = 2;
    while (nextSections.some((section) => String((section && (section.id || section.label)) || "") === nextId)) {
      nextId = slugify(cleanLabel) + "-" + cursor;
      cursor += 1;
    }
    nextSections.push({ id: nextId, label: cleanLabel, items: [blankItem(editTab)] });
    setDraftSections(editTab, nextSections);
    editor.activeSubByTab[editTab] = nextId;
    setEditorStatus("Categoria adicionada");
    rerenderEditor();
    return true;
  };
  const saveEditorNow = async () => {
    if (editor.isSaving) return;
    const saveButton = el.edit.querySelector("button[data-edit-save]");
    const errors = validateEditorDraft(editor, getDraftSections, isSimpleEditTab);
    if (errors.length) {
      const firstError = String(errors[0] || "Corrige os campos antes de guardar.");
      setEditorStatus(firstError);
      try {
        window.alert(errors.slice(0, 5).join("\n"));
      } catch (_err) {}
      const firstInvalidField = el.edit.querySelector(".input.is-invalid,[aria-invalid=\"true\"]");
      if (firstInvalidField && typeof firstInvalidField.focus === "function") {
        firstInvalidField.focus();
      } else {
        const nameField = el.edit.querySelector("input[data-edit-field=\"name\"]");
        if (nameField && !String(editor.draft.name || "").trim()) {
          nameField.classList.add("is-invalid");
          nameField.setAttribute("aria-invalid", "true");
          nameField.focus();
        }
      }
      return;
    }
    editor.isSaving = true;
    setEditorStatus("A guardar...");
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "A guardar...";
    }
    try {
      await saveEditDraft();
      const now = Date.now();
      editor.lastServerSaveAt = now;
      editor.lastAutosaveAt = now;
      editor.statusText = "Guardado no servidor " + (formatEditStatusTime(now) || "");
      try {
        window.localStorage.removeItem(autosaveKey);
      } catch (_err) {}
      if (editor.autosaveTimer) {
        clearTimeout(editor.autosaveTimer);
        editor.autosaveTimer = 0;
      }
    } catch (err) {
      setEditorStatus("Erro ao guardar");
      try {
        window.alert("Erro ao guardar: " + ((err && err.message) || err));
      } catch (_err) {}
    } finally {
      editor.isSaving = false;
      if (saveButton && el.edit && el.edit.contains(saveButton)) {
        saveButton.disabled = false;
        saveButton.textContent = "Guardar";
      }
    }
  };
  editor.addActionsDelegatedHandler = (ev) => {
    const button = ev.target && typeof ev.target.closest === "function"
      ? ev.target.closest("button[data-add-link],button[data-add-tab],button[data-add-item],button[data-add-category],button[data-edit-save]")
      : null;
    if (!button || !el.edit.contains(button)) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if (button.matches("button[data-edit-save]")) {
      saveEditorNow();
      return;
    }
    if (button.matches("button[data-add-link]")) {
      addLinkFromEditorFields();
      return;
    }
    if (button.matches("button[data-add-tab]")) {
      addTabFromEditorFields();
      return;
    }
    if (button.matches("button[data-add-item]")) {
      addItemToActiveSection();
      return;
    }
    if (button.matches("button[data-add-category]")) {
      addCategoryToActiveTab();
    }
  };
  el.edit.addEventListener("click", editor.addActionsDelegatedHandler, true);

  const previewRoot = el.edit.querySelector("[data-edit-preview-body]");
  if (!editor.fileUploadDelegatedBound) {
    editor.fileUploadDelegatedBound = true;
    el.edit.addEventListener("change", async (ev) => {
      const input = ev.target && ev.target.matches && ev.target.matches("input[type='file']")
        ? ev.target
        : null;
      if (!input) return;
      const file = input.files && input.files[0];
      if (!file) {
        setEditorStatus("Nenhum ficheiro selecionado");
        return;
      }
      const isAvatarUpload = input.matches("input[data-avatar-upload]");
      const isGalleryUpload = input.matches("input[data-gallery-upload]");
      if (!isAvatarUpload && !isGalleryUpload) return;
      ev.stopPropagation();
      try {
        setEditorStatus(isAvatarUpload ? "A carregar imagem..." : "A carregar ficheiro...");
        const dataUrl = await readUploadedMediaUrl(file, isAvatarUpload ? "avatar" : "gallery");
        if (!dataUrl) throw new Error("Ficheiro vazio");
        if (isAvatarUpload) {
          editor.draft.data.avatar = dataUrl;
          setEditorStatus("Imagem carregada");
          rerenderEditor();
          replaceWithUploadedMediaUrl(file, "avatar", (uploadedUrl) => {
            if (!editor.draft || !editor.draft.data) return;
            if (editor.draft.data.avatar !== dataUrl) return;
            editor.draft.data.avatar = uploadedUrl;
            setEditorStatus("Imagem enviada para Supabase");
            renderEditScreen(ctx);
          });
          return;
        }
        const active = String(editor.activeSubByTab.galeria || "photos");
        const next = getDraftGalleryLists();
        const nextViews = typeof getDraftGalleryViews === "function" ? getDraftGalleryViews() : null;
        const list = Array.isArray(next[active]) ? next[active].slice() : [];
        list.push(dataUrl);
        next[active] = list;
        setDraftGalleryLists(next);
        if (nextViews && typeof setDraftGalleryViews === "function") {
          const viewList = Array.isArray(nextViews[active]) ? nextViews[active].slice() : [];
          viewList.push(active === "photos" ? { fit: "contain", zoom: 100, posX: 50, posY: 50 } : {});
          nextViews[active] = viewList;
          setDraftGalleryViews(nextViews);
        }
        editor.gallerySelectedByTab = editor.gallerySelectedByTab || {};
        editor.galleryPagerByTab = editor.galleryPagerByTab || {};
        editor.gallerySelectedByTab[active] = list.length - 1;
        editor.galleryPagerByTab[active] = Math.max(1, Math.ceil(list.length / 24));
        setEditorStatus("Ficheiro carregado");
        rerenderEditor();
        replaceWithUploadedMediaUrl(file, "gallery", (uploadedUrl) => {
          const latest = getDraftGalleryLists();
          const latestList = Array.isArray(latest[active]) ? latest[active].slice() : [];
          const mediaIdx = latestList.indexOf(dataUrl);
          if (mediaIdx < 0) return;
          latestList[mediaIdx] = uploadedUrl;
          latest[active] = latestList;
          setDraftGalleryLists(latest);
          setEditorStatus("Ficheiro enviado para Supabase");
          renderEditScreen(ctx);
        });
      } catch (_err) {
        setEditorStatus(isAvatarUpload ? "Erro ao carregar imagem" : "Erro ao carregar ficheiro");
      } finally {
        input.value = "";
      }
    }, true);
  }
  const renderLivePreview = () => {
    if (!previewRoot || !document.body.contains(previewRoot)) return;
    const draftData = Object.assign({}, deepClone(editor.draft.data || {}));
    const safeAbout = sanitizeRichHtml(editor.draft.about || "");
    const effectiveCategory = String(draftData.customCategory || "").trim() || String(editor.draft.category || "").trim();
    draftData.about = safeAbout;
    draftData.name = String(editor.draft.name || "").trim();
    draftData.category = effectiveCategory;
    draftData.role = effectiveCategory;
    draftData.location = String(editor.draft.location || "").trim();
    const previewProfile = Object.assign({}, profile, {
      name: editor.draft.name || profile.name || "Perfil",
      type: editor.draft.type || profile.type || "service_pro",
      category: effectiveCategory || profile.category || "",
      location: editor.draft.location || profile.location || "",
      about: safeAbout,
      data: draftData,
    });
    const previewTabsRaw = getTabsForProfile(previewProfile);
    const previewTabs = Array.isArray(previewTabsRaw) ? previewTabsRaw.filter((tab) => tab.enabled !== false) : [];
    const previewSelected = String((editor.previewNav && editor.previewNav.tabId) || "");
    const previewTabMeta = previewTabs.find((tab) => tab.id === previewSelected) || previewTabs.find((tab) => tab.id === editTab) || previewTabs[0] || { id: "sobre", type: "sobre" };
    const previewTabId = previewTabMeta.id;
    const previewTabType = String(previewTabMeta.type || previewTabMeta.id || "sobre").toLowerCase();
    editor.previewNav.tabId = previewTabId;
    let previewSections = [];
    if (previewTabType !== "sobre") {
      if (isSimpleEditTab(previewTabId)) {
        previewSections = buildSimplePreviewSections(previewTabType, editor, getDraftGalleryLists);
      } else {
        previewSections = getDraftSections(previewTabId);
        if (previewTabType === "campanhas") {
          const mergedItems = previewSections.flatMap((section) => (Array.isArray(section.items) ? section.items : []));
          previewSections = [{ id: "campanha", label: "Campanha", items: mergedItems }];
        }
      }
    }
    const previewSubSelected = String((editor.previewNav.subByTab && editor.previewNav.subByTab[previewTabId]) || "");
    const previewSubFallback = String((editor.activeSubByTab && editor.activeSubByTab[previewTabId]) || "");
    const previewSubId = previewSubSelected || previewSubFallback;
    const activeSection = previewSections.find((section) => (section.id || section.label) === previewSubId) || previewSections[0] || null;
    if (activeSection && editor.previewNav.subByTab) {
      editor.previewNav.subByTab[previewTabId] = String(activeSection.id || activeSection.label || "");
    }
    const rawItems = activeSection && Array.isArray(activeSection.items) ? activeSection.items : [];
    const visibleItems = rawItems
      .filter((item) => isEnabledFlag(item && item.enabled))
      .map((item) => item);
    const category = previewProfile.category || PROFILE_TYPE_LABEL[previewProfile.type] || "Perfil";
    const location = String(previewProfile.location || draftData.location || "").trim();
    const rating = String(previewProfile.rating || draftData.rating || "-").trim() || "-";
    const avatar = String((previewProfile && previewProfile.avatar) || draftData.avatar || "").trim();
    const socialItems = typeof getSocialItems === "function" ? getSocialItems(draftData) : [];
    const socialHtml = socialItems.map((item) => {
      const iconKey = String((item && item.icon) || "website").toLowerCase();
      const iconSvg = typeof getSocialIconSvg === "function" ? getSocialIconSvg(iconKey) : "&bull;";
      const url = String((item && item.url) || "").trim();
      const socialLabel = getLinkTypeLabel(iconKey);
      if (!url) {
        return (
          "<span class=\"profile-social-btn social-" + esc(iconKey) + " is-empty\" title=\"" + esc(socialLabel) + "\" aria-label=\"" + esc(socialLabel) + "\">" +
            "<span class=\"profile-social-glyph\" aria-hidden=\"true\">" + iconSvg + "</span>" +
          "</span>"
        );
      }
      return (
        "<a class=\"profile-social-btn social-" + esc(iconKey) + "\" href=\"" + esc(url) + "\" target=\"_blank\" rel=\"noopener noreferrer\" title=\"" + esc(socialLabel) + "\" aria-label=\"" + esc(socialLabel) + "\">" +
          "<span class=\"profile-social-glyph\" aria-hidden=\"true\">" + iconSvg + "</span>" +
        "</a>"
      );
    }).join("");
    let contentHtml = "";
    if (previewTabType === "sobre") {
      const summary = String(draftData.aboutSummary || "").trim();
      contentHtml =
        (summary ? "<p class=\"edit-preview-about-summary\">" + esc(summary) + "</p>" : "") +
        "<div class=\"profile-about-content\">" + (safeAbout || "<p class=\"muted\">Sem descricao.</p>") + "</div>";
    } else if (previewTabType === "produtos" || previewTabType === "menu") {
      const isProducts = previewTabType === "produtos";
      const fallbackView = isProducts
        ? String((state && state.profileProductsView) || "list")
        : String((state && state.profileMenuView) || "list");
      const savedView = String((editor.previewNav.catalogView && editor.previewNav.catalogView[previewTabId]) || fallbackView || "list").toLowerCase();
      const currentView = savedView === "grid" ? "grid" : "list";
      editor.previewNav.catalogView[previewTabId] = currentView;
      const sectionLabel = String((activeSection && (activeSection.label || activeSection.id)) || (isProducts ? "Produtos" : "Menu"));
      const cardsHtml = currentView === "grid"
        ? (
          typeof buildCatalogGridCard === "function"
            ? visibleItems.map((item, idx) => buildCatalogGridCard(previewTabType, item, idx)).join("")
            : visibleItems.map((item, idx) => renderItem(previewTabType, item, idx)).join("")
        )
        : (
          typeof buildCatalogListCard === "function"
            ? visibleItems.map((item, idx) => buildCatalogListCard(previewTabType, item, idx)).join("")
            : visibleItems.map((item, idx) => renderItem(previewTabType, item, idx)).join("")
        );
      const bodyClass = currentView === "grid"
        ? ("profile-catalog-grid" + (isProducts ? " profile-catalog-grid-products" : ""))
        : "profile-catalog-list";
      contentHtml =
        "<div class=\"profile-catalog-head\">" +
          "<strong class=\"profile-catalog-title\">" + esc(sectionLabel) + "</strong>" +
          "<div class=\"profile-catalog-toggle\">" +
            "<button type=\"button\" class=\"" + (currentView === "list" ? "active" : "") + "\" data-preview-catalog-view=\"list\" title=\"Lista\" aria-label=\"Ver em lista\">&#9776;</button>" +
            "<button type=\"button\" class=\"" + (currentView === "grid" ? "active" : "") + "\" data-preview-catalog-view=\"grid\" title=\"Grelha\" aria-label=\"Ver em grelha\">&#9638;</button>" +
          "</div>" +
        "</div>" +
        (visibleItems.length
          ? ("<div class=\"" + bodyClass + "\">" + cardsHtml + "</div>")
          : "<p class=\"muted\">Sem itens nesta aba.</p>");
    } else {
      const wrapperClass = getPreviewContentWrapperClass(previewTabType);
      const renderedItems = typeof renderItem === "function"
        ? visibleItems.map((item, idx) => renderItem(previewTabType, item, idx)).join("")
        : visibleItems.map((item) => "<article class=\"profile-item\"><strong>" + esc(String((item && item.name) || "Item")) + "</strong></article>").join("");
      contentHtml = visibleItems.length
        ? ("<div class=\"" + wrapperClass + "\">" + renderedItems + "</div>")
        : "<p class=\"muted\">Sem itens nesta aba.</p>";
    }
    previewRoot.innerHTML =
      "<div class=\"edit-preview-shell\">" +
        "<div class=\"edit-preview-head\">" +
          "<div class=\"profile-head-wrap\">" +
            "<div class=\"profile-head-avatar-wrap\">" +
              (avatar
                ? "<img class=\"profile-head-avatar\" src=\"" + esc(avatar) + "\" alt=\"" + esc(previewProfile.name || "Perfil") + "\" />"
                : "<div class=\"profile-head-avatar placeholder\">" + esc((previewProfile.name || "P").slice(0, 1).toUpperCase()) + "</div>") +
            "</div>" +
            "<div class=\"profile-head-main\">" +
              "<div class=\"profile-head-name-row\"><h3>" + esc(previewProfile.name || "Perfil") + "</h3></div>" +
              "<p class=\"muted\">" + esc(category) + "</p>" +
              "<div class=\"profile-meta-row\">" +
                "<span class=\"profile-meta-pill\">&#128205; " + esc(location || "Sem localizacao") + "</span>" +
                "<span class=\"profile-meta-pill\">&#9733; " + esc(rating) + "</span>" +
              "</div>" +
              (socialHtml ? "<div class=\"profile-social-row\">" + socialHtml + "</div>" : "") +
            "</div>" +
          "</div>" +
        "</div>" +
        "<div class=\"chips edit-preview-tabs\">" + previewTabs.map((tab) => "<button type=\"button\" class=\"" + (tab.id === previewTabId ? "active" : "") + "\" data-preview-tab=\"" + esc(tab.id) + "\">" + esc(tab.label || tab.id) + "</button>").join("") + "</div>" +
        (previewTabType === "sobre" || !previewSections.length ? "" : "<div class=\"chips edit-preview-subtabs\">" + previewSections.map((section) => {
          const key = section.id || section.label;
          return "<button type=\"button\" class=\"" + ((activeSection && (activeSection.id || activeSection.label) === key) ? "active" : "") + "\" data-preview-subtab=\"" + esc(key) + "\">" + esc(section.label || key) + "</button>";
        }).join("") + "</div>") +
        "<div class=\"panel edit-preview-content\">" + contentHtml + "</div>" +
      "</div>";
    previewRoot.querySelectorAll("button[data-preview-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = String(button.dataset.previewTab || "");
        if (!tabId) return;
        editor.previewNav.tabId = tabId;
        scheduleLivePreview();
      });
    });
    previewRoot.querySelectorAll("button[data-preview-subtab]").forEach((button) => {
      button.addEventListener("click", () => {
        const subId = String(button.dataset.previewSubtab || "");
        if (!subId) return;
        if (!editor.previewNav.subByTab || typeof editor.previewNav.subByTab !== "object") editor.previewNav.subByTab = {};
        editor.previewNav.subByTab[previewTabId] = subId;
        scheduleLivePreview();
      });
    });
    previewRoot.querySelectorAll("button[data-preview-catalog-view]").forEach((button) => {
      button.addEventListener("click", () => {
        const view = button.dataset.previewCatalogView === "grid" ? "grid" : "list";
        if (!editor.previewNav.catalogView || typeof editor.previewNav.catalogView !== "object") editor.previewNav.catalogView = {};
        editor.previewNav.catalogView[previewTabId] = view;
        scheduleLivePreview();
      });
    });
    previewRoot.querySelectorAll("button[data-item-thumb-url]").forEach((thumbBtn) => {
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
        card.querySelectorAll(".item-inline-thumb").forEach((node) => node.classList.remove("active"));
        thumbBtn.classList.add("active");
      });
    });
    previewRoot.querySelectorAll(".profile-item[data-profile-item]").forEach((card) => {
      card.addEventListener("click", (ev) => {
        if (ev.target.closest("a,button,input,select,textarea,video")) return;
        const idx = Number(card.dataset.profileItem || -1);
        if (idx < 0 || idx >= visibleItems.length) return;
        openItemModal(previewTabId, visibleItems, idx);
      });
    });
  };
  let previewRenderPending = 0;
  const scheduleLivePreview = () => {
    if (!previewRoot) return;
    if (previewRenderPending) return;
    const runPreview = () => {
      previewRenderPending = 0;
      renderLivePreview();
    };
    if (typeof window.requestAnimationFrame === "function") {
      previewRenderPending = window.requestAnimationFrame(runPreview);
      return;
    }
    previewRenderPending = window.setTimeout(runPreview, 16);
  };
  if (previewRoot) {
    let inputHistoryTimer = 0;
    const markInputChange = () => {
      queueAutosave();
      setEditorStatus("Alteracoes por guardar");
      if (inputHistoryTimer) clearTimeout(inputHistoryTimer);
      inputHistoryTimer = window.setTimeout(() => {
        inputHistoryTimer = 0;
        pushHistorySnapshot();
      }, 420);
    };
    const triggerLivePreview = () => {
      scheduleLivePreview();
    };
    const liveNodes = el.edit.querySelectorAll("input,select,textarea,[contenteditable='true']");
    liveNodes.forEach((node) => {
      const kind = String(node.getAttribute("type") || "").toLowerCase();
      if (kind === "file") return;
      node.addEventListener("input", () => {
        markInputChange();
        triggerLivePreview();
      });
      node.addEventListener("change", () => {
        markInputChange();
        triggerLivePreview();
      });
    });
  }
  renderLivePreview();

  el.edit.querySelectorAll("button[data-edit-collapse-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = String(button.dataset.editCollapseSection || "").trim().toLowerCase();
      if (!key) return;
      const allowed = { avatar: true, basic: true, links: true, tabs: true };
      if (!allowed[key]) return;
      if (!editor.collapsedTopSections || typeof editor.collapsedTopSections !== "object") {
        editor.collapsedTopSections = {};
      }
      editor.collapsedTopSections[key] = editor.collapsedTopSections[key] !== true;
      rerenderEditor();
    });
  });

  const undoBtn = el.edit.querySelector("button[data-edit-undo]");
  if (undoBtn) undoBtn.addEventListener("click", applyHistoryUndo);
  const redoBtn = el.edit.querySelector("button[data-edit-redo]");
  if (redoBtn) redoBtn.addEventListener("click", applyHistoryRedo);

  const editorRoot = el.edit.querySelector(".edit-root");
  if (editorRoot) {
    editorRoot.addEventListener("keydown", (ev) => {
      const key = String(ev.key || "").toLowerCase();
      const withCtrl = !!(ev.ctrlKey || ev.metaKey);
      if (!withCtrl) return;
      const target = ev.target;
      const tag = String((target && target.tagName) || "").toLowerCase();
      const isEditableTarget = !!(
        (target && target.isContentEditable) ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select"
      );
      if (key === "s") {
        ev.preventDefault();
        const quickSaveBtn = el.edit.querySelector("button[data-edit-save]");
        if (quickSaveBtn && !quickSaveBtn.disabled) quickSaveBtn.click();
        return;
      }
      if (isEditableTarget && (key === "z" || key === "y")) {
        return;
      }
      if (key === "z" && !ev.shiftKey) {
        ev.preventDefault();
        applyHistoryUndo();
        return;
      }
      if (key === "y" || (key === "z" && ev.shiftKey)) {
        ev.preventDefault();
        applyHistoryRedo();
      }
    });
  }

  let tabDragFromIndex = -1;
  el.edit.querySelectorAll("[data-tab-drag-index]").forEach((node) => {
    node.addEventListener("dragstart", () => {
      tabDragFromIndex = Number(node.dataset.tabDragIndex || -1);
      node.classList.add("is-dragging");
    });
    node.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      node.classList.add("is-drop-target");
    });
    node.addEventListener("dragleave", () => {
      node.classList.remove("is-drop-target");
    });
    node.addEventListener("drop", (ev) => {
      ev.preventDefault();
      node.classList.remove("is-drop-target");
      const from = Number(tabDragFromIndex);
      const to = Number(node.dataset.tabDragIndex || -1);
      tabDragFromIndex = -1;
      if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < 0 || from === to) return;
      const next = normalizeTabsForEditor(editor.draft.data.tabs, [], slugify);
      if (from >= next.length || to >= next.length) return;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      editor.draft.data.tabs = next;
      editor.manageTabId = moved && moved.id ? moved.id : editor.manageTabId;
      setEditorStatus("Ordem das abas atualizada");
      rerenderEditor();
    });
    node.addEventListener("dragend", () => {
      tabDragFromIndex = -1;
      node.classList.remove("is-dragging");
      el.edit.querySelectorAll("[data-tab-drag-index]").forEach((entry) => entry.classList.remove("is-drop-target"));
    });
  });

  if (editTabType === "sobre") {
    const aboutInput = el.edit.querySelector("textarea[data-edit-field=\"about\"]");
    const aboutEditor = el.edit.querySelector("[data-about-editor]");
    const aboutCountEl = el.edit.querySelector("[data-about-count]");
    const aboutPreviewBodyEl = el.edit.querySelector("[data-about-preview-body]");
    const aboutPreviewTitleEl = el.edit.querySelector("[data-about-preview-title]");
    const aboutSummaryInput = el.edit.querySelector("input[data-about-summary]");
    const aboutSummaryCountEl = el.edit.querySelector("[data-about-summary-count]");
    const syncAboutMeta = (safeHtml) => {
      const plainText = extractAboutPlainText(safeHtml);
      if (aboutCountEl) aboutCountEl.textContent = String(plainText.length);
      if (aboutPreviewBodyEl) {
        aboutPreviewBodyEl.innerHTML = safeHtml || "<p class=\"edit-about-preview-empty\">Sem descricao ainda.</p>";
      }
    };
    const syncAboutSummary = () => {
      if (!aboutSummaryInput) return;
      const summary = sanitizeAboutSummaryText(aboutSummaryInput.value || "");
      editor.draft.data.aboutSummary = summary;
      if (String(aboutSummaryInput.value || "") !== summary) aboutSummaryInput.value = summary;
      if (aboutSummaryCountEl) aboutSummaryCountEl.textContent = String(summary.length);
      if (aboutPreviewTitleEl) aboutPreviewTitleEl.textContent = summary || "Sobre";
      scheduleLivePreview();
    };
    const syncAboutField = () => {
      if (!aboutInput || !aboutEditor) return;
      const safeHtml = sanitizeRichHtml(aboutEditor.innerHTML || "");
      aboutInput.value = safeHtml;
      editor.draft.about = safeHtml;
      syncAboutMeta(safeHtml);
      scheduleLivePreview();
    };
    syncAboutMeta(editor.draft.about || "");
    syncAboutSummary();
    if (aboutEditor) {
      aboutEditor.addEventListener("input", syncAboutField);
      aboutEditor.addEventListener("blur", syncAboutField);
    }
    if (aboutSummaryInput) {
      aboutSummaryInput.addEventListener("input", syncAboutSummary);
      aboutSummaryInput.addEventListener("change", syncAboutSummary);
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
  const nameField = el.edit.querySelector("input[data-edit-field=\"name\"]");
  if (nameField) {
    const applyNameValidity = () => {
      const valid = !!String(nameField.value || "").trim();
      nameField.classList.toggle("is-invalid", !valid);
      nameField.setAttribute("aria-invalid", valid ? "false" : "true");
    };
    nameField.addEventListener("input", applyNameValidity);
    nameField.addEventListener("change", applyNameValidity);
    applyNameValidity();
  }
  if (typeField) {
    typeField.addEventListener("change", () => {
      editor.draft.type = typeField.value || "service_pro";
      const pool = PROFILE_CATEGORY_OPTIONS[editor.draft.type] || [];
      if (!pool.includes(editor.draft.category)) editor.draft.category = pool[0] || "";
      const fallbackByType = getTabsForProfile({ type: editor.draft.type, data: editor.draft.data });
      editor.draft.data.tabs = normalizeTabsForEditor(editor.draft.data.tabs, fallbackByType, slugify);
      rerenderEditor();
    });
  }

  const customCategoryField = el.edit.querySelector("input[data-custom-category]");
  if (customCategoryField) {
    const applyCustomCategory = () => {
      const sanitized = sanitizeShortLabel(customCategoryField.value || "", PROFILE_CUSTOM_CATEGORY_MAX_LENGTH);
      editor.draft.data.customCategory = sanitized;
      if (String(customCategoryField.value || "") !== sanitized) customCategoryField.value = sanitized;
    };
    customCategoryField.addEventListener("input", applyCustomCategory);
    customCategoryField.addEventListener("change", applyCustomCategory);
    applyCustomCategory();
  }

  const hashtagField = el.edit.querySelector("input[data-content-categories]");
  if (hashtagField) {
    const applyTags = () => {
      const parsed = parseTagReferences(hashtagField.value || "");
      editor.draft.data.contentCategories = parsed;
      editor.draft.data.tags = parsed.slice();
      return parsed;
    };
    hashtagField.addEventListener("input", applyTags);
    hashtagField.addEventListener("change", () => {
      const parsed = applyTags();
      hashtagField.value = tagsToInput(parsed);
      rerenderEditor();
    });
  }

  const avatarRemoveBtn = el.edit.querySelector("button[data-avatar-remove]");
  if (avatarRemoveBtn) {
    avatarRemoveBtn.addEventListener("click", () => {
      editor.draft.data.avatar = "";
      rerenderEditor();
    });
  }
  const avatarUploadInput = el.edit.querySelector("input[data-avatar-upload]");
  if (avatarUploadInput) {
    avatarUploadInput.addEventListener("change", async () => {
      const file = avatarUploadInput.files && avatarUploadInput.files[0];
      if (!file) {
        setEditorStatus("Nenhum ficheiro selecionado");
        return;
      }
      try {
        setEditorStatus("A carregar imagem...");
        const dataUrl = await readUploadedMediaUrl(file, "avatar");
        if (!dataUrl) throw new Error("Imagem vazia");
        editor.draft.data.avatar = dataUrl;
        setEditorStatus("Imagem carregada");
        rerenderEditor();
        replaceWithUploadedMediaUrl(file, "avatar", (uploadedUrl) => {
          if (!editor.draft || !editor.draft.data) return;
          if (editor.draft.data.avatar !== dataUrl) return;
          editor.draft.data.avatar = uploadedUrl;
          setEditorStatus("Imagem enviada para Supabase");
          renderEditScreen(ctx);
        });
      } catch (_err) {
        setEditorStatus("Erro ao carregar imagem");
      } finally {
        avatarUploadInput.value = "";
      }
    });
  }

  const mutateLink = (idx, patch) => {
    const next = normalizeLinksForEditor(editor.draft.data.links);
    if (!next[idx]) return;
    next[idx] = Object.assign({}, next[idx], patch || {});
    if (!next[idx].key) next[idx].key = "link-" + Date.now() + "-" + idx;
    editor.draft.data.links = next;
  };
  const normalizeComparableText = (value) => {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  };
  function sanitizeShortLabel(value, maxLength) {
    const limit = Number(maxLength || 0) > 0 ? Number(maxLength) : 32;
    let out = String(value || "").replace(/\s+/g, " ").trim();
    if (out.length > limit) out = out.slice(0, limit).trim();
    return out;
  }
  const sanitizeLinkInputUrl = (value) => {
    return String(value || "").trim().slice(0, LINK_URL_MAX_LENGTH);
  };
  const normalizeLinkIdentity = (type, value) => {
    const kind = String(type || "").trim().toLowerCase();
    let out = String(value || "").trim().toLowerCase();
    if (!out) return "";
    if (out.startsWith("@")) out = out.slice(1);
    out = out.replace(/^https?:\/\//, "").replace(/^www\./, "");
    if (kind === "website" || kind === "outro") out = out.replace(/\/+$/g, "");
    if (kind === "whatsapp") out = out.replace(/[\s().-]+/g, "").replace(/^\+/, "");
    return out;
  };
  const applyUrlFieldValidity = (field, type, value) => {
    if (!field) return;
    const valid = isLikelyUrlForLink(value, type);
    field.classList.toggle("is-invalid", !valid);
    field.setAttribute("aria-invalid", valid ? "false" : "true");
  };

  el.edit.querySelectorAll("select[data-link-type]").forEach((field) => {
    field.addEventListener("change", () => {
      const idx = Number(field.dataset.linkType || -1);
      if (idx < 0) return;
      mutateLink(idx, { type: String(field.value || "website").trim().toLowerCase() || "website" });
      rerenderEditor();
    });
  });
  el.edit.querySelectorAll("input[data-link-url]").forEach((field) => {
    const apply = () => {
      const idx = Number(field.dataset.linkUrl || -1);
      if (idx < 0) return;
      const nextValue = sanitizeLinkInputUrl(field.value || "");
      if (String(field.value || "") !== nextValue) field.value = nextValue;
      mutateLink(idx, { url: nextValue });
      const current = normalizeLinksForEditor(editor.draft.data.links)[idx] || {};
      applyUrlFieldValidity(field, current.type, nextValue);
    };
    field.addEventListener("input", apply);
    field.addEventListener("change", apply);
    const idx = Number(field.dataset.linkUrl || -1);
    const current = normalizeLinksForEditor(editor.draft.data.links)[idx] || {};
    const currentValue = sanitizeLinkInputUrl(field.value || "");
    if (String(field.value || "") !== currentValue) field.value = currentValue;
    applyUrlFieldValidity(field, current.type, currentValue);
  });
  el.edit.querySelectorAll("input[data-link-label]").forEach((field) => {
    const apply = () => {
      const idx = Number(field.dataset.linkLabel || -1);
      if (idx < 0) return;
      const nextValue = sanitizeShortLabel(field.value || "", LINK_LABEL_MAX_LENGTH);
      if (String(field.value || "") !== nextValue) field.value = nextValue;
      mutateLink(idx, { label: nextValue });
    };
    field.addEventListener("input", apply);
    field.addEventListener("change", apply);
  });
  el.edit.querySelectorAll("button[data-remove-link]").forEach((button) => {
    button.addEventListener("click", () => {
      const idx = Number(button.dataset.removeLink || -1);
      const next = normalizeLinksForEditor(editor.draft.data.links);
      if (idx >= 0 && idx < next.length) next.splice(idx, 1);
      editor.draft.data.links = next;
      rerenderEditor();
    });
  });

  const newLinkTypeField = el.edit.querySelector("select[data-new-link-type]");
  if (newLinkTypeField) {
    newLinkTypeField.addEventListener("change", () => {
      editor.newLinkDraft.type = String(newLinkTypeField.value || "").trim().toLowerCase();
      const iconWrap = newLinkTypeField.closest(".edit-link-type-wrap");
      const iconNode = iconWrap && iconWrap.querySelector(".edit-link-type-icon");
      if (iconNode) {
        const iconType = editor.newLinkDraft.type || "website";
        iconNode.className = "edit-link-type-icon social-" + (iconType === "outro" ? "website" : iconType);
        iconNode.innerHTML = getSocialIconSvg(iconType === "outro" ? "website" : iconType);
      }
      if (newLinkUrlField) applyUrlFieldValidity(newLinkUrlField, editor.newLinkDraft.type, editor.newLinkDraft.url);
    });
  }
  const newLinkUrlField = el.edit.querySelector("input[data-new-link-url]");
  if (newLinkUrlField) {
    newLinkUrlField.addEventListener("input", () => {
      const sanitized = sanitizeLinkInputUrl(newLinkUrlField.value || "");
      editor.newLinkDraft.url = sanitized;
      if (String(newLinkUrlField.value || "") !== sanitized) newLinkUrlField.value = sanitized;
      applyUrlFieldValidity(newLinkUrlField, editor.newLinkDraft.type, editor.newLinkDraft.url);
    });
    applyUrlFieldValidity(newLinkUrlField, editor.newLinkDraft.type, editor.newLinkDraft.url);
  }
  const newLinkLabelField = el.edit.querySelector("input[data-new-link-label]");
  if (newLinkLabelField) {
    newLinkLabelField.addEventListener("input", () => {
      const sanitized = sanitizeShortLabel(newLinkLabelField.value || "", LINK_LABEL_MAX_LENGTH);
      editor.newLinkDraft.label = sanitized;
      if (String(newLinkLabelField.value || "") !== sanitized) newLinkLabelField.value = sanitized;
    });
  }
  const addLinkFromCurrentFields = () => {
    const typeField = el.edit.querySelector("select[data-new-link-type]");
    const urlField = el.edit.querySelector("input[data-new-link-url]");
    const labelField = el.edit.querySelector("input[data-new-link-label]");
    const type = String((typeField && typeField.value) || (editor.newLinkDraft && editor.newLinkDraft.type) || "website").trim().toLowerCase() || "website";
    const url = sanitizeLinkInputUrl((urlField && urlField.value) || (editor.newLinkDraft && editor.newLinkDraft.url) || "");
    const label = sanitizeShortLabel((labelField && labelField.value) || (editor.newLinkDraft && editor.newLinkDraft.label) || "", LINK_LABEL_MAX_LENGTH);
    editor.newLinkDraft.type = type;
    editor.newLinkDraft.url = url;
    editor.newLinkDraft.label = label;
    if (urlField && String(urlField.value || "") !== url) urlField.value = url;
    if (labelField && String(labelField.value || "") !== label) labelField.value = label;
    const next = normalizeLinksForEditor(editor.draft.data.links);
    const normalizedUrl = normalizeLinkIdentity(type, url);
    const duplicate = (normalizedUrl || label) && next.some((entry) => {
      return String(entry && entry.type || "").toLowerCase() === type &&
        normalizeLinkIdentity(type, String(entry && entry.url || "")) === normalizedUrl &&
        String(entry && entry.label || "").trim().toLowerCase() === label.toLowerCase();
    });
    if (duplicate) {
      setEditorStatus("Este link ja existe.");
      if (urlField) urlField.focus();
      return;
    }
    next.push({
      key: "link-" + Date.now() + "-" + next.length,
      type,
      url,
      label,
    });
    editor.draft.data.links = next;
    editor.newLinkDraft.type = "";
    editor.newLinkDraft.url = "";
    editor.newLinkDraft.label = "";
    setEditorStatus("Link adicionado");
    rerenderEditor();
  };
  if (!editor.addLinkDelegatedBound) {
    editor.addLinkDelegatedBound = true;
    el.edit.addEventListener("click", (ev) => {
      const button = ev.target && ev.target.closest ? ev.target.closest("button[data-add-link]") : null;
      if (!button || !el.edit.contains(button)) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      addLinkFromCurrentFields();
    }, true);
  }
  const addLinkBtn = el.edit.querySelector("button[data-add-link]");
  if (addLinkBtn) {
    addLinkBtn.addEventListener("click", () => {
      addLinkFromCurrentFields();
    });
  }

  const moveManageTab = (delta) => {
    const next = normalizeTabsForEditor(editor.draft.data.tabs, [], slugify);
    const idx = next.findIndex((tab) => tab.id === editor.manageTabId);
    const target = idx + delta;
    if (idx < 0 || target < 0 || target >= next.length) return;
    const temp = next[target];
    next[target] = next[idx];
    next[idx] = temp;
    editor.draft.data.tabs = next;
    rerenderEditor();
  };

  el.edit.querySelectorAll("button[data-manage-tab-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = String(button.dataset.manageTabSelect || "");
      if (!tabId) return;
      editor.manageTabId = tabId;
      const picked = allTabs.find((tab) => tab.id === tabId);
      if (picked && picked.enabled !== false) setState({ editTab: tabId });
      rerenderEditor();
    });
  });
  el.edit.querySelectorAll("button[data-manage-tab-move]").forEach((button) => {
    button.addEventListener("click", () => {
      const delta = Number(button.dataset.manageTabMove || 0);
      if (!delta) return;
      moveManageTab(delta);
    });
  });
  el.edit.querySelectorAll("button[data-tab-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = String(button.dataset.tabToggle || "");
      const next = normalizeTabsForEditor(editor.draft.data.tabs, [], slugify);
      const idx = next.findIndex((tab) => tab.id === tabId);
      if (idx < 0) return;
      next[idx].enabled = next[idx].enabled === false;
      editor.draft.data.tabs = next;
      const selected = next.find((tab) => tab.id === state.editTab);
      if (!selected || selected.enabled === false) {
        const firstEnabled = next.find((tab) => tab.enabled !== false) || next[0];
        setState({ editTab: (firstEnabled && firstEnabled.id) || "sobre" });
      }
      rerenderEditor();
    });
  });
  el.edit.querySelectorAll("button[data-tab-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = String(button.dataset.tabRemove || "");
      const next = normalizeTabsForEditor(editor.draft.data.tabs, [], slugify);
      const idx = next.findIndex((tab) => tab.id === tabId);
      if (idx < 0) return;
      if (next.length <= 1) {
        setEditorStatus("O perfil precisa de pelo menos uma aba.");
        return;
      }
      next.splice(idx, 1);
      editor.draft.data.tabs = next;
      if (editor.manageTabId === tabId) {
        editor.manageTabId = (editor.draft.data.tabs[0] && editor.draft.data.tabs[0].id) || "sobre";
      }
      const current = editor.draft.data.tabs.find((tab) => tab.id === state.editTab && tab.enabled !== false);
      if (!current) {
        const firstEnabled = editor.draft.data.tabs.find((tab) => tab.enabled !== false) || editor.draft.data.tabs[0];
        setState({ editTab: (firstEnabled && firstEnabled.id) || "sobre" });
      }
      rerenderEditor();
    });
  });

  const newTabTypeField = el.edit.querySelector("select[data-new-tab-type]");
  if (newTabTypeField) {
    newTabTypeField.addEventListener("change", () => {
      editor.newTabDraft.type = String(newTabTypeField.value || "servicos").trim().toLowerCase() || "servicos";
    });
  }
  const newTabLabelField = el.edit.querySelector("input[data-new-tab-label]");
  if (newTabLabelField) {
    newTabLabelField.addEventListener("input", () => {
      const sanitized = sanitizeShortLabel(newTabLabelField.value || "", TAB_LABEL_MAX_LENGTH);
      editor.newTabDraft.label = sanitized;
      if (String(newTabLabelField.value || "") !== sanitized) newTabLabelField.value = sanitized;
    });
  }
  const addTabBtn = el.edit.querySelector("button[data-add-tab]");
  if (addTabBtn) {
    addTabBtn.addEventListener("click", () => {
      const type = String((editor.newTabDraft && editor.newTabDraft.type) || "servicos").trim().toLowerCase() || "servicos";
      const draftLabel = sanitizeShortLabel((editor.newTabDraft && editor.newTabDraft.label) || "", TAB_LABEL_MAX_LENGTH);
      const cleanLabel = draftLabel || getTabTemplateLabel(type);
      editor.newTabDraft.label = draftLabel;
      if (newTabLabelField && String(newTabLabelField.value || "") !== draftLabel) newTabLabelField.value = draftLabel;
      const next = normalizeTabsForEditor(editor.draft.data.tabs, [], slugify);
      const duplicatedLabel = next.some((tab) => normalizeComparableText(tab && tab.label) === normalizeComparableText(cleanLabel));
      if (duplicatedLabel) {
        setEditorStatus("Ja existe uma aba com esse nome.");
        if (newTabLabelField) newTabLabelField.focus();
        return;
      }
      const nextId = ensureUniqueTabId(type + "-" + cleanLabel, next, slugify);
      next.push({
        id: nextId,
        type,
        label: cleanLabel,
        enabled: true,
      });
      editor.draft.data.tabs = next;
      editor.newTabDraft.label = "";
      editor.manageTabId = nextId;
      setState({ editTab: nextId });
      rerenderEditor();
    });
  }

  if (simpleEditTab) {
    bindSimpleEditTabEvents(editTab, { setEditorStatus });
    const simpleMutationSelectors = [
      "[data-gallery-tab]",
      "[data-gallery-select]",
      "[data-gallery-page-prev]",
      "[data-gallery-page-next]",
      "[data-gallery-order-prev]",
      "[data-gallery-order-next]",
      "[data-gallery-remove]",
      "[data-gallery-adjust]",
      "[data-gallery-add-url]",
      "[data-agenda-add-slot]",
      "[data-agenda-remove-slot]",
      "[data-partner-add]",
      "[data-partner-remove]",
      "[data-location-add]",
      "[data-location-remove]",
    ];
    const trackSimpleMutation = (ev) => {
      const target = ev.target && typeof ev.target.closest === "function"
        ? ev.target.closest(simpleMutationSelectors.join(","))
        : null;
      if (!target) return;
      window.setTimeout(() => {
        pushHistorySnapshot();
        queueAutosave();
        setEditorStatus("Alteracoes por guardar");
      }, 0);
    };
    editor.simpleMutationHandler = trackSimpleMutation;
    el.edit.addEventListener("click", trackSimpleMutation, true);
  }

  if (editTabType !== "sobre" && !simpleEditTab) {
    el.edit.querySelectorAll("button[data-edit-subtab]").forEach((button) => button.addEventListener("click", () => {
      editor.activeSubByTab[editTab] = button.dataset.editSubtab;
      rerenderEditor();
    }));

    const categoryLabelField = el.edit.querySelector("input[data-category-label]");
    if (categoryLabelField) {
      categoryLabelField.addEventListener("change", () => {
        const next = getDraftSections(editTab);
        const activeSub = editor.activeSubByTab[editTab];
        const idx = next.findIndex((section) => (section.id || section.label) === activeSub);
        if (idx < 0) return;
        const cleanLabel = sanitizeShortLabel(categoryLabelField.value || "", CATEGORY_LABEL_MAX_LENGTH);
        if (!cleanLabel) {
          categoryLabelField.value = String(next[idx].label || next[idx].id || "");
          setEditorStatus("Nome da categoria obrigatorio.");
          return;
        }
        const duplicatedLabel = next.some((section, sectionIdx) => {
          if (sectionIdx === idx) return false;
          return normalizeComparableText(section && (section.label || section.id)) === normalizeComparableText(cleanLabel);
        });
        if (duplicatedLabel) {
          categoryLabelField.value = String(next[idx].label || next[idx].id || "");
          setEditorStatus("Ja existe uma categoria com esse nome.");
          return;
        }
        next[idx] = Object.assign({}, next[idx], { label: cleanLabel });
        setDraftSections(editTab, next);
        setEditorStatus("Categoria atualizada");
        rerenderEditor();
      });
    }

    const addCategoryBtn = el.edit.querySelector("button[data-add-category]");
    if (addCategoryBtn) {
      addCategoryBtn.addEventListener("click", () => {
        const label = window.prompt("Nome da categoria:", "Nova categoria");
        if (!label) return;
        const next = getDraftSections(editTab);
        const cleanLabel = sanitizeShortLabel(label || "", CATEGORY_LABEL_MAX_LENGTH);
        if (!cleanLabel) return;
        const duplicatedLabel = next.some((section) => normalizeComparableText(section && (section.label || section.id)) === normalizeComparableText(cleanLabel));
        if (duplicatedLabel) {
          setEditorStatus("Ja existe uma categoria com esse nome.");
          return;
        }
        const baseId = slugify(cleanLabel);
        let nextId = baseId;
        let cursor = 2;
        while (next.some((section) => String((section && (section.id || section.label)) || "") === nextId)) {
          nextId = baseId + "-" + cursor;
          cursor += 1;
        }
        next.push({ id: nextId, label: cleanLabel, items: [blankItem(editTab)] });
        setDraftSections(editTab, next);
        editor.activeSubByTab[editTab] = nextId;
        rerenderEditor();
      });
    }

    const removeCategoryBtn = el.edit.querySelector("button[data-remove-category]");
    if (removeCategoryBtn) {
      removeCategoryBtn.addEventListener("click", () => {
        const next = getDraftSections(editTab);
        if (next.length <= 1) return;
        const activeSub = editor.activeSubByTab[editTab];
        const idx = next.findIndex((section) => (section.id || section.label) === activeSub);
        if (idx >= 0) next.splice(idx, 1);
        setDraftSections(editTab, next);
        editor.activeSubByTab[editTab] = (next[0] && (next[0].id || next[0].label)) || "";
        rerenderEditor();
      });
    }

    const moveCategoryLeftBtn = el.edit.querySelector("button[data-move-category-left]");
    if (moveCategoryLeftBtn) {
      moveCategoryLeftBtn.addEventListener("click", () => {
        const next = getDraftSections(editTab);
        const activeSub = editor.activeSubByTab[editTab];
        const idx = next.findIndex((section) => (section.id || section.label) === activeSub);
        if (idx <= 0) return;
        const temp = next[idx - 1];
        next[idx - 1] = next[idx];
        next[idx] = temp;
        setDraftSections(editTab, next);
        rerenderEditor();
      });
    }

    const moveCategoryRightBtn = el.edit.querySelector("button[data-move-category-right]");
    if (moveCategoryRightBtn) {
      moveCategoryRightBtn.addEventListener("click", () => {
        const next = getDraftSections(editTab);
        const activeSub = editor.activeSubByTab[editTab];
        const idx = next.findIndex((section) => (section.id || section.label) === activeSub);
        if (idx < 0 || idx >= next.length - 1) return;
        const temp = next[idx + 1];
        next[idx + 1] = next[idx];
        next[idx] = temp;
        setDraftSections(editTab, next);
        rerenderEditor();
      });
    }

    const addItemBtn = el.edit.querySelector("button[data-add-item]");
    if (addItemBtn) {
      addItemBtn.addEventListener("click", () => {
        const next = getDraftSections(editTab);
        const activeSub = editor.activeSubByTab[editTab];
        const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
        if (!Array.isArray(section.items)) section.items = [];
        section.items.push(blankItem(editTab));
        setDraftSections(editTab, next);
        rerenderEditor();
      });
    }

    el.edit.querySelectorAll("button[data-toggle-item-collapse]").forEach((button) => button.addEventListener("click", () => {
      const idx = Number(button.dataset.toggleItemCollapse || -1);
      const activeSub = editor.activeSubByTab[editTab];
      if (idx < 0) return;
      const current = isEditItemCollapsed(editTab, activeSub, idx);
      setEditItemCollapsed(editTab, activeSub, idx, !current);
      rerenderEditor();
    }));

    el.edit.querySelectorAll("button[data-toggle-item-enabled]").forEach((button) => button.addEventListener("click", () => {
      const idx = Number(button.dataset.toggleItemEnabled || -1);
      const next = getDraftSections(editTab);
      const activeSub = editor.activeSubByTab[editTab];
      const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
      if (!section || !Array.isArray(section.items) || idx < 0 || idx >= section.items.length) return;
      const row = Object.assign({}, section.items[idx] || {});
      row.enabled = !isEnabledFlag(row.enabled);
      section.items[idx] = row;
      setDraftSections(editTab, next);
      rerenderEditor();
    }));

    el.edit.querySelectorAll("button[data-preview-item]").forEach((button) => button.addEventListener("click", () => {
      const idx = Number(button.dataset.previewItem || -1);
      const next = getDraftSections(editTab);
      const activeSub = editor.activeSubByTab[editTab];
      const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
      if (!section || !Array.isArray(section.items) || idx < 0 || idx >= section.items.length) return;
      openItemModal(editTab, section.items, idx);
    }));

    el.edit.querySelectorAll("button[data-dup-item]").forEach((button) => button.addEventListener("click", () => {
      const idx = Number(button.dataset.dupItem || -1);
      const next = getDraftSections(editTab);
      const activeSub = editor.activeSubByTab[editTab];
      const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
      if (!section || !Array.isArray(section.items) || idx < 0 || idx >= section.items.length) return;
      section.items.splice(idx + 1, 0, deepClone(section.items[idx]));
      setDraftSections(editTab, next);
      rerenderEditor();
    }));

    el.edit.querySelectorAll("button[data-remove-item]").forEach((button) => button.addEventListener("click", () => {
      const idx = Number(button.dataset.removeItem || -1);
      const next = getDraftSections(editTab);
      const activeSub = editor.activeSubByTab[editTab];
      const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
      if (!section || !Array.isArray(section.items)) return;
      if (idx >= 0 && idx < section.items.length) section.items.splice(idx, 1);
      setDraftSections(editTab, next);
      rerenderEditor();
    }));

    el.edit.querySelectorAll("button[data-add-extra]").forEach((button) => button.addEventListener("click", () => {
      const idx = Number(button.dataset.addExtra || -1);
      const next = getDraftSections(editTab);
      const activeSub = editor.activeSubByTab[editTab];
      const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
      if (!section || !Array.isArray(section.items) || !section.items[idx]) return;
      if (!Array.isArray(section.items[idx].extraFields)) section.items[idx].extraFields = [];
      section.items[idx].extraFields.push({ name: "", value: "", description: "" });
      setDraftSections(editTab, next);
      rerenderEditor();
    }));

    el.edit.querySelectorAll("button[data-remove-extra]").forEach((button) => button.addEventListener("click", () => {
      const idx = Number(button.dataset.removeExtra || -1);
      const extraIdx = Number(button.dataset.extraIdx || -1);
      const next = getDraftSections(editTab);
      const activeSub = editor.activeSubByTab[editTab];
      const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
      if (!section || !Array.isArray(section.items) || !section.items[idx]) return;
      if (!Array.isArray(section.items[idx].extraFields)) section.items[idx].extraFields = [];
      if (extraIdx >= 0 && extraIdx < section.items[idx].extraFields.length) section.items[idx].extraFields.splice(extraIdx, 1);
      setDraftSections(editTab, next);
      rerenderEditor();
    }));

    el.edit.querySelectorAll("[data-extra-field]").forEach((field) => {
      const applyExtra = () => {
        const idx = Number(field.dataset.itemIdx || -1);
        const extraIdx = Number(field.dataset.extraIdx || -1);
        const key = field.dataset.extraField;
        const next = getDraftSections(editTab);
        const activeSub = editor.activeSubByTab[editTab];
        const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
        if (!section || !Array.isArray(section.items) || !section.items[idx]) return;
        if (!Array.isArray(section.items[idx].extraFields)) section.items[idx].extraFields = [];
        if (!section.items[idx].extraFields[extraIdx]) section.items[idx].extraFields[extraIdx] = { name: "", value: "", description: "" };
        section.items[idx].extraFields[extraIdx][key] = field.value;
        setDraftSections(editTab, next);
      };
      field.addEventListener("input", applyExtra);
      field.addEventListener("change", applyExtra);
    });

    el.edit.querySelectorAll("input[data-upload-item]").forEach((input) => input.addEventListener("change", async () => {
      const idx = Number(input.dataset.uploadItem || -1);
      const file = input.files && input.files[0];
      if (!file) return;
      const next = getDraftSections(editTab);
      const activeSub = editor.activeSubByTab[editTab];
      const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
      if (!section || !Array.isArray(section.items) || !section.items[idx]) return;
      try {
        setEditorStatus("A carregar imagem...");
        const dataUrl = await readUploadedMediaUrl(file, "item");
        if (!dataUrl) throw new Error("Imagem vazia");
        const merged = getMergedItemImages(section.items[idx]);
        merged.push(dataUrl);
        applyMergedItemImages(section.items[idx], merged);
        setDraftSections(editTab, next);
        setEditorStatus("Imagem carregada");
        rerenderEditor();
        replaceWithUploadedMediaUrl(file, "item", (uploadedUrl) => {
          const latest = getDraftSections(editTab);
          const latestSection = latest.find((entry) => (entry.id || entry.label) === activeSub) || latest[0];
          if (!latestSection || !Array.isArray(latestSection.items) || !latestSection.items[idx]) return;
          const latestMerged = getMergedItemImages(latestSection.items[idx]);
          const imageIdx = latestMerged.indexOf(dataUrl);
          if (imageIdx < 0) return;
          latestMerged[imageIdx] = uploadedUrl;
          applyMergedItemImages(latestSection.items[idx], latestMerged);
          setDraftSections(editTab, latest);
          setEditorStatus("Imagem enviada para Supabase");
          renderEditScreen(ctx);
        });
      } catch (_err) {
        setEditorStatus("Erro ao carregar imagem");
      } finally {
        input.value = "";
      }
    }));

    el.edit.querySelectorAll("button[data-set-cover-image]").forEach((button) => button.addEventListener("click", () => {
      const idx = Number(button.dataset.setCoverImage || -1);
      const imageIdx = Number(button.dataset.imageIdx || -1);
      const next = getDraftSections(editTab);
      const activeSub = editor.activeSubByTab[editTab];
      const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
      if (!section || !Array.isArray(section.items) || !section.items[idx]) return;
      const merged = getMergedItemImages(section.items[idx]);
      if (imageIdx < 0 || imageIdx >= merged.length) return;
      const picked = merged.splice(imageIdx, 1)[0];
      merged.unshift(picked);
      applyMergedItemImages(section.items[idx], merged);
      setDraftSections(editTab, next);
      rerenderEditor();
    }));

    el.edit.querySelectorAll("button[data-move-item-image-up]").forEach((button) => button.addEventListener("click", () => {
      const idx = Number(button.dataset.moveItemImageUp || -1);
      const imageIdx = Number(button.dataset.imageIdx || -1);
      const next = getDraftSections(editTab);
      const activeSub = editor.activeSubByTab[editTab];
      const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
      if (!section || !Array.isArray(section.items) || !section.items[idx]) return;
      const merged = getMergedItemImages(section.items[idx]);
      if (imageIdx <= 0 || imageIdx >= merged.length) return;
      const temp = merged[imageIdx - 1];
      merged[imageIdx - 1] = merged[imageIdx];
      merged[imageIdx] = temp;
      applyMergedItemImages(section.items[idx], merged);
      setDraftSections(editTab, next);
      rerenderEditor();
    }));

    el.edit.querySelectorAll("button[data-move-item-image-down]").forEach((button) => button.addEventListener("click", () => {
      const idx = Number(button.dataset.moveItemImageDown || -1);
      const imageIdx = Number(button.dataset.imageIdx || -1);
      const next = getDraftSections(editTab);
      const activeSub = editor.activeSubByTab[editTab];
      const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
      if (!section || !Array.isArray(section.items) || !section.items[idx]) return;
      const merged = getMergedItemImages(section.items[idx]);
      if (imageIdx < 0 || imageIdx >= merged.length - 1) return;
      const temp = merged[imageIdx + 1];
      merged[imageIdx + 1] = merged[imageIdx];
      merged[imageIdx] = temp;
      applyMergedItemImages(section.items[idx], merged);
      setDraftSections(editTab, next);
      rerenderEditor();
    }));

    el.edit.querySelectorAll("button[data-remove-item-image]").forEach((button) => button.addEventListener("click", () => {
      const idx = Number(button.dataset.removeItemImage || -1);
      const imageIdx = Number(button.dataset.imageIdx || -1);
      const next = getDraftSections(editTab);
      const activeSub = editor.activeSubByTab[editTab];
      const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
      if (!section || !Array.isArray(section.items) || !section.items[idx]) return;
      const merged = getMergedItemImages(section.items[idx]);
      if (imageIdx >= 0 && imageIdx < merged.length) merged.splice(imageIdx, 1);
      applyMergedItemImages(section.items[idx], merged);
      setDraftSections(editTab, next);
      rerenderEditor();
    }));

    el.edit.querySelectorAll("input[data-upload-campaign]").forEach((input) => input.addEventListener("change", async () => {
      const idx = Number(input.dataset.uploadCampaign || -1);
      const file = input.files && input.files[0];
      if (!file) return;
      const next = getDraftSections(editTab);
      const activeSub = editor.activeSubByTab[editTab];
      const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
      if (!section || !Array.isArray(section.items) || !section.items[idx]) return;
      try {
        setEditorStatus("A carregar ficheiro...");
        const dataUrl = await readUploadedMediaUrl(file, "campaign");
        if (!dataUrl) throw new Error("Ficheiro vazio");
        section.items[idx].mediaUrl = dataUrl;
        section.items[idx].mediaType = String(file.type || "").toLowerCase().startsWith("video/") ? "video" : "image";
        setDraftSections(editTab, next);
        setEditorStatus("Ficheiro carregado");
        rerenderEditor();
        replaceWithUploadedMediaUrl(file, "campaign", (uploadedUrl) => {
          const latest = getDraftSections(editTab);
          const latestSection = latest.find((entry) => (entry.id || entry.label) === activeSub) || latest[0];
          if (!latestSection || !Array.isArray(latestSection.items) || !latestSection.items[idx]) return;
          if (latestSection.items[idx].mediaUrl !== dataUrl) return;
          latestSection.items[idx].mediaUrl = uploadedUrl;
          setDraftSections(editTab, latest);
          setEditorStatus("Ficheiro enviado para Supabase");
          renderEditScreen(ctx);
        });
      } catch (_err) {
        setEditorStatus("Erro ao carregar ficheiro");
      } finally {
        input.value = "";
      }
    }));

    el.edit.querySelectorAll("[data-item-field]").forEach((field) => {
      const applyField = () => {
        const idx = Number(field.dataset.itemIdx || -1);
        const key = String(field.dataset.itemField || "");
        const next = getDraftSections(editTab);
        const activeSub = editor.activeSubByTab[editTab];
        const section = next.find((entry) => (entry.id || entry.label) === activeSub) || next[0];
        if (!section || !Array.isArray(section.items)) return;
        if (!section.items[idx]) section.items[idx] = blankItem(editTab);
        const value = String(field.value || "");
        if (key === "promoEnabled" || key === "quoteOnly") {
          section.items[idx][key] = (value.trim().toLowerCase() === "yes" ? "yes" : "no");
        } else if (key === "serviceType") {
          const cleanType = String(value || "").replace(/\s+/g, " ").trim();
          const knownType = (SERVICE_TYPE_META || []).find((type) => {
            const id = String(type && type.id || "").trim().toLowerCase();
            const label = String(type && type.label || "").trim().toLowerCase();
            const lookup = cleanType.toLowerCase();
            return lookup && (lookup === id || lookup === label);
          });
          section.items[idx].serviceType = knownType ? knownType.id : cleanType;
          section.items[idx].type = knownType ? knownType.id : cleanType;
          section.items[idx].serviceTypeLabel = knownType ? knownType.label : cleanType;
        } else if ((editTabType === "casas" || editTabType === "quartos") && (key === "amenities" || key === "houseRules")) {
          section.items[idx][key] = toArrayList(value);
        } else {
          section.items[idx][key] = value;
        }
        if (key === "imageUrl") {
          const url = String(field.value || "").trim();
          const merged = getMergedItemImages(section.items[idx]);
          if (url) {
            const nextMerged = [url].concat(merged.filter((entry) => entry !== url));
            applyMergedItemImages(section.items[idx], nextMerged);
          } else {
            applyMergedItemImages(section.items[idx], merged.filter((_entry, imageIdx) => imageIdx !== 0));
          }
        }
        setDraftSections(editTab, next);
        if (key === "promoEnabled" || key === "quoteOnly" || key === "mediaType" || key === "mediaUrl" || key === "imageUrl" || key === "availability") {
          rerenderEditor();
        }
      };
      field.addEventListener("input", applyField);
      field.addEventListener("change", applyField);
    });
  }

  const saveBtn = el.edit.querySelector("button[data-edit-save]");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      if (editor.isSaving) return;
      const errors = validateEditorDraft(editor, getDraftSections, isSimpleEditTab);
      if (errors.length) {
        const firstError = String(errors[0] || "Corrige os campos antes de guardar.");
        setEditorStatus(firstError);
        alert(errors.slice(0, 5).join("\n"));
        const firstInvalidField = el.edit.querySelector(".input.is-invalid,[aria-invalid=\"true\"]");
        if (firstInvalidField && typeof firstInvalidField.focus === "function") {
          firstInvalidField.focus();
        } else {
          const nameField = el.edit.querySelector("input[data-edit-field=\"name\"]");
          if (nameField && !String(editor.draft.name || "").trim()) {
            nameField.classList.add("is-invalid");
            nameField.setAttribute("aria-invalid", "true");
            nameField.focus();
          }
        }
        return;
      }
      editor.isSaving = true;
      setEditorStatus("A guardar...");
      saveBtn.disabled = true;
      saveBtn.textContent = "A guardar...";
      try {
        await saveEditDraft();
        const now = Date.now();
        editor.lastServerSaveAt = now;
        editor.lastAutosaveAt = now;
        editor.statusText = "Guardado no servidor " + (formatEditStatusTime(now) || "");
        try {
          window.localStorage.removeItem(autosaveKey);
        } catch (_err) {}
        if (editor.autosaveTimer) {
          clearTimeout(editor.autosaveTimer);
          editor.autosaveTimer = 0;
        }
      } catch (err) {
        setEditorStatus("Erro ao guardar");
        alert("Erro ao guardar: " + ((err && err.message) || err));
      } finally {
        editor.isSaving = false;
        if (el.edit && el.edit.contains(saveBtn)) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Guardar";
        }
      }
    });
  }
}


