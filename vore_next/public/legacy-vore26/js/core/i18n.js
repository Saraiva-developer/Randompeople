const UI_I18N = {
  pt: {
    nav: { home: "Home", explore: "Explorar", notifications: "Notificações", profile: "Perfil", edit: "Editar Perfil", settings: "Definições" },
    homeFilters: { destaques: "Destaques", novidades: "Novidades", promocoes: "Promoções", perto: "Perto de mim" },
    exploreDiscovery: { all: "Todos", perto: "Perto de mim", promocoes: "Promoções", novidades: "Novidades", verif: "Verificados" },
    exploreSort: { relevance: "Relevância", recent: "Recentes", rating: "Rating", near: "Perto" },
  },
  en: {
    nav: { home: "Home", explore: "Explore", notifications: "Notifications", profile: "Profile", edit: "Edit Profile", settings: "Settings" },
    homeFilters: { destaques: "Highlights", novidades: "New", promocoes: "Promotions", perto: "Near me" },
    exploreDiscovery: { all: "All", perto: "Near me", promocoes: "Promotions", novidades: "New", verif: "Verified" },
    exploreSort: { relevance: "Relevance", recent: "Recent", rating: "Rating", near: "Near" },
  },
  es: {
    nav: { home: "Inicio", explore: "Explorar", notifications: "Notificaciones", profile: "Perfil", edit: "Editar Perfil", settings: "Configuración" },
    homeFilters: { destaques: "Destacados", novidades: "Novedades", promocoes: "Promociones", perto: "Cerca de mí" },
    exploreDiscovery: { all: "Todos", perto: "Cerca de mí", promocoes: "Promociones", novidades: "Novedades", verif: "Verificados" },
    exploreSort: { relevance: "Relevancia", recent: "Recientes", rating: "Rating", near: "Cerca" },
  },
};

let currentLanguage = "pt";

function normalizeLanguage(value) {
  const lang = String(value || "").toLowerCase();
  if (lang === "en" || lang === "es") return lang;
  return "pt";
}

export function setI18nLanguage(value) {
  currentLanguage = normalizeLanguage(value || currentLanguage);
  return currentLanguage;
}

export function getI18nLanguage() {
  return currentLanguage;
}

export function getStoredLanguage() {
  try {
    const value = String(localStorage.getItem("vore_language") || "").toLowerCase();
    if (value === "pt" || value === "en" || value === "es") return value;
  } catch (_e) {}
  return "";
}

export function getUiBundle() {
  return UI_I18N[currentLanguage] || UI_I18N.pt;
}

function getUiTextBundle() {
  return UI_TEXT[currentLanguage] || UI_TEXT.pt;
}

