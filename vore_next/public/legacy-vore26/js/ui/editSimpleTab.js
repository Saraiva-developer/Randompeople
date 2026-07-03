function clampAdjustValue(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

function openImageAdjustModal(params) {
  const {
    dataUrl,
    normalizeGalleryView,
    galleryDefaultView,
    initialView,
  } = params || {};
  if (!dataUrl) return Promise.resolve(null);
  return new Promise((resolve) => {
    const ADJUST_MIN_ZOOM = 80;
    const ADJUST_DEFAULT_ZOOM = 100;
    const hadBodyLock = document.body.classList.contains("modal-lock");
    const iconClose = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M6 6l12 12M18 6 6 18' stroke='currentColor' stroke-width='2' stroke-linecap='round'/></svg>";
    const iconReset = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M3 12a9 9 0 1 0 2.64-6.36' stroke='currentColor' stroke-width='2' stroke-linecap='round'/><path d='M3 4v4h4' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
    const iconSave = "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M20 7 9 18l-5-5' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
    const baseView = typeof normalizeGalleryView === "function"
      ? normalizeGalleryView(initialView || (typeof galleryDefaultView === "function" ? galleryDefaultView() : {}))
      : {
          fit: "contain",
          zoom: 100,
          posX: 50,
          posY: 50,
        };
    const root = document.createElement("div");
    root.className = "edit-media-adjust-root";
    root.innerHTML = (
      "<div class=\"edit-media-adjust-backdrop\" data-adjust-close=\"1\"></div>" +
      "<div class=\"edit-media-adjust-panel\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Ajustar foto\">" +
        "<div class=\"edit-media-adjust-head\">" +
          "<strong>Ajustar foto</strong>" +
          "<div class=\"chips edit-item-actions edit-media-adjust-head-actions\">" +
            "<button type=\"button\" class=\"edit-item-icon-btn\" data-adjust-reset=\"1\" title=\"Repor\" aria-label=\"Repor\">" + iconReset + "</button>" +
            "<button type=\"button\" class=\"edit-item-icon-btn\" data-adjust-close=\"1\" title=\"Fechar\" aria-label=\"Fechar\">" + iconClose + "</button>" +
          "</div>" +
        "</div>" +
        "<div class=\"edit-media-adjust-body\">" +
          "<div class=\"edit-media-adjust-preview-wrap\">" +
            "<img class=\"edit-media-adjust-preview\" data-adjust-preview=\"1\" alt=\"Preview\" />" +
          "</div>" +
          "<div class=\"edit-media-adjust-controls\">" +
            "<label>Zoom <span class=\"muted\" data-adjust-zoom-value=\"1\"></span><input class=\"input\" type=\"range\" min=\"" + String(ADJUST_MIN_ZOOM) + "\" max=\"220\" step=\"1\" data-adjust-zoom=\"1\" /></label>" +
            "<p class=\"muted edit-media-adjust-tip\">Arrasta para ajustar livremente (esquerda/direita/cima/baixo).</p>" +
          "</div>" +
        "</div>" +
        "<div class=\"edit-media-adjust-foot\">" +
          "<button type=\"button\" data-adjust-close=\"1\">Cancelar</button>" +
          "<button type=\"button\" class=\"active edit-media-adjust-save\" data-adjust-save=\"1\">" + iconSave + "<span>Guardar</span></button>" +
        "</div>" +
      "</div>"
    );
    document.body.appendChild(root);
    document.body.classList.add("modal-lock");
    requestAnimationFrame(() => root.classList.add("open"));

    const previewWrap = root.querySelector(".edit-media-adjust-preview-wrap");
    const preview = root.querySelector("[data-adjust-preview]");
    if (preview) preview.src = String(dataUrl || "");
    const zoomInput = root.querySelector("[data-adjust-zoom]");
    const zoomValue = root.querySelector("[data-adjust-zoom-value]");

    let current = Object.assign({}, baseView);
    current.fit = "contain";
    zoomInput.value = String(clampAdjustValue(current.zoom, ADJUST_MIN_ZOOM, 220, ADJUST_DEFAULT_ZOOM));
    current.posX = clampAdjustValue(current.posX, 0, 100, 50);
    current.posY = clampAdjustValue(current.posY, 0, 100, 50);

    const syncPreview = () => {
      current.fit = "contain";
      current.zoom = clampAdjustValue(zoomInput.value, ADJUST_MIN_ZOOM, 220, ADJUST_DEFAULT_ZOOM);
      current.posX = clampAdjustValue(current.posX, 0, 100, 50);
      current.posY = clampAdjustValue(current.posY, 0, 100, 50);
      if (preview) {
        preview.style.objectFit = current.fit;
        preview.style.objectPosition = "center center";
        preview.style.transform = "translate(" + String((current.posX - 50).toFixed(2)) + "%," + String((current.posY - 50).toFixed(2)) + "%) scale(" + String((current.zoom / 100).toFixed(3)) + ")";
      }
      if (zoomValue) zoomValue.textContent = String(current.zoom) + "%";
    };
    syncPreview();

    let dragStart = null;
    let dragRaf = 0;
    const requestPreviewSync = () => {
      if (dragRaf) return;
      dragRaf = requestAnimationFrame(() => {
        dragRaf = 0;
        syncPreview();
      });
    };
    const beginDrag = (clientX, clientY) => {
      dragStart = {
        x: Number(clientX || 0),
        y: Number(clientY || 0),
        posX: current.posX,
        posY: current.posY,
        width: Math.max(1, Number((previewWrap && previewWrap.clientWidth) || 1)),
        height: Math.max(1, Number((previewWrap && previewWrap.clientHeight) || 1)),
      };
      if (previewWrap && previewWrap.classList) previewWrap.classList.add("is-dragging");
    };
    const moveDrag = (clientX, clientY) => {
      if (!dragStart || !previewWrap) return;
      const boxW = Math.max(1, Number(dragStart.width || 1));
      const boxH = Math.max(1, Number(dragStart.height || 1));
      const dx = Number(clientX || 0) - dragStart.x;
      const dy = Number(clientY || 0) - dragStart.y;
      current.posX = clampAdjustValue(dragStart.posX + ((dx / boxW) * 100), 0, 100, 50);
      current.posY = clampAdjustValue(dragStart.posY + ((dy / boxH) * 100), 0, 100, 50);
      requestPreviewSync();
    };
    const endDrag = () => {
      if (dragRaf) {
        cancelAnimationFrame(dragRaf);
        dragRaf = 0;
      }
      syncPreview();
      dragStart = null;
      if (previewWrap && previewWrap.classList) previewWrap.classList.remove("is-dragging");
    };
    if (previewWrap) {
      previewWrap.addEventListener("pointerdown", (ev) => {
        if (Number(ev.button) !== 0) return;
        beginDrag(ev.clientX, ev.clientY);
        if (typeof previewWrap.setPointerCapture === "function") {
          try { previewWrap.setPointerCapture(ev.pointerId); } catch (_e) {}
        }
        ev.preventDefault();
      });
      previewWrap.addEventListener("pointermove", (ev) => {
        if (!dragStart) return;
        moveDrag(ev.clientX, ev.clientY);
      });
      previewWrap.addEventListener("pointerup", endDrag);
      previewWrap.addEventListener("pointercancel", endDrag);
      previewWrap.addEventListener("wheel", (ev) => {
        ev.preventDefault();
        const delta = ev.deltaY < 0 ? 4 : -4;
        current.zoom = clampAdjustValue(current.zoom + delta, 80, 220, 100);
        zoomInput.value = String(current.zoom);
        syncPreview();
      }, { passive: false });
    }

    let done = false;
    const finish = (accepted) => {
      if (done) return;
      done = true;
      root.classList.remove("open");
      setTimeout(() => {
        if (root && root.parentNode) root.parentNode.removeChild(root);
      }, 120);
      if (!hadBodyLock) document.body.classList.remove("modal-lock");
      document.removeEventListener("keydown", onKeyDown, true);
      if (!accepted) {
        resolve(null);
        return;
      }
      const finalView = typeof normalizeGalleryView === "function"
        ? normalizeGalleryView(current)
        : Object.assign({}, current);
      resolve(finalView);
    };

    const onKeyDown = (ev) => {
      const key = String((ev && ev.key) || "");
      if (key === "Escape") {
        ev.preventDefault();
        finish(false);
      }
      if (key === "Enter") {
        const targetTag = String((ev && ev.target && ev.target.tagName) || "").toLowerCase();
        if (targetTag !== "textarea") {
          ev.preventDefault();
          finish(true);
        }
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    [zoomInput].forEach((field) => {
      field.addEventListener("input", syncPreview);
      field.addEventListener("change", syncPreview);
    });

    const resetBtn = root.querySelector("[data-adjust-reset]");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const resetView = typeof normalizeGalleryView === "function"
          ? normalizeGalleryView(typeof galleryDefaultView === "function" ? galleryDefaultView() : {})
          : { fit: "contain", zoom: 100, posX: 50, posY: 50 };
        current.fit = "contain";
        zoomInput.value = String(clampAdjustValue(resetView.zoom, ADJUST_MIN_ZOOM, 220, ADJUST_DEFAULT_ZOOM));
        current.posX = clampAdjustValue(resetView.posX, 0, 100, 50);
        current.posY = clampAdjustValue(resetView.posY, 0, 100, 50);
        syncPreview();
      });
    }

    root.querySelectorAll("[data-adjust-close]").forEach((button) => {
      button.addEventListener("click", () => finish(false));
    });
    const saveBtn = root.querySelector("[data-adjust-save]");
    if (saveBtn) saveBtn.addEventListener("click", () => finish(true));
  });
}

