export const FILTERS = [
  { id: 'destaques', label: 'Destaques' },
  { id: 'novidades', label: 'Novidades' },
  { id: 'promocoes', label: 'Promoções' },
  { id: 'perto', label: 'Perto de mim' },
];

export const PROFILE_LIMITS = {
  name: 20,
  category: 18,
  location: 24,
};

function clampText(value, max) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.slice(0, Math.max(0, max));
}

export const FALLBACK_PROFILES = [
  {
    id: '1',
    name: 'Ze do Canto',
    category: 'Bar de Petiscos',
    location: 'Setubal',
    rating: '4.6',
    filter: 'destaques',
    badge: 'novo',
    about: 'Restaurante tradicional com petiscos.',
    type: 'food',
    data: {},
  },
  {
    id: '2',
    name: 'Loja One Tech',
    category: 'Eletronicos',
    location: 'Lisboa',
    rating: '4.8',
    filter: 'promocoes',
    badge: 'promo',
    about: 'Acessorios e gadgets com suporte rapido.',
    type: 'shop',
    data: {},
  },
  {
    id: '3',
    name: 'Fit Prime',
    category: 'Suplementos',
    location: 'Porto',
    rating: '4.7',
    filter: 'novidades',
    badge: 'verif',
    about: 'Suplementacao desportiva focada em performance.',
    type: 'service_pro',
    data: {},
  },
];

function filterFromType(type) {
  const value = String(type || '').toLowerCase();
  if (value === 'shop') return 'promocoes';
  if (value === 'lodging') return 'perto';
  if (value === 'creator') return 'novidades';
  return 'destaques';
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return false;
  if (['1', 'true', 'yes', 'y', 'on', 'sim'].includes(raw)) return true;
  if (['0', 'false', 'no', 'n', 'off', 'nao', 'não', 'null', 'undefined'].includes(raw)) return false;
  return false;
}

function normalizeBadge(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (['verif', 'verificado', 'verified'].includes(raw)) return 'verif';
  if (['promo', 'promocao', 'promoção', 'promotion'].includes(raw)) return 'promo';
  if (['novo', 'novidade', 'new'].includes(raw)) return 'novo';
  return '';
}

function resolveProfileBadge(row, data, filter) {
  const explicitBadge = normalizeBadge(
    data?.badge || data?.badge_type || data?.status_badge || row?.badge || row?.badge_type
  );
  if (explicitBadge) return explicitBadge;

  const isVerified =
    toBool(data?.is_verified) ||
    toBool(data?.isVerified) ||
    toBool(data?.verified) ||
    toBool(row?.is_verified) ||
    toBool(row?.isVerified) ||
    toBool(row?.verified);
  if (isVerified) return 'verif';

  const isPromo =
    toBool(data?.is_promo) ||
    toBool(data?.isPromo) ||
    toBool(data?.promo) ||
    toBool(row?.is_promo) ||
    toBool(row?.isPromo) ||
    toBool(row?.promo);
  if (isPromo) return 'promo';

  const isNew =
    toBool(data?.is_new) ||
    toBool(data?.isNew) ||
    toBool(data?.new) ||
    toBool(row?.is_new) ||
    toBool(row?.isNew) ||
    toBool(row?.new);
  if (isNew) return 'novo';

  if (filter === 'promocoes') return 'promo';
  if (filter === 'novidades') return 'novo';
  return '';
}

export function mapProfileRow(row, idx = 0) {
  const data = row && row.data && typeof row.data === 'object' ? row.data : {};
  const filter = String(row?.filter || data?.filter || filterFromType(row?.type))
    .trim()
    .toLowerCase();
  return {
    id: String(row?.slug || row?.id || idx + 1),
    remoteId: row?.id ? Number(row.id) : null,
    slug: String(row?.slug || ''),
    name: clampText(data.name || row?.name || 'Perfil', PROFILE_LIMITS.name),
    category: clampText(data.role || row?.category || 'Perfil', PROFILE_LIMITS.category),
    location: clampText(data.location || 'Portugal', PROFILE_LIMITS.location),
    rating: String(data.rating || (4.5 + (idx % 5) * 0.1).toFixed(1)),
    filter,
    badge: resolveProfileBadge(row, data, filter),
    about: String(data.about || ''),
    type: String(row?.type || 'service_pro'),
    data,
  };
}

export function sanitizeProfilePayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  return {
    ...source,
    name: clampText(source.name, PROFILE_LIMITS.name),
    category: clampText(source.category, PROFILE_LIMITS.category),
    location: clampText(source.location, PROFILE_LIMITS.location),
    about: String(source.about || '').trim(),
  };
}

export function slugifyName(name) {
  const base = String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const clean = base || 'perfil';
  return clean.slice(0, 60);
}
