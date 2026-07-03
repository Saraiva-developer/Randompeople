export function renderSimpleEditTabUi(ctx, tabId) {
  const {
    editor,
    getDraftGalleryLists,
    getDraftGalleryViews,
    normalizeGalleryView,
    getGalleryViewStyle,
    esc,
    scheduleToObject,
  } = ctx || {};
  const data = editor.draft && editor.draft.data ? editor.draft.data : {};
  if (tabId === "galeria") {
    const gallery = getDraftGalleryLists();
    const mediaTabs = [
      { id: "photos", label: "Fotos" },
      { id: "videos", label: "Videos" },
    ];
    const activeMediaTab = mediaTabs.some((tab) => tab.id === editor.activeSubByTab.galeria)
      ? editor.activeSubByTab.galeria
      : "photos";
    editor.activeSubByTab.galeria = activeMediaTab;
    const list = gallery[activeMediaTab] || [];
    const views = getDraftGalleryViews();
    const viewList = views[activeMediaTab] || [];
    if (!editor.galleryPagerByTab || typeof editor.galleryPagerByTab !== "object") {
      editor.galleryPagerByTab = {};
    }
    if (!editor.gallerySelectedByTab || typeof editor.gallerySelectedByTab !== "object") {
      editor.gallerySelectedByTab = {};
    }
    const pageSize = 24;
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    const rawPage = Number(editor.galleryPagerByTab[activeMediaTab] || 1);
    const currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(rawPage) ? rawPage : 1));
    editor.galleryPagerByTab[activeMediaTab] = currentPage;
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, list.length);
    const pageItems = list.slice(start, end);

    let selectedIdx = Number(editor.gallerySelectedByTab[activeMediaTab]);
    if (!Number.isFinite(selectedIdx) || selectedIdx < 0 || selectedIdx >= list.length) {
      selectedIdx = list.length ? 0 : -1;
    }
    editor.gallerySelectedByTab[activeMediaTab] = selectedIdx;
    const canMovePrev = selectedIdx > 0;
    const canMoveNext = selectedIdx >= 0 && selectedIdx < (list.length - 1);

    const mediaType = activeMediaTab === "photos" ? "image" : "video";
    const selectedUrl = selectedIdx >= 0 ? String(list[selectedIdx] || "") : "";
    const selectedView = normalizeGalleryView(viewList[selectedIdx]);
    const selectedStyle = getGalleryViewStyle(selectedView, mediaType);
    const selectedPreview = selectedUrl
      ? (mediaType === "image"
          ? "<img class=\"item-preview\" src=\"" + esc(selectedUrl) + "\" alt=\"Selecionado\" style=\"" + esc(selectedStyle) + "\" />"
          : "<video class=\"item-preview\" controls preload=\"metadata\" src=\"" + esc(selectedUrl) + "\" style=\"" + esc(selectedStyle) + "\"></video>")
      : "<div class=\"panel\"><p class=\"muted\">Sem media</p></div>";
    const iconEye = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><circle cx='12' cy='12' r='3' stroke='currentColor' stroke-width='2'/></svg>";
    const iconTrash = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M4 7h16' stroke='currentColor' stroke-width='2' stroke-linecap='round'/><path d='M9 7V5h6v2M8 10v8m4-8v8m4-8v8' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M6 7l1 13h10l1-13' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/></svg>";

    const gridHtml = pageItems.map((url, localIdx) => {
      const globalIdx = start + localIdx;
      const view = normalizeGalleryView(viewList[globalIdx]);
      const thumbStyle = "object-fit:cover;object-position:center center;transform:none;";
      const thumb = url
        ? (mediaType === "image"
            ? "<img class=\"item-preview\" src=\"" + esc(url) + "\" alt=\"media " + (globalIdx + 1) + "\" style=\"" + esc(thumbStyle) + "\" />"
            : "<video class=\"item-preview\" preload=\"metadata\" muted playsinline src=\"" + esc(url) + "\" style=\"" + esc(thumbStyle) + "\"></video>")
        : "<div class=\"panel\"><p class=\"muted\">Sem media</p></div>";
      return (
        "<article class=\"panel edit-gallery-tile" + (globalIdx === selectedIdx ? " active" : "") + "\" draggable=\"true\" data-gallery-drag-index=\"" + String(globalIdx) + "\">" +
          "<button type=\"button\" class=\"edit-gallery-tile-media\" data-gallery-select=\"" + globalIdx + "\" title=\"Selecionar\" aria-label=\"Selecionar media " + String(globalIdx + 1) + "\">"+ thumb + "</button>" +
          "<div class=\"edit-gallery-tile-foot\">" +
            "<span class=\"muted\">" + (globalIdx + 1) + "</span>" +
            "<span class=\"edit-drag-handle\" aria-hidden=\"true\">&#8942;&#8942;</span>" +
            "<div class=\"chips edit-item-actions edit-gallery-tile-actions\">" +
              "<button type=\"button\" class=\"edit-item-icon-btn\" data-gallery-preview=\"" + globalIdx + "\" title=\"Ver modal\" aria-label=\"Ver modal\">" + iconEye + "</button>" +
              "<button type=\"button\" class=\"edit-item-icon-btn is-danger\" data-gallery-remove=\"" + globalIdx + "\" title=\"Remover\" aria-label=\"Remover\">" + iconTrash + "</button>" +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");

    return (
      "<div class=\"panel edit-simple-section edit-simple-gallery\">" +
      "<p class=\"muted\">Galeria</p>" +
      "<div class=\"chips edit-subtabs-row\">" +
      mediaTabs
        .map(
          (tab) =>
            "<button type=\"button\" class=\"" +
            (tab.id === activeMediaTab ? "active" : "") +
            "\" data-gallery-tab=\"" +
            tab.id +
            "\">" +
            esc(tab.label) + " (" + String((gallery[tab.id] || []).length) + ")" +
            "</button>"
        )
        .join("") +
      "</div>" +
      "<div class=\"chips edit-actions-row edit-gallery-actions\">" +
      "<button type=\"button\" data-gallery-add-url=\"1\" title=\"Adicionar media por URL\" aria-label=\"Adicionar media por URL\">Adicionar URL</button>" +
      "<label class=\"edit-gallery-upload\">" +
      "<span>Carregar ficheiro</span>" +
      "<input type=\"file\" class=\"edit-gallery-upload-input\" data-gallery-upload=\"1\" accept=\"" +
      (activeMediaTab === "photos" ? "image/*" : "video/*") +
      "\" />" +
      "</label>" +
      "</div>" +
      (list.length
        ? (
          "<div class=\"edit-gallery-pagination-row\">" +
            "<p class=\"muted\">A mostrar " + String(start + 1) + " - " + String(end) + " de " + String(list.length) + "</p>" +
            "<div class=\"chips edit-gallery-order-controls\">" +
              "<button type=\"button\" data-gallery-order-prev=\"1\"" + (canMovePrev ? "" : " disabled") + " title=\"Mover para a esquerda\" aria-label=\"Mover foto para a esquerda\">&larr;</button>" +
              "<button type=\"button\" data-gallery-order-next=\"1\"" + (canMoveNext ? "" : " disabled") + " title=\"Mover para a direita\" aria-label=\"Mover foto para a direita\">&rarr;</button>" +
            "</div>" +
          "</div>" +
          "<p class=\"muted edit-gallery-drag-tip\">Arrasta uma foto para reordenar rapidamente.</p>" +
          (totalPages > 1
            ? (
              "<div class=\"edit-gallery-page-controls\">" +
                "<p class=\"muted\">Pagina " + String(currentPage) + " de " + String(totalPages) + "</p>" +
                "<div class=\"chips\">" +
                  "<button type=\"button\" data-gallery-page-prev=\"1\" title=\"Pagina anterior\" aria-label=\"Pagina anterior\"" + (currentPage <= 1 ? " disabled" : "") + ">&larr;</button>" +
                  "<button type=\"button\" data-gallery-page-next=\"1\" title=\"Pagina seguinte\" aria-label=\"Pagina seguinte\"" + (currentPage >= totalPages ? " disabled" : "") + ">&rarr;</button>" +
                "</div>" +
              "</div>"
            )
            : ""
          ) +
          "<div class=\"edit-gallery-grid-compact\">" + gridHtml + "</div>" +
          (selectedIdx >= 0
            ? (
              "<div class=\"panel edit-gallery-selected-editor\">" +
                "<div class=\"edit-item-header\">" +
                  "<strong class=\"edit-item-title\">Selecionado " + String(selectedIdx + 1) + "</strong>" +
                  "<div class=\"chips edit-item-actions\">" +
                    "<button type=\"button\" class=\"edit-item-icon-btn\" data-gallery-preview=\"" + String(selectedIdx) + "\" title=\"Ver modal\" aria-label=\"Ver modal\">" + iconEye + "</button>" +
                    "<button type=\"button\" class=\"edit-item-icon-btn is-danger\" data-gallery-remove=\"" + String(selectedIdx) + "\" title=\"Remover\" aria-label=\"Remover\">" + iconTrash + "</button>" +
                  "</div>" +
                "</div>" +
                "<div class=\"edit-gallery-selected-preview\">" + selectedPreview + "</div>" +
                "<label>URL<input class=\"input\" data-gallery-url=\"" + String(selectedIdx) + "\" value=\"" + esc(selectedUrl) + "\" /></label>" +
                (activeMediaTab === "photos"
                  ? "<div class=\"chips edit-actions-row\"><button type=\"button\" data-gallery-adjust=\"" + String(selectedIdx) + "\" title=\"Ajustar enquadramento da foto\" aria-label=\"Ajustar enquadramento da foto\">Ajustar foto</button></div>"
                  : ""
                ) +
                "<div class=\"edit-gallery-view-grid\">" +
                  (activeMediaTab === "photos"
                    ? (
                      "<label>Zoom<input class=\"input\" type=\"range\" min=\"80\" max=\"220\" step=\"1\" data-gallery-zoom=\"" + String(selectedIdx) + "\" value=\"" + esc(String(selectedView.zoom)) + "\" /></label>" +
                      "<p class=\"muted\">Usa Ajustar foto para posicionar livremente (esquerda/direita/cima/baixo), sem corte automatico.</p>"
                    )
                    : "<p class=\"muted\">Video sem ajuste de enquadramento.</p>"
                  ) +
                "</div>" +
              "</div>"
            )
            : ""
          )
        )
        : "<p class=\"muted\">Sem media nesta sub-aba.</p>"
      ) +
      "</div>"
    );
  }
  if (tabId === "horario") {
    const schedule = scheduleToObject(data.schedule);
    return (
      "<div class=\"panel edit-simple-section edit-simple-schedule\">" +
      "<p class=\"muted\">Horario</p>" +
      "<div class=\"edit-form-grid edit-basic-grid\">" +
      "<label>Segunda<input class=\"input\" data-simple-field=\"schedule_seg\" value=\"" +
      esc(schedule.seg) +
      "\" /></label>" +
      "<label>Terca<input class=\"input\" data-simple-field=\"schedule_ter\" value=\"" +
      esc(schedule.ter) +
      "\" /></label>" +
      "<label>Quarta<input class=\"input\" data-simple-field=\"schedule_qua\" value=\"" +
      esc(schedule.qua) +
      "\" /></label>" +
      "<label>Quinta<input class=\"input\" data-simple-field=\"schedule_qui\" value=\"" +
      esc(schedule.qui) +
      "\" /></label>" +
      "<label>Sexta<input class=\"input\" data-simple-field=\"schedule_sex\" value=\"" +
      esc(schedule.sex) +
      "\" /></label>" +
      "<label>Sabado<input class=\"input\" data-simple-field=\"schedule_sab\" value=\"" +
      esc(schedule.sab) +
      "\" /></label>" +
      "<label>Domingo<input class=\"input\" data-simple-field=\"schedule_dom\" value=\"" +
      esc(schedule.dom) +
      "\" /></label>" +
      "</div>" +
      "</div>"
    );
  }
  if (tabId === "agenda") {
    const agenda = data.agenda && typeof data.agenda === "object" ? data.agenda : {};
    const slots = Array.isArray(agenda.slots) ? agenda.slots : [];
    const slotsHtml = slots
      .map((slot, idx) => {
        const day = String((slot && (slot.day || slot.date || slot.rawDay)) || "").trim();
        const weekday = String((slot && (slot.weekday || slot.displayDay)) || "").trim();
        const times = Array.isArray(slot && slot.times) ? slot.times.join(", ") : "";
        return (
          "<article class=\"panel edit-item-card\">" +
          "<div class=\"edit-item-header\">" +
          "<strong class=\"edit-item-title\">Slot " +
          (idx + 1) +
          "</strong>" +
          "<div class=\"chips edit-item-actions\"><button type=\"button\" data-agenda-remove-slot=\"" +
          idx +
          "\" title=\"Remover slot\" aria-label=\"Remover slot " + (idx + 1) + "\">Remover</button></div>" +
          "</div>" +
          "<div class=\"edit-form-grid edit-basic-grid\">" +
          "<label>Dia<input class=\"input\" data-agenda-slot-day=\"" +
          idx +
          "\" value=\"" +
          esc(day) +
          "\" /></label>" +
          "<label>Dia da semana<input class=\"input\" data-agenda-slot-weekday=\"" +
          idx +
          "\" value=\"" +
          esc(weekday) +
          "\" /></label>" +
          "<label>Horas (10h, 12h)<input class=\"input\" data-agenda-slot-times=\"" +
          idx +
          "\" value=\"" +
          esc(times) +
          "\" /></label>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
    return (
      "<div class=\"panel edit-simple-section edit-simple-agenda\">" +
      "<p class=\"muted\">Agenda</p>" +
      "<label>Descricao<textarea class=\"input\" rows=\"3\" data-simple-field=\"agenda_description\">" +
      esc(String(agenda.description || "")) +
      "</textarea></label>" +
      "<label>Link de reserva<input class=\"input\" data-simple-field=\"agenda_reserveLink\" value=\"" +
      esc(String(agenda.reserveLink || "")) +
      "\" /></label>" +
      "<p class=\"muted\">Slots</p>" +
      (slotsHtml || "<p class=\"muted\">Sem slots definidos.</p>") +
      "<div class=\"chips edit-actions-row\"><button type=\"button\" data-agenda-add-slot=\"1\" title=\"Adicionar novo slot\" aria-label=\"Adicionar novo slot\">Adicionar slot</button></div>" +
      "</div>"
    );
  }
  if (tabId === "parcerias") {
    const rows = Array.isArray(data.partners) ? data.partners : [];
    const cards = rows
      .map((row, idx) => {
        const name = String((row && row.name) || "").trim();
        const image = String((row && row.image) || "").trim();
        const link = String((row && (row.link || row.url)) || "").trim();
        return (
          "<article class=\"panel edit-item-card\">" +
          "<div class=\"edit-item-header\">" +
          "<strong class=\"edit-item-title\">Parceria " +
          (idx + 1) +
          "</strong>" +
          "<div class=\"chips edit-item-actions\"><button type=\"button\" data-partner-remove=\"" +
          idx +
          "\" title=\"Remover parceria\" aria-label=\"Remover parceria " + (idx + 1) + "\">Remover</button></div>" +
          "</div>" +
          (image
            ? "<img class=\"item-preview\" src=\"" +
              esc(image) +
              "\" alt=\"" +
              esc(name || "Parceiro " + (idx + 1)) +
              "\" />"
            : "") +
          "<div class=\"edit-form-grid edit-basic-grid\">" +
          "<label>Nome<input class=\"input\" data-partner-name=\"" +
          idx +
          "\" value=\"" +
          esc(name) +
          "\" /></label>" +
          "<label>Imagem URL<input class=\"input\" data-partner-image=\"" +
          idx +
          "\" value=\"" +
          esc(image) +
          "\" /></label>" +
          "<label>Link<input class=\"input\" data-partner-link=\"" +
          idx +
          "\" value=\"" +
          esc(link) +
          "\" /></label>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
    return (
      "<div class=\"panel edit-simple-section edit-simple-partners\">" +
      "<p class=\"muted\">Parcerias</p>" +
      (cards || "<p class=\"muted\">Sem parcerias adicionadas.</p>") +
      "<div class=\"chips edit-actions-row\"><button type=\"button\" data-partner-add=\"1\" title=\"Adicionar parceria\" aria-label=\"Adicionar parceria\">Adicionar parceria</button></div>" +
      "</div>"
    );
  }
  if (tabId === "locais") {
    const rows = Array.isArray(data.locations) ? data.locations : [];
    const cards = rows
      .map((row, idx) => {
        const title = String((row && row.title) || "").trim();
        const address = String((row && row.address) || "").trim();
        const note = String((row && row.note) || "").trim();
        const coords = String((row && row.coords) || "").trim();
        const link = String((row && row.link) || "").trim();
        return (
          "<article class=\"panel edit-item-card\">" +
          "<div class=\"edit-item-header\">" +
          "<strong class=\"edit-item-title\">Local " +
          (idx + 1) +
          "</strong>" +
          "<div class=\"chips edit-item-actions\"><button type=\"button\" data-location-remove=\"" +
          idx +
          "\" title=\"Remover local\" aria-label=\"Remover local " + (idx + 1) + "\">Remover</button></div>" +
          "</div>" +
          "<div class=\"edit-form-grid edit-basic-grid\">" +
          "<label>Titulo<input class=\"input\" data-location-title=\"" +
          idx +
          "\" value=\"" +
          esc(title) +
          "\" /></label>" +
          "<label>Morada<input class=\"input\" data-location-address=\"" +
          idx +
          "\" value=\"" +
          esc(address) +
          "\" /></label>" +
          "<label>Nota<input class=\"input\" data-location-note=\"" +
          idx +
          "\" value=\"" +
          esc(note) +
          "\" /></label>" +
          "<label>Coordenadas<input class=\"input\" data-location-coords=\"" +
          idx +
          "\" value=\"" +
          esc(coords) +
          "\" /></label>" +
          "<label>Link mapa<input class=\"input\" data-location-link=\"" +
          idx +
          "\" value=\"" +
          esc(link) +
          "\" /></label>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
    return (
      "<div class=\"panel edit-simple-section edit-simple-locations\">" +
      "<p class=\"muted\">Locais</p>" +
      (cards || "<p class=\"muted\">Sem locais adicionados.</p>") +
      "<div class=\"chips edit-actions-row\"><button type=\"button\" data-location-add=\"1\" title=\"Adicionar local\" aria-label=\"Adicionar local\">Adicionar local</button></div>" +
      "</div>"
    );
  }
  return "";
}

