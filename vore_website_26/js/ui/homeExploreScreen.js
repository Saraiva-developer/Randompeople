let exploreAdvancedRoot = null;

function ensureExploreAdvancedRoot(ctx) {
  if (exploreAdvancedRoot && document.body.contains(exploreAdvancedRoot)) return exploreAdvancedRoot;
  let root = document.getElementById("exploreAdvancedRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "exploreAdvancedRoot";
    root.className = "explore-advanced-root";
    root.innerHTML = (
      "<div class=\"explore-advanced-backdrop\" data-explore-adv-close=\"1\"></div>" +
      "<div class=\"explore-advanced-sheet\">" +
        "<div class=\"explore-advanced-handle\"></div>" +
        "<div class=\"explore-advanced-header\">" +
          "<strong>Filtros avancados</strong>" +
          "<div class=\"explore-advanced-header-actions\">" +
            "<button type=\"button\" data-explore-adv-clear=\"1\">Limpar</button>" +
            "<button type=\"button\" data-explore-adv-close=\"1\" aria-label=\"Fechar\">&times;</button>" +
          "</div>" +
        "</div>" +
        "<div id=\"exploreAdvancedBody\" class=\"explore-advanced-body\"></div>" +
        "<div class=\"explore-advanced-footer\">" +
          "<button type=\"button\" class=\"explore-advanced-apply\" data-explore-adv-close=\"1\">Aplicar</button>" +
        "</div>" +
      "</div>"
    );
    document.body.appendChild(root);
  }
  exploreAdvancedRoot = root;

  root.querySelectorAll("[data-explore-adv-close]").forEach((btn) => {
    btn.onclick = () => {
      ctx.setState({ exploreAdvancedOpen: false });
      renderExploreAdvancedModalUi(ctx);
    };
  });
  const clearBtn = root.querySelector("[data-explore-adv-clear]");
  if (clearBtn) {
    clearBtn.onclick = () => {
      ctx.setState({
        exploreDiscoveryFilter: "all",
        exploreCategoryFilters: [],
        exploreSortBy: "relevance",
        exploreCategorySearch: "",
      });
      ctx.renderAll();
      renderExploreAdvancedModalUi(ctx);
    };
  }
  return root;
}

function removeExploreCategoryFilterUi(ctx, key) {
  const next = (Array.isArray(ctx.state.exploreCategoryFilters) ? ctx.state.exploreCategoryFilters : []).filter((k) => k !== key);
  ctx.setState({ exploreCategoryFilters: next });
  ctx.renderAll();
}

export function renderExploreSortChipsUi(ctx) {
  const row = ctx.el.exploreSortRow;
  if (!row) return;
  const activeSort = String(ctx.state.exploreSortBy || "relevance");
  row.innerHTML = ctx.EXPLORE_SORT_OPTIONS.map((opt) => (
    "<button class=\"" + (opt.key === activeSort ? "active" : "") + "\" data-explore-sort=\"" + opt.key + "\">" + ctx.esc(opt.label) + "</button>"
  )).join("");
  row.querySelectorAll("button[data-explore-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      ctx.setState({ exploreSortBy: button.dataset.exploreSort || "relevance" });
      ctx.renderAll();
    });
  });
}

