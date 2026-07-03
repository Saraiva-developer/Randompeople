
export const state = {
  authUser: null,
  guestMode: false,
  authEntryView: 'loading',
  authLoading: true,
  profiles: [],
  selectedProfileId: null,
  homeFilter: 'destaques',
  profileReturnTab: 'home',
  exploreSearch: '',
  exploreAdvancedOpen: false,
  exploreDiscoveryFilter: 'all',
  exploreCategoryFilters: [],
  exploreCategorySearch: '',
  exploreSortBy: 'relevance',
  notificationsFilter: 'all',
  currentTab: 'home',
  profileContext: 'public',
  profileTab: 'sobre',
  profileSubTab: '',
  profileProductsView: 'list',
  profileMenuView: 'list',
  profileLodgingItemIndex: { casas: 0, quartos: 0 },
  profileLodgingMediaIndex: { casas: 0, quartos: 0 },
  profileLodgingAmenitiesExpanded: { casas: false, quartos: false },
  commonProfileTab: 'guardados',
  commonSavedSubTab: 'perfis',
  commonSavedSearch: '',
  commonSavedMediaFilter: 'all',
  commonSavedItemFilter: 'all',
  commonShareSubTab: 'recebidos',
  commonShareThreadKey: '',
  commonShareSearch: '',
  editTab: 'sobre',
};

export const TAB_BLUEPRINTS = {
  service_pro: [
    { id: 'sobre', type: 'sobre', label: 'Sobre', enabled: true },
    { id: 'servicos', type: 'servicos', label: 'Servicos', enabled: true },
    { id: 'galeria', type: 'galeria', label: 'Galeria', enabled: true },
    { id: 'horario', type: 'horario', label: 'Horario', enabled: true },
    { id: 'agenda', type: 'agenda', label: 'Agenda', enabled: true },
    { id: 'parcerias', type: 'parcerias', label: 'Parcerias', enabled: true },
    { id: 'locais', type: 'locais', label: 'Localizacao', enabled: true },
  ],
  shop: [
    { id: 'sobre', type: 'sobre', label: 'Sobre', enabled: true },
    { id: 'produtos', type: 'produtos', label: 'Produtos', enabled: true },
    { id: 'campanhas', type: 'campanhas', label: 'Campanhas', enabled: true },
    { id: 'galeria', type: 'galeria', label: 'Galeria', enabled: true },
    { id: 'horario', type: 'horario', label: 'Horario', enabled: true },
    { id: 'locais', type: 'locais', label: 'Localizacao', enabled: true },
    { id: 'parcerias', type: 'parcerias', label: 'Parcerias', enabled: true },
  ],
  food: [
    { id: 'sobre', type: 'sobre', label: 'Sobre', enabled: true },
    { id: 'menu', type: 'menu', label: 'Menu', enabled: true },
    { id: 'galeria', type: 'galeria', label: 'Galeria', enabled: true },
    { id: 'horario', type: 'horario', label: 'Horario', enabled: true },
    { id: 'locais', type: 'locais', label: 'Localizacao', enabled: true },
    { id: 'agenda', type: 'agenda', label: 'Agenda', enabled: true },
  ],
  lodging: [
    { id: 'sobre', type: 'sobre', label: 'Sobre', enabled: true },
    { id: 'casas', type: 'casas', label: 'Casas', enabled: true },
    { id: 'quartos', type: 'quartos', label: 'Quartos', enabled: true },
    { id: 'galeria', type: 'galeria', label: 'Galeria', enabled: true },
    { id: 'agenda', type: 'agenda', label: 'Agenda', enabled: true },
    { id: 'horario', type: 'horario', label: 'Horario', enabled: true },
    { id: 'locais', type: 'locais', label: 'Localizacao', enabled: true },
  ],
  creator: [
    { id: 'sobre', type: 'sobre', label: 'Sobre', enabled: true },
    { id: 'portfolio', type: 'portfolio', label: 'Portfolio', enabled: true },
    { id: 'servicos', type: 'servicos', label: 'Servicos', enabled: true },
    { id: 'galeria', type: 'galeria', label: 'Galeria', enabled: true },
    { id: 'agenda', type: 'agenda', label: 'Agenda', enabled: true },
    { id: 'locais', type: 'locais', label: 'Localizacao', enabled: true },
    { id: 'parcerias', type: 'parcerias', label: 'Parcerias', enabled: true },
  ],
};

export function setState(patch) {
  Object.assign(state, patch || {});
}

function toBool(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'yes', 'on', 'sim'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off', 'nao'].includes(raw)) return false;
  return fallback;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'geral';
}

function filterFromType(type) {
  const value = String(type || '').toLowerCase();
  if (value === 'shop') return 'promocoes';
  if (value === 'lodging') return 'perto';
  if (value === 'creator') return 'novidades';
  return 'destaques';
}

