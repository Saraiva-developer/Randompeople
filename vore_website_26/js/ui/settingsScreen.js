export function renderSettingsScreen(ctx) {
  const {
    root,
    authUser,
    settingsUi,
    isGuestUser,
    isCommonUser,
    isProfessionalUser,
    esc,
    tUi,
    settingsRowHtml,
    settingsToggleHtml,
    localizeSettingsHtml,
    onRender,
    onRenderAll,
    onOpenEditProfile,
    onOpenProfile,
    onSetPersonalProfileContext,
    onLogout,
  } = ctx;
  if (!root) return;

  const renderMain = () => {
    const guest = !!isGuestUser();
    const common = !!isCommonUser();
    const professional = !!isProfessionalUser();
    const email = String((authUser && authUser.email) || "");
    const name = String((authUser && authUser.name) || "Perfil");
    let html = "";
    html += "<div class=\"panel settings-hero\">";
    html += "<h3>Definições</h3>";
    html += "<p class=\"muted\">" + esc(guest ? "Modo convidado" : email) + "</p>";
    html += "<p class=\"muted\">" + esc(guest ? "Conta convidado" : (common ? "Conta pessoal" : "Conta profissional")) + "</p>";
    html += "</div>";

    if (guest) {
      html += "<div class=\"settings-section\"><h4>Conta</h4><div class=\"settings-card\">";
      html += "<p class=\"muted\">Entra para aceder a todas as definicoes.</p>";
      html += "</div></div>";
      root.innerHTML = localizeSettingsHtml(html);
      return;
    }

    if (professional) {
      html += "<div class=\"settings-section\"><h4>Conta</h4><div class=\"settings-card\">";
      html += "<div class=\"settings-row static\"><span class=\"settings-row-main\"><span class=\"settings-row-label\">" + esc(name) + "</span><span class=\"settings-row-hint\">Nome do negocio/perfil</span></span></div>";
      html += settingsRowHtml("Credenciais de acesso", email, "open_credentials");
      html += settingsRowHtml("Editar perfil", "Abrir edicao completa", "open_edit_profile");
      html += settingsToggleHtml("Perfil ativo", "profileActive", settingsUi.profileActive);
      html += "</div></div>";

      html += "<div class=\"settings-section\"><h4>Notificações</h4><div class=\"settings-card\">";
      html += settingsToggleHtml("Novas visitas ao perfil", "notifNewVisits", settingsUi.notifNewVisits);
      html += settingsToggleHtml("Novas partilhas do perfil", "notifShares", settingsUi.notifShares);
      html += settingsToggleHtml("Alertas de promoções", "notifPromos", settingsUi.notifPromos);
      html += "</div></div>";
    } else if (common) {
      html += "<div class=\"settings-section\"><h4>Conta pessoal</h4><div class=\"settings-card\">";
      html += settingsRowHtml("Credenciais de acesso", email, "open_credentials");
      html += settingsRowHtml("Abrir perfil pessoal", "Ir para o perfil", "open_profile");
      html += "</div></div>";
    }

    html += "<div class=\"settings-section\"><h4>App</h4><div class=\"settings-card\">";
    html += settingsRowHtml("Idioma", settingsUi.language === "en" ? "English" : settingsUi.language === "es" ? "Espanol" : "Portugues", "open_language");
    html += "<div class=\"settings-row static\"><span class=\"settings-row-main\"><span class=\"settings-row-label\">Tema</span><span class=\"settings-row-hint\">" + esc(settingsUi.theme === "escuro" ? "Escuro" : "Claro") + "</span></span></div>";
    html += settingsRowHtml("Limpar cache local", "Recarregar aplicacao", "clear_cache");
    html += "</div></div>";

    html += "<div class=\"settings-section\"><h4>Suporte e legal</h4><div class=\"settings-card\">";
    html += settingsRowHtml("Ajuda", "", "open_support");
    html += settingsRowHtml("Contacto", "", "open_support");
    html += settingsRowHtml("Termos e privacidade", "", "open_support");
    html += "</div></div>";

    html += "<button type=\"button\" class=\"settings-logout-btn\" data-settings-action=\"logout\">Terminar sessao</button>";
    if (settingsUi.message) html += "<p class=\"muted\">" + esc(settingsUi.message) + "</p>";
    root.innerHTML = localizeSettingsHtml(html);
  };

  const renderCredentials = () => {
    const email = String((authUser && authUser.email) || settingsUi.credentials.email || "");
    if (!settingsUi.credentials.email) settingsUi.credentials.email = email;
    let html = "";
    html += "<div class=\"panel settings-hero\">";
    html += "<div class=\"settings-subhead\"><button type=\"button\" class=\"profile-top-btn\" data-settings-action=\"back_main\">&#8592;</button><h3>Credenciais</h3></div>";
    html += "<p class=\"muted\">Alterar email e palavra-passe</p>";
    html += "</div>";
    html += "<div class=\"settings-section\"><div class=\"settings-card settings-form\">";
    html += "<label>Email</label><input id=\"settingsEmail\" class=\"input\" value=\"" + esc(settingsUi.credentials.email || "") + "\" />";
    html += "<label>Palavra-passe atual</label><input id=\"settingsCurrentPass\" type=\"password\" class=\"input\" value=\"" + esc(settingsUi.credentials.currentPassword || "") + "\" />";
    html += "<label>Nova palavra-passe</label><input id=\"settingsNewPass\" type=\"password\" class=\"input\" value=\"" + esc(settingsUi.credentials.newPassword || "") + "\" />";
    html += "<label>Repetir nova palavra-passe</label><input id=\"settingsRepeatPass\" type=\"password\" class=\"input\" value=\"" + esc(settingsUi.credentials.repeatPassword || "") + "\" />";
    html += "<button type=\"button\" class=\"settings-save-btn\" data-settings-action=\"save_credentials\">Guardar</button>";
    html += "</div></div>";
    if (settingsUi.message) html += "<p class=\"muted\">" + esc(settingsUi.message) + "</p>";
    root.innerHTML = localizeSettingsHtml(html);
  };

  const renderLanguage = () => {
    let html = "";
    html += "<div class=\"panel settings-hero\">";
    html += "<div class=\"settings-subhead\"><button type=\"button\" class=\"profile-top-btn\" data-settings-action=\"back_main\">&#8592;</button><h3>Idioma</h3></div>";
    html += "<p class=\"muted\">Seleciona o idioma da app</p>";
    html += "</div>";
    html += "<div class=\"settings-section\"><div class=\"settings-card\">";
    html += "<div class=\"chips\">";
    html += "<button type=\"button\" class=\"" + (settingsUi.language === "pt" ? "active" : "") + "\" data-settings-language=\"pt\">Portugues</button>";
    html += "<button type=\"button\" class=\"" + (settingsUi.language === "en" ? "active" : "") + "\" data-settings-language=\"en\">English</button>";
    html += "<button type=\"button\" class=\"" + (settingsUi.language === "es" ? "active" : "") + "\" data-settings-language=\"es\">Espanol</button>";
    html += "</div>";
    html += "<button type=\"button\" class=\"settings-save-btn\" data-settings-action=\"save_language\">Guardar</button>";
    html += "</div></div>";
    if (settingsUi.message) html += "<p class=\"muted\">" + esc(settingsUi.message) + "</p>";
    root.innerHTML = localizeSettingsHtml(html);
  };

  const bindEvents = () => {
    root.querySelectorAll("button[data-settings-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = String(button.dataset.settingsToggle || "");
        if (!key || !(key in settingsUi)) return;
        settingsUi[key] = !settingsUi[key];
        settingsUi.message = "";
        onRender();
      });
    });
    root.querySelectorAll("button[data-settings-language]").forEach((button) => {
      button.addEventListener("click", () => {
        settingsUi.language = String(button.dataset.settingsLanguage || "pt");
        settingsUi.message = "";
        onRender();
      });
    });
    root.querySelectorAll("button[data-settings-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = String(button.dataset.settingsAction || "");
        if (action === "open_credentials") {
          settingsUi.view = "credentials";
          settingsUi.message = "";
          onRender();
          return;
        }
        if (action === "open_language") {
          settingsUi.view = "language";
          settingsUi.message = "";
          onRender();
          return;
        }
        if (action === "open_edit_profile") {
          onOpenEditProfile();
          return;
        }
        if (action === "open_profile") {
          onSetPersonalProfileContext();
          onOpenProfile();
          return;
        }
        if (action === "open_support") {
          settingsUi.message = tUi("settings.supportPreparing", "Seccao de suporte/termos em preparacao.");
          onRender();
          return;
        }
        if (action === "clear_cache") {
          settingsUi.message = tUi("settings.cacheCleared", "Cache limpo. A recarregar...");
          onRender();
          setTimeout(() => window.location.reload(), 200);
          return;
        }
        if (action === "save_language") {
          try { localStorage.setItem("vore_language", settingsUi.language); } catch (_e) {}
          settingsUi.message = tUi("settings.languageSaved", "Idioma guardado.");
          settingsUi.view = "main";
          onRenderAll();
          return;
        }
        if (action === "save_credentials") {
          const emailInput = root.querySelector("#settingsEmail");
          const curInput = root.querySelector("#settingsCurrentPass");
          const newInput = root.querySelector("#settingsNewPass");
          const repInput = root.querySelector("#settingsRepeatPass");
          settingsUi.credentials.email = String((emailInput && emailInput.value) || "").trim();
          settingsUi.credentials.currentPassword = String((curInput && curInput.value) || "");
          settingsUi.credentials.newPassword = String((newInput && newInput.value) || "");
          settingsUi.credentials.repeatPassword = String((repInput && repInput.value) || "");
          if (settingsUi.credentials.newPassword !== settingsUi.credentials.repeatPassword) {
            settingsUi.message = tUi("settings.passwordMismatch", "Nova palavra-passe e repeticao nao coincidem.");
            onRender();
            return;
          }
          settingsUi.message = tUi("settings.credentialsSaved", "Credenciais guardadas localmente. Endpoint de alteracao ainda nao disponivel.");
          settingsUi.view = "main";
          onRender();
          return;
        }
        if (action === "logout") {
          await onLogout();
          return;
        }
        if (action === "back_main") {
          settingsUi.view = "main";
          settingsUi.message = "";
          onRender();
        }
      });
    });
  };

  if (settingsUi.view === "credentials") renderCredentials();
  else if (settingsUi.view === "language") renderLanguage();
  else renderMain();
  bindEvents();
}
