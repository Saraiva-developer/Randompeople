export function renderEntryGateUi(ctx) {
  const {
    el,
    state,
    entryUi,
    hasAccessSession,
    setState,
    esc,
    api,
    settingsUi,
    resetRecommendationsStore,
    refreshRecommendationsForCurrentUser,
    onRenderAll,
    onRenderEntryGate,
  } = ctx || {};
  const getInitialTab = () => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const requested = String(params.get("open") || "").trim().toLowerCase();
      return requested === "edit" ? "edit" : "home";
    } catch (_err) {
      return "home";
    }
  };

  if (!el.entryGate || !el.appShell) return;
  if (hasAccessSession()) {
    el.entryGate.classList.remove("active");
    el.entryGate.innerHTML = "";
    el.appShell.classList.remove("hidden");
    return;
  }
  const view = String(state.authEntryView || "welcome");
  let html = "<div class=\"entry-card\">";
  html += "<div class=\"entry-logo\">Vore</div>";
  if (view === "loading") {
    html += "<h2 class=\"entry-title\">A iniciar</h2>";
    html += "<p class=\"entry-subtitle\">A validar sessao...</p>";
    html += "</div>";
    el.entryGate.innerHTML = html;
    el.entryGate.classList.add("active");
    el.appShell.classList.add("hidden");
    return;
  }
  if (view === "login") {
    html += "<h2 class=\"entry-title\">Entrar</h2>";
    html += "<p class=\"entry-subtitle\">Acede com a tua conta Vore.</p>";
    html += "<form class=\"entry-form\" id=\"entryLoginForm\">";
    html += "<label>Email<input required type=\"email\" id=\"entryLoginEmail\" class=\"input\" autocomplete=\"email\" /></label>";
    html += "<label>Palavra-passe<input required type=\"password\" id=\"entryLoginPassword\" class=\"input\" autocomplete=\"current-password\" /></label>";
    if (entryUi.error) html += "<p class=\"entry-error\">" + esc(entryUi.error) + "</p>";
    if (entryUi.success) html += "<p class=\"entry-success\">" + esc(entryUi.success) + "</p>";
    html += "<div class=\"entry-form-actions\">";
    html += "<button type=\"button\" data-entry-action=\"back\">Voltar</button>";
    html += "<button type=\"submit\" class=\"entry-submit-btn\"" + (entryUi.pending ? " disabled" : "") + ">" + (entryUi.pending ? "A entrar..." : "Entrar") + "</button>";
    html += "</div></form>";
    html += "<div class=\"entry-link-row\"><button type=\"button\" class=\"entry-link-btn\" data-entry-action=\"to_register\">Não tens conta? Registar</button></div>";
  } else if (view === "register") {
    html += "<h2 class=\"entry-title\">Criar conta</h2>";
    html += "<p class=\"entry-subtitle\">Regista uma conta profissional ou pessoal.</p>";
    html += "<form class=\"entry-form\" id=\"entryRegisterForm\">";
    html += "<label>Nome<input required type=\"text\" id=\"entryRegisterName\" class=\"input\" autocomplete=\"name\" /></label>";
    html += "<label>Email<input required type=\"email\" id=\"entryRegisterEmail\" class=\"input\" autocomplete=\"email\" /></label>";
    html += "<label>Palavra-passe<input required minlength=\"6\" type=\"password\" id=\"entryRegisterPassword\" class=\"input\" autocomplete=\"new-password\" /></label>";
    html += "<label>Tipo de conta<select id=\"entryRegisterType\" class=\"input\"><option value=\"professional\">Profissional</option><option value=\"common\">Conta pessoal</option></select></label>";
    if (entryUi.error) html += "<p class=\"entry-error\">" + esc(entryUi.error) + "</p>";
    if (entryUi.success) html += "<p class=\"entry-success\">" + esc(entryUi.success) + "</p>";
    html += "<div class=\"entry-form-actions\">";
    html += "<button type=\"button\" data-entry-action=\"back\">Voltar</button>";
    html += "<button type=\"submit\" class=\"entry-submit-btn\"" + (entryUi.pending ? " disabled" : "") + ">" + (entryUi.pending ? "A criar..." : "Criar conta") + "</button>";
    html += "</div></form>";
    html += "<div class=\"entry-link-row\"><button type=\"button\" class=\"entry-link-btn\" data-entry-action=\"to_login\">Ja tens conta? Entrar</button></div>";
  } else {
    html += "<h2 class=\"entry-title\">Descobrir e explorar</h2>";
    html += "<p class=\"entry-subtitle\">Entra para gerir perfil, ou continua como convidado para pesquisar.</p>";
    if (entryUi.error) html += "<p class=\"entry-error\">" + esc(entryUi.error) + "</p>";
    if (entryUi.success) html += "<p class=\"entry-success\">" + esc(entryUi.success) + "</p>";
    html += "<div class=\"entry-actions\">";
    html += "<button type=\"button\" class=\"entry-primary-btn\" data-entry-action=\"to_login\">Entrar</button>";
    html += "<button type=\"button\" data-entry-action=\"to_register\">Registar</button>";
    html += "<button type=\"button\" data-entry-action=\"guest\">Continuar como convidado</button>";
    html += "</div>";
  }
  html += "</div>";
  el.entryGate.innerHTML = html;
  el.entryGate.classList.add("active");
  el.appShell.classList.add("hidden");

  el.entryGate.querySelectorAll("button[data-entry-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = String(button.dataset.entryAction || "");
      entryUi.error = "";
      entryUi.success = "";
      if (action === "to_login") {
        setState({ authEntryView: "login" });
        onRenderEntryGate();
        return;
      }
      if (action === "to_register") {
        setState({ authEntryView: "register" });
        onRenderEntryGate();
        return;
      }
      if (action === "back") {
        setState({ authEntryView: "welcome" });
        onRenderEntryGate();
        return;
      }
      if (action === "guest") {
        setState({ guestMode: true, authEntryView: "welcome", currentTab: getInitialTab() });
        resetRecommendationsStore();
        onRenderAll();
      }
    });
  });

  const loginForm = el.entryGate.querySelector("#entryLoginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (entryUi.pending) return;
      const email = String((el.entryGate.querySelector("#entryLoginEmail") || {}).value || "").trim();
      const password = String((el.entryGate.querySelector("#entryLoginPassword") || {}).value || "");
      if (!email || !password) {
        entryUi.error = "Preenche email e palavra-passe.";
        onRenderEntryGate();
        return;
      }
      entryUi.pending = true;
      entryUi.error = "";
      entryUi.success = "";
      onRenderEntryGate();
      try {
        const data = await api.authLogin(email, password);
        const user = data && data.user ? data.user : null;
        if (!user) throw new Error("Resposta invalida");
        const profile = data && data.profile ? ctx.mapProfileRow(data.profile) : null;
        const nextProfiles = profile
          ? [profile].concat((Array.isArray(state.profiles) ? state.profiles : []).filter((p) => Number((p && p.id) || 0) !== Number(profile.id || 0)))
          : state.profiles;
        setState({
          authUser: user,
          guestMode: false,
          authEntryView: "welcome",
          currentTab: getInitialTab(),
          notificationsFilter: "all",
          profileContext: String(user && user.account_type || "").toLowerCase() === "common" ? "personal" : "public",
          profiles: nextProfiles,
          selectedProfileId: profile ? profile.id : state.selectedProfileId,
        });
        settingsUi.credentials.email = String(user.email || "");
        settingsUi.view = "main";
        entryUi.pending = false;
        await refreshRecommendationsForCurrentUser({ force: true, silent: true });
        onRenderAll();
      } catch (err) {
        entryUi.pending = false;
        entryUi.error = (err && err.message) || "Falha no login.";
        onRenderEntryGate();
      }
    });
  }

  const registerForm = el.entryGate.querySelector("#entryRegisterForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (entryUi.pending) return;
      const name = String((el.entryGate.querySelector("#entryRegisterName") || {}).value || "").trim();
      const email = String((el.entryGate.querySelector("#entryRegisterEmail") || {}).value || "").trim();
      const password = String((el.entryGate.querySelector("#entryRegisterPassword") || {}).value || "");
      const accountType = String((el.entryGate.querySelector("#entryRegisterType") || {}).value || "professional");
      if (!name || !email || !password) {
        entryUi.error = "Preenche nome, email e palavra-passe.";
        onRenderEntryGate();
        return;
      }
      entryUi.pending = true;
      entryUi.error = "";
      entryUi.success = "";
      onRenderEntryGate();
      try {
        const data = await api.authRegister(name, email, password, accountType);
        const user = data && data.user ? data.user : null;
        if (!user) throw new Error("Resposta invalida");
        const profile = data && data.profile ? ctx.mapProfileRow(data.profile) : null;
        const nextProfiles = profile
          ? [profile].concat((Array.isArray(state.profiles) ? state.profiles : []).filter((p) => Number((p && p.id) || 0) !== Number(profile.id || 0)))
          : state.profiles;
        setState({
          authUser: user,
          guestMode: false,
          authEntryView: "welcome",
          currentTab: getInitialTab(),
          notificationsFilter: "all",
          profileContext: String(user && user.account_type || "").toLowerCase() === "common" ? "personal" : "public",
          profiles: nextProfiles,
          selectedProfileId: profile ? profile.id : state.selectedProfileId,
        });
        settingsUi.credentials.email = String(user.email || "");
        settingsUi.view = "main";
        entryUi.pending = false;
        await refreshRecommendationsForCurrentUser({ force: true, silent: true });
        onRenderAll();
      } catch (err) {
        entryUi.pending = false;
        entryUi.error = (err && err.message) || "Falha no registo.";
        onRenderEntryGate();
      }
    });
  }
}
