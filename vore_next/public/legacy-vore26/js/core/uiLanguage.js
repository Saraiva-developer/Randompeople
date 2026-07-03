export function getStoredLanguageUi(getStoredLanguageI18n) {
  return getStoredLanguageI18n();
}

export function getUiLanguageUi(ctx) {
  const { settingsUi, getStoredLanguage, setI18nLanguage } = ctx || {};
  const lang = String(settingsUi.language || getStoredLanguage() || "pt").toLowerCase();
  return setI18nLanguage(lang);
}

export function applyUiLanguageLabelsUi(ctx) {
  const {
    getUiLanguage,
    getUiBundle,
    NAV_LABELS,
    HOME_FILTERS,
    HOME_FILTER_LABELS,
    EXPLORE_DISCOVERY_OPTIONS,
    EXPLORE_SORT_OPTIONS,
  } = ctx || {};
  getUiLanguage();
  const bundle = getUiBundle();
  const nav = bundle.nav || {};
  NAV_LABELS.home = String(nav.home || NAV_LABELS.home || "Home");
  NAV_LABELS.explore = String(nav.explore || NAV_LABELS.explore || "Explorar");
  NAV_LABELS.notifications = String(nav.notifications || NAV_LABELS.notifications || "Notificacoes");
  NAV_LABELS.profile = String(nav.profile || NAV_LABELS.profile || "Perfil");
  NAV_LABELS.edit = String(nav.edit || NAV_LABELS.edit || "Editar Perfil");
  NAV_LABELS.settings = String(nav.settings || NAV_LABELS.settings || "Definicoes");

  const homeFilters = bundle.homeFilters || {};
  HOME_FILTERS.forEach((item) => {
    item.label = String(homeFilters[item.id] || item.label || item.id);
  });
  Object.keys(HOME_FILTER_LABELS).forEach((key) => {
    delete HOME_FILTER_LABELS[key];
  });
  HOME_FILTERS.forEach((item) => {
    HOME_FILTER_LABELS[item.id] = item.label;
  });

  const discovery = bundle.exploreDiscovery || {};
  EXPLORE_DISCOVERY_OPTIONS.forEach((item) => {
    item.label = String(discovery[item.key] || item.label || item.key);
  });

  const sort = bundle.exploreSort || {};
  EXPLORE_SORT_OPTIONS.forEach((item) => {
    item.label = String(sort[item.key] || item.label || item.key);
  });
}
