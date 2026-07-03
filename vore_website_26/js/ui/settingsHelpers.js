export function settingsRowHtml(esc, label, hint = "", dataAction = "") {
  return (
    "<button type=\"button\" class=\"settings-row\" " + (dataAction ? ("data-settings-action=\"" + esc(dataAction) + "\"") : "") + ">" +
      "<span class=\"settings-row-main\">" +
        "<span class=\"settings-row-label\">" + esc(label) + "</span>" +
        (hint ? "<span class=\"settings-row-hint\">" + esc(hint) + "</span>" : "") +
      "</span>" +
      "<span class=\"settings-row-arrow\">&#8250;</span>" +
    "</button>"
  );
}

export function settingsToggleHtml(esc, label, key, value) {
  return (
    "<button type=\"button\" class=\"settings-row\" data-settings-toggle=\"" + esc(key) + "\">" +
      "<span class=\"settings-row-main\"><span class=\"settings-row-label\">" + esc(label) + "</span></span>" +
      "<span class=\"settings-toggle" + (value ? " on" : "") + "\"><span class=\"settings-toggle-dot\"></span></span>" +
    "</button>"
  );
}

export function localizeSettingsHtml(html, tUi, esc) {
  let out = String(html || "");
  const replacements = [
    ["Definicoes", tUi("settings.title", "Definicoes")],
    ["Definições", tUi("settings.title", "Definicoes")],
    ["Modo convidado", tUi("settings.guestMode", "Modo convidado")],
    ["Conta convidado", tUi("settings.guestAccount", "Conta convidado")],
    ["Conta pessoal", tUi("settings.personalAccount", "Conta pessoal")],
    ["Conta profissional", tUi("settings.professionalAccount", "Conta profissional")],
    ["<h4>Conta</h4>", "<h4>" + esc(tUi("settings.account", "Conta")) + "</h4>"],
    ["<h4>App</h4>", "<h4>" + esc(tUi("settings.app", "App")) + "</h4>"],
    ["Suporte e legal", tUi("settings.supportLegal", "Suporte e legal")],
    ["Notificações", tUi("settings.notifications", "Notificacoes")],
    ["Credenciais de acesso", tUi("settings.credentials", "Credenciais de acesso")],
    ["Editar perfil", tUi("settings.editProfile", "Editar perfil")],
    ["Abrir edicao completa", tUi("settings.openFullEdit", "Abrir edicao completa")],
    ["Perfil ativo", tUi("settings.profileActive", "Perfil ativo")],
    ["Novas visitas ao perfil", tUi("settings.notifNewVisits", "Novas visitas ao perfil")],
    ["Novas partilhas do perfil", tUi("settings.notifShares", "Novas partilhas do perfil")],
    ["Alertas de promoções", tUi("settings.notifPromos", "Alertas de promocoes")],
    ["Abrir perfil pessoal", tUi("settings.openPersonalProfile", "Abrir perfil pessoal")],
    ["Ir para o perfil", tUi("settings.goToProfile", "Ir para o perfil")],
    ["Idioma", tUi("settings.language", "Idioma")],
    ["Tema", tUi("settings.theme", "Tema")],
    ["Escuro", tUi("settings.themeDark", "Escuro")],
    ["Claro", tUi("settings.themeLight", "Claro")],
    ["Limpar cache local", tUi("settings.clearCache", "Limpar cache local")],
    ["Recarregar aplicacao", tUi("settings.reloadApp", "Recarregar aplicacao")],
    ["Ajuda", tUi("settings.help", "Ajuda")],
    ["Contacto", tUi("settings.contact", "Contacto")],
    ["Termos e privacidade", tUi("settings.termsPrivacy", "Termos e privacidade")],
    ["Terminar sessao", tUi("settings.logout", "Terminar sessao")],
    ["Credenciais", tUi("settings.credentialsTitle", "Credenciais")],
    ["Alterar email e palavra-passe", tUi("settings.credentialsHint", "Alterar email e palavra-passe")],
    ["Seleciona o idioma da app", tUi("settings.languageHint", "Seleciona o idioma da app")],
    ["Palavra-passe atual", tUi("settings.currentPassword", "Palavra-passe atual")],
    ["Nova palavra-passe", tUi("settings.newPassword", "Nova palavra-passe")],
    ["Repetir nova palavra-passe", tUi("settings.repeatPassword", "Repetir nova palavra-passe")],
    ["Guardar", tUi("settings.save", "Guardar")],
    ["Portugues", tUi("settings.langPt", "Portugues")],
    ["English", tUi("settings.langEn", "English")],
    ["Espanol", tUi("settings.langEs", "Espanol")],
    ["Nome do negocio/perfil", tUi("settings.businessNameHint", "Nome do negocio/perfil")],
    ["Entra para aceder a todas as definicoes.", tUi("settings.signInToAccess", "Entra para aceder a todas as definicoes.")],
  ];
  replacements.forEach((pair) => {
    const from = String(pair[0] || "");
    const to = String(pair[1] || "");
    if (!from || !to || from === to) return;
    out = out.split(from).join(to);
  });
  return out;
}
