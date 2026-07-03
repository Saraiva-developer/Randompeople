export function ensureSharePickerRootUi(ctx) {
  const { documentRef, closeSharePicker } = ctx || {};
  if (!documentRef) return null;
  let root = documentRef.getElementById("sharePickerRoot");
  if (root) return root;
  root = documentRef.createElement("div");
  root.id = "sharePickerRoot";
  root.className = "share-picker-root";
  root.innerHTML =
    "<div class=\"share-picker-backdrop\" data-share-picker-close=\"1\"></div>" +
    "<div class=\"share-picker-panel\">" +
      "<div class=\"share-picker-top\">" +
        "<strong>Partilhar</strong>" +
        "<button type=\"button\" data-share-picker-close=\"1\">&times;</button>" +
      "</div>" +
      "<div id=\"sharePickerBody\" class=\"share-picker-body\"></div>" +
    "</div>";
  documentRef.body.appendChild(root);
  root.querySelectorAll("[data-share-picker-close]").forEach((btn) => {
    btn.addEventListener("click", closeSharePicker);
  });
  return root;
}

export function closeSharePickerUi(ctx) {
  const { sharePickerState, documentRef } = ctx || {};
  if (!sharePickerState) return;
  sharePickerState.open = false;
  sharePickerState.payload = null;
  sharePickerState.query = "";
  sharePickerState.error = "";
  sharePickerState.usersLoading = false;
  sharePickerState.usersQuery = "";
  sharePickerState.users = [];
  sharePickerState.searchToken = Number(sharePickerState.searchToken || 0) + 1;
  const root = (documentRef || document).getElementById("sharePickerRoot");
  if (root) root.classList.remove("open");
}

export function openSharePickerUi(ctx, payload) {
  const { isCommonUser, sharePickerState, deepClone, renderSharePicker } = ctx || {};
  if (!isCommonUser || !isCommonUser()) return;
  if (!sharePickerState) return;
  sharePickerState.open = true;
  sharePickerState.payload = payload ? deepClone(payload) : null;
  sharePickerState.query = "";
  sharePickerState.error = "";
  sharePickerState.usersLoading = false;
  sharePickerState.usersQuery = "";
  sharePickerState.users = [];
  renderSharePicker();
}

