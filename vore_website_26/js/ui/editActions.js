export async function saveEditDraftUi(ctx) {
  const {
    state,
    setState,
    editor,
    sanitizeRichHtml,
    getDraftGalleryLists,
    getDraftGalleryViews,
    ensureGalleryViewLength,
    api,
    mapProfileRow,
    renderAll,
    setScreen,
    slugify,
  } = ctx || {};
  const upsertProfile = (nextProfile) => {
    const next = state.profiles.slice();
    const idx = next.findIndex((p) => p.id === nextProfile.id);
    if (idx >= 0) next[idx] = nextProfile;
    else next.unshift(nextProfile);
    setState({ profiles: next, selectedProfileId: nextProfile.id });
  };
  const LINK_TYPES = new Set([
    "website",
    "instagram",
    "whatsapp",
    "facebook",
    "x",
    "youtube",
    "tiktok",
    "linkedin",
    "outro",
  ]);
  const sanitizeLinkType = (value) => {
    const type = String(value || "").trim().toLowerCase();
    return LINK_TYPES.has(type) ? type : "website";
  };
  const normalizePlainText = (value, maxLength) => {
    const limit = Number(maxLength || 0) > 0 ? Number(maxLength) : 256;
    let out = String(value || "").replace(/\s+/g, " ").trim();
    if (out.length > limit) out = out.slice(0, limit).trim();
    return out;
  };
  const toOpenableUrl = (rawValue) => {
    const raw = String(rawValue || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return "https://" + raw;
    return "";
  };
  const toSocialUrl = (type, rawValue) => {
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
  };
  const toLinkPayloadUrl = (type, value) => {
    const kind = sanitizeLinkType(type);
    let out = String(value || "").trim();
    if (!out) return "";
    if (out.length > 320) out = out.slice(0, 320).trim();
    if (kind === "instagram" || kind === "tiktok" || kind === "youtube" || kind === "facebook" || kind === "linkedin" || kind === "x") {
      return toSocialUrl(kind, out);
    }
    if (kind === "whatsapp") {
      out = out.replace(/[\s().-]+/g, "");
      out = out.replace(/^\+/, "");
      if (out.length > 64) out = out.slice(0, 64);
      return toSocialUrl(kind, out);
    }
    return toOpenableUrl(out);
  };
  const normalizeLinkIdentity = (type, value) => {
    const kind = sanitizeLinkType(type);
    let raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    if (raw.startsWith("@")) raw = raw.slice(1);
    raw = raw.replace(/^https?:\/\//, "").replace(/^www\./, "");
    if (kind === "website" || kind === "outro") raw = raw.replace(/\/+$/g, "");
    if (kind === "whatsapp") raw = raw.replace(/[\s().-]+/g, "").replace(/^\+/, "");
    return raw;
  };
  const normalizeErrorText = (value) => String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const isNotFoundError = (value) => {
    const raw = String(value || "").toLowerCase();
    const normalized = normalizeErrorText(value);
    return (
      raw.includes("404") ||
      raw.includes("not found") ||
      normalized.includes("nao encontrado") ||
      /n.{0,3}o encontrado/i.test(raw)
    );
  };
  if (!editor.draft) return;
  const safeAbout = sanitizeRichHtml(editor.draft.about || "");
  editor.draft.about = safeAbout;
  const safeName = normalizePlainText(editor.draft.name || "", 80);
  const safeCategory = normalizePlainText(editor.draft.category || "", 64);
  const safeLocation = normalizePlainText(editor.draft.location || "", 90);
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
  const rawData = Object.assign({}, editor.draft.data || {});
  const cleanLinks = (Array.isArray(rawData.links) ? rawData.links : [])
    .map((item, idx) => {
      const type = sanitizeLinkType(item && item.type);
      return {
        key: String((item && (item.key || item.id)) || ("link-" + (idx + 1))).trim(),
        type,
        url: toLinkPayloadUrl(type, (item && (item.url || item.value)) || ""),
        label: normalizePlainText((item && item.label) || "", 40),
      };
    })
    .filter((item) => item.url)
    .filter((item, idx, arr) => {
      const signature = item.type + "|" + normalizeLinkIdentity(item.type, item.url);
      return arr.findIndex((entry) => {
        return (entry.type + "|" + normalizeLinkIdentity(entry.type, entry.url)) === signature;
      }) === idx;
    })
    .slice(0, 64);
  const getFirstLink = (type) => cleanLinks.find((item) => item.type === type && item.url)?.url || "";
  const websiteFromLinks = getFirstLink("website") || getFirstLink("outro") || toLinkPayloadUrl("website", rawData.website || rawData.site || "");
  const effectiveCategory = normalizePlainText(rawData.customCategory || "", 64) || safeCategory;
  const safeAboutSummary = normalizePlainText(rawData.aboutSummary || "", 120);
  const tags = Array.isArray(rawData.contentCategories)
    ? Array.from(new Set(rawData.contentCategories.map((entry) => normalizePlainText(entry || "", 32)).filter(Boolean))).slice(0, 40)
    : [];
  const social = Object.assign({}, rawData.social || {}, {
    instagram: getFirstLink("instagram") || toLinkPayloadUrl("instagram", (rawData.social || {}).instagram || ""),
    youtube: getFirstLink("youtube") || toLinkPayloadUrl("youtube", (rawData.social || {}).youtube || ""),
    facebook: getFirstLink("facebook") || toLinkPayloadUrl("facebook", (rawData.social || {}).facebook || ""),
    linkedin: getFirstLink("linkedin") || toLinkPayloadUrl("linkedin", (rawData.social || {}).linkedin || ""),
    tiktok: getFirstLink("tiktok") || toLinkPayloadUrl("tiktok", (rawData.social || {}).tiktok || ""),
    whatsapp: getFirstLink("whatsapp") || toLinkPayloadUrl("whatsapp", (rawData.social || {}).whatsapp || ""),
    x: getFirstLink("x") || toLinkPayloadUrl("x", (rawData.social || {}).x || ""),
  });
  const payloadData = Object.assign({}, rawData, {
    name: safeName,
    category: effectiveCategory,
    role: effectiveCategory,
    location: safeLocation,
    about: safeAbout,
    aboutSummary: safeAboutSummary,
    links: cleanLinks,
    website: websiteFromLinks,
    site: websiteFromLinks,
    social,
    contentCategories: tags,
    tags,
  });
  const payload = { name: safeName || "Perfil", type: editor.draft.type || "service_pro", data: payloadData };
  try {
    const res = await api.profileUpdate(payload);
    if (!res || !res.profile) throw new Error("Resposta invalida ao guardar perfil.");
    const mapped = mapProfileRow(res.profile);
    upsertProfile(mapped);
    renderAll();
    setScreen("profile");
  } catch (err) {
    const msg = String((err && err.message) || err || "");
    if (isNotFoundError(msg)) {
      const createRes = await api.profileCreate(Object.assign({ slug: slugify(safeName || "perfil") }, payload));
      if (!createRes || !createRes.profile) throw new Error("Resposta invalida ao criar perfil.");
      const mappedCreate = mapProfileRow(createRes.profile);
      upsertProfile(mappedCreate);
      renderAll();
      setScreen("profile");
      return;
    }
    throw err;
  }
}

export function bindEditTopEventsUi(ctx) {
  const {
    el,
    setState,
    renderEdit,
    editor,
  } = ctx || {};
  const sanitizeBaseDraftField = (fieldName, value) => {
    const key = String(fieldName || "").trim();
    let out = String(value || "");
    if (key === "name") {
      out = out.replace(/\s+/g, " ").trim();
      if (out.length > 80) out = out.slice(0, 80).trim();
      return out;
    }
    if (key === "category") {
      out = out.replace(/\s+/g, " ").trim();
      if (out.length > 64) out = out.slice(0, 64).trim();
      return out;
    }
    if (key === "location") {
      out = out.replace(/\s+/g, " ").trim();
      if (out.length > 90) out = out.slice(0, 90).trim();
      return out;
    }
    return out;
  };
  el.edit.querySelectorAll("button[data-edit-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ editTab: button.dataset.editTab });
      renderEdit();
    });
  });
  el.edit.querySelectorAll("[data-edit-field]").forEach((field) => {
    const applyField = () => {
      const key = String(field.dataset.editField || "");
      const nextValue = sanitizeBaseDraftField(key, field.value);
      editor.draft[key] = nextValue;
      if (String(field.value || "") !== nextValue) field.value = nextValue;
    };
    field.addEventListener("input", applyField);
    field.addEventListener("change", applyField);
  });
}