function normalizeBadge(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (['verif', 'verificado', 'verified'].includes(raw)) return 'verif';
  if (['promo', 'promocao', 'promotion'].includes(raw)) return 'promo';
  if (['novo', 'novidade', 'new'].includes(raw)) return 'novo';
  return '';
}

function toBoolFlag(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return false;
  if (['1', 'true', 'yes', 'y', 'on', 'sim'].includes(raw)) return true;
  if (['0', 'false', 'no', 'n', 'off', 'nao'].includes(raw)) return false;
  return false;
}

function resolveProfileBadge(row, data, filter) {
  const explicitBadge = normalizeBadge(
    data?.badge || data?.badge_type || data?.status_badge || row?.badge || row?.badge_type
  );
  if (explicitBadge) return explicitBadge;

  const isVerified =
    toBoolFlag(data?.is_verified) ||
    toBoolFlag(data?.isVerified) ||
    toBoolFlag(data?.verified) ||
    toBoolFlag(row?.is_verified) ||
    toBoolFlag(row?.isVerified) ||
    toBoolFlag(row?.verified);
  if (isVerified) return 'verif';

  const isPromo =
    toBoolFlag(data?.is_promo) ||
    toBoolFlag(data?.isPromo) ||
    toBoolFlag(data?.promo) ||
    toBoolFlag(row?.is_promo) ||
    toBoolFlag(row?.isPromo) ||
    toBoolFlag(row?.promo);
  if (isPromo) return 'promo';

  const isNew =
    toBoolFlag(data?.is_new) ||
    toBoolFlag(data?.isNew) ||
    toBoolFlag(data?.new) ||
    toBoolFlag(row?.is_new) ||
    toBoolFlag(row?.isNew) ||
    toBoolFlag(row?.new);
  if (isNew) return 'novo';

  if (filter === 'promocoes') return 'promo';
  if (filter === 'novidades') return 'novo';
  return '';
}
function normalizeTab(tab, idx = 0) {
  const rawType = String((tab && (tab.type || tab.id)) || ('tab_' + (idx + 1)));
  const type = rawType.trim().toLowerCase();
  const id = slugify((tab && tab.id) || type || ('tab_' + (idx + 1)));
  return {
    id,
    type,
    label: String((tab && (tab.label || tab.name)) || type || ('Aba ' + (idx + 1))).trim() || ('Aba ' + (idx + 1)),
    enabled: toBool(tab && tab.enabled, true),
  };
}

export function getTabsForProfile(profile) {
  const data = (profile && profile.data) || {};
  const custom = Array.isArray(data.tabs) ? data.tabs.map((tab, idx) => normalizeTab(tab, idx)) : [];
  const activeCustom = custom.filter((tab) => tab.enabled !== false);
  if (activeCustom.length) return activeCustom;
  const type = String((profile && profile.type) || data.type || 'service_pro').toLowerCase();
  const fallback = TAB_BLUEPRINTS[type] || TAB_BLUEPRINTS.service_pro;
  return fallback.map((tab, idx) => normalizeTab(tab, idx));
}

export function mapProfileRow(row) {
  const data = (row && row.data) || {};
  const filter = String((row && row.filter) || data.filter || filterFromType((row && row.type) || data.type || 'service_pro'))
    .trim()
    .toLowerCase();
  return {
    id: Number((row && row.id) || 0),
    remoteId: Number((row && row.id) || 0),
    userId: Number((row && row.user_id) || 0),
    slug: String((row && row.slug) || ''),
    name: (row && row.name) || data.name || 'Perfil',
    type: (row && row.type) || data.type || 'service_pro',
    category: data.category || data.role || 'Perfil',
    location: data.location || '',
    about: data.about || '',
    rating: String(data.rating || ''),
    filter,
    badge: resolveProfileBadge(row, data, filter),
    avatar: data.avatar || '',
    data,
  };
}

function mapFlatToSections(items) {
  const grouped = {};
  (Array.isArray(items) ? items : []).forEach((it) => {
    const label = String((it && (it.category || it.label)) || 'Geral').trim() || 'Geral';
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(it);
  });
  return Object.keys(grouped).map((label) => ({ id: slugify(label), label, enabled: true, items: grouped[label] }));
}

function normalizeSections(source) {
  const arr = Array.isArray(source) ? source : [];
  if (!arr.length) return [];
  const hasNested = arr.some((it) => Array.isArray(it && it.items));
  if (!hasNested) return mapFlatToSections(arr);
  return arr
    .map((section, idx) => {
      const label = String((section && (section.label || section.name || section.category)) || ('Categoria ' + (idx + 1))).trim() || ('Categoria ' + (idx + 1));
      return {
        id: slugify((section && section.id) || label || ('categoria-' + (idx + 1))),
        label,
        enabled: toBool(section && section.enabled, true),
        items: Array.isArray(section && section.items) ? section.items : [],
      };
    })
    .filter((section) => section.enabled !== false);
}