export function renderSharePickerUi(ctx) {
  const {
    ensureSharePickerRoot,
    sharePickerState,
    getShareContacts,
    normalizeEmail,
    isValidEmail,
    esc,
    loadSharePickerUsers,
    dispatchShare,
    closeSharePicker,
    el,
    renderProfile,
    renderAll,
  } = ctx || {};
  const root = ensureSharePickerRoot();
  if (!root || !sharePickerState) return;
  if (!sharePickerState.open) {
    root.classList.remove("open");
    return;
  }
  const body = root.querySelector("#sharePickerBody");
  if (!body) return;

  const contacts = getShareContacts();
  const query = String(sharePickerState.query || "").trim();
  const qNorm = normalizeEmail(query);
  const localFiltered = !qNorm
    ? contacts.slice(0, 30)
    : contacts
        .filter(
          (entry) =>
            normalizeEmail(entry && entry.email).includes(qNorm) ||
            String((entry && entry.name) || "").toLowerCase().includes(qNorm)
        )
        .slice(0, 30);
  const remoteFiltered = Array.isArray(sharePickerState.users) ? sharePickerState.users : [];
  const byEmail = {};
  [...localFiltered, ...remoteFiltered].forEach((entry) => {
    const email = normalizeEmail(entry && entry.email);
    if (!isValidEmail(email)) return;
    if (!byEmail[email]) {
      byEmail[email] = { email, name: String((entry && entry.name) || "").trim() };
    }
  });
  const filtered = Object.values(byEmail).slice(0, 40);
  const hasExact = filtered.some((entry) => normalizeEmail(entry && entry.email) === qNorm);
  const canUseTyped = isValidEmail(qNorm) && !hasExact;
  const showRemoteLoading = sharePickerState.usersLoading && qNorm.length >= 2;
  const noResults = !filtered.length && !canUseTyped && !showRemoteLoading;

  body.innerHTML =
    "<div class=\"share-picker-form\">" +
      "<label>Email ou contacto</label>" +
      "<input id=\"sharePickerInput\" class=\"input\" placeholder=\"email@exemplo.com\" value=\"" + esc(query) + "\" />" +
      (sharePickerState.error ? "<p class=\"entry-error\">" + esc(sharePickerState.error) + "</p>" : "") +
      "<div class=\"share-picker-actions\">" +
        "<button type=\"button\" data-share-picker-action=\"close\">Cancelar</button>" +
        "<button type=\"button\" class=\"entry-submit-btn\" data-share-picker-action=\"send_input\">Enviar</button>" +
      "</div>" +
    "</div>" +
    "<div class=\"share-picker-list\">" +
      (showRemoteLoading ? "<p class=\"muted\">A procurar utilizadores...</p>" : "") +
      (canUseTyped
        ? "<button type=\"button\" class=\"share-picker-row\" data-share-email=\"" + esc(qNorm) + "\" data-share-name=\"\">" +
            "<span>Usar: " + esc(qNorm) + "</span><span>Enviar</span>" +
          "</button>"
        : "") +
      (filtered.length
        ? filtered
            .map((entry) => {
              const email = normalizeEmail(entry && entry.email);
              const name = String((entry && entry.name) || "").trim();
              return (
                "<button type=\"button\" class=\"share-picker-row\" data-share-email=\"" + esc(email) + "\" data-share-name=\"" + esc(name) + "\">" +
                  "<span class=\"share-picker-main\"><strong>" + esc(name || email) + "</strong><span class=\"muted\">" + esc(email) + "</span></span>" +
                  "<span>Enviar</span>" +
                "</button>"
              );
            })
            .join("")
        : noResults
          ? "<p class=\"muted\">Sem contactos. Escreve um email para enviar.</p>"
          : "") +
    "</div>";

  const input = body.querySelector("#sharePickerInput");
  if (input) {
    input.addEventListener("input", () => {
      sharePickerState.query = String(input.value || "");
      sharePickerState.error = "";
      const nextQuery = String(sharePickerState.query || "").trim();
      if (nextQuery.length >= 2) {
        void loadSharePickerUsers(nextQuery).then(() => {
          if (sharePickerState.open) renderSharePickerUi(ctx);
        });
      } else {
        sharePickerState.users = [];
        sharePickerState.usersLoading = false;
      }
      renderSharePickerUi(ctx);
    });
    input.addEventListener("keydown", async (ev) => {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      const targetEmail = normalizeEmail(input.value || "");
      if (!isValidEmail(targetEmail)) {
        sharePickerState.error = "Email invalido.";
        renderSharePickerUi(ctx);
        return;
      }
      const result = await dispatchShare(sharePickerState.payload, targetEmail, "");
      if (!result || !result.ok) {
        if (result && result.permissionRequired) {
          closeSharePicker();
          if (el && el.status) el.status.textContent = "Pedido de permissao enviado.";
          renderProfile();
          renderAll();
          return;
        }
        sharePickerState.error = String((result && result.error) || "Nao foi possivel enviar.");
        renderSharePickerUi(ctx);
        return;
      }
      closeSharePicker();
      renderProfile();
      renderAll();
    });
  }

  body.querySelectorAll("button[data-share-picker-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = String(btn.dataset.sharePickerAction || "");
      if (action === "close") {
        closeSharePicker();
        return;
      }
      if (action !== "send_input") return;
      const targetEmail = normalizeEmail((body.querySelector("#sharePickerInput") || {}).value || "");
      if (!isValidEmail(targetEmail)) {
        sharePickerState.error = "Email invalido.";
        renderSharePickerUi(ctx);
        return;
      }
      const result = await dispatchShare(sharePickerState.payload, targetEmail, "");
      if (!result || !result.ok) {
        if (result && result.permissionRequired) {
          closeSharePicker();
          if (el && el.status) el.status.textContent = "Pedido de permissao enviado.";
          renderProfile();
          renderAll();
          return;
        }
        sharePickerState.error = String((result && result.error) || "Nao foi possivel enviar.");
        renderSharePickerUi(ctx);
        return;
      }
      closeSharePicker();
      renderProfile();
      renderAll();
    });
  });

  body.querySelectorAll("button[data-share-email]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const email = normalizeEmail(btn.dataset.shareEmail || "");
      const name = String(btn.dataset.shareName || "");
      const result = await dispatchShare(sharePickerState.payload, email, name);
      if (!result || !result.ok) {
        if (result && result.permissionRequired) {
          closeSharePicker();
          if (el && el.status) el.status.textContent = "Pedido de permissao enviado.";
          renderProfile();
          renderAll();
          return;
        }
        sharePickerState.error = String((result && result.error) || "Nao foi possivel enviar.");
        renderSharePickerUi(ctx);
        return;
      }
      closeSharePicker();
      renderProfile();
      renderAll();
    });
  });
  root.classList.add("open");
}

export function getCurrentModalSharePayloadUi(ctx) {
  const { itemModalState, pick, getItemMediaList, deepClone } = ctx || {};
  if (!itemModalState || !itemModalState.open) return null;
  const tabId = String(itemModalState.tabId || "");
  const item = itemModalState.items[itemModalState.index] || {};
  const title = pick(item, ["name", "title", "label", "description"]) || "Conteudo";
  const profileId = Number(itemModalState.profileId || 0);
  const profileName = String(itemModalState.profileName || "Perfil");
  if (tabId === "galeria") {
    const media = getItemMediaList(tabId, item)[itemModalState.mediaIndex] || null;
    if (!media || !media.url) return null;
    return {
      kind: "media",
      title,
      subtitle: profileName + " - Galeria",
      profileId,
      profileName,
      tabId,
      mediaUrl: media.url,
      mediaType: media.type || "image",
    };
  }
  return {
    kind: "item",
    title,
    subtitle: profileName + " - " + tabId,
    profileId,
    profileName,
    tabId,
    item: deepClone(item),
  };
}