export function bindSimpleEditTabEventsUi(ctx, tabId) {
  const {
    editor,
    el,
    renderEdit,
    getDraftGalleryLists,
    getDraftGalleryViews,
    setDraftGalleryLists,
    setDraftGalleryViews,
    normalizeGalleryView,
    openItemModal,
    ensureGalleryViewLength,
    galleryDefaultView,
    readFileAsDataUrl,
    api,
    getDraftSections,
    setDraftSections,
    scheduleToObject,
    toArrayList,
    setEditorStatus,
  } = ctx || {};

  const notifyStatus = (message) => {
    if (typeof setEditorStatus === "function") {
      setEditorStatus(message);
      return;
    }
    try {
      window.alert(String(message || ""));
    } catch (_err) {}
  };
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

  const toMediaUrl = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return "https://" + raw;
    return raw;
  };

  const isLikelyMediaUrl = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return false;
    if (/^data:(image|video)\//i.test(raw)) return true;
    if (/^(https?:\/\/|blob:|\/)/i.test(raw)) return true;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return true;
    return false;
  };
  const normalizeMediaIdentity = (value) => {
    const raw = toMediaUrl(value);
    return String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/g, "");
  };
  const applyMediaFieldValidity = (field, isValid) => {
    if (!field) return;
    field.classList.toggle("is-invalid", !isValid);
    field.setAttribute("aria-invalid", isValid ? "false" : "true");
  };

  if (!editor.draft || !editor.draft.data) return;
  const data = editor.draft.data;
  if (tabId === "galeria") {
    if (!editor.galleryPagerByTab || typeof editor.galleryPagerByTab !== "object") {
      editor.galleryPagerByTab = {};
    }
    if (!editor.gallerySelectedByTab || typeof editor.gallerySelectedByTab !== "object") {
      editor.gallerySelectedByTab = {};
    }
    const pageSize = 24;
    const normalizeGalleryUiState = (active, listLength) => {
      const totalPages = Math.max(1, Math.ceil(listLength / pageSize));
      const currentPage = Math.min(totalPages, Math.max(1, Number(editor.galleryPagerByTab[active] || 1)));
      editor.galleryPagerByTab[active] = currentPage;
      let selectedIdx = Number(editor.gallerySelectedByTab[active]);
      if (!Number.isFinite(selectedIdx) || selectedIdx < 0 || selectedIdx >= listLength) {
        selectedIdx = listLength ? 0 : -1;
      }
      editor.gallerySelectedByTab[active] = selectedIdx;
    };

    el.edit.querySelectorAll("button[data-gallery-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const active = String(button.dataset.galleryTab || "photos");
        editor.activeSubByTab.galeria = active;
        const lists = getDraftGalleryLists();
        const list = Array.isArray(lists[active]) ? lists[active] : [];
        normalizeGalleryUiState(active, list.length);
        renderEdit();
      });
    });

    el.edit.querySelectorAll("button[data-gallery-select]").forEach((button) => {
      button.addEventListener("click", () => {
        const idx = Number(button.dataset.gallerySelect || -1);
        const active = String(editor.activeSubByTab.galeria || "photos");
        const lists = getDraftGalleryLists();
        const list = Array.isArray(lists[active]) ? lists[active] : [];
        if (idx < 0 || idx >= list.length) return;
        editor.gallerySelectedByTab[active] = idx;
        renderEdit();
      });
    });

    const shiftGalleryPage = (delta) => {
      const active = String(editor.activeSubByTab.galeria || "photos");
      const lists = getDraftGalleryLists();
      const list = Array.isArray(lists[active]) ? lists[active] : [];
      const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
      const currentPage = Math.min(totalPages, Math.max(1, Number(editor.galleryPagerByTab[active] || 1)));
      const nextPage = Math.min(totalPages, Math.max(1, currentPage + delta));
      if (nextPage === currentPage) return;
      editor.galleryPagerByTab[active] = nextPage;
      const start = (nextPage - 1) * pageSize;
      const end = Math.min(start + pageSize, list.length);
      const selectedIdx = Number(editor.gallerySelectedByTab[active]);
      if (!Number.isFinite(selectedIdx) || selectedIdx < start || selectedIdx >= end) {
        editor.gallerySelectedByTab[active] = start < list.length ? start : -1;
      }
      renderEdit();
    };
    const prevBtn = el.edit.querySelector("button[data-gallery-page-prev]");
    if (prevBtn) prevBtn.addEventListener("click", () => shiftGalleryPage(-1));
    const nextBtn = el.edit.querySelector("button[data-gallery-page-next]");
    if (nextBtn) nextBtn.addEventListener("click", () => shiftGalleryPage(1));
    const moveGalleryItem = (delta) => {
      const active = String(editor.activeSubByTab.galeria || "photos");
      const next = getDraftGalleryLists();
      const nextViews = getDraftGalleryViews();
      const list = Array.isArray(next[active]) ? next[active].slice() : [];
      const viewList = ensureGalleryViewLength(list, nextViews[active]).slice();
      const fromIdx = Number(editor.gallerySelectedByTab[active]);
      if (!Number.isFinite(fromIdx) || fromIdx < 0 || fromIdx >= list.length) return;
      const toIdx = Math.max(0, Math.min(list.length - 1, fromIdx + delta));
      if (toIdx === fromIdx) return;
      const [item] = list.splice(fromIdx, 1);
      const [view] = viewList.splice(fromIdx, 1);
      list.splice(toIdx, 0, item);
      viewList.splice(toIdx, 0, view);
      next[active] = list;
      nextViews[active] = viewList;
      editor.gallerySelectedByTab[active] = toIdx;
      editor.galleryPagerByTab[active] = Math.max(1, Math.ceil((toIdx + 1) / pageSize));
      setDraftGalleryLists(next);
      setDraftGalleryViews(nextViews);
      renderEdit();
    };
    const moveGalleryItemTo = (fromIdx, toIdx) => {
      const active = String(editor.activeSubByTab.galeria || "photos");
      const next = getDraftGalleryLists();
      const nextViews = getDraftGalleryViews();
      const list = Array.isArray(next[active]) ? next[active].slice() : [];
      const viewList = ensureGalleryViewLength(list, nextViews[active]).slice();
      if (!Number.isFinite(fromIdx) || !Number.isFinite(toIdx)) return;
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= list.length || toIdx >= list.length || fromIdx === toIdx) return;
      const [item] = list.splice(fromIdx, 1);
      const [view] = viewList.splice(fromIdx, 1);
      list.splice(toIdx, 0, item);
      viewList.splice(toIdx, 0, view);
      next[active] = list;
      nextViews[active] = viewList;
      editor.gallerySelectedByTab[active] = toIdx;
      editor.galleryPagerByTab[active] = Math.max(1, Math.ceil((toIdx + 1) / pageSize));
      setDraftGalleryLists(next);
      setDraftGalleryViews(nextViews);
      renderEdit();
    };
    const orderPrevBtn = el.edit.querySelector("button[data-gallery-order-prev]");
    if (orderPrevBtn) orderPrevBtn.addEventListener("click", () => moveGalleryItem(-1));
    const orderNextBtn = el.edit.querySelector("button[data-gallery-order-next]");
    if (orderNextBtn) orderNextBtn.addEventListener("click", () => moveGalleryItem(1));
    let dragFrom = -1;
    el.edit.querySelectorAll("[data-gallery-drag-index]").forEach((tile) => {
      tile.addEventListener("dragstart", () => {
        dragFrom = Number(tile.dataset.galleryDragIndex || -1);
        tile.classList.add("is-dragging");
      });
      tile.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        tile.classList.add("is-drop-target");
      });
      tile.addEventListener("dragleave", () => {
        tile.classList.remove("is-drop-target");
      });
      tile.addEventListener("drop", (ev) => {
        ev.preventDefault();
        tile.classList.remove("is-drop-target");
        const to = Number(tile.dataset.galleryDragIndex || -1);
        const from = Number(dragFrom);
        dragFrom = -1;
        moveGalleryItemTo(from, to);
      });
      tile.addEventListener("dragend", () => {
        dragFrom = -1;
        tile.classList.remove("is-dragging");
        el.edit.querySelectorAll("[data-gallery-drag-index]").forEach((entry) => entry.classList.remove("is-drop-target"));
      });
    });

    el.edit.querySelectorAll("button[data-gallery-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        const idx = Number(button.dataset.galleryRemove || -1);
        const active = String(editor.activeSubByTab.galeria || "photos");
        const next = getDraftGalleryLists();
        const nextViews = getDraftGalleryViews();
        const list = Array.isArray(next[active]) ? next[active].slice() : [];
        const viewList = Array.isArray(nextViews[active]) ? nextViews[active].slice() : [];
        if (idx >= 0 && idx < list.length) list.splice(idx, 1);
        if (idx >= 0 && idx < viewList.length) viewList.splice(idx, 1);
        next[active] = list;
        nextViews[active] = viewList;
        if (list.length === 0) {
          editor.gallerySelectedByTab[active] = -1;
          editor.galleryPagerByTab[active] = 1;
        } else {
          const selectedIdx = Number(editor.gallerySelectedByTab[active]);
          if (selectedIdx === idx) {
            editor.gallerySelectedByTab[active] = Math.min(idx, list.length - 1);
          } else if (selectedIdx > idx) {
            editor.gallerySelectedByTab[active] = selectedIdx - 1;
          }
          normalizeGalleryUiState(active, list.length);
        }
        setDraftGalleryLists(next);
        setDraftGalleryViews(nextViews);
        renderEdit();
      });
    });
    el.edit.querySelectorAll("button[data-gallery-preview]").forEach((button) => {
      button.addEventListener("click", () => {
        const idx = Number(button.dataset.galleryPreview || -1);
        const active = String(editor.activeSubByTab.galeria || "photos");
        const next = getDraftGalleryLists();
        const views = getDraftGalleryViews();
        const list = Array.isArray(next[active]) ? next[active] : [];
        const viewList = Array.isArray(views[active]) ? views[active] : [];
        if (idx < 0 || idx >= list.length) return;
        const mediaType = active === "photos" ? "image" : "video";
        const items = list.map((url, i) => ({
          name: (active === "photos" ? "Foto " : "Video ") + (i + 1),
          mediaUrl: url,
          mediaType,
          galleryView: normalizeGalleryView(viewList[i]),
        }));
        openItemModal("galeria", items, idx);
      });
    });
    el.edit.querySelectorAll("button[data-gallery-adjust]").forEach((button) => {
      button.addEventListener("click", async () => {
        const idx = Number(button.dataset.galleryAdjust || -1);
        const active = String(editor.activeSubByTab.galeria || "photos");
        if (active !== "photos") return;
        const next = getDraftGalleryLists();
        const nextViews = getDraftGalleryViews();
        const list = Array.isArray(next[active]) ? next[active] : [];
        const viewList = ensureGalleryViewLength(list, nextViews[active]).slice();
        if (idx < 0 || idx >= list.length) return;
        const url = String(list[idx] || "").trim();
        if (!url) return;
        const adjusted = await openImageAdjustModal({
          dataUrl: url,
          normalizeGalleryView,
          galleryDefaultView,
          initialView: viewList[idx],
        });
        if (!adjusted) return;
        viewList[idx] = adjusted;
        nextViews[active] = viewList;
        setDraftGalleryViews(nextViews);
        renderEdit();
      });
    });
    el.edit.querySelectorAll("input[data-gallery-url]").forEach((input) => {
      const apply = (normalizeOnChange = false) => {
        const idx = Number(input.dataset.galleryUrl || -1);
        const active = String(editor.activeSubByTab.galeria || "photos");
        const next = getDraftGalleryLists();
        const list = Array.isArray(next[active]) ? next[active].slice() : [];
        if (idx < 0 || idx >= list.length) return;
        const raw = String(input.value || "").trim();
        const candidate = normalizeOnChange ? toMediaUrl(raw) : raw;
        const isValid = !candidate || isLikelyMediaUrl(candidate);
        applyMediaFieldValidity(input, isValid);
        if (!isValid) {
          if (normalizeOnChange) notifyStatus("URL de media invalida.");
          return;
        }
        if (candidate) {
          const identity = normalizeMediaIdentity(candidate);
          const duplicated = list.some((entry, entryIdx) => {
            if (entryIdx === idx) return false;
            return normalizeMediaIdentity(entry) === identity;
          });
          if (duplicated) {
            applyMediaFieldValidity(input, false);
            if (normalizeOnChange) notifyStatus("Esta media ja existe na lista.");
            return;
          }
        }
        if (normalizeOnChange) input.value = candidate;
        list[idx] = candidate;
        next[active] = list;
        setDraftGalleryLists(next);
      };
      input.addEventListener("input", () => apply(false));
      input.addEventListener("change", () => apply(true));
      applyMediaFieldValidity(input, !String(input.value || "").trim() || isLikelyMediaUrl(toMediaUrl(input.value)));
    });
    const bindGalleryViewField = (selector, key) => {
      el.edit.querySelectorAll(selector).forEach((input) => {
        const apply = () => {
          const idx = Number(input.dataset.galleryZoom || -1);
          const active = String(editor.activeSubByTab.galeria || "photos");
          const lists = getDraftGalleryLists();
          const nextViews = getDraftGalleryViews();
          const list = Array.isArray(lists[active]) ? lists[active] : [];
          const viewList = ensureGalleryViewLength(list, nextViews[active]);
          if (idx < 0 || idx >= viewList.length) return;
          const current = normalizeGalleryView(viewList[idx]);
          let nextValue = input.value;
          if (key === "zoom") {
            nextValue = Number(input.value || 0);
          }
          current[key] = nextValue;
          viewList[idx] = normalizeGalleryView(current);
          nextViews[active] = viewList;
          setDraftGalleryViews(nextViews);
          renderEdit();
        };
        input.addEventListener("input", apply);
        input.addEventListener("change", apply);
      });
    };
    bindGalleryViewField("input[data-gallery-zoom]", "zoom");
    const addUrlBtn = el.edit.querySelector("button[data-gallery-add-url]");
    if (addUrlBtn) {
      addUrlBtn.addEventListener("click", () => {
        const url = window.prompt("URL da media:");
        if (!url) return;
        const clean = toMediaUrl(url);
        if (!clean) return;
        if (!isLikelyMediaUrl(clean)) {
          notifyStatus("URL de media invalida.");
          return;
        }
        const active = String(editor.activeSubByTab.galeria || "photos");
        const next = getDraftGalleryLists();
        const nextViews = getDraftGalleryViews();
        const list = Array.isArray(next[active]) ? next[active].slice() : [];
        const identity = normalizeMediaIdentity(clean);
        const duplicated = list.some((entry) => normalizeMediaIdentity(entry) === identity);
        if (duplicated) {
          notifyStatus("Esta media ja existe na lista.");
          return;
        }
        const viewList = ensureGalleryViewLength(list, nextViews[active]).slice();
        list.push(clean);
        viewList.push(galleryDefaultView());
        next[active] = list;
        nextViews[active] = viewList;
        editor.gallerySelectedByTab[active] = list.length - 1;
        editor.galleryPagerByTab[active] = Math.max(1, Math.ceil(list.length / pageSize));
        setDraftGalleryLists(next);
        setDraftGalleryViews(nextViews);
        notifyStatus("Media adicionada.");
        renderEdit();
      });
    }
    const uploadInput = el.edit.querySelector("input[data-gallery-upload]");
    if (uploadInput) {
      uploadInput.addEventListener("change", async () => {
        const file = uploadInput.files && uploadInput.files[0];
        if (!file) return;
        try {
          notifyStatus("A carregar ficheiro...");
          const dataUrl = await readUploadedMediaUrl(file, "gallery");
          if (!dataUrl) throw new Error("Ficheiro vazio");
          const active = String(editor.activeSubByTab.galeria || "photos");
          const next = getDraftGalleryLists();
          const nextViews = getDraftGalleryViews();
          const list = Array.isArray(next[active]) ? next[active].slice() : [];
          const viewList = ensureGalleryViewLength(list, nextViews[active]).slice();
          const newView = active === "photos"
            ? normalizeGalleryView({ fit: "contain", zoom: 100, posX: 50, posY: 50 })
            : galleryDefaultView();
          list.push(dataUrl);
          viewList.push(newView);
          next[active] = list;
          nextViews[active] = viewList;
          editor.gallerySelectedByTab[active] = list.length - 1;
          editor.galleryPagerByTab[active] = Math.max(1, Math.ceil(list.length / pageSize));
          setDraftGalleryLists(next);
          setDraftGalleryViews(nextViews);
          notifyStatus("Ficheiro carregado.");
          renderEdit();
          replaceWithUploadedMediaUrl(file, "gallery", (uploadedUrl) => {
            const latest = getDraftGalleryLists();
            const latestList = Array.isArray(latest[active]) ? latest[active].slice() : [];
            const imageIdx = latestList.indexOf(dataUrl);
            if (imageIdx < 0) return;
            latestList[imageIdx] = uploadedUrl;
            latest[active] = latestList;
            setDraftGalleryLists(latest);
            notifyStatus("Ficheiro enviado para Supabase.");
            renderEdit();
          });
        } catch (_err) {
          notifyStatus("Erro ao carregar ficheiro.");
        } finally {
          uploadInput.value = "";
        }
      });
    }
    return;
  }

  if (tabId === "agenda") {
    const getAgenda = () => (data.agenda && typeof data.agenda === "object") ? Object.assign({}, data.agenda) : { description: "", reserveLink: "", slots: [] };
    const persistAgenda = (nextAgenda) => {
      data.agenda = nextAgenda;
    };
    const addSlotBtn = el.edit.querySelector("button[data-agenda-add-slot]");
    if (addSlotBtn) {
      addSlotBtn.addEventListener("click", () => {
        const agenda = getAgenda();
        const slots = Array.isArray(agenda.slots) ? agenda.slots.slice() : [];
        slots.push({ rawDay: "", day: "", date: "", weekday: "", displayDay: "", times: [] });
        agenda.slots = slots;
        persistAgenda(agenda);
        renderEdit();
      });
    }
    el.edit.querySelectorAll("button[data-agenda-remove-slot]").forEach((button) => {
      button.addEventListener("click", () => {
        const idx = Number(button.dataset.agendaRemoveSlot || -1);
        const agenda = getAgenda();
        const slots = Array.isArray(agenda.slots) ? agenda.slots.slice() : [];
        if (idx >= 0 && idx < slots.length) slots.splice(idx, 1);
        agenda.slots = slots;
        persistAgenda(agenda);
        renderEdit();
      });
    });
    el.edit.querySelectorAll("[data-agenda-slot-day],[data-agenda-slot-weekday],[data-agenda-slot-times]").forEach((input) => {
      const apply = () => {
        const agenda = getAgenda();
        const slots = Array.isArray(agenda.slots) ? agenda.slots.slice() : [];
        const idx =
          Number(input.dataset.agendaSlotDay || input.dataset.agendaSlotWeekday || input.dataset.agendaSlotTimes || -1);
        if (idx < 0 || idx >= slots.length) return;
        const current = Object.assign({}, slots[idx] || {});
        if (input.hasAttribute("data-agenda-slot-day")) {
          const value = String(input.value || "").trim();
          current.rawDay = value;
          current.day = value;
          current.date = value;
        } else if (input.hasAttribute("data-agenda-slot-weekday")) {
          const value = String(input.value || "").trim();
          current.weekday = value;
          current.displayDay = value;
        } else if (input.hasAttribute("data-agenda-slot-times")) {
          const value = String(input.value || "").trim();
          current.times = value ? value.split(",").map((entry) => entry.trim()).filter(Boolean) : [];
        }
        slots[idx] = current;
        agenda.slots = slots;
        persistAgenda(agenda);
      };
      input.addEventListener("input", apply);
      input.addEventListener("change", apply);
    });
  }

  if (tabId === "parcerias") {
    const setRows = (nextRows) => { data.partners = nextRows; };
    const addBtn = el.edit.querySelector("button[data-partner-add]");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const current = Array.isArray(data.partners) ? data.partners.slice() : [];
        setRows([...current, { name: "", image: "", link: "" }]);
        renderEdit();
      });
    }
    el.edit.querySelectorAll("button[data-partner-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        const idx = Number(button.dataset.partnerRemove || -1);
        const next = Array.isArray(data.partners) ? data.partners.slice() : [];
        if (idx >= 0 && idx < next.length) next.splice(idx, 1);
        setRows(next);
        renderEdit();
      });
    });
    el.edit.querySelectorAll("[data-partner-name],[data-partner-image],[data-partner-link]").forEach((input) => {
      const apply = () => {
        const idx = Number(
          input.dataset.partnerName || input.dataset.partnerImage || input.dataset.partnerLink || -1
        );
        const next = Array.isArray(data.partners) ? data.partners.slice() : [];
        if (idx < 0 || idx >= next.length) return;
        const row = Object.assign({}, next[idx] || {});
        if (input.hasAttribute("data-partner-name")) row.name = String(input.value || "").trim();
        else if (input.hasAttribute("data-partner-image")) row.image = String(input.value || "").trim();
        else if (input.hasAttribute("data-partner-link")) row.link = String(input.value || "").trim();
        next[idx] = row;
        setRows(next);
      };
      input.addEventListener("input", apply);
      input.addEventListener("change", apply);
    });
  }

  if (tabId === "locais") {
    const setRows = (nextRows) => { data.locations = nextRows; };
    const addBtn = el.edit.querySelector("button[data-location-add]");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const next = Array.isArray(data.locations) ? data.locations.slice() : [];
        next.push({ title: "", address: "", note: "", coords: "", link: "" });
        setRows(next);
        renderEdit();
      });
    }
    el.edit.querySelectorAll("button[data-location-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        const idx = Number(button.dataset.locationRemove || -1);
        const next = Array.isArray(data.locations) ? data.locations.slice() : [];
        if (idx >= 0 && idx < next.length) next.splice(idx, 1);
        setRows(next);
        renderEdit();
      });
    });
    el.edit.querySelectorAll("[data-location-title],[data-location-address],[data-location-note],[data-location-coords],[data-location-link]").forEach((input) => {
      const apply = () => {
        const idx = Number(
          input.dataset.locationTitle ||
          input.dataset.locationAddress ||
          input.dataset.locationNote ||
          input.dataset.locationCoords ||
          input.dataset.locationLink ||
          -1
        );
        const next = Array.isArray(data.locations) ? data.locations.slice() : [];
        if (idx < 0 || idx >= next.length) return;
        const row = Object.assign({}, next[idx] || {});
        if (input.hasAttribute("data-location-title")) row.title = String(input.value || "").trim();
        else if (input.hasAttribute("data-location-address")) row.address = String(input.value || "").trim();
        else if (input.hasAttribute("data-location-note")) row.note = String(input.value || "").trim();
        else if (input.hasAttribute("data-location-coords")) row.coords = String(input.value || "").trim();
        else if (input.hasAttribute("data-location-link")) row.link = String(input.value || "").trim();
        next[idx] = row;
        setRows(next);
      };
      input.addEventListener("input", apply);
      input.addEventListener("change", apply);
    });
  }

  el.edit.querySelectorAll("[data-simple-field]").forEach((field) => {
    const apply = () => {
      const key = String(field.dataset.simpleField || "");
      if (tabId === "horario") {
        const schedule = scheduleToObject(data.schedule);
        const scheduleKey = key.replace("schedule_", "");
        if (Object.prototype.hasOwnProperty.call(schedule, scheduleKey)) schedule[scheduleKey] = String(field.value || "").trim();
        data.schedule = schedule;
        return;
      }
      if (tabId === "agenda") {
        const agenda = data.agenda && typeof data.agenda === "object" ? Object.assign({}, data.agenda) : {};
        if (key === "agenda_description") agenda.description = String(field.value || "").trim();
        else if (key === "agenda_reserveLink") agenda.reserveLink = String(field.value || "").trim();
        data.agenda = agenda;
        return;
      }
    };
    field.addEventListener("input", apply);
    field.addEventListener("change", apply);
  });

}