function isOnFlag(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'number') return value !== 0;
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return false;
  return ['true', '1', 'yes', 'on', 'sim', 'y'].includes(raw);
}

export function profileSections(profile, mainTab) {
  const d = (profile && profile.data) || {};
  let source = [];
  if (mainTab === 'servicos') source = d.servicesSections || d.services;
  else if (mainTab === 'produtos') source = d.productsSections || d.products;
  else if (mainTab === 'menu') source = d.menuSections || d.menu;
  else if (mainTab === 'portfolio') source = d.portfolioSections || d.portfolio;
  else if (mainTab === 'casas') source = d.housesSections || d.houses;
  else if (mainTab === 'quartos') source = d.roomsSections || d.rooms;
  else if (mainTab === 'campanhas') source = d.campaignSections || d.campaigns;
  else if (mainTab === 'galeria') {
    const gallery = d.gallery && typeof d.gallery === 'object' ? d.gallery : {};
    const photos = Array.isArray(gallery.photos) ? gallery.photos : (Array.isArray(d.photos) ? d.photos : []);
    const videos = Array.isArray(gallery.videos) ? gallery.videos : (Array.isArray(d.videos) ? d.videos : []);
    const reels = Array.isArray(gallery.reels) ? gallery.reels : (Array.isArray(d.reels) ? d.reels : []);
    source = [
      { id: 'photos', label: 'Fotos', enabled: true, items: photos.map((url, idx) => ({ name: 'Foto ' + (idx + 1), mediaUrl: url, mediaType: 'image' })) },
      { id: 'videos', label: 'Videos', enabled: true, items: videos.map((url, idx) => ({ name: 'Video ' + (idx + 1), mediaUrl: url, mediaType: 'video' })) },
      { id: 'reels', label: 'Reels', enabled: true, items: reels.map((url, idx) => ({ name: 'Reel ' + (idx + 1), mediaUrl: url, mediaType: 'video' })) },
    ];
  } else if (mainTab === 'horario') {
    const schedule = d.schedule && typeof d.schedule === 'object' ? d.schedule : {};
    const weekdays = [
      ['seg', 'Segunda'],
      ['ter', 'Terca'],
      ['qua', 'Quarta'],
      ['qui', 'Quinta'],
      ['sex', 'Sexta'],
      ['sab', 'Sabado'],
      ['dom', 'Domingo'],
    ];
    source = [
      {
        id: 'horario',
        label: 'Horario',
        enabled: true,
        items: weekdays
          .map(([key, label]) => ({ name: label, day: key, time: String(schedule[key] || '').trim() }))
          .filter((row) => row.time),
      },
    ];
  } else if (mainTab === 'agenda') {
    const agenda = d.agenda && typeof d.agenda === 'object' ? d.agenda : {};
    const slots = Array.isArray(agenda.slots) ? agenda.slots : [];
    source = [
      {
        id: 'agenda',
        label: 'Agenda',
        enabled: true,
        items: slots.map((slot, idx) => ({
          name: String(slot && (slot.weekday || slot.displayDay || slot.day)) || ('Slot ' + (idx + 1)),
          day: String(slot && (slot.day || slot.date || slot.rawDay) || ''),
          weekday: String(slot && (slot.weekday || slot.displayDay) || ''),
          times: Array.isArray(slot && slot.times) ? slot.times : [],
          description: String(agenda.description || ''),
          reserveLink: String(agenda.reserveLink || ''),
        })),
      },
    ];
  } else if (mainTab === 'parcerias') {
    source = Array.isArray(d.partners) ? [{ id: 'parcerias', label: 'Parcerias', enabled: true, items: d.partners }] : [];
  } else if (mainTab === 'locais') {
    source = Array.isArray(d.locations) ? [{ id: 'locais', label: 'Locais', enabled: true, items: d.locations }] : [];
  }
  let sections = normalizeSections(source);
  if (mainTab === 'servicos' || mainTab === 'produtos' || mainTab === 'menu') {
    const promoItems = sections
      .flatMap((section) => (Array.isArray(section?.items) ? section.items : []))
      .filter((item) => isOnFlag(item?.promoEnabled) && (String(item?.promoNowPrice || item?.price || '').trim() || String(item?.promoOldPrice || '').trim()));
    if (promoItems.length && !sections.some((section) => String(section?.id || '').toLowerCase() === 'promocoes')) {
      sections = [{ id: 'promocoes', label: 'Promocoes', enabled: true, items: promoItems }, ...sections];
    }
  }
  if (sections.length) return sections;
  if (Array.isArray(source) && source.length) return [{ id: 'geral', label: 'Geral', enabled: true, items: source }];
  return [];
}