export function tUi(path, fallback = "", vars = null) {
  const parts = String(path || "").split(".");
  let value = getUiTextBundle();
  for (let i = 0; i < parts.length; i += 1) {
    const key = parts[i];
    if (!key || !value || typeof value !== "object" || !(key in value)) {
      value = "";
      break;
    }
    value = value[key];
  }
  let out = typeof value === "string" ? value : String(fallback || "");
  if (vars && out) {
    Object.keys(vars).forEach((key) => {
      out = out.replaceAll("{" + key + "}", String(vars[key] ?? ""));
    });
  }
  return out;
}
const UI_TEXT = {
  pt: {
    status: {
      chooseAccess: "Seleciona Entrar, Registar ou Convidado.",
      loading: "A carregar...",
      loadedProfiles: "Perfis carregados: {count}",
      errorPrefix: "Erro: ",
      missingLayout: "Erro: elementos base do layout em falta.",
    },
    settings: {
      title: "Definicoes",
      guestMode: "Modo convidado",
      guestAccount: "Conta convidado",
      personalAccount: "Conta pessoal",
      professionalAccount: "Conta profissional",
      account: "Conta",
      personalSection: "Conta pessoal",
      app: "App",
      supportLegal: "Suporte e legal",
      notifications: "Notificacoes",
      signInToAccess: "Entra para aceder a todas as definicoes.",
      businessNameHint: "Nome do negocio/perfil",
      credentials: "Credenciais de acesso",
      editProfile: "Editar perfil",
      openFullEdit: "Abrir edicao completa",
      profileActive: "Perfil ativo",
      notifNewVisits: "Novas visitas ao perfil",
      notifShares: "Novas partilhas do perfil",
      notifPromos: "Alertas de promocoes",
      openPersonalProfile: "Abrir perfil pessoal",
      goToProfile: "Ir para o perfil",
      language: "Idioma",
      theme: "Tema",
      themeLight: "Claro",
      themeDark: "Escuro",
      clearCache: "Limpar cache local",
      reloadApp: "Recarregar aplicacao",
      help: "Ajuda",
      contact: "Contacto",
      termsPrivacy: "Termos e privacidade",
      logout: "Terminar sessao",
      credentialsTitle: "Credenciais",
      credentialsHint: "Alterar email e palavra-passe",
      languageTitle: "Idioma",
      languageHint: "Seleciona o idioma da app",
      email: "Email",
      currentPassword: "Palavra-passe atual",
      newPassword: "Nova palavra-passe",
      repeatPassword: "Repetir nova palavra-passe",
      save: "Guardar",
      supportPreparing: "Seccao de suporte/termos em preparacao.",
      cacheCleared: "Cache limpo. A recarregar...",
      languageSaved: "Idioma guardado.",
      passwordMismatch: "Nova palavra-passe e repeticao nao coincidem.",
      credentialsSaved: "Credenciais guardadas localmente. Endpoint de alteracao ainda nao disponivel.",
      langPt: "Portugues",
      langEn: "English",
      langEs: "Espanol",
    },
  },
  en: {
    status: {
      chooseAccess: "Select Sign in, Register or Guest.",
      loading: "Loading...",
      loadedProfiles: "Profiles loaded: {count}",
      errorPrefix: "Error: ",
      missingLayout: "Error: missing base layout elements.",
    },
    settings: {
      title: "Settings",
      guestMode: "Guest mode",
      guestAccount: "Guest account",
      personalAccount: "Personal account",
      professionalAccount: "Professional account",
      account: "Account",
      personalSection: "Personal account",
      app: "App",
      supportLegal: "Support and legal",
      notifications: "Notifications",
      signInToAccess: "Sign in to access all settings.",
      businessNameHint: "Business/profile name",
      credentials: "Access credentials",
      editProfile: "Edit profile",
      openFullEdit: "Open full editor",
      profileActive: "Active profile",
      notifNewVisits: "New profile visits",
      notifShares: "New profile shares",
      notifPromos: "Promotion alerts",
      openPersonalProfile: "Open personal profile",
      goToProfile: "Go to profile",
      language: "Language",
      theme: "Theme",
      themeLight: "Light",
      themeDark: "Dark",
      clearCache: "Clear local cache",
      reloadApp: "Reload application",
      help: "Help",
      contact: "Contact",
      termsPrivacy: "Terms and privacy",
      logout: "Log out",
      credentialsTitle: "Credentials",
      credentialsHint: "Change email and password",
      languageTitle: "Language",
      languageHint: "Select app language",
      email: "Email",
      currentPassword: "Current password",
      newPassword: "New password",
      repeatPassword: "Repeat new password",
      save: "Save",
      supportPreparing: "Support/terms section is in preparation.",
      cacheCleared: "Cache cleared. Reloading...",
      languageSaved: "Language saved.",
      passwordMismatch: "New password and confirmation do not match.",
      credentialsSaved: "Credentials saved locally. Update endpoint not available yet.",
      langPt: "Portuguese",
      langEn: "English",
      langEs: "Spanish",
    },
  },
  es: {
    status: {
      chooseAccess: "Selecciona Iniciar sesion, Registro o Invitado.",
      loading: "Cargando...",
      loadedProfiles: "Perfiles cargados: {count}",
      errorPrefix: "Error: ",
      missingLayout: "Error: faltan elementos base del layout.",
    },
    settings: {
      title: "Configuracion",
      guestMode: "Modo invitado",
      guestAccount: "Cuenta invitado",
      personalAccount: "Cuenta personal",
      professionalAccount: "Cuenta profesional",
      account: "Cuenta",
      personalSection: "Cuenta personal",
      app: "App",
      supportLegal: "Soporte y legal",
      notifications: "Notificaciones",
      signInToAccess: "Inicia sesion para acceder a todos los ajustes.",
      businessNameHint: "Nombre del negocio/perfil",
      credentials: "Credenciales de acceso",
      editProfile: "Editar perfil",
      openFullEdit: "Abrir editor completo",
      profileActive: "Perfil activo",
      notifNewVisits: "Nuevas visitas al perfil",
      notifShares: "Nuevas comparticiones del perfil",
      notifPromos: "Alertas de promociones",
      openPersonalProfile: "Abrir perfil personal",
      goToProfile: "Ir al perfil",
      language: "Idioma",
      theme: "Tema",
      themeLight: "Claro",
      themeDark: "Oscuro",
      clearCache: "Limpiar cache local",
      reloadApp: "Recargar aplicacion",
      help: "Ayuda",
      contact: "Contacto",
      termsPrivacy: "Terminos y privacidad",
      logout: "Cerrar sesion",
      credentialsTitle: "Credenciales",
      credentialsHint: "Cambiar correo y contraseña",
      languageTitle: "Idioma",
      languageHint: "Selecciona el idioma de la app",
      email: "Email",
      currentPassword: "Contraseña actual",
      newPassword: "Nueva contraseña",
      repeatPassword: "Repetir nueva contraseña",
      save: "Guardar",
      supportPreparing: "Seccion de soporte/terminos en preparacion.",
      cacheCleared: "Cache limpiado. Recargando...",
      languageSaved: "Idioma guardado.",
      passwordMismatch: "La nueva contraseña y la repeticion no coinciden.",
      credentialsSaved: "Credenciales guardadas localmente. Endpoint de cambio aun no disponible.",
      langPt: "Portugues",
      langEn: "English",
      langEs: "Espanol",
    },
  },
};