export function renderExploreActiveFiltersUi(ctx) {
  const root = ctx.el.exploreActiveFilters;
  if (!root) return;
  const discoveryFilter = String(ctx.state.exploreDiscoveryFilter || "all");
  const categoryFilters = Array.isArray(ctx.state.exploreCategoryFilters) ? ctx.state.exploreCategoryFilters : [];
  const sortBy = String(ctx.state.exploreSortBy || "relevance");
  const hasActive = discoveryFilter !== "all" || sortBy !== "relevance" || categoryFilters.length > 0;
  if (!hasActive) {
    root.innerHTML = "";
    return;
  }
  const discoveryLabel = (ctx.EXPLORE_DISCOVERY_OPTIONS.find((item) => item.key === discoveryFilter) || {}).label || "Descoberta";
  const sortLabel = (ctx.EXPLORE_SORT_OPTIONS.find((item) => item.key === sortBy) || {}).label || "Ordenacao";
  const categoryBits = categoryFilters.map((key) => {
    const label = (ctx.CATEGORY_TAXONOMY.find((item) => item.key === key) || {}).label || key;
    return "<button class=\"explore-active-filter-chip\" data-remove-explore-cat=\"" + ctx.esc(key) + "\">" + ctx.esc(label) + " <span>&times;</span></button>";
  }).join("");
  root.innerHTML =
    (discoveryFilter !== "all" ? "<button class=\"explore-active-filter-chip\" data-clear-discovery=\"1\">" + ctx.esc(discoveryLabel) + " <span>&times;</span></button>" : "") +
    (sortBy !== "relevance" ? "<button class=\"explore-active-filter-chip\" data-clear-sort=\"1\">" + ctx.esc(sortLabel) + " <span>&times;</span></button>" : "") +
    categoryBits;
  const clearDiscovery = root.querySelector("button[data-clear-discovery]");
  if (clearDiscovery) clearDiscovery.addEventListener("click", () => { ctx.setState({ exploreDiscoveryFilter: "all" }); ctx.renderAll(); });
  const clearSort = root.querySelector("button[data-clear-sort]");
  if (clearSort) clearSort.addEventListener("click", () => { ctx.setState({ exploreSortBy: "relevance" }); ctx.renderAll(); });
  root.querySelectorAll("button[data-remove-explore-cat]").forEach((button) => {
    button.addEventListener("click", () => removeExploreCategoryFilterUi(ctx, String(button.dataset.removeExploreCat || "")));
  });
}

export function renderHomeFiltersUi(ctx) {
  const root = ctx.el.homeFilters;
  if (!root) return;
  const active = String(ctx.state.homeFilter || "destaques");
  root.innerHTML = ctx.HOME_FILTERS.map((f) => (
    "<button class=\"" + (active === f.id ? "active" : "") + "\" data-home-filter=\"" + f.id + "\">" + ctx.esc(f.label) + "</button>"
  )).join("");
  root.querySelectorAll("button[data-home-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      ctx.setState({ homeFilter: button.dataset.homeFilter || "destaques" });
      ctx.renderAll();
    });
  });
  if (ctx.el.homeProfilesTitle) {
    ctx.el.homeProfilesTitle.textContent = (ctx.HOME_FILTER_LABELS[active] || ctx.HOME_FILTER_LABELS.destaques);
  }
}

export function renderHomeInsightsUi(ctx) {
  const root = ctx.el.homeInsights;
  if (!root) return;
  const profiles = Array.isArray(ctx.state.profiles) ? ctx.state.profiles : [];
  if (!profiles.length) {
    root.innerHTML = "";
    return;
  }
  const totalViews = ctx.getTotalProfileViews();
  const trending = ctx.getTrendingProfiles(profiles, 1);
  const topName = trending[0] && trending[0].profile ? String(trending[0].profile.name || "Sem dados") : "Sem dados";
  const promoCount = profiles.filter((p) => ctx.getBadgeType(p) === "promo" || ctx.resolveProfileFilter(p) === "promocoes").length;
  const newCount = profiles.filter((p) => ctx.getBadgeType(p) === "novo" || ctx.resolveProfileFilter(p) === "novidades").length;
  root.innerHTML =
    "<span class=\"home-insight-chip\">Vistas hoje: " + ctx.esc(String(totalViews)) + "</span>" +
    "<span class=\"home-insight-chip\">Em alta: " + ctx.esc(topName) + "</span>" +
    "<span class=\"home-insight-chip\">Promocoes: " + ctx.esc(String(promoCount)) + " | Novos: " + ctx.esc(String(newCount)) + "</span>";
}

export function renderExploreTrendUi(ctx, exploreList) {
  const root = ctx.el.exploreTrendText;
  if (!root) return;
  const list = Array.isArray(exploreList) ? exploreList : [];
  if (!list.length) {
    root.textContent = "";
    return;
  }
  const trending = ctx.getTrendingProfiles(list, 2).map((entry) => String(entry && entry.profile && entry.profile.name || "").trim()).filter(Boolean);
  const label = trending.length ? ("Tendencia: " + trending.join(" | ")) : "";
  root.textContent = label;
}

