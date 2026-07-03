export function renderNotificationsScreen(ctx) {
  const {
    rootList,
    rootFilters,
    authUser,
    profiles,
    notificationsFilter,
    esc,
    setNotificationsFilter,
    getCurrentUserInboxEntries,
    deepClone,
    isNotificationRead,
    getBadgeType,
    resolveProfileFilter,
    markNotificationRead,
    markCurrentUserInboxEntryRead,
    openSharedEntry,
    openPublicProfile,
    formatRelativeTime,
    toTimestampMs,
    renderAll,
    setNavCount,
  } = ctx;

  if (!rootList || !rootFilters) return;
  if (!authUser) {
    rootFilters.innerHTML = "";
    rootList.innerHTML = "<p class=\"muted\">Entra para ver notificações.</p>";
    setNavCount(0);
    return;
  }

  function buildNotificationsEntries() {
    const entries = [];
    const baseNow = Date.now();
    const inbox = getCurrentUserInboxEntries();
    inbox.forEach((share) => {
      const id = String((share && share.id) || "");
      if (!id) return;
      const fromName = String((share && (share.fromName || share.fromEmail)) || "Utilizador");
      const title = String((share && share.title) || "Partilha");
      const when = Number((share && share.createdAt) || 0);
      const key = "share_" + id;
      entries.push({
        key,
        category: "shares",
        title: "Partilha de " + fromName,
        subtitle: title,
        time: when,
        sourceId: id,
        payload: deepClone(share),
        read: isNotificationRead(key) || (share && share.read === true),
      });
    });

    profiles.forEach((profile, profileIdx) => {
      const badge = getBadgeType(profile);
      const filter = resolveProfileFilter(profile);
      const candidateTimes = [
        profile && profile.updated_at,
        profile && profile.created_at,
        profile && profile.updatedAt,
        profile && profile.createdAt,
        profile && profile.data && profile.data.updatedAt,
        profile && profile.data && profile.data.createdAt,
        profile && profile.data && profile.data.updated_at,
        profile && profile.data && profile.data.created_at,
      ];
      let pseudoTime = 0;
      for (const candidate of candidateTimes) {
        const parsed = Date.parse(String(candidate || ""));
        if (Number.isFinite(parsed) && parsed > 0) {
          pseudoTime = parsed;
          break;
        }
      }
      if (!pseudoTime) pseudoTime = baseNow - (profileIdx * 1000);

      if (badge === "novo" || filter === "novidades") {
        const key = "new_profile_" + String(profile.id || "");
        entries.push({
          key,
          category: "new",
          title: "Novo perfil",
          subtitle: String(profile.name || "Perfil"),
          time: pseudoTime,
          profileId: Number(profile.id || 0),
          read: isNotificationRead(key),
        });
      }
      if (badge === "promo" || filter === "promocoes") {
        const key = "promo_profile_" + String(profile.id || "");
        entries.push({
          key,
          category: "promo",
          title: "Promocao ativa",
          subtitle: String(profile.name || "Perfil"),
          time: pseudoTime,
          profileId: Number(profile.id || 0),
          read: isNotificationRead(key),
        });
      }
    });

    return entries
      .sort((a, b) => Number(b.time || 0) - Number(a.time || 0))
      .slice(0, 160);
  }

  function openNotificationEntry(entry) {
    if (!entry || typeof entry !== "object") return;
    markNotificationRead(entry.key);
    if (entry.category === "shares") {
      markCurrentUserInboxEntryRead(entry.sourceId);
      openSharedEntry(entry.payload);
      return;
    }
    const pid = Number(entry.profileId || 0);
    if (pid > 0) {
      openPublicProfile(pid, { fromTab: "notifications", addRecent: false });
    }
  }

  function notificationCategoryLabel(category) {
    const key = String(category || "").toLowerCase();
    if (key === "shares") return "Partilha";
    if (key === "new") return "Novo";
    if (key === "promo") return "Promocao";
    return "Alerta";
  }

  function notificationDayBucket(value) {
    const ts = toTimestampMs(value);
    if (!ts) return "older";
    const now = new Date();
    const target = new Date(ts);
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const diffDays = Math.floor((startToday - startTarget) / (24 * 60 * 60 * 1000));
    if (diffDays <= 0) return "today";
    if (diffDays === 1) return "yesterday";
    return "older";
  }

  function notificationBucketLabel(bucket) {
    if (bucket === "today") return "Hoje";
    if (bucket === "yesterday") return "Ontem";
    return "Anteriores";
  }

  function groupNotificationsByBucket(list) {
    const groups = { today: [], yesterday: [], older: [] };
    (Array.isArray(list) ? list : []).forEach((entry) => {
      const bucket = notificationDayBucket(entry && entry.time);
      if (!groups[bucket]) groups[bucket] = [];
      groups[bucket].push(entry);
    });
    return ["today", "yesterday", "older"]
      .map((bucket) => ({ bucket, label: notificationBucketLabel(bucket), items: groups[bucket] || [] }))
      .filter((group) => group.items.length > 0);
  }

  const allEntries = buildNotificationsEntries();
  const unreadCount = allEntries.filter((entry) => !entry.read).length;
  setNavCount(unreadCount);

  const filter = String(notificationsFilter || "all");
  const filters = [
    { key: "all", label: "Todas" },
    { key: "shares", label: "Partilhas" },
    { key: "new", label: "Novos perfis" },
    { key: "promo", label: "Promocoes" },
  ];

  rootFilters.innerHTML =
    filters.map((item) => "<button type=\"button\" class=\"" + (filter === item.key ? "active" : "") + "\" data-notif-filter=\"" + item.key + "\">" + esc(item.label) + "</button>").join("") +
    "<button type=\"button\" data-notif-mark-all=\"1\">Marcar tudo lido</button>";

  rootFilters.querySelectorAll("button[data-notif-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      setNotificationsFilter(String(button.dataset.notifFilter || "all"));
    });
  });

  const markAllBtn = rootFilters.querySelector("button[data-notif-mark-all]");
  if (markAllBtn) {
    markAllBtn.addEventListener("click", () => {
      const scope = filter === "all" ? allEntries : allEntries.filter((entry) => entry.category === filter);
      scope.forEach((entry) => {
        markNotificationRead(entry.key);
        if (entry.category === "shares") markCurrentUserInboxEntryRead(entry.sourceId);
      });
      renderAll();
    });
  }

  const visible = filter === "all" ? allEntries : allEntries.filter((entry) => entry.category === filter);
  if (!visible.length) {
    rootList.innerHTML = "<p class=\"muted\">Sem notificações.</p>";
    return;
  }

  const grouped = groupNotificationsByBucket(visible);
  rootList.innerHTML = "<div class=\"notifications-list\">" + grouped.map((group) => (
    "<section class=\"notifications-group\">" +
      "<p class=\"notifications-group-title\">" + esc(group.label) + "</p>" +
      group.items.map((entry) => {
        const unread = !entry.read;
        const dot = unread ? "<span class=\"notifications-dot\"></span>" : "";
        const when = formatRelativeTime(entry && entry.time);
        const categoryLabel = notificationCategoryLabel(entry && entry.category);
        return (
          "<button type=\"button\" class=\"notifications-row" + (unread ? " unread" : "") + "\" data-notif-key=\"" + esc(String((entry && entry.key) || "")) + "\">" +
            "<span class=\"notifications-main\">" +
              "<strong>" + esc(entry.title || "Notificação") + "</strong>" +
              "<span class=\"muted\">" + esc(entry.subtitle || "") + "</span>" +
              "<span class=\"notifications-meta\">" +
                "<span class=\"profile-thread-kind\">" + esc(categoryLabel) + "</span>" +
                (when ? "<span class=\"profile-thread-time\">" + esc(when) + "</span>" : "") +
              "</span>" +
            "</span>" +
            "<span class=\"notifications-right\">" + dot + "</span>" +
          "</button>"
        );
      }).join("") +
    "</section>"
  )).join("") + "</div>";

  rootList.querySelectorAll("button[data-notif-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = String(button.dataset.notifKey || "");
      const entry = visible.find((row) => String((row && row.key) || "") === key);
      if (!entry) return;
      openNotificationEntry(entry);
      renderAll();
    });
  });
}
