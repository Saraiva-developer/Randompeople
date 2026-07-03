function getShareCounterpartInternal(normalizeEmail, entry, shareSub) {
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

export function buildShareThreadsUi(ctx, list, shareSub) {
  const { normalizeEmail, slugify } = ctx || {};
  const map = {};
  (Array.isArray(list) ? list : []).forEach((entry) => {
    const cp = getShareCounterpartInternal(normalizeEmail, entry, shareSub);
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

export function markThreadReadUi(ctx, threadKey, shareSub) {
  const { recommendationsStore, normalizeEmail, slugify, markNotificationRead } = ctx || {};
  if (String(shareSub || "") !== "recebidos") return;
  const inbox = Array.isArray(recommendationsStore.inbox) ? recommendationsStore.inbox : [];
  inbox.forEach((entry) => {
    const cp = getShareCounterpartInternal(normalizeEmail, entry, "recebidos");
    const key = cp.email || ("anon_" + slugify(cp.name || "utilizador"));
    if (key === threadKey) {
      entry.read = true;
      const id = String(entry && entry.id || "").trim();
      if (id) markNotificationRead("share_" + id);
    }
  });
}

export function toTimestampMsUi(value) {
  const raw = Number(value || 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw < 1e12 ? raw * 1000 : raw;
}

export function formatRelativeTimeUi(value) {
  const ts = toTimestampMsUi(value);
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

export function getShareKindLabelUi(entry) {
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

export function tabIdToLabelUi(value) {
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

export function getSavedItemPreviewImageUi(ctx, entry) {
  const { getItemMediaList } = ctx || {};
  const item = entry && entry.item && typeof entry.item === "object" ? entry.item : null;
  if (!item) return "";
  const tabId = String(entry && entry.tabId || "item");
  const media = getItemMediaList(tabId, item);
  const image = (Array.isArray(media) ? media : []).find((m) => String(m && m.type || "").toLowerCase() === "image");
  return String(image && image.url || "").trim();
}

export function getShareEntryPreviewImageUi(ctx, entry) {
  const { state, getItemMediaList } = ctx || {};
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

export function openSharedEntryUi(ctx, entry) {
  const { state, openPublicProfile, openItemModal, deepClone } = ctx || {};
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
      openPublicProfile(pid, { fromTab: nextBack, addRecent: false });
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