export function renderExplorePagerUi(ctx, totalCount, shownCount) {
  const pager = ctx.el.explorePager;
  if (!pager) return;
  const total = Math.max(0, Number(totalCount || 0));
  const shown = Math.max(0, Number(shownCount || 0));
  if (ctx.el.exploreSentinel) {
    ctx.el.exploreSentinel.style.display = "none";
  }
  if (!total) {
    pager.innerHTML = "";
    return;
  }
  const hasMore = shown < total;
  pager.innerHTML =
    "<span class=\"muted\">A mostrar " + ctx.esc(String(shown)) + " de " + ctx.esc(String(total)) + "</span>" +
    (hasMore ? "<button type=\"button\" data-explore-load-more=\"1\">Mostrar mais</button>" : "");
  const btn = pager.querySelector("button[data-explore-load-more]");
  if (btn) {
    btn.addEventListener("click", ctx.loadMoreExploreItems);
  }
  if (ctx.el.exploreSentinel) {
    ctx.el.exploreSentinel.style.display = hasMore ? "block" : "none";
  }
}

export function renderExploreAdvancedModalUi(ctx) {
  const root = ensureExploreAdvancedRoot(ctx);
  const open = !!ctx.state.exploreAdvancedOpen;
  if (!open) {
    root.classList.remove("open");
    return;
  }
  const categorySearch = ctx.normalizeText(ctx.state.exploreCategorySearch || "");
  const visibleCategoryOptions = ctx.CATEGORY_TAXONOMY.filter((item) => {
    if (!categorySearch) return true;
    return ctx.normalizeText(item.label).includes(categorySearch);
  });
  const body = root.querySelector("#exploreAdvancedBody");
  if (!body) return;

  body.innerHTML =
    "<p class=\"explore-advanced-label\">Descoberta</p>" +
    "<div class=\"explore-advanced-chips\">" +
      ctx.EXPLORE_DISCOVERY_OPTIONS.map((item) => {
        const active = String(ctx.state.exploreDiscoveryFilter || "all") === item.key;
        return "<button type=\"button\" class=\"" + (active ? "active" : "") + "\" data-explore-discovery=\"" + item.key + "\">" + ctx.esc(item.label) + "</button>";
      }).join("") +
    "</div>" +
    "<p class=\"explore-advanced-label\">Ordenar por</p>" +
    "<div class=\"explore-advanced-chips\">" +
      ctx.EXPLORE_SORT_OPTIONS.map((item) => {
        const active = String(ctx.state.exploreSortBy || "relevance") === item.key;
        return "<button type=\"button\" class=\"" + (active ? "active" : "") + "\" data-explore-sort-modal=\"" + item.key + "\">" + ctx.esc(item.label) + "</button>";
      }).join("") +
    "</div>" +
    "<p class=\"explore-advanced-label\">Categoria</p>" +
    "<div class=\"explore-category-search-box\">" +
      "<span class=\"explore-category-search-icon\">&#8981;</span>" +
      "<input id=\"exploreCategorySearchInput\" class=\"input\" placeholder=\"Pesquisar categoria...\" value=\"" + ctx.esc(ctx.state.exploreCategorySearch || "") + "\" />" +
    "</div>" +
    "<div class=\"explore-category-list\">" +
      (visibleCategoryOptions.length
        ? visibleCategoryOptions.map((item) => {
            const selected = (Array.isArray(ctx.state.exploreCategoryFilters) ? ctx.state.exploreCategoryFilters : []).includes(item.key);
            return "<button type=\"button\" class=\"explore-category-row" + (selected ? " active" : "") + "\" data-explore-category=\"" + item.key + "\"><span>" + ctx.esc(item.label) + "</span><span>" + (selected ? "&#9745;" : "&#9744;") + "</span></button>";
          }).join("")
        : "<div class=\"panel\"><p class=\"muted\">Sem categorias para este termo.</p></div>") +
    "</div>";

  body.querySelectorAll("button[data-explore-discovery]").forEach((button) => {
    button.addEventListener("click", () => {
      ctx.setState({ exploreDiscoveryFilter: button.dataset.exploreDiscovery || "all" });
      ctx.renderAll();
      renderExploreAdvancedModalUi(ctx);
    });
  });
  body.querySelectorAll("button[data-explore-sort-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      ctx.setState({ exploreSortBy: button.dataset.exploreSortModal || "relevance" });
      ctx.renderAll();
      renderExploreAdvancedModalUi(ctx);
    });
  });
  const categoryInput = body.querySelector("#exploreCategorySearchInput");
  if (categoryInput) {
    categoryInput.addEventListener("input", () => {
      const nextValue = categoryInput.value || "";
      ctx.setState({ exploreCategorySearch: nextValue });
      renderExploreAdvancedModalUi(ctx);
      const nextInput = root.querySelector("#exploreCategorySearchInput");
      if (nextInput) {
        nextInput.focus({ preventScroll: true });
        const cursor = nextValue.length;
        try {
          nextInput.setSelectionRange(cursor, cursor);
        } catch (_error) {}
      }
    });
  }
  body.querySelectorAll("button[data-explore-category]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = String(button.dataset.exploreCategory || "");
      const prev = Array.isArray(ctx.state.exploreCategoryFilters) ? ctx.state.exploreCategoryFilters : [];
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      ctx.setState({ exploreCategoryFilters: next });
      ctx.renderAll();
      renderExploreAdvancedModalUi(ctx);
    });
  });
  root.classList.add("open");
}

export function renderDesktopRailUi(ctx) {
  if (!ctx.el.desktopRail) return;
  if (String((ctx.state && ctx.state.currentTab) || "") === "edit") {
    ctx.el.desktopRail.innerHTML = "";
    return;
  }
  const profiles = Array.isArray(ctx.state.profiles) ? ctx.state.profiles : [];
  if (!profiles.length || !ctx.hasAccessSession()) {
    ctx.el.desktopRail.innerHTML = "";
    return;
  }

  const featured = [...profiles].sort((a, b) => ctx.scoreLocal(b) - ctx.scoreLocal(a)).slice(0, 5);
  const typeCounts = {};
  profiles.forEach((p) => {
    const key = String((p && p.type) || "service_pro").toLowerCase();
    typeCounts[key] = (typeCounts[key] || 0) + 1;
  });
  const topTypes = Object.keys(typeCounts)
    .map((key) => ({ key, count: Number(typeCounts[key] || 0), label: ctx.PROFILE_TYPE_LABEL[key] || key }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const featuredHtml = featured.map((p) => {
    const avatar = String((p && p.avatar) || "").trim();
    const name = String((p && p.name) || "Perfil");
    const category = String((p && p.category) || (ctx.PROFILE_TYPE_LABEL[p && p.type] || "Perfil"));
    const badge = ctx.getBadgeType(p);
    const isVerified = badge === "verif";
    const avatarHtml =
      "<span class=\"desktop-rail-avatar-wrap\">" +
        (avatar
          ? "<img class=\"desktop-rail-avatar\" src=\"" + ctx.esc(avatar) + "\" alt=\"" + ctx.esc(name) + "\" />"
          : "<div class=\"desktop-rail-avatar placeholder\">" + ctx.esc(name.slice(0, 1).toUpperCase()) + "</div>") +
        (isVerified ? "<span class=\"desktop-rail-avatar-verif\" aria-hidden=\"true\">&#10003;</span>" : "") +
      "</span>";
    const badgeHtml = (badge && !isVerified)
      ? "<span class=\"desktop-rail-badge desktop-rail-badge-" + ctx.esc(badge) + "\">" +
          ctx.esc(badge === "promo" ? "Promo" : badge === "novo" ? "Novo" : "Verif") +
        "</span>"
      : "";
    return (
      "<button type=\"button\" class=\"desktop-rail-profile\" data-rail-profile=\"" + ctx.esc(String((p && p.id) || "")) + "\">" +
        avatarHtml +
        "<span class=\"desktop-rail-main\">" +
          "<strong>" + ctx.esc(name) + "</strong>" +
          "<span class=\"desktop-rail-sub\">" + ctx.esc(category) + "</span>" +
        "</span>" +
        badgeHtml +
      "</button>"
    );
  }).join("");

  ctx.el.desktopRail.innerHTML =
    "<div class=\"desktop-rail-block\">" +
      "<h4>Selecao Vore</h4>" +
      "<div class=\"desktop-rail-list\">" + featuredHtml + "</div>" +
    "</div>" +
    "<div class=\"desktop-rail-block\">" +
      "<h4>Categorias</h4>" +
      "<div class=\"desktop-rail-chips\">" +
        topTypes.map((entry) => "<span class=\"desktop-rail-chip\">" + ctx.esc(entry.label) + " (" + ctx.esc(String(entry.count)) + ")</span>").join("") +
      "</div>" +
    "</div>";

  ctx.el.desktopRail.querySelectorAll("button[data-rail-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.railProfile || 0);
      if (!id) return;
      const fromTab = ctx.resolveProfileOriginTab();
      ctx.openPublicProfile(id, { fromTab });
    });
  });
}
