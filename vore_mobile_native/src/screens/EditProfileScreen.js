import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Linking, Modal, PanResponder, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { WebView } from 'react-native-webview';
import { styles } from '../styles/appStyles';
import { PROFILE_LIMITS, sanitizeProfilePayload } from '../data/profileModel';
import { getApiBase } from '../api/client';
import { t } from '../i18n';

const PROFILE_TYPES = [
  { id: 'service_pro', label: 'Serviço' },
  { id: 'shop', label: 'Loja / Produto' },
  { id: 'food', label: 'Restaurante / Bar' },
  { id: 'lodging', label: 'Alojamento' },
  { id: 'creator', label: 'Criador / Portfólio' },
];

const PROFILE_CATEGORY_OPTIONS = {
  service_pro: ['Estética', 'Bem-estar', 'Saúde', 'Treino', 'Consultoria', 'Eventos', 'Automóvel', 'Casa'],
  shop: ['Eletrónica', 'Moda', 'Beleza', 'Suplementos', 'Casa e Decoração', 'Tecnologia', 'Desporto', 'Pet'],
  food: ['Restaurante', 'Bar', 'Café', 'Pastelaria', 'Brunch', 'Petiscos', 'Take-away', 'Pizzaria'],
  lodging: ['Alojamento', 'Hotel', 'Hostel', 'Casa de Férias', 'Quarto', 'Rural', 'Glamping', 'Resort'],
  creator: ['Fotografia', 'Vídeo', 'Design', 'Música', 'Arte', 'Moda', 'Conteúdo', 'Marketing'],
};

const TAB_BLUEPRINTS = {
  service_pro: [
    { id: 'sobre', label: 'Sobre', type: 'sobre' },
    { id: 'servicos', label: 'Serviços', type: 'servicos' },
    { id: 'galeria', label: 'Galeria', type: 'galeria' },
    { id: 'horario', label: 'Horário', type: 'horario' },
    { id: 'agenda', label: 'Agenda', type: 'agenda' },
    { id: 'parcerias', label: 'Parcerias', type: 'parcerias' },
    { id: 'locais', label: 'Localização', type: 'locais' },
  ],
  shop: [
    { id: 'sobre', label: 'Sobre', type: 'sobre' },
    { id: 'produtos', label: 'Produtos', type: 'produtos' },
    { id: 'campanhas', label: 'Campanhas', type: 'campanhas' },
    { id: 'galeria', label: 'Galeria', type: 'galeria' },
    { id: 'horario', label: 'Horário', type: 'horario' },
    { id: 'locais', label: 'Localização', type: 'locais' },
    { id: 'parcerias', label: 'Parcerias', type: 'parcerias' },
  ],
  food: [
    { id: 'sobre', label: 'Sobre', type: 'sobre' },
    { id: 'menu', label: 'Menu', type: 'menu' },
    { id: 'galeria', label: 'Galeria', type: 'galeria' },
    { id: 'horario', label: 'Horário', type: 'horario' },
    { id: 'locais', label: 'Localização', type: 'locais' },
    { id: 'agenda', label: 'Agenda', type: 'agenda' },
  ],
  lodging: [
    { id: 'sobre', label: 'Sobre', type: 'sobre' },
    { id: 'casas', label: 'Casas', type: 'casas' },
    { id: 'quartos', label: 'Quartos', type: 'quartos' },
    { id: 'galeria', label: 'Galeria', type: 'galeria' },
    { id: 'agenda', label: 'Agenda', type: 'agenda' },
    { id: 'horario', label: 'Horário', type: 'horario' },
    { id: 'locais', label: 'Localização', type: 'locais' },
  ],
  creator: [
    { id: 'sobre', label: 'Sobre', type: 'sobre' },
    { id: 'portfolio', label: 'Portfolio', type: 'portfolio' },
    { id: 'servicos', label: 'Serviços', type: 'servicos' },
    { id: 'galeria', label: 'Galeria', type: 'galeria' },
    { id: 'agenda', label: 'Agenda', type: 'agenda' },
    { id: 'locais', label: 'Localização', type: 'locais' },
    { id: 'parcerias', label: 'Parcerias', type: 'parcerias' },
  ],
};

const TAB_TEMPLATES = [
  { type: 'sobre', label: 'Sobre' },
  { type: 'servicos', label: 'Serviços' },
  { type: 'menu', label: 'Menu' },
  { type: 'produtos', label: 'Produtos' },
  { type: 'campanhas', label: 'Campanhas' },
  { type: 'galeria', label: 'Galeria' },
  { type: 'agenda', label: 'Agenda' },
  { type: 'horario', label: 'Horário' },
  { type: 'locais', label: 'Localização' },
  { type: 'parcerias', label: 'Parcerias' },
  { type: 'portfolio', label: 'Portfolio' },
  { type: 'casas', label: 'Casas' },
  { type: 'quartos', label: 'Quartos' },
];

const TAB_LABEL_NORMALIZATION = {
  sobre: 'Sobre',
  servico: 'Serviços',
  servicos: 'Serviços',
  galeria: 'Galeria',
  horario: 'Horário',
  agenda: 'Agenda',
  parcerias: 'Parcerias',
  localizacao: 'Localização',
  locais: 'Localização',
  menu: 'Menu',
  produtos: 'Produtos',
  campanha: 'Campanhas',
  campanhas: 'Campanhas',
  portfolio: 'Portfolio',
  portofolio: 'Portfolio',
  casas: 'Casas',
  quartos: 'Quartos',
  fotos: 'Fotos',
  videos: 'Vídeos',
  reels: 'Reels',
};

function stripDiacritics(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeTabLabel(label, type) {
  const byType = TAB_LABEL_NORMALIZATION[String(type || '').toLowerCase()];
  const raw = String(label || '').trim();
  const normalizedKey = stripDiacritics(raw).toLowerCase().replace(/\s+/g, '');
  if (normalizedKey && TAB_LABEL_NORMALIZATION[normalizedKey]) {
    return TAB_LABEL_NORMALIZATION[normalizedKey];
  }
  if (!raw && byType) return byType;
  if (byType && stripDiacritics(raw).toLowerCase() === stripDiacritics(byType).toLowerCase()) {
    return byType;
  }
  return raw || byType || 'Aba';
}

const LINK_TYPES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X / Twitter' },
  { value: 'threads', label: 'Threads' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'discord', label: 'Discord' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'github', label: 'GitHub' },
  { value: 'gitlab', label: 'GitLab' },
  { value: 'behance', label: 'Behance' },
  { value: 'dribbble', label: 'Dribbble' },
  { value: 'medium', label: 'Medium' },
  { value: 'substack', label: 'Substack' },
  { value: 'patreon', label: 'Patreon' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'apple_music', label: 'Apple Music' },
  { value: 'deezer', label: 'Deezer' },
  { value: 'linktree', label: 'Linktree' },
  { value: 'calendly', label: 'Calendly' },
  { value: 'maps', label: 'Google Maps' },
  { value: 'drive', label: 'Google Drive' },
  { value: 'dropbox', label: 'Dropbox' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'outro', label: 'Outro' },
];

const DEFAULT_AMENITIES = [
  'Wi-Fi',
  'Ar condicionado',
  'Piscina',
  'Estacionamento',
  'Pequeno-almoco',
  'Cozinha equipada',
];

const DEFAULT_HOUSE_RULES = [
  'Sem festas',
  'Sem fumar',
  'Animais permitidos',
  'Sem animais',
  'Check-in autonomo',
];

const DEFAULT_GALLERY_MODAL_FIT = {
  photos: 'contain',
  videos: 'contain',
  reels: 'contain',
};

const SERVICE_TYPE_OPTIONS = [
  { id: 'general', label: 'Geral', extra1: 'Detalhe 1', extra2: 'Detalhe 2' },
  { id: 'beauty', label: 'Beleza', extra1: 'Área', extra2: 'Material' },
  { id: 'wellness', label: 'Bem-estar', extra1: 'Tipo de sessão', extra2: 'Objetivo' },
  { id: 'fitness', label: 'Treino', extra1: 'Nível', extra2: 'Objetivo' },
  { id: 'consulting', label: 'Consultoria', extra1: 'Especialidade', extra2: 'Formato' },
];

function resolveServiceTypeMeta(type) {
  const key = String(type || '').trim().toLowerCase();
  return SERVICE_TYPE_OPTIONS.find((item) => item.id === key) || SERVICE_TYPE_OPTIONS[0];
}

function normalizeGalleryModalFitValue(rawValue) {
  const raw = String(rawValue || '').trim().toLowerCase();
  if (!raw) return 'contain';
  if (['cover', 'crop', 'cortar'].includes(raw)) return 'cover';
  if (['contain', 'fit', 'ajustar', 'completo'].includes(raw)) return 'contain';
  return 'contain';
}

function normalizeGalleryModalFit(rawValue) {
  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    return {
      photos: normalizeGalleryModalFitValue(rawValue.photos),
      videos: normalizeGalleryModalFitValue(rawValue.videos),
      reels: normalizeGalleryModalFitValue(rawValue.reels),
    };
  }
  const fit = normalizeGalleryModalFitValue(rawValue);
  return {
    photos: fit,
    videos: fit,
    reels: fit,
  };
}

function normalizeGalleryItemFitMap(rawValue) {
  const empty = { photos: {}, videos: {}, reels: {} };
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) return empty;

  const out = { ...empty };
  ['photos', 'videos', 'reels'].forEach((tab) => {
    const source = rawValue[tab];
    if (!source || typeof source !== 'object' || Array.isArray(source)) return;
    Object.keys(source).forEach((rawKey) => {
      const uri = String(rawKey || '').trim();
      if (!uri) return;
      out[tab][uri] = normalizeGalleryModalFitValue(source[rawKey]);
    });
  });
  return out;
}

function filterGalleryItemFitMap(rawValue, mediaByTab) {
  const normalized = normalizeGalleryItemFitMap(rawValue);
  const out = { photos: {}, videos: {}, reels: {} };

  ['photos', 'videos', 'reels'].forEach((tab) => {
    const items = Array.isArray(mediaByTab?.[tab]) ? mediaByTab[tab] : [];
    const allowed = new Set(items.map((item) => String(item || '').trim()).filter(Boolean));
    Object.keys(normalized[tab] || {}).forEach((key) => {
      const uri = String(key || '').trim();
      if (!uri || !allowed.has(uri)) return;
      out[tab][uri] = normalizeGalleryModalFitValue(normalized[tab][uri]);
    });
  });

  return out;
}

function normalizeGalleryCropNumber(rawValue, fallback = 0) {
  const num = Number(rawValue);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

function normalizeGalleryItemCropMap(rawValue) {
  const empty = { photos: {}, videos: {}, reels: {} };
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) return empty;

  const out = { ...empty };
  ['photos', 'videos', 'reels'].forEach((tab) => {
    const source = rawValue[tab];
    if (!source || typeof source !== 'object' || Array.isArray(source)) return;
    Object.keys(source).forEach((rawKey) => {
      const uri = String(rawKey || '').trim();
      if (!uri) return;
      const crop = source[rawKey];
      out[tab][uri] = {
        x: normalizeGalleryCropNumber(crop?.x, 0),
        y: normalizeGalleryCropNumber(crop?.y, 0),
        scale: Math.max(1, Math.min(3, normalizeGalleryCropNumber(crop?.scale, 1.12))),
      };
    });
  });

  return out;
}

function filterGalleryItemCropMap(rawValue, mediaByTab) {
  const normalized = normalizeGalleryItemCropMap(rawValue);
  const out = { photos: {}, videos: {}, reels: {} };

  ['photos', 'videos', 'reels'].forEach((tab) => {
    const items = Array.isArray(mediaByTab?.[tab]) ? mediaByTab[tab] : [];
    const allowed = new Set(items.map((item) => String(item || '').trim()).filter(Boolean));
    Object.keys(normalized[tab] || {}).forEach((key) => {
      const uri = String(key || '').trim();
      if (!uri || !allowed.has(uri)) return;
      out[tab][uri] = {
        x: normalizeGalleryCropNumber(normalized[tab][uri]?.x, 0),
        y: normalizeGalleryCropNumber(normalized[tab][uri]?.y, 0),
        scale: Math.max(1, Math.min(3, normalizeGalleryCropNumber(normalized[tab][uri]?.scale, 1.12))),
      };
    });
  });

  return out;
}

function normalizeContentImageFitMap(rawValue) {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) return {};
  const out = {};
  Object.keys(rawValue).forEach((rawKey) => {
    const uri = String(rawKey || '').trim();
    if (!uri) return;
    out[uri] = normalizeGalleryModalFitValue(rawValue[rawKey]);
  });
  return out;
}

function normalizeContentImageCropMap(rawValue) {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) return {};
  const out = {};
  Object.keys(rawValue).forEach((rawKey) => {
    const uri = String(rawKey || '').trim();
    if (!uri) return;
    const crop = rawValue[rawKey];
    out[uri] = {
      x: normalizeGalleryCropNumber(crop?.x, 0),
      y: normalizeGalleryCropNumber(crop?.y, 0),
      scale: Math.max(1, Math.min(3, normalizeGalleryCropNumber(crop?.scale, 1.12))),
    };
  });
  return out;
}

function getCategoryOptionsForType(type) {
  const key = String(type || 'service_pro').toLowerCase();
  const options = PROFILE_CATEGORY_OPTIONS[key];
  if (Array.isArray(options) && options.length) return options;
  return PROFILE_CATEGORY_OPTIONS.service_pro;
}

function parseHashtagReferences(value) {
  const tokens = String(value || '')
    .split(/[\s,;]+/)
    .map((entry) =>
      String(entry || '')
        .trim()
        .replace(/^#+/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .toLowerCase()
    )
    .filter(Boolean);
  const seen = new Set();
  const output = [];
  tokens.forEach((item) => {
    if (seen.has(item)) return;
    seen.add(item);
    output.push(item);
  });
  return output.slice(0, 24);
}

function hashtagsToInput(value) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item) => String(item || '').trim().replace(/^#+/, ''))
    .filter(Boolean)
    .map((item) => `#${item}`)
    .join(' ');
}

function normalizeMediaList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') return String(item.url || item.src || item.uri || '').trim();
      return '';
    })
    .filter(Boolean);
}

function resolveAvatarUri(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  if (/^data:image\//i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(file|content):\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) {
    const base = String(getApiBase() || '').trim();
    const origin = base ? base.replace(/\/api\/?$/i, '') : 'http://localhost';
    return `${origin}${raw}`;
  }
  return '';
}

function buildInlineVideoHtml(uri) {
  const safeUri = String(uri || '').replace(/"/g, '&quot;');
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
    <style>
      html,body{margin:0;padding:0;background:#000;overflow:hidden}
      video{width:100vw;height:100vh;object-fit:cover;background:#000}
    </style>
  </head>
  <body>
    <video src="${safeUri}" autoplay muted loop playsinline webkit-playsinline preload="metadata"></video>
  </body>
</html>`;
}

function normalizeLinks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, idx) => ({
      key: String(item?.key || item?.id || `link-${idx + 1}`),
      type: String(item?.type || 'website').toLowerCase(),
      url: String(item?.url || item?.value || '').trim(),
      label: String(item?.label || '').trim(),
    }))
    .filter((item) => item.url);
}

function normalizeAmenityList(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);
  }
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeExtraFields(value, keepEmpty = false) {
  if (!Array.isArray(value)) return [];
  const mapped = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return { label: '', value: '', description: '' };
      return {
        label: String(entry.label || entry.name || entry.key || '').trim(),
        value: String(entry.value || entry.content || '').trim(),
        description: String(entry.description || entry.desc || entry.details || '').trim(),
      };
    });
  if (keepEmpty) return mapped;
  return mapped.filter((entry) => entry.label || entry.value || entry.description);
}

function uniqueAmenityList(values) {
  const out = [];
  const seen = new Set();
  (Array.isArray(values) ? values : []).forEach((entry) => {
    const text = String(entry || '').trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(text);
  });
  return out;
}

function collectAmenitiesFromSections(sections) {
  const out = [];
  const list = Array.isArray(sections) ? sections : [];
  list.forEach((sec) => {
    const items = Array.isArray(sec?.items) ? sec.items : [];
    items.forEach((item) => {
      out.push(...normalizeAmenityList(item?.amenities));
    });
  });
  return uniqueAmenityList(out);
}

function collectRulesFromSections(sections) {
  const out = [];
  const list = Array.isArray(sections) ? sections : [];
  list.forEach((sec) => {
    const items = Array.isArray(sec?.items) ? sec.items : [];
    items.forEach((item) => {
      out.push(...normalizeAmenityList(item?.houseRules));
    });
  });
  return uniqueAmenityList(out);
}

function getTabsForType(type) {
  const key = String(type || 'service_pro').toLowerCase();
  const tabs = TAB_BLUEPRINTS[key] || TAB_BLUEPRINTS.service_pro;
  return tabs.map((tab) => ({ ...tab }));
}

function normalizeTabs(value, type) {
  if (!Array.isArray(value) || !value.length) return getTabsForType(type);
  const parsed = value
    .map((tab, idx) => ({
      id: String(tab?.id || `${tab?.type || 'aba'}-${idx + 1}`),
      type: String(tab?.type || 'sobre').toLowerCase(),
      label: normalizeTabLabel(tab?.label || tab?.type || `Aba ${idx + 1}`, tab?.type),
      enabled: !(
        tab?.enabled === false ||
        tab?.active === false ||
        String(tab?.enabled || tab?.active || '').trim().toLowerCase() === 'false'
      ),
    }))
    .filter((tab) => tab.id);
  const hasSobre = parsed.some((tab) => tab.type === 'sobre');
  if (!hasSobre) {
    return [{ id: 'sobre', label: 'Sobre', type: 'sobre', enabled: true }, ...parsed];
  }
  return parsed;
}

function tabsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i]?.type !== b[i]?.type ||
      a[i]?.label !== b[i]?.label ||
      a[i]?.id !== b[i]?.id ||
      !!(a[i]?.enabled !== false) !== !!(b[i]?.enabled !== false)
    ) return false;
  }
  return true;
}

function makeTabId(type, label, existing) {
  const base = String(label || type || 'aba')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'aba';
  let next = base;
  let idx = 2;
  const taken = new Set((existing || []).map((tab) => String(tab?.id || '')));
  while (taken.has(next)) {
    next = `${base}-${idx}`;
    idx += 1;
  }
  return next;
}

const SCHEDULE_DAYS = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

function normalizeSections(rawSections, rawFlat, fallbackLabel) {
  let sections = Array.isArray(rawSections) ? rawSections : [];
  if (!sections.length) {
    const flat = Array.isArray(rawFlat) ? rawFlat : [];
    if (flat.length) sections = [{ id: 'base', label: fallbackLabel, items: flat }];
  }
  return sections
    .map((sec, idx) => ({
      id: String(sec?.id || `${fallbackLabel}-${idx + 1}`),
      label: String(sec?.label || fallbackLabel),
      enabled: !(
        sec?.enabled === false ||
        sec?.active === false ||
        String(sec?.enabled || sec?.active || '').trim().toLowerCase() === 'false'
      ),
      items: Array.isArray(sec?.items) ? sec.items : [],
    }))
    .filter((sec) => sec.items.length);
}

function servicesToText(list) {
  if (!Array.isArray(list)) return '';
  return list
    .map((svc) => {
      const name = String(svc?.description || svc?.name || '').trim();
      const time = String(svc?.time || '').trim();
      const price = String(svc?.price || '').trim();
      return [name, time, price].join(' | ');
    })
    .filter((line) => line.replace(/\s|\|/g, '').length > 0)
    .join('\n');
}

function textToServices(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', time = '', price = ''] = line.split('|').map((part) => part.trim());
      return { description: name, name, time, price };
    })
    .filter((item) => item.description || item.time || item.price);
}

function sectionsToText(rawSections, rawFlat, fallbackLabel, kind = 'menu') {
  const sections = normalizeSections(rawSections, rawFlat, fallbackLabel);
  if (!sections.length) return '';
  const blockLines = [];
  sections.forEach((sec, secIdx) => {
    if (secIdx > 0) blockLines.push('');
    blockLines.push(`# ${sec.label}`);
    sec.items.forEach((item) => {
      if (kind === 'portfolio') {
        blockLines.push(
          [
            String(item?.name || '').trim(),
            String(item?.description || '').trim(),
            String(item?.link || '').trim(),
            String(item?.image || '').trim(),
          ].join(' | ')
        );
        return;
      }
      if (kind === 'lodging') {
        blockLines.push(
          [
            String(item?.name || '').trim(),
            String(item?.description || '').trim(),
            String(item?.priceNight || '').trim(),
            String(item?.image || '').trim(),
            String(item?.capacity || '').trim(),
            String(item?.beds || '').trim(),
            String(item?.bathrooms || '').trim(),
            String(item?.checkIn || '').trim(),
            String(item?.checkOut || '').trim(),
            String(item?.availability || '').trim(),
            normalizeAmenityList(item?.houseRules).join(', '),
            normalizeAmenityList(item?.amenities).join(', '),
          ].join(' | ')
        );
        return;
      }
      blockLines.push(
        [
          String(item?.name || '').trim(),
          String(item?.description || item?.shortDescription || '').trim(),
          String(item?.price || '').trim(),
          String(item?.image || '').trim(),
        ].join(' | ')
      );
    });
  });
  return blockLines.join('\n');
}

function textToSections(text, fallbackLabel, kind = 'menu') {
  const lines = String(text || '').split(/\r?\n/);
  const sections = [];
  let current = null;
  let secIndex = 1;

  const ensureSection = () => {
    if (current) return current;
    current = {
      id: `${fallbackLabel.toLowerCase()}-${secIndex}`,
      label: fallbackLabel,
      items: [],
    };
    secIndex += 1;
    sections.push(current);
    return current;
  };

  lines.forEach((rawLine) => {
    const line = String(rawLine || '').trim();
    if (!line) return;
    if (line.startsWith('#')) {
      const label = line.replace(/^#+\s*/, '').trim() || fallbackLabel;
      current = {
        id: `${fallbackLabel.toLowerCase()}-${secIndex}`,
        label,
        items: [],
      };
      secIndex += 1;
      sections.push(current);
      return;
    }

    const target = ensureSection();
    const parts = line.split('|').map((part) => part.trim());
    if (kind === 'portfolio') {
      const [name = '', description = '', link = '', image = ''] = parts;
      if (!name && !description && !link && !image) return;
      target.items.push({ name, description, link, image });
      return;
    }
    if (kind === 'lodging') {
      const [
        name = '',
        description = '',
        priceNight = '',
        image = '',
        capacity = '',
        beds = '',
        bathrooms = '',
        checkIn = '',
        checkOut = '',
        availability = '',
        houseRules = '',
        amenities = '',
      ] = parts;
      if (
        !name &&
        !description &&
        !priceNight &&
        !image &&
        !capacity &&
        !beds &&
        !bathrooms &&
        !checkIn &&
        !checkOut &&
        !availability &&
        !houseRules &&
        !amenities
      ) return;
      target.items.push({
        name,
        description,
        priceNight,
        image,
        images: image ? [image] : [],
        capacity,
        beds,
        bathrooms,
        checkIn,
        checkOut,
        availability,
        houseRules: normalizeAmenityList(houseRules),
        amenities: normalizeAmenityList(amenities),
      });
      return;
    }
    const [name = '', description = '', price = '', image = ''] = parts;
    if (!name && !description && !price && !image) return;
    target.items.push({ name, description, shortDescription: description, price, image });
  });

  return sections.filter((sec) => sec.items.length);
}

function locationsToText(list) {
  if (!Array.isArray(list)) return '';
  return list
    .map((loc) =>
      [
        String(loc?.title || '').trim(),
        String(loc?.address || '').trim(),
        String(loc?.note || '').trim(),
        String(loc?.coords || '').trim(),
        String(loc?.link || '').trim(),
      ].join(' | ')
    )
    .filter((line) => line.replace(/\s|\|/g, '').length > 0)
    .join('\n');
}

function textToLocations(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title = '', address = '', note = '', coords = '', link = ''] = line.split('|').map((part) => part.trim());
      return { title, address, note, coords, link };
    })
    .filter((loc) => loc.title || loc.address || loc.note || loc.coords || loc.link);
}

function partnersToText(list) {
  if (!Array.isArray(list)) return '';
  return list
    .map((partner) => [String(partner?.name || '').trim(), String(partner?.image || '').trim()].join(' | '))
    .filter((line) => line.replace(/\s|\|/g, '').length > 0)
    .join('\n');
}

function textToPartners(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', image = ''] = line.split('|').map((part) => part.trim());
      return { name, image };
    })
    .filter((partner) => partner.name || partner.image);
}

function agendaSlotsToText(slots) {
  if (!Array.isArray(slots)) return '';
  return slots
    .map((slot) => {
      const day = String(slot?.displayDay || slot?.day || slot?.rawDay || '').trim();
      const times = Array.isArray(slot?.times) ? slot.times.join(', ') : '';
      return [day, times].join(' | ');
    })
    .filter((line) => line.replace(/\s|\|/g, '').length > 0)
    .join('\n');
}

function textToAgendaSlots(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [day = '', timesRaw = ''] = line.split('|').map((part) => part.trim());
      const times = String(timesRaw || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      return { day, displayDay: day, rawDay: day, times };
    })
    .filter((slot) => slot.day || slot.times.length);
}

function makeLocalId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyServiceRow() {
  return {
    description: '',
    serviceType: 'general',
    time: '',
    price: '',
    priceMode: 'fixed',
    promoEnabled: false,
    promoOldPrice: '',
    promoNowPrice: '',
    extra1: '',
    extra2: '',
    note: '',
    image: '',
    enabled: true,
    modalImageEnabled: true,
    extraFields: [],
  };
}

function emptyServiceItem() {
  return emptyServiceRow();
}

function normalizeServicesRows(value) {
  const rows = Array.isArray(value)
    ? value.map((item) => ({
      description: String(item?.description || item?.name || '').trim(),
      serviceType: String(item?.serviceType || item?.type || 'general').trim().toLowerCase(),
      time: String(item?.time || '').trim(),
      price: String(item?.price || '').trim(),
      priceMode: String(item?.priceMode || item?.budgetMode || '').trim().toLowerCase() === 'budget' ||
        item?.isBudget === true ||
        item?.quoteOnly === true
        ? 'budget'
        : 'fixed',
      promoEnabled: !!(item?.promoEnabled || item?.isPromo || item?.promo),
      promoOldPrice: String(item?.promoOldPrice || item?.oldPrice || item?.priceBefore || '').trim(),
      promoNowPrice: String(item?.promoNowPrice || item?.newPrice || item?.priceNow || '').trim(),
      extra1: String(item?.extra1 || item?.detail1 || item?.specialty || '').trim(),
      extra2: String(item?.extra2 || item?.detail2 || item?.format || '').trim(),
      note: String(item?.note || item?.notes || '').trim(),
      image: String(item?.image || '').trim(),
      modalImageEnabled: !(
        item?.modalImageEnabled === false ||
        item?.showImageInModal === false ||
        String(item?.modalImageEnabled || item?.showImageInModal || '').trim().toLowerCase() === 'false'
      ),
      extraFields: normalizeExtraFields(item?.extraFields || item?.attributes || item?.specs),
    }))
    : [];
  const valid = rows.filter((row) => row.description || row.time || row.price || row.extra1 || row.extra2 || row.note || normalizeExtraFields(row.extraFields).length);
  return valid.length ? valid : [emptyServiceRow()];
}

function toServicesPayload(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .map((row) => ({
      description: String(row?.description || '').trim(),
      name: String(row?.description || '').trim(),
      serviceType: String(row?.serviceType || 'general').trim(),
      type: String(row?.serviceType || 'general').trim(),
      time: String(row?.time || '').trim(),
      price: String(row?.price || '').trim(),
      priceMode: String(row?.priceMode || '').trim().toLowerCase() === 'budget' ? 'budget' : 'fixed',
      isBudget: String(row?.priceMode || '').trim().toLowerCase() === 'budget',
      quoteOnly: String(row?.priceMode || '').trim().toLowerCase() === 'budget',
      budgetMode: String(row?.priceMode || '').trim().toLowerCase() === 'budget' ? 'budget' : 'fixed',
      promoEnabled: !!row?.promoEnabled,
      promoOldPrice: String(row?.promoOldPrice || '').trim(),
      promoNowPrice: String(row?.promoNowPrice || '').trim(),
      extra1: String(row?.extra1 || '').trim(),
      extra2: String(row?.extra2 || '').trim(),
      detail1: String(row?.extra1 || '').trim(),
      detail2: String(row?.extra2 || '').trim(),
      note: String(row?.note || '').trim(),
      notes: String(row?.note || '').trim(),
      image: String(row?.image || '').trim(),
      modalImageEnabled: !!row?.modalImageEnabled,
      showImageInModal: !!row?.modalImageEnabled,
      extraFields: normalizeExtraFields(row?.extraFields),
    }))
    .filter((row) => row.description || row.time || row.price || row.extra1 || row.extra2 || row.note || normalizeExtraFields(row.extraFields).length);
}

function servicesSectionsToRows(sections) {
  const list = Array.isArray(sections) ? sections : [];
  return list
    .flatMap((sec) => (Array.isArray(sec?.items) ? sec.items : []))
    .map((item) => ({
      description: String(item?.description || item?.name || '').trim(),
      serviceType: String(item?.serviceType || item?.type || 'general').trim(),
      time: String(item?.time || '').trim(),
      price: String(item?.price || '').trim(),
      priceMode: String(item?.priceMode || item?.budgetMode || '').trim().toLowerCase() === 'budget' ||
        item?.isBudget === true ||
        item?.quoteOnly === true
        ? 'budget'
        : 'fixed',
      promoEnabled: !!(item?.promoEnabled || item?.isPromo || item?.promo),
      promoOldPrice: String(item?.promoOldPrice || item?.oldPrice || item?.priceBefore || '').trim(),
      promoNowPrice: String(item?.promoNowPrice || item?.newPrice || item?.priceNow || '').trim(),
      extra1: String(item?.extra1 || item?.detail1 || '').trim(),
      extra2: String(item?.extra2 || item?.detail2 || '').trim(),
      note: String(item?.note || item?.notes || '').trim(),
      image: String(item?.image || '').trim(),
      modalImageEnabled: !(
        item?.modalImageEnabled === false ||
        item?.showImageInModal === false ||
        String(item?.modalImageEnabled || item?.showImageInModal || '').trim().toLowerCase() === 'false'
      ),
      extraFields: normalizeExtraFields(item?.extraFields || item?.attributes || item?.specs),
    }))
    .filter((row) => row.description || row.time || row.price || row.extra1 || row.extra2 || row.note || normalizeExtraFields(row.extraFields).length);
}

function emptyMenuItem() {
  return {
    name: '',
    description: '',
    price: '',
    promoEnabled: false,
    promoOldPrice: '',
    promoNowPrice: '',
    image: '',
    enabled: true,
    extraFields: [],
  };
}

function emptyProductItem() {
  return {
    name: '',
    price: '',
    promoEnabled: false,
    promoOldPrice: '',
    promoNowPrice: '',
    sku: '',
    stock: 'in',
    enabled: true,
    image: '',
    modalImageEnabled: true,
    shortDescription: '',
    fullDescription: '',
    usage: '',
    ingredients: '',
    size: '',
    extraFields: [],
  };
}

function emptyPortfolioItem() {
  return {
    name: '',
    description: '',
    link: '',
    image: '',
    enabled: true,
    extraFields: [],
  };
}

function emptyCampaignItem() {
  return {
    title: '',
    badge: '',
    images: [],
    videos: [],
    image: '',
    video: '',
    enabled: true,
  };
}

function emptyLodgingItem() {
  return {
    name: '',
    description: '',
    image: '',
    images: [],
    capacity: '',
    priceNight: '',
    promoEnabled: false,
    promoOldPrice: '',
    promoNowPrice: '',
    beds: '',
    bathrooms: '',
    checkIn: '',
    checkOut: '',
    availability: '',
    houseRules: [],
    amenities: [],
  };
}

function normalizeCampaignRows(value, fallbackSections) {
  const direct = Array.isArray(value) ? value : [];
  const fromSections = Array.isArray(fallbackSections)
    ? fallbackSections.flatMap((sec) => (Array.isArray(sec?.items) ? sec.items : []))
    : [];
  const source = direct.length ? direct : fromSections;
  const rows = source.map((item) => ({
    title: String(item?.title || item?.name || '').trim(),
    badge: String(item?.badge || item?.tag || '').trim(),
    images: uniqueAmenityList([
      ...normalizeMediaList(item?.images),
      ...normalizeMediaList(item?.image ? [item.image] : []),
    ]),
    videos: uniqueAmenityList([
      ...normalizeMediaList(item?.videos),
      ...normalizeMediaList(item?.video || item?.videoUrl ? [item?.video || item?.videoUrl] : []),
    ]),
    image: String(item?.image || '').trim(),
    video: String(item?.video || item?.videoUrl || '').trim(),
    enabled: !(
      item?.enabled === false ||
      item?.active === false ||
      String(item?.enabled || item?.active || '').trim().toLowerCase() === 'false'
    ),
  })).map((row) => {
    const images = uniqueAmenityList([
      ...normalizeMediaList(row?.images),
      ...normalizeMediaList(row?.image ? [row.image] : []),
    ]);
    const videos = uniqueAmenityList([
      ...normalizeMediaList(row?.videos),
      ...normalizeMediaList(row?.video ? [row.video] : []),
    ]);
    return {
      ...row,
      images,
      videos,
      image: images[0] || '',
      video: videos[0] || '',
    };
  });
  const valid = rows.filter((row) => row.title || row.badge || row.image || row.video || row.images?.length || row.videos?.length);
  return valid.length ? valid : [emptyCampaignItem()];
}

function normalizeSectionItems(items, mode) {
  const list = Array.isArray(items) ? items : [];
  if (mode === 'services') {
    const next = list.map((item) => ({
      description: String(item?.description || item?.name || '').trim(),
      name: String(item?.description || item?.name || '').trim(),
      serviceType: String(item?.serviceType || item?.type || 'general').trim().toLowerCase(),
      type: String(item?.serviceType || item?.type || 'general').trim().toLowerCase(),
      time: String(item?.time || '').trim(),
      price: String(item?.price || '').trim(),
      priceMode: String(item?.priceMode || item?.budgetMode || '').trim().toLowerCase() === 'budget' ||
        item?.isBudget === true ||
        item?.quoteOnly === true
        ? 'budget'
        : 'fixed',
      promoEnabled: !!(item?.promoEnabled || item?.isPromo || item?.promo),
      promoOldPrice: String(item?.promoOldPrice || item?.oldPrice || item?.priceBefore || '').trim(),
      promoNowPrice: String(item?.promoNowPrice || item?.newPrice || item?.priceNow || '').trim(),
      extra1: String(item?.extra1 || item?.detail1 || '').trim(),
      extra2: String(item?.extra2 || item?.detail2 || '').trim(),
      detail1: String(item?.extra1 || item?.detail1 || '').trim(),
      detail2: String(item?.extra2 || item?.detail2 || '').trim(),
      note: String(item?.note || item?.notes || '').trim(),
      notes: String(item?.note || item?.notes || '').trim(),
      enabled: !(
        item?.enabled === false ||
        item?.active === false ||
        String(item?.enabled || item?.active || '').trim().toLowerCase() === 'false'
      ),
      image: String(item?.image || '').trim(),
      modalImageEnabled: !(
        item?.modalImageEnabled === false ||
        item?.showImageInModal === false ||
        String(item?.modalImageEnabled || item?.showImageInModal || '').trim().toLowerCase() === 'false'
      ),
      extraFields: normalizeExtraFields(item?.extraFields || item?.attributes || item?.specs),
    }));
    return next.length ? next : [emptyServiceItem()];
  }
  if (mode === 'products') {
    const next = list.map((item) => ({
      name: String(item?.name || '').trim(),
      price: String(item?.price || '').trim(),
      promoEnabled: !!(item?.promoEnabled || item?.isPromo || item?.promo),
      promoOldPrice: String(item?.promoOldPrice || item?.oldPrice || item?.priceBefore || '').trim(),
      promoNowPrice: String(item?.promoNowPrice || item?.newPrice || item?.priceNow || '').trim(),
      sku: String(item?.sku || '').trim(),
      stock: String(item?.stock || 'in').trim() === 'out' ? 'out' : 'in',
      enabled: !(
        item?.enabled === false ||
        item?.active === false ||
        String(item?.enabled || item?.active || '').trim().toLowerCase() === 'false'
      ),
      image: String(item?.image || '').trim(),
      modalImageEnabled: !(
        item?.modalImageEnabled === false ||
        item?.showImageInModal === false ||
        String(item?.modalImageEnabled || item?.showImageInModal || '').trim().toLowerCase() === 'false'
      ),
      shortDescription: String(item?.shortDescription || item?.description || '').trim(),
      fullDescription: String(item?.fullDescription || '').trim(),
      usage: String(item?.usage || '').trim(),
      ingredients: String(item?.ingredients || '').trim(),
      size: String(item?.size || '').trim(),
      extraFields: normalizeExtraFields(item?.extraFields || item?.attributes || item?.specs),
    }));
    return next.length ? next : [emptyProductItem()];
  }
  if (mode === 'portfolio') {
    const next = list.map((item) => ({
      name: String(item?.name || '').trim(),
      description: String(item?.description || '').trim(),
      link: String(item?.link || '').trim(),
      image: String(item?.image || '').trim(),
      enabled: !(
        item?.enabled === false ||
        item?.active === false ||
        String(item?.enabled || item?.active || '').trim().toLowerCase() === 'false'
      ),
      extraFields: normalizeExtraFields(item?.extraFields || item?.attributes || item?.specs),
    }));
    return next.length ? next : [emptyPortfolioItem()];
  }
  if (mode === 'lodging') {
    const next = list.map((item) => ({
      name: String(item?.name || '').trim(),
      description: String(item?.description || '').trim(),
      image: String(item?.image || '').trim(),
      images: normalizeMediaList(item?.images),
      capacity: String(item?.capacity || '').trim(),
      priceNight: String(item?.priceNight || '').trim(),
      promoEnabled: !!(item?.promoEnabled || item?.isPromo || item?.promo),
      promoOldPrice: String(item?.promoOldPrice || item?.oldPrice || item?.priceBefore || '').trim(),
      promoNowPrice: String(item?.promoNowPrice || item?.newPrice || item?.priceNow || '').trim(),
      beds: String(item?.beds || '').trim(),
      bathrooms: String(item?.bathrooms || '').trim(),
      checkIn: String(item?.checkIn || '').trim(),
      checkOut: String(item?.checkOut || '').trim(),
      availability: String(item?.availability || '').trim(),
      houseRules: normalizeAmenityList(item?.houseRules),
      amenities: normalizeAmenityList(item?.amenities),
    }));
    return next.length ? next : [emptyLodgingItem()];
  }
  const next = list.map((item) => ({
    name: String(item?.name || '').trim(),
    description: String(item?.description || item?.shortDescription || '').trim(),
    price: String(item?.price || '').trim(),
    promoEnabled: !!(item?.promoEnabled || item?.isPromo || item?.promo),
    promoOldPrice: String(item?.promoOldPrice || item?.oldPrice || item?.priceBefore || '').trim(),
    promoNowPrice: String(item?.promoNowPrice || item?.newPrice || item?.priceNow || '').trim(),
    enabled: !(
      item?.enabled === false ||
      item?.active === false ||
      String(item?.enabled || item?.active || '').trim().toLowerCase() === 'false'
    ),
    image: String(item?.image || '').trim(),
    extraFields: normalizeExtraFields(item?.extraFields || item?.attributes || item?.specs),
  }));
  return next.length ? next : [emptyMenuItem()];
}

function normalizeSectionsForEditor(rawSections, rawFlat, fallbackLabel, mode = 'menu') {
  const base = normalizeSections(rawSections, rawFlat, fallbackLabel);
  const withFallback = base.length
    ? base
    : [{ id: `${fallbackLabel.toLowerCase()}-base`, label: fallbackLabel, items: [] }];
  return withFallback.map((sec, idx) => ({
    id: String(sec?.id || `${fallbackLabel.toLowerCase()}-${idx + 1}`),
    label: String(sec?.label || fallbackLabel).trim() || fallbackLabel,
    enabled: !(
      sec?.enabled === false ||
      sec?.active === false ||
      String(sec?.enabled || sec?.active || '').trim().toLowerCase() === 'false'
    ),
    items: normalizeSectionItems(sec?.items, mode),
  }));
}

function hasItemData(item, mode) {
  if (!item || typeof item !== 'object') return false;
  if (mode === 'services') {
    return !!(
      String(item.description || item.name || '').trim() ||
      String(item.time || '').trim() ||
      String(item.price || '').trim() ||
      String(item.promoOldPrice || '').trim() ||
      String(item.promoNowPrice || '').trim() ||
      String(item.extra1 || item.detail1 || '').trim() ||
      String(item.extra2 || item.detail2 || '').trim() ||
      String(item.note || item.notes || '').trim() ||
      String(item.image || '').trim() ||
      normalizeExtraFields(item.extraFields).length
    );
  }
  if (mode === 'products') {
    return !!(
      String(item.name || '').trim() ||
      String(item.shortDescription || '').trim() ||
      String(item.price || '').trim() ||
      String(item.promoOldPrice || '').trim() ||
      String(item.promoNowPrice || '').trim() ||
      String(item.sku || '').trim() ||
      String(item.image || '').trim() ||
      normalizeExtraFields(item.extraFields).length
    );
  }
  if (mode === 'portfolio') {
    return !!(
      String(item.name || '').trim() ||
      String(item.description || '').trim() ||
      String(item.link || '').trim() ||
      String(item.image || '').trim() ||
      normalizeExtraFields(item.extraFields).length
    );
  }
  if (mode === 'lodging') {
    return !!(
      String(item.name || '').trim() ||
      String(item.description || '').trim() ||
      String(item.image || '').trim() ||
      normalizeMediaList(item.images).length ||
      String(item.capacity || '').trim() ||
      String(item.priceNight || '').trim() ||
      String(item.promoOldPrice || '').trim() ||
      String(item.promoNowPrice || '').trim() ||
      String(item.beds || '').trim() ||
      String(item.bathrooms || '').trim() ||
      String(item.checkIn || '').trim() ||
      String(item.checkOut || '').trim() ||
      String(item.availability || '').trim() ||
      normalizeAmenityList(item.houseRules).length ||
      normalizeAmenityList(item.amenities).length
    );
  }
  return !!(
    String(item.name || '').trim() ||
    String(item.description || '').trim() ||
    String(item.price || '').trim() ||
    String(item.promoOldPrice || '').trim() ||
    String(item.promoNowPrice || '').trim() ||
    String(item.image || '').trim() ||
    normalizeExtraFields(item.extraFields).length
  );
}

function toSectionsPayload(sections, mode = 'menu') {
  const list = Array.isArray(sections) ? sections : [];
  return list
    .map((sec, idx) => {
      const items = Array.isArray(sec?.items) ? sec.items : [];
      const filtered = items.filter((item) => hasItemData(item, mode));
      return {
        id: String(sec?.id || `sec-${idx + 1}`),
        label: String(sec?.label || 'Categoria').trim() || 'Categoria',
        enabled: !(
          sec?.enabled === false ||
          sec?.active === false ||
          String(sec?.enabled || sec?.active || '').trim().toLowerCase() === 'false'
        ),
        items: filtered,
      };
    })
    .filter((sec) => sec.items.length);
}

function emptyLocationRow() {
  return { title: '', address: '', note: '', coords: '', link: '' };
}

function normalizeLocationsRows(value) {
  const rows = Array.isArray(value)
    ? value.map((loc) => ({
      title: String(loc?.title || '').trim(),
      address: String(loc?.address || '').trim(),
      note: String(loc?.note || '').trim(),
      coords: String(loc?.coords || '').trim(),
      link: String(loc?.link || '').trim(),
    }))
    : [];
  const valid = rows.filter((loc) => loc.title || loc.address || loc.note || loc.coords || loc.link);
  return valid.length ? valid : [emptyLocationRow()];
}

function toLocationsPayload(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .map((loc) => ({
      title: String(loc?.title || '').trim(),
      address: String(loc?.address || '').trim(),
      note: String(loc?.note || '').trim(),
      coords: String(loc?.coords || '').trim(),
      link: String(loc?.link || '').trim(),
    }))
    .filter((loc) => loc.title || loc.address || loc.note || loc.coords || loc.link);
}

function emptyPartnerRow() {
  return { name: '', image: '', link: '' };
}

function normalizePartnersRows(value) {
  const rows = Array.isArray(value)
    ? value.map((item) => ({
      name: String(item?.name || '').trim(),
      image: String(item?.image || '').trim(),
      link: String(item?.link || '').trim(),
    }))
    : [];
  const valid = rows.filter((row) => row.name || row.image || row.link);
  return valid.length ? valid : [emptyPartnerRow()];
}

function toPartnersPayload(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .map((row) => ({
      name: String(row?.name || '').trim(),
      image: String(row?.image || '').trim(),
      link: String(row?.link || '').trim(),
    }))
    .filter((row) => row.name || row.image || row.link);
}

function normalizeAgendaSlotsRows(value) {
  const rows = Array.isArray(value)
    ? value.map((slot) => ({
      day: String(slot?.day || slot?.date || slot?.rawDay || '').trim(),
      weekday: String(slot?.weekday || slot?.displayDay || '').trim(),
      times: Array.isArray(slot?.times) ? slot.times.join(' ') : '',
    }))
    : [];
  const valid = rows.filter((row) => row.day || row.weekday || row.times);
  return valid.length ? valid : [{ day: '', weekday: '', times: '' }];
}

function toAgendaSlotsPayload(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .map((row) => ({
      rawDay: String(row?.day || '').trim(),
      day: String(row?.day || '').trim(),
      date: String(row?.day || '').trim(),
      weekday: String(row?.weekday || '').trim(),
      displayDay: String(row?.weekday || '').trim(),
      times: String(row?.times || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean),
    }))
    .filter((row) => row.day || row.weekday || row.times.length);
}

export default function EditProfileScreen({ profile, saving, error, onCancel, onSave, currentLanguage = 'pt' }) {
  const L = currentLanguage || 'pt';
  const tr = (key, fallback) => {
    const value = t(L, key);
    return value === key ? fallback : value;
  };
  const translateUiLabel = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return raw;
    const normalized = raw.toLowerCase();
    const map = {
      'serviço': tr('edit_profile_type_service', 'Serviço'),
      'loja / produto': tr('edit_profile_type_shop', 'Loja / Produto'),
      'restaurante / bar': tr('edit_profile_type_food', 'Restaurante / Bar'),
      alojamento: tr('edit_profile_type_lodging', 'Alojamento'),
      'criador / portfólio': tr('edit_profile_type_creator', 'Criador / Portfólio'),
      'criador / portfolio': tr('edit_profile_type_creator', 'Criador / Portfólio'),
      sobre: tr('profile_tab_about', 'Sobre'),
      'serviços': tr('profile_tab_services', 'Serviços'),
      servicos: tr('profile_tab_services', 'Serviços'),
      galeria: tr('profile_tab_gallery', 'Galeria'),
      horário: tr('profile_tab_schedule', 'Horário'),
      horario: tr('profile_tab_schedule', 'Horário'),
      agenda: tr('profile_tab_agenda', 'Agenda'),
      parcerias: tr('profile_tab_partners', 'Parcerias'),
      localização: tr('profile_tab_location', 'Localização'),
      localizacao: tr('profile_tab_location', 'Localização'),
      menu: tr('profile_tab_menu', 'Menu'),
      produtos: tr('profile_tab_products', 'Produtos'),
      campanhas: tr('profile_tab_campaigns', 'Campanhas'),
      portfolio: tr('profile_tab_portfolio', 'Portfolio'),
      portofolio: tr('profile_tab_portfolio', 'Portfolio'),
      casas: tr('profile_tab_houses', 'Casas'),
      quartos: tr('profile_tab_rooms', 'Quartos'),
      categoria: tr('edit_category', 'Categoria'),
      selecionar: tr('edit_select', 'Selecionar'),
      'selecionar categoria': tr('edit_select_category', 'Selecionar categoria'),
      link: tr('edit_link', 'Link'),
      aba: tr('edit_tab', 'Aba'),
    };
    return map[normalized] || raw;
  };
  const profileTypeOptions = useMemo(
    () => PROFILE_TYPES.map((item) => ({ ...item, label: translateUiLabel(item.label) })),
    [L]
  );
  const tabTemplateOptions = useMemo(
    () => TAB_TEMPLATES.map((item) => ({ ...item, label: translateUiLabel(item.label) })),
    [L]
  );
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [profileType, setProfileType] = useState('service_pro');
  const [location, setLocation] = useState('');
  const [about, setAbout] = useState('');
  const [avatar, setAvatar] = useState('');
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [galleryVideos, setGalleryVideos] = useState([]);
  const [galleryReels, setGalleryReels] = useState([]);
  const [galleryModalFit, setGalleryModalFit] = useState(DEFAULT_GALLERY_MODAL_FIT);
  const [galleryItemFitMap, setGalleryItemFitMap] = useState({ photos: {}, videos: {}, reels: {} });
  const [galleryItemCropMap, setGalleryItemCropMap] = useState({ photos: {}, videos: {}, reels: {} });
  const [contentImageFitMap, setContentImageFitMap] = useState({});
  const [contentImageCropMap, setContentImageCropMap] = useState({});
  const [storiesList, setStoriesList] = useState([]);
  const [galleryTab, setGalleryTab] = useState('photos');
  const [galleryEditorOpen, setGalleryEditorOpen] = useState(false);
  const [galleryEditorTab, setGalleryEditorTab] = useState('photos');
  const [galleryEditorIndex, setGalleryEditorIndex] = useState(-1);
  const [galleryEditorCrop, setGalleryEditorCrop] = useState({ x: 0, y: 0, scale: 1.12 });
  const [galleryEditorPreviewSize, setGalleryEditorPreviewSize] = useState({ width: 0, height: 0 });
  const [contentImageEditorOpen, setContentImageEditorOpen] = useState(false);
  const [contentImageEditorContext, setContentImageEditorContext] = useState(null);
  const [contentImageEditorUri, setContentImageEditorUri] = useState('');
  const [contentImageEditorFit, setContentImageEditorFit] = useState('cover');
  const [contentImageEditorCrop, setContentImageEditorCrop] = useState({ x: 0, y: 0, scale: 1.12 });
  const [contentImageEditorPreviewSize, setContentImageEditorPreviewSize] = useState({ width: 0, height: 0 });
  const [servicePreviewOpen, setServicePreviewOpen] = useState(false);
  const [servicePreviewItem, setServicePreviewItem] = useState(null);
  const [servicePreviewSectionLabel, setServicePreviewSectionLabel] = useState('');
  const [serviceExtrasOpen, setServiceExtrasOpen] = useState(false);
  const [productPreviewOpen, setProductPreviewOpen] = useState(false);
  const [productPreviewItem, setProductPreviewItem] = useState(null);
  const [productPreviewSectionLabel, setProductPreviewSectionLabel] = useState('');
  const [productExtrasOpen, setProductExtrasOpen] = useState(false);
  const [portfolioExtrasOpen, setPortfolioExtrasOpen] = useState(false);
  const [campaignVideoEditorOpen, setCampaignVideoEditorOpen] = useState(false);
  const [campaignVideoEditorItemIndex, setCampaignVideoEditorItemIndex] = useState(-1);
  const [campaignVideoEditorIndex, setCampaignVideoEditorIndex] = useState(-1);
  const [campaignVideoEditorUri, setCampaignVideoEditorUri] = useState('');
  const [galleryDragState, setGalleryDragState] = useState({ active: false, index: -1 });
  const [galleryGridWidth, setGalleryGridWidth] = useState(0);
  const [galleryGridFrame, setGalleryGridFrame] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const galleryDragRef = useRef({ active: false, index: -1 });
  const aboutEditorRef = useRef(null);
  const galleryResponderActiveRef = useRef(false);
  const galleryGridRef = useRef(null);
  const galleryEditorDragStartRef = useRef({ x: 0, y: 0 });
  const galleryEditorCropRef = useRef({ x: 0, y: 0, scale: 1.12 });
  const galleryEditorPinchRef = useRef({ active: false, startDistance: 0, startScale: 1.12 });
  const galleryEditorMoveRef = useRef({ mode: 'drag', lastDx: 0, lastDy: 0 });
  const contentImageEditorCropRef = useRef({ x: 0, y: 0, scale: 1.12 });
  const contentImageEditorPinchRef = useRef({ active: false, startDistance: 0, startScale: 1.12 });
  const contentImageEditorMoveRef = useRef({ mode: 'drag', lastDx: 0, lastDy: 0 });
  const [servicesRows, setServicesRows] = useState([emptyServiceRow()]);
  const [editingServiceIndex, setEditingServiceIndex] = useState(0);
  const [editingMenuIndex, setEditingMenuIndex] = useState(0);
  const [editingProductIndex, setEditingProductIndex] = useState(0);
  const [editingPortfolioIndex, setEditingPortfolioIndex] = useState(0);
  const [servicesSectionsState, setServicesSectionsState] = useState([]);
  const [menuSectionsState, setMenuSectionsState] = useState([]);
  const [productsSectionsState, setProductsSectionsState] = useState([]);
  const [portfolioSectionsState, setPortfolioSectionsState] = useState([]);
  const [campaignsRows, setCampaignsRows] = useState([emptyCampaignItem()]);
  const [editingCampaignIndex, setEditingCampaignIndex] = useState(0);
  const [housesSectionsState, setHousesSectionsState] = useState([]);
  const [roomsSectionsState, setRoomsSectionsState] = useState([]);
  const [locationsRows, setLocationsRows] = useState([emptyLocationRow()]);
  const [partnersRows, setPartnersRows] = useState([emptyPartnerRow()]);
  const [activeMenuSectionId, setActiveMenuSectionId] = useState('');
  const [activeServicesSectionId, setActiveServicesSectionId] = useState('');
  const [activeProductsSectionId, setActiveProductsSectionId] = useState('');
  const [activePortfolioSectionId, setActivePortfolioSectionId] = useState('');
  const [activeHousesSectionId, setActiveHousesSectionId] = useState('');
  const [activeRoomsSectionId, setActiveRoomsSectionId] = useState('');
  const [activeHouseItemIndex, setActiveHouseItemIndex] = useState(0);
  const [activeRoomItemIndex, setActiveRoomItemIndex] = useState(0);
  const [houseAmenityDraft, setHouseAmenityDraft] = useState('');
  const [roomAmenityDraft, setRoomAmenityDraft] = useState('');
  const [houseRuleDraft, setHouseRuleDraft] = useState('');
  const [roomRuleDraft, setRoomRuleDraft] = useState('');
  const [amenityCatalog, setAmenityCatalog] = useState(DEFAULT_AMENITIES);
  const [rulesCatalog, setRulesCatalog] = useState(DEFAULT_HOUSE_RULES);
  const [agendaDescription, setAgendaDescription] = useState('');
  const [agendaReserveLink, setAgendaReserveLink] = useState('');
  const [agendaSlotsRows, setAgendaSlotsRows] = useState([{ day: '', weekday: '', times: '' }]);
  const [schedule, setSchedule] = useState({
    seg: '',
    ter: '',
    qua: '',
    qui: '',
    sex: '',
    sab: '',
    dom: '',
  });
  const [links, setLinks] = useState([]);
  const [newLinkType, setNewLinkType] = useState('instagram');
  const [newLinkValue, setNewLinkValue] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [linkTypeSearch, setLinkTypeSearch] = useState('');
  const [editingLinkKey, setEditingLinkKey] = useState('');
  const [isLinkTypeMenuOpen, setIsLinkTypeMenuOpen] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState('sobre');
  const [newTabType, setNewTabType] = useState('sobre');
  const [newTabLabel, setNewTabLabel] = useState('');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [isNewTabTypeMenuOpen, setIsNewTabTypeMenuOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    category: '',
    location: '',
    link: '',
  });

  const tabTypeLabelMap = useMemo(() => {
    const map = {};
    TAB_TEMPLATES.forEach((item) => {
      map[item.type] = item.label;
    });
    return map;
  }, []);

  const categoryOptions = useMemo(() => getCategoryOptionsForType(profileType), [profileType]);
  const hashtagReferences = useMemo(() => parseHashtagReferences(hashtagsInput), [hashtagsInput]);
  const filteredLinkTypes = useMemo(() => {
    const q = String(linkTypeSearch || '').trim().toLowerCase();
    if (!q) return LINK_TYPES;
    return LINK_TYPES.filter((item) => String(item.label || '').toLowerCase().includes(q));
  }, [linkTypeSearch]);

  useEffect(() => {
    const data = profile?.data && typeof profile.data === 'object' ? profile.data : {};
    const social = data?.social && typeof data.social === 'object' ? data.social : {};
    const type = String(profile?.type || data?.type || 'service_pro').toLowerCase();
    const rawLinks = normalizeLinks(data?.links);
    const fallbackLinks = [];
    if (social?.instagram) fallbackLinks.push({ key: 'instagram', type: 'instagram', url: String(social.instagram), label: '' });
    if (social?.tiktok) fallbackLinks.push({ key: 'tiktok', type: 'tiktok', url: String(social.tiktok), label: '' });
    if (social?.youtube) fallbackLinks.push({ key: 'youtube', type: 'youtube', url: String(social.youtube), label: '' });
    if (social?.facebook) fallbackLinks.push({ key: 'facebook', type: 'facebook', url: String(social.facebook), label: '' });
    if (social?.linkedin) fallbackLinks.push({ key: 'linkedin', type: 'linkedin', url: String(social.linkedin), label: '' });
    if (data?.website || data?.site) {
      fallbackLinks.push({
        key: 'website',
        type: 'website',
        url: String(data?.website || data?.site),
        label: '',
      });
    }

    const resolvedCategoryOptions = getCategoryOptionsForType(type);
    const initialCategory = String(profile?.category || data?.role || '').trim();
    const initialHashtags = Array.isArray(data?.contentCategories)
      ? data.contentCategories
      : Array.isArray(data?.tags)
        ? data.tags
        : [];

    const categoryInOptions = resolvedCategoryOptions.some(
      (item) => String(item || '').trim().toLowerCase() === initialCategory.toLowerCase()
    );
    const initialCustomCategory = String(
      data?.customCategory || data?.categoryCustom || data?.customRole || ''
    ).trim();

    setName(profile?.name || '');
    setCategory(categoryInOptions ? initialCategory : resolvedCategoryOptions[0] || '');
    setCustomCategory(initialCustomCategory || (categoryInOptions ? '' : initialCategory));
    setHashtagsInput(hashtagsToInput(initialHashtags));
    setProfileType(type);
    setLocation(profile?.location || '');
    setAbout(profile?.about || '');
    setAvatar(String(data?.avatar || ''));
    setGalleryPhotos(normalizeMediaList(data?.gallery?.photos || data?.photos));
    setGalleryVideos(
      uniqueAmenityList([
        ...normalizeMediaList(data?.gallery?.videos || data?.videos),
        ...normalizeMediaList(data?.gallery?.reels || data?.reels),
      ])
    );
    setGalleryReels([]);
    setGalleryModalFit(
      normalizeGalleryModalFit(
        data?.gallery?.modalFit || data?.gallery?.modalMediaFit || data?.galleryModalFit
      )
    );
    setGalleryItemFitMap(
      normalizeGalleryItemFitMap(
        data?.gallery?.itemFitMap || data?.gallery?.mediaItemFitMap || data?.galleryItemFitMap
      )
    );
    setGalleryItemCropMap(
      normalizeGalleryItemCropMap(
        data?.gallery?.itemCropMap || data?.gallery?.mediaItemCropMap || data?.galleryItemCropMap
      )
    );
    setContentImageFitMap(
      normalizeContentImageFitMap(data?.contentImageFitMap || data?.itemImageFitMap)
    );
    setContentImageCropMap(
      normalizeContentImageCropMap(data?.contentImageCropMap || data?.itemImageCropMap)
    );
    setStoriesList(normalizeMediaList(data?.stories));
    setGalleryTab('photos');
    setGalleryEditorOpen(false);
    setGalleryEditorTab('photos');
    setGalleryEditorIndex(-1);
    const servicesNext = normalizeSectionsForEditor(data?.servicesSections, data?.services, 'Serviços', 'services');
    setServicesRows(normalizeServicesRows(data?.services));
    setEditingMenuIndex(0);
    setEditingProductIndex(0);
    setEditingPortfolioIndex(0);
    setEditingCampaignIndex(0);
    setPortfolioExtrasOpen(false);
    setServicesSectionsState(servicesNext);
    const menuNext = normalizeSectionsForEditor(data?.menuSections, data?.menu, 'Menu', 'menu');
    const productsNext = normalizeSectionsForEditor(data?.productsSections, data?.products, 'Produtos', 'products');
    const portfolioNext = normalizeSectionsForEditor(data?.portfolioSections, [], 'Portfolio', 'portfolio');
    const campaignsNext = normalizeSectionsForEditor(data?.campaignSections, data?.campaigns, 'Campanhas', 'portfolio');
    const housesNext = normalizeSectionsForEditor(data?.housesSections, data?.houses, 'Casas', 'lodging');
    const roomsNext = normalizeSectionsForEditor(data?.roomsSections, data?.rooms, 'Quartos', 'lodging');
    setMenuSectionsState(menuNext);
    setProductsSectionsState(productsNext);
    setPortfolioSectionsState(portfolioNext);
    setCampaignsRows(normalizeCampaignRows(data?.campaigns, campaignsNext));
    setHousesSectionsState(housesNext);
    setRoomsSectionsState(roomsNext);
    setActiveServicesSectionId(servicesNext[0]?.id || '');
    setActiveMenuSectionId(menuNext[0]?.id || '');
    setActiveProductsSectionId(productsNext[0]?.id || '');
    setActivePortfolioSectionId(portfolioNext[0]?.id || '');
    setActiveHousesSectionId(housesNext[0]?.id || '');
    setActiveRoomsSectionId(roomsNext[0]?.id || '');
    setActiveHouseItemIndex(0);
    setActiveRoomItemIndex(0);
    setHouseAmenityDraft('');
    setRoomAmenityDraft('');
    setHouseRuleDraft('');
    setRoomRuleDraft('');
    const dataCatalog = normalizeAmenityList(data?.amenitiesCatalog);
    const sectionCatalog = collectAmenitiesFromSections([...housesNext, ...roomsNext]);
    setAmenityCatalog(uniqueAmenityList([...DEFAULT_AMENITIES, ...dataCatalog, ...sectionCatalog]));
    const dataRulesCatalog = normalizeAmenityList(data?.rulesCatalog || data?.houseRulesCatalog);
    const sectionRulesCatalog = collectRulesFromSections([...housesNext, ...roomsNext]);
    setRulesCatalog(uniqueAmenityList([...DEFAULT_HOUSE_RULES, ...dataRulesCatalog, ...sectionRulesCatalog]));
    setLocationsRows(normalizeLocationsRows(data?.locations));
    setPartnersRows(normalizePartnersRows(data?.partners));
    setAgendaDescription(String(data?.agenda?.description || '').trim());
    setAgendaReserveLink(String(data?.agenda?.reserveLink || '').trim());
    setAgendaSlotsRows(normalizeAgendaSlotsRows(data?.agenda?.slots));
    setSchedule({
      seg: String(data?.schedule?.seg || '').trim(),
      ter: String(data?.schedule?.ter || '').trim(),
      qua: String(data?.schedule?.qua || '').trim(),
      qui: String(data?.schedule?.qui || '').trim(),
      sex: String(data?.schedule?.sex || '').trim(),
      sab: String(data?.schedule?.sab || '').trim(),
      dom: String(data?.schedule?.dom || '').trim(),
    });
    setLinks(rawLinks.length ? rawLinks : fallbackLinks);
    setEditingLinkKey('');
    const normalizedTabs = normalizeTabs(data?.tabs, type);
    setTabs(normalizedTabs);
    setActiveTabId(normalizedTabs[0]?.id || 'sobre');
    setNewTabType((getTabsForType(type)[0]?.type || 'sobre'));
    setNewTabLabel('');
    setIsCategoryMenuOpen(false);
    setIsTypeMenuOpen(false);
    setIsLinkTypeMenuOpen(false);
    setIsNewTabTypeMenuOpen(false);
    setFieldErrors({ name: '', category: '', location: '', link: '' });
  }, [profile]);

  useEffect(() => {
    if (!categoryOptions.length) return;
    const current = String(category || '').trim().toLowerCase();
    const hasCustom = String(customCategory || '').trim().length > 0;
    if (!current && !hasCustom) {
      setCategory(categoryOptions[0]);
      return;
    }
    if (!current) return;
    const exists = categoryOptions.some((item) => String(item || '').trim().toLowerCase() === current);
    if (!exists) setCategory(categoryOptions[0]);
  }, [profileType, categoryOptions, category, customCategory]);

  useEffect(() => {
    if (!tabs.length) {
      setActiveTabId('');
      return;
    }
    const exists = tabs.some((tab) => tab.id === activeTabId);
    if (!exists) setActiveTabId(tabs[0].id);
  }, [tabs, activeTabId]);

  const activeMenuSection = useMemo(
    () => menuSectionsState.find((sec) => sec.id === activeMenuSectionId) || menuSectionsState[0] || null,
    [menuSectionsState, activeMenuSectionId]
  );
  const activeServicesSection = useMemo(
    () => servicesSectionsState.find((sec) => sec.id === activeServicesSectionId) || servicesSectionsState[0] || null,
    [servicesSectionsState, activeServicesSectionId]
  );
  const activeProductsSection = useMemo(
    () => productsSectionsState.find((sec) => sec.id === activeProductsSectionId) || productsSectionsState[0] || null,
    [productsSectionsState, activeProductsSectionId]
  );
  const activePortfolioSection = useMemo(
    () => portfolioSectionsState.find((sec) => sec.id === activePortfolioSectionId) || portfolioSectionsState[0] || null,
    [portfolioSectionsState, activePortfolioSectionId]
  );
  const activeHousesSection = useMemo(
    () => housesSectionsState.find((sec) => sec.id === activeHousesSectionId) || housesSectionsState[0] || null,
    [housesSectionsState, activeHousesSectionId]
  );
  const activeRoomsSection = useMemo(
    () => roomsSectionsState.find((sec) => sec.id === activeRoomsSectionId) || roomsSectionsState[0] || null,
    [roomsSectionsState, activeRoomsSectionId]
  );

  function updateSectionLabel(setter, activeId, value) {
    setter((prev) => prev.map((sec) => (sec.id === activeId ? { ...sec, label: value } : sec)));
  }

  function updateSectionEnabled(setter, activeId, enabled) {
    setter((prev) => prev.map((sec) => (sec.id === activeId ? { ...sec, enabled: !!enabled } : sec)));
  }

  function addSection(setter, activeSetter, sections, labelBase, emptyItemFactory) {
    const id = makeLocalId('sec');
    const nextLabel = `${labelBase} ${Math.max(1, (sections || []).length + 1)}`;
    setter((prev) => [...prev, { id, label: nextLabel, enabled: true, items: [emptyItemFactory()] }]);
    activeSetter(id);
  }

  function removeSection(setter, activeSetter, sections, activeId, fallbackLabel, emptyItemFactory) {
    if (!Array.isArray(sections) || sections.length <= 1) return;
    const next = sections.filter((sec) => sec.id !== activeId);
    setter(next.length ? next : [{ id: makeLocalId('sec'), label: fallbackLabel, items: [emptyItemFactory()] }]);
    activeSetter(next[0]?.id || '');
  }

  function addItemToActiveSection(setter, activeId, emptyItemFactory) {
    if (!activeId) return;
    setter((prev) => prev.map((sec) => (
      sec.id === activeId ? { ...sec, items: [...(sec.items || []), emptyItemFactory()] } : sec
    )));
  }

  function updateItemInActiveSection(setter, activeId, index, key, value) {
    if (!activeId) return;
    setter((prev) => prev.map((sec) => {
      if (sec.id !== activeId) return sec;
      const items = Array.isArray(sec.items) ? sec.items : [];
      return {
        ...sec,
        items: items.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
      };
    }));
  }

  function removeItemFromActiveSection(setter, activeId, index, emptyItemFactory) {
    if (!activeId) return;
    setter((prev) => prev.map((sec) => {
      if (sec.id !== activeId) return sec;
      const items = Array.isArray(sec.items) ? sec.items : [];
      const next = items.filter((_, idx) => idx !== index);
      return { ...sec, items: next.length ? next : [emptyItemFactory()] };
    }));
  }

  function duplicateItemInActiveSection(setter, activeId, index) {
    if (!activeId || index < 0) return;
    setter((prev) => prev.map((sec) => {
      if (sec.id !== activeId) return sec;
      const items = Array.isArray(sec.items) ? sec.items : [];
      const source = items[index];
      if (!source || typeof source !== 'object') return sec;
      const clone = JSON.parse(JSON.stringify(source));
      const next = [...items];
      next.splice(index + 1, 0, clone);
      return { ...sec, items: next };
    }));
  }

  function moveArrayItemById(list, id, direction) {
    const items = Array.isArray(list) ? [...list] : [];
    const idx = items.findIndex((item) => item?.id === id);
    if (idx < 0) return items;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= items.length) return items;
    const [moved] = items.splice(idx, 1);
    items.splice(nextIdx, 0, moved);
    return items;
  }

  function moveActiveTab(direction) {
    if (!activeTabId) return;
    setTabs((prev) => moveArrayItemById(prev, activeTabId, direction));
  }

  function moveActiveSection(setter, activeId, direction) {
    if (!activeId) return;
    setter((prev) => moveArrayItemById(prev, activeId, direction));
  }

  function clearFieldError(key) {
    if (!key) return;
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  }

  function validateRequiredFields() {
    const next = { name: '', category: '', location: '', link: '' };
    const effectiveCategory = String(customCategory || '').trim() || String(category || '').trim();

    if (!String(name || '').trim()) next.name = 'Preenche o nome do perfil.';
    if (!effectiveCategory) next.category = 'Seleciona ou escreve uma categoria.';
    if (!String(location || '').trim()) next.location = 'Preenche a localização.';

    setFieldErrors(next);
    return !next.name && !next.category && !next.location;
  }

  function handleAddLink() {
    const url = String(newLinkValue || '').trim();
    if (!url) {
      setFieldErrors((prev) => ({ ...prev, link: 'Preenche o link antes de adicionar.' }));
      return;
    }
    if (editingLinkKey) {
      setLinks((prev) =>
        prev.map((item) =>
          item.key === editingLinkKey
            ? {
                ...item,
                type: newLinkType,
                url,
                label: String(newLinkLabel || '').trim(),
              }
            : item
        )
      );
      setEditingLinkKey('');
    } else {
      setLinks((prev) => [
        ...prev,
        {
          key: `link-${Date.now()}`,
          type: newLinkType,
          url,
          label: String(newLinkLabel || '').trim(),
        },
      ]);
    }
    setNewLinkValue('');
    setNewLinkLabel('');
    clearFieldError('link');
  }

  function handleRemoveLink(key) {
    setLinks((prev) => prev.filter((item) => item.key !== key));
    if (editingLinkKey === key) {
      setEditingLinkKey('');
      setNewLinkValue('');
      setNewLinkLabel('');
      setNewLinkType('instagram');
    }
  }

  function handleEditLink(item) {
    if (!item) return;
    setEditingLinkKey(String(item.key || ''));
    setNewLinkType(String(item.type || 'website'));
    setNewLinkValue(String(item.url || '').trim());
    setNewLinkLabel(String(item.label || '').trim());
    setIsLinkTypeMenuOpen(false);
  }

  function handleCancelEditLink() {
    setEditingLinkKey('');
    setNewLinkType('instagram');
    setNewLinkValue('');
    setNewLinkLabel('');
  }

  function handleAddTab() {
    const type = String(newTabType || 'sobre').toLowerCase();
    const defaultLabel = tabTypeLabelMap[type] || 'Aba';
    const label = String(newTabLabel || '').trim() || defaultLabel;
    const id = makeTabId(type, label, tabs);
    setTabs((prev) => [...prev, { id, label, type, enabled: true }]);
    setActiveTabId(id);
    setNewTabLabel('');
    setIsNewTabTypeMenuOpen(false);
  }

  function handleToggleTabEnabled(tabId) {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) return tab;
        return { ...tab, enabled: tab.enabled === false };
      })
    );
  }

  function handleRemoveTab(tabId) {
    const target = tabs.find((tab) => tab.id === tabId);
    if (!target) return;
    const next = tabs.filter((tab) => tab.id !== tabId);
    setTabs(next);
    if (activeTabId === tabId) {
      setActiveTabId(next[0]?.id || '');
    }
  }

  const isBlueprintTabs = useMemo(
    () => tabsEqual(tabs, getTabsForType(profileType)),
    [tabs, profileType]
  );
  const avatarPreviewUri = useMemo(() => resolveAvatarUri(avatar), [avatar]);

  async function handleUploadAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission?.granted) {
      Alert.alert('Permissao', 'Permite acesso a fotos para carregar imagem de perfil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (result?.canceled || !Array.isArray(result?.assets) || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.base64) {
      const mime = asset.mimeType || 'image/jpeg';
      setAvatar(`data:${mime};base64,${asset.base64}`);
      return;
    }
    if (asset.uri) {
      setAvatar(asset.uri);
    }
  }

  function getGalleryItemsByTab(tab) {
    if (tab === 'videos') return galleryVideos;
    return galleryPhotos;
  }

  function resolveGalleryTab(tab) {
    if (tab === 'videos') return tab;
    return 'photos';
  }

  function setGalleryItemsByTab(tab, updater) {
    const targetTab = resolveGalleryTab(tab);
    if (targetTab === 'videos') {
      setGalleryVideos((prev) => {
        const next = updater(prev);
        return Array.isArray(next) ? next : prev;
      });
      return;
    }
    setGalleryPhotos((prev) => {
      const next = updater(prev);
      return Array.isArray(next) ? next : prev;
    });
  }

  function getGalleryItemFit(tab, uri) {
    const targetTab = resolveGalleryTab(tab);
    const key = String(uri || '').trim();
    if (!key) return normalizeGalleryModalFitValue(galleryModalFit?.[targetTab]);
    const byItem = galleryItemFitMap?.[targetTab]?.[key];
    if (byItem) return normalizeGalleryModalFitValue(byItem);
    return normalizeGalleryModalFitValue(galleryModalFit?.[targetTab]);
  }

  function setGalleryItemFit(tab, uri, fit) {
    const targetTab = resolveGalleryTab(tab);
    const key = String(uri || '').trim();
    if (!key) return;
    const nextFit = normalizeGalleryModalFitValue(fit);
    setGalleryItemFitMap((prev) => ({
      photos: { ...(prev?.photos || {}) },
      videos: { ...(prev?.videos || {}) },
      reels: { ...(prev?.reels || {}) },
      [targetTab]: {
        ...(prev?.[targetTab] || {}),
        [key]: nextFit,
      },
    }));
  }

  function getGalleryItemCrop(tab, uri) {
    const targetTab = resolveGalleryTab(tab);
    const key = String(uri || '').trim();
    if (!key) return { x: 0, y: 0, scale: 1.12 };
    const item = galleryItemCropMap?.[targetTab]?.[key];
    if (!item || typeof item !== 'object') return { x: 0, y: 0, scale: 1.12 };
    return {
      x: normalizeGalleryCropNumber(item.x, 0),
      y: normalizeGalleryCropNumber(item.y, 0),
      scale: Math.max(1, Math.min(3, normalizeGalleryCropNumber(item.scale, 1.12))),
    };
  }

  function setGalleryItemCrop(tab, uri, cropPatch) {
    const targetTab = resolveGalleryTab(tab);
    const key = String(uri || '').trim();
    if (!key) return;
    const safeNext = {
      x: normalizeGalleryCropNumber(cropPatch?.x, 0),
      y: normalizeGalleryCropNumber(cropPatch?.y, 0),
      scale: Math.max(1, Math.min(3, normalizeGalleryCropNumber(cropPatch?.scale, 1.12))),
    };
    setGalleryItemCropMap((prev) => ({
      photos: { ...(prev?.photos || {}) },
      videos: { ...(prev?.videos || {}) },
      reels: { ...(prev?.reels || {}) },
      [targetTab]: {
        ...(prev?.[targetTab] || {}),
        [key]: safeNext,
      },
    }));
  }

  function removeGalleryItemFit(tab, uri) {
    const targetTab = resolveGalleryTab(tab);
    const key = String(uri || '').trim();
    if (!key) return;
    setGalleryItemFitMap((prev) => {
      const source = prev?.[targetTab] || {};
      if (!Object.prototype.hasOwnProperty.call(source, key)) return prev;
      const nextTabMap = { ...source };
      delete nextTabMap[key];
      return {
        photos: { ...(prev?.photos || {}) },
        videos: { ...(prev?.videos || {}) },
        reels: { ...(prev?.reels || {}) },
        [targetTab]: nextTabMap,
      };
    });
  }

  function removeGalleryItemCrop(tab, uri) {
    const targetTab = resolveGalleryTab(tab);
    const key = String(uri || '').trim();
    if (!key) return;
    setGalleryItemCropMap((prev) => {
      const source = prev?.[targetTab] || {};
      if (!Object.prototype.hasOwnProperty.call(source, key)) return prev;
      const nextTabMap = { ...source };
      delete nextTabMap[key];
      return {
        photos: { ...(prev?.photos || {}) },
        videos: { ...(prev?.videos || {}) },
        reels: { ...(prev?.reels || {}) },
        [targetTab]: nextTabMap,
      };
    });
  }

  function getContentImageFit(uri) {
    const key = String(uri || '').trim();
    if (!key) return 'cover';
    return normalizeGalleryModalFitValue(contentImageFitMap?.[key] || 'cover');
  }

  function setContentImageFit(uri, fit) {
    const key = String(uri || '').trim();
    if (!key) return;
    setContentImageFitMap((prev) => ({
      ...(prev || {}),
      [key]: normalizeGalleryModalFitValue(fit),
    }));
  }

  function getContentImageCrop(uri) {
    const key = String(uri || '').trim();
    if (!key) return { x: 0, y: 0, scale: 1.12 };
    const crop = contentImageCropMap?.[key];
    if (!crop || typeof crop !== 'object') return { x: 0, y: 0, scale: 1.12 };
    return {
      x: normalizeGalleryCropNumber(crop?.x, 0),
      y: normalizeGalleryCropNumber(crop?.y, 0),
      scale: Math.max(1, Math.min(3, normalizeGalleryCropNumber(crop?.scale, 1.12))),
    };
  }

  function setContentImageCrop(uri, cropPatch) {
    const key = String(uri || '').trim();
    if (!key) return;
    const safeNext = {
      x: normalizeGalleryCropNumber(cropPatch?.x, 0),
      y: normalizeGalleryCropNumber(cropPatch?.y, 0),
      scale: Math.max(1, Math.min(3, normalizeGalleryCropNumber(cropPatch?.scale, 1.12))),
    };
    setContentImageCropMap((prev) => ({
      ...(prev || {}),
      [key]: safeNext,
    }));
  }

  function removeContentImageMap(uri) {
    const key = String(uri || '').trim();
    if (!key) return;
    setContentImageFitMap((prev) => {
      if (!prev || !Object.prototype.hasOwnProperty.call(prev, key)) return prev || {};
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setContentImageCropMap((prev) => {
      if (!prev || !Object.prototype.hasOwnProperty.call(prev, key)) return prev || {};
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function closeContentImageEditor() {
    setContentImageEditorOpen(false);
    setContentImageEditorContext(null);
    setContentImageEditorUri('');
    setContentImageEditorFit('cover');
    setContentImageEditorCrop({ x: 0, y: 0, scale: 1.12 });
  }

  function updateLodgingImagesForContext(context, nextImagesRaw) {
    const ctx = context || {};
    const kind = ctx.kind === 'quartos' ? 'quartos' : 'casas';
    const setSections = kind === 'quartos' ? setRoomsSectionsState : setHousesSectionsState;
    const sectionId = String(ctx.sectionId || '');
    const itemIndex = Number(ctx.itemIndex);
    if (!sectionId || itemIndex < 0) return;
    const cleaned = uniqueAmenityList(nextImagesRaw).filter(Boolean).slice(0, 18);
    updateItemInActiveSection(setSections, sectionId, itemIndex, 'images', cleaned);
    updateItemInActiveSection(setSections, sectionId, itemIndex, 'image', cleaned[0] || '');
  }

  function applyContentImageToContext(context, nextUri) {
    const ctx = context || {};
    const safeUri = String(nextUri || '').trim();
    if (ctx.source === 'campaigns') {
      const itemIndex = Number(ctx.itemIndex);
      const imageIndex = Number(ctx.imageIndex);
      if (itemIndex < 0 || imageIndex < 0) return;
      setCampaignsRows((prevRows) =>
        (Array.isArray(prevRows) ? prevRows : []).map((row, idx) => {
          if (idx !== itemIndex) return row;
          const currentImages = uniqueAmenityList([
            ...normalizeMediaList(row?.images),
            ...normalizeMediaList(row?.image ? [row.image] : []),
          ]);
          const nextImages = currentImages.map((entry, imgIdx) => (imgIdx === imageIndex ? safeUri : entry));
          return { ...row, images: nextImages, image: nextImages[0] || '' };
        })
      );
      return;
    }
    const sectionId = String(ctx.sectionId || '');
    const itemIndex = Number(ctx.itemIndex);
    if (!sectionId || itemIndex < 0) return;

    if (ctx.source === 'menu') {
      updateItemInActiveSection(setMenuSectionsState, sectionId, itemIndex, 'image', safeUri);
      return;
    }
    if (ctx.source === 'services') {
      updateItemInActiveSection(setServicesSectionsState, sectionId, itemIndex, 'image', safeUri);
      return;
    }
    if (ctx.source === 'products') {
      updateItemInActiveSection(setProductsSectionsState, sectionId, itemIndex, 'image', safeUri);
      return;
    }
    if (ctx.source === 'portfolio') {
      updateItemInActiveSection(setPortfolioSectionsState, sectionId, itemIndex, 'image', safeUri);
      return;
    }
    if (ctx.source === 'lodging') {
      const images = Array.isArray(ctx.imagesSnapshot) ? ctx.imagesSnapshot : [];
      const imageIndex = Number(ctx.imageIndex);
      if (imageIndex < 0 || imageIndex >= images.length) return;
      const nextImages = [...images];
      nextImages[imageIndex] = safeUri;
      updateLodgingImagesForContext(ctx, nextImages);
      return;
    }
  }

  function removeContentImageFromContext(context) {
    const ctx = context || {};
    const sectionId = String(ctx.sectionId || '');
    const itemIndex = Number(ctx.itemIndex);
    if (!sectionId || itemIndex < 0) return;

    if (ctx.source === 'menu') {
      updateItemInActiveSection(setMenuSectionsState, sectionId, itemIndex, 'image', '');
      return;
    }
    if (ctx.source === 'services') {
      updateItemInActiveSection(setServicesSectionsState, sectionId, itemIndex, 'image', '');
      return;
    }
    if (ctx.source === 'products') {
      updateItemInActiveSection(setProductsSectionsState, sectionId, itemIndex, 'image', '');
      return;
    }
    if (ctx.source === 'portfolio') {
      updateItemInActiveSection(setPortfolioSectionsState, sectionId, itemIndex, 'image', '');
      return;
    }
    if (ctx.source === 'lodging') {
      const images = Array.isArray(ctx.imagesSnapshot) ? ctx.imagesSnapshot : [];
      const imageIndex = Number(ctx.imageIndex);
      if (imageIndex < 0 || imageIndex >= images.length) return;
      const nextImages = images.filter((_, idx) => idx !== imageIndex);
      updateLodgingImagesForContext(ctx, nextImages);
      return;
    }
    if (ctx.source === 'campaigns') {
      const itemIndex = Number(ctx.itemIndex);
      const imageIndex = Number(ctx.imageIndex);
      if (itemIndex < 0 || imageIndex < 0) return;
      setCampaignsRows((prevRows) =>
        (Array.isArray(prevRows) ? prevRows : []).map((row, idx) => {
          if (idx !== itemIndex) return row;
          const nextImages = uniqueAmenityList([
            ...normalizeMediaList(row?.images),
            ...normalizeMediaList(row?.image ? [row.image] : []),
          ]).filter((_, imageIdx) => imageIdx !== imageIndex);
          return { ...row, images: nextImages, image: nextImages[0] || '' };
        })
      );
    }
  }

  function openCampaignVideoEditor(itemIndex, videoIndex, uri) {
    const safeUri = String(uri || '').trim();
    if (!safeUri || itemIndex < 0 || videoIndex < 0) return;
    setCampaignVideoEditorItemIndex(itemIndex);
    setCampaignVideoEditorIndex(videoIndex);
    setCampaignVideoEditorUri(safeUri);
    setCampaignVideoEditorOpen(true);
  }

  function closeCampaignVideoEditor() {
    setCampaignVideoEditorOpen(false);
    setCampaignVideoEditorItemIndex(-1);
    setCampaignVideoEditorIndex(-1);
    setCampaignVideoEditorUri('');
  }

  async function handleReplaceCampaignVideoEditorItem() {
    if (!campaignVideoEditorOpen || campaignVideoEditorItemIndex < 0 || campaignVideoEditorIndex < 0) return;
    const nextUri = await pickSingleVideoUri();
    if (!nextUri) return;
    setCampaignsRows((prevRows) =>
      (Array.isArray(prevRows) ? prevRows : []).map((row, idx) => {
        if (idx !== campaignVideoEditorItemIndex) return row;
        const currentVideos = uniqueAmenityList([
          ...normalizeMediaList(row?.videos),
          ...normalizeMediaList(row?.video ? [row.video] : []),
        ]);
        const nextVideos = currentVideos.map((entry, vIdx) => (vIdx === campaignVideoEditorIndex ? nextUri : entry));
        return { ...row, videos: nextVideos, video: nextVideos[0] || '' };
      })
    );
    setCampaignVideoEditorUri(nextUri);
  }

  function handleRemoveCampaignVideoEditorItem() {
    if (!campaignVideoEditorOpen || campaignVideoEditorItemIndex < 0 || campaignVideoEditorIndex < 0) return;
    setCampaignsRows((prevRows) =>
      (Array.isArray(prevRows) ? prevRows : []).map((row, idx) => {
        if (idx !== campaignVideoEditorItemIndex) return row;
        const currentVideos = uniqueAmenityList([
          ...normalizeMediaList(row?.videos),
          ...normalizeMediaList(row?.video ? [row.video] : []),
        ]);
        const nextVideos = currentVideos.filter((_, vIdx) => vIdx !== campaignVideoEditorIndex);
        return { ...row, videos: nextVideos, video: nextVideos[0] || '' };
      })
    );
    closeCampaignVideoEditor();
  }

  async function ensureMediaLibraryPermission(mediaLabel = 'fotos') {
    let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!permission?.granted) {
      permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
    if (permission?.granted) return true;
    if (permission?.canAskAgain === false) {
      Alert.alert(
        'Permissão necessária',
        `Ativa o acesso a ${mediaLabel} nas Definições do telemóvel para continuar.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Abrir Definições',
            onPress: () => {
              Linking.openSettings().catch(() => {});
            },
          },
        ]
      );
      return false;
    }
    Alert.alert('Permissão', `Permite acesso a ${mediaLabel} para continuar.`);
    return false;
  }

  async function pickSingleImageUri() {
    const granted = await ensureMediaLibraryPermission('fotos');
    if (!granted) return '';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (result?.canceled || !Array.isArray(result?.assets) || !result.assets[0]) return '';
    return String(result.assets[0]?.uri || '').trim();
  }

  async function pickSingleVideoUri() {
    const granted = await ensureMediaLibraryPermission('vídeos');
    if (!granted) return '';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.85,
    });
    if (result?.canceled || !Array.isArray(result?.assets) || !result.assets[0]) return '';
    return String(result.assets[0]?.uri || '').trim();
  }

  function openContentImageEditor(context, uri) {
    const safeUri = String(uri || '').trim();
    if (!safeUri) return;
    const fit = getContentImageFit(safeUri) || 'cover';
    const crop = getContentImageCrop(safeUri);
    const normalizedCrop = {
      x: normalizeGalleryCropNumber(crop?.x, 0),
      y: normalizeGalleryCropNumber(crop?.y, 0),
      scale: Math.max(1.08, normalizeGalleryCropNumber(crop?.scale, 1.12)),
    };
    setContentImageEditorContext(context || null);
    setContentImageEditorUri(safeUri);
    setContentImageEditorFit(fit === 'contain' ? 'contain' : 'cover');
    contentImageEditorCropRef.current = normalizedCrop;
    setContentImageEditorCrop(normalizedCrop);
    setContentImageEditorOpen(true);
  }

  async function handleReplaceContentImageEditorItem() {
    if (!contentImageEditorOpen || !contentImageEditorContext) return;
    const oldUri = String(contentImageEditorUri || '').trim();
    if (!oldUri) return;
    const nextUri = await pickSingleImageUri();
    if (!nextUri) return;

    const currentFit = getContentImageFit(oldUri);
    const currentCrop = getContentImageCrop(oldUri);
    applyContentImageToContext(contentImageEditorContext, nextUri);
    removeContentImageMap(oldUri);
    setContentImageFit(nextUri, currentFit);
    setContentImageCrop(nextUri, currentCrop);
    setContentImageEditorUri(nextUri);
  }

  function handleRemoveContentImageEditorItem() {
    if (!contentImageEditorOpen || !contentImageEditorContext) return;
    const oldUri = String(contentImageEditorUri || '').trim();
    removeContentImageFromContext(contentImageEditorContext);
    if (oldUri) removeContentImageMap(oldUri);
    closeContentImageEditor();
  }

  function openGalleryItemEditor(tab, index) {
    const targetTab = resolveGalleryTab(tab);
    const items = getGalleryItemsByTab(targetTab);
    if (!Array.isArray(items) || index < 0 || index >= items.length) return;
    const uri = String(items?.[index] || '').trim();
    if (targetTab === 'photos' && uri) {
      setGalleryItemFit(targetTab, uri, 'cover');
      const savedCrop = getGalleryItemCrop(targetTab, uri);
      setGalleryEditorCrop({
        x: normalizeGalleryCropNumber(savedCrop?.x, 0),
        y: normalizeGalleryCropNumber(savedCrop?.y, 0),
        scale: Math.max(1.08, normalizeGalleryCropNumber(savedCrop?.scale, 1.12)),
      });
    }
    setGalleryEditorTab(targetTab);
    setGalleryEditorIndex(index);
    setGalleryEditorOpen(true);
  }

  function closeGalleryItemEditor() {
    setGalleryEditorOpen(false);
    setGalleryEditorIndex(-1);
  }

  function handleRemoveGalleryItem(index, tab = galleryTab) {
    const targetTab = resolveGalleryTab(tab);
    const items = getGalleryItemsByTab(targetTab);
    const uri = String(items?.[index] || '').trim();
    setGalleryItemsByTab(targetTab, (prev) => prev.filter((_, idx) => idx !== index));
    if (uri) removeGalleryItemFit(targetTab, uri);
    if (uri) removeGalleryItemCrop(targetTab, uri);
    if (galleryEditorOpen && galleryEditorTab === targetTab) {
      closeGalleryItemEditor();
    }
  }

  function handleMoveGalleryItem(fromIndex, toIndex) {
    setGalleryItemsByTab(galleryTab, (prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      if (fromIndex < 0 || fromIndex >= list.length) return list;
      if (toIndex < 0 || toIndex >= list.length || toIndex === fromIndex) return list;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return list;
    });
    galleryDragRef.current = { ...galleryDragRef.current, index: toIndex };
    setGalleryDragState((prev) => ({ ...prev, index: toIndex }));
  }

  async function pickGalleryMediaUriForTab(tab) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission?.granted) {
      Alert.alert('Permissão', 'Permite acesso a fotos/vídeos para adicionar na galeria.');
      return '';
    }

    const targetTab = resolveGalleryTab(tab);
    const mediaTypes = targetTab === 'photos'
      ? ImagePicker.MediaTypeOptions.Images
      : ImagePicker.MediaTypeOptions.Videos;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result?.canceled || !Array.isArray(result?.assets) || !result.assets[0]) return '';
    const uri = String(result.assets[0]?.uri || '').trim();
    if (!uri) return '';
    return uri;
  }

  async function handlePickGalleryMedia() {
    const targetTab = resolveGalleryTab(galleryTab);
    const uri = await pickGalleryMediaUriForTab(targetTab);
    if (!uri) return;
    const nextIndex = getGalleryItemsByTab(targetTab).length;
    setGalleryItemsByTab(targetTab, (prev) => [...prev, uri]);
    setGalleryItemFit(targetTab, uri, galleryModalFit?.[targetTab] || 'contain');
    setGalleryItemCrop(targetTab, uri, { x: 0, y: 0, scale: 1.12 });
    setTimeout(() => openGalleryItemEditor(targetTab, nextIndex), 0);
  }

  async function handleReplaceGalleryEditorItem() {
    const targetTab = resolveGalleryTab(galleryEditorTab);
    const index = Number(galleryEditorIndex);
    if (index < 0) return;
    const currentItems = getGalleryItemsByTab(targetTab);
    const oldUri = String(currentItems?.[index] || '').trim();
    if (!oldUri) return;
    const nextUri = await pickGalleryMediaUriForTab(targetTab);
    if (!nextUri) return;
    const currentFit = getGalleryItemFit(targetTab, oldUri);
    const currentCrop = getGalleryItemCrop(targetTab, oldUri);
    setGalleryItemsByTab(targetTab, (prev) => prev.map((item, idx) => (idx === index ? nextUri : item)));
    removeGalleryItemFit(targetTab, oldUri);
    removeGalleryItemCrop(targetTab, oldUri);
    setGalleryItemFit(targetTab, nextUri, currentFit);
    setGalleryItemCrop(targetTab, nextUri, currentCrop);
  }

  const galleryCurrentItems = useMemo(
    () => getGalleryItemsByTab(galleryTab),
    [galleryTab, galleryPhotos, galleryVideos, galleryReels]
  );
  const galleryEditorItems = useMemo(
    () => getGalleryItemsByTab(galleryEditorTab),
    [galleryEditorTab, galleryPhotos, galleryVideos, galleryReels]
  );
  const galleryEditorUri = String(galleryEditorItems?.[galleryEditorIndex] || '').trim();
  const galleryEditorPreviewUri = resolveAvatarUri(galleryEditorUri) || galleryEditorUri;
  const galleryEditorFit = getGalleryItemFit(galleryEditorTab, galleryEditorUri);

  function clampGalleryEditorCrop(nextCrop) {
    const width = Number(galleryEditorPreviewSize?.width || 0);
    const height = Number(galleryEditorPreviewSize?.height || 0);
    const scale = Math.max(1, Math.min(3, normalizeGalleryCropNumber(nextCrop?.scale, 1.12)));
    const maxX = width > 0 ? ((scale - 1) * width) / 2 : 0;
    const maxY = height > 0 ? ((scale - 1) * height) / 2 : 0;
    return {
      x: Math.max(-maxX, Math.min(maxX, normalizeGalleryCropNumber(nextCrop?.x, 0))),
      y: Math.max(-maxY, Math.min(maxY, normalizeGalleryCropNumber(nextCrop?.y, 0))),
      scale,
    };
  }

  function updateGalleryEditorCrop(nextCrop, persist = true) {
    const clamped = clampGalleryEditorCrop(nextCrop);
    galleryEditorCropRef.current = clamped;
    setGalleryEditorCrop(clamped);
    if (persist && galleryEditorUri) {
      setGalleryItemCrop(galleryEditorTab, galleryEditorUri, clamped);
    }
  }

  function updateGalleryEditorScale(delta) {
    const base = galleryEditorCropRef.current || galleryEditorCrop;
    const nextScale = Math.max(1, Math.min(3, normalizeGalleryCropNumber(base?.scale, 1.12) + delta));
    updateGalleryEditorCrop({ ...base, scale: nextScale }, true);
  }

  function getTouchesDistance(nativeEvent) {
    const touches = Array.isArray(nativeEvent?.touches)
      ? nativeEvent.touches
      : Array.isArray(nativeEvent?.changedTouches)
        ? nativeEvent.changedTouches
        : [];
    if (!Array.isArray(touches) || touches.length < 2) return 0;
    const a = touches[0];
    const b = touches[1];
    const ax = normalizeGalleryCropNumber(a?.pageX ?? a?.locationX ?? a?.x, 0);
    const ay = normalizeGalleryCropNumber(a?.pageY ?? a?.locationY ?? a?.y, 0);
    const bx = normalizeGalleryCropNumber(b?.pageX ?? b?.locationX ?? b?.x, 0);
    const by = normalizeGalleryCropNumber(b?.pageY ?? b?.locationY ?? b?.y, 0);
    const dx = bx - ax;
    const dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const galleryEditorPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => {
          if (!galleryEditorOpen) return false;
          if (galleryEditorTab !== 'photos') return false;
          if (galleryEditorFit !== 'cover') return false;
          if (!galleryEditorUri) return false;
          return true;
        },
        onStartShouldSetPanResponderCapture: () => {
          if (!galleryEditorOpen) return false;
          if (galleryEditorTab !== 'photos') return false;
          if (galleryEditorFit !== 'cover') return false;
          if (!galleryEditorUri) return false;
          return true;
        },
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          if (!galleryEditorOpen) return false;
          if (galleryEditorTab !== 'photos') return false;
          if (galleryEditorFit !== 'cover') return false;
          if (!galleryEditorUri) return false;
          const moved = Math.abs(gestureState?.dx || 0) + Math.abs(gestureState?.dy || 0);
          return moved >= 0;
        },
        onMoveShouldSetPanResponderCapture: () => {
          if (!galleryEditorOpen) return false;
          if (galleryEditorTab !== 'photos') return false;
          if (galleryEditorFit !== 'cover') return false;
          if (!galleryEditorUri) return false;
          return true;
        },
        onPanResponderGrant: (evt) => {
          galleryEditorDragStartRef.current = {
            x: normalizeGalleryCropNumber(galleryEditorCropRef.current?.x, 0),
            y: normalizeGalleryCropNumber(galleryEditorCropRef.current?.y, 0),
          };
          galleryEditorMoveRef.current = { mode: 'drag', lastDx: 0, lastDy: 0 };
          const distance = getTouchesDistance(evt?.nativeEvent);
          if (distance > 0) {
            galleryEditorPinchRef.current = {
              active: true,
              startDistance: distance,
              startScale: normalizeGalleryCropNumber(galleryEditorCropRef.current?.scale, 1.12),
            };
            galleryEditorMoveRef.current.mode = 'pinch';
          } else {
            galleryEditorPinchRef.current = { active: false, startDistance: 0, startScale: 1.12 };
          }
        },
        onPanResponderStart: (evt) => {
          const distance = getTouchesDistance(evt?.nativeEvent);
          if (distance > 0) {
            galleryEditorPinchRef.current = {
              active: true,
              startDistance: distance,
              startScale: normalizeGalleryCropNumber(galleryEditorCropRef.current?.scale, 1.12),
            };
            galleryEditorMoveRef.current.mode = 'pinch';
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          const activeTouches = Math.max(0, normalizeGalleryCropNumber(gestureState?.numberActiveTouches, 0));
          const pinchDistance = getTouchesDistance(evt?.nativeEvent);
          if (activeTouches >= 2 || pinchDistance > 0) {
            if (!galleryEditorPinchRef.current.active) {
              galleryEditorPinchRef.current = {
                active: true,
                startDistance: Math.max(1, pinchDistance),
                startScale: normalizeGalleryCropNumber(galleryEditorCropRef.current?.scale, 1.12),
              };
            }
            galleryEditorMoveRef.current.mode = 'pinch';
            if (pinchDistance <= 0) return;
            const baseDistance = Math.max(1, normalizeGalleryCropNumber(galleryEditorPinchRef.current.startDistance, 1));
            const ratio = pinchDistance / baseDistance;
            const tunedRatio = 1 + (ratio - 1) * 1.35;
            const nextScale = Math.max(
              1,
              Math.min(3, normalizeGalleryCropNumber(galleryEditorPinchRef.current.startScale, 1.12) * tunedRatio)
            );
            updateGalleryEditorCrop({ ...galleryEditorCropRef.current, scale: nextScale }, false);
            return;
          }

          if (galleryEditorPinchRef.current.active) {
            return;
          }

          const currentDx = normalizeGalleryCropNumber(gestureState?.dx, 0);
          const currentDy = normalizeGalleryCropNumber(gestureState?.dy, 0);
          const deltaX = currentDx - normalizeGalleryCropNumber(galleryEditorMoveRef.current?.lastDx, 0);
          const deltaY = currentDy - normalizeGalleryCropNumber(galleryEditorMoveRef.current?.lastDy, 0);
          galleryEditorMoveRef.current.lastDx = currentDx;
          galleryEditorMoveRef.current.lastDy = currentDy;

          const next = {
            ...galleryEditorCropRef.current,
            x: normalizeGalleryCropNumber(galleryEditorCropRef.current?.x, 0) + deltaX,
            y: normalizeGalleryCropNumber(galleryEditorCropRef.current?.y, 0) + deltaY,
          };
          updateGalleryEditorCrop(next, false);
        },
        onPanResponderRelease: () => {
          galleryEditorPinchRef.current = { active: false, startDistance: 0, startScale: 1.12 };
          galleryEditorMoveRef.current = { mode: 'drag', lastDx: 0, lastDy: 0 };
          if (!galleryEditorUri) return;
          setGalleryItemCrop(galleryEditorTab, galleryEditorUri, galleryEditorCropRef.current);
        },
        onPanResponderTerminate: () => {
          galleryEditorPinchRef.current = { active: false, startDistance: 0, startScale: 1.12 };
          galleryEditorMoveRef.current = { mode: 'drag', lastDx: 0, lastDy: 0 };
          if (!galleryEditorUri) return;
          setGalleryItemCrop(galleryEditorTab, galleryEditorUri, galleryEditorCropRef.current);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [galleryEditorOpen, galleryEditorTab, galleryEditorFit, galleryEditorUri, galleryEditorPreviewSize]
  );

  useEffect(() => {
    if (!galleryEditorOpen) return;
    if (galleryEditorIndex < 0 || galleryEditorIndex >= galleryEditorItems.length) {
      closeGalleryItemEditor();
    }
  }, [galleryEditorOpen, galleryEditorIndex, galleryEditorItems.length]);

  useEffect(() => {
    if (!galleryEditorOpen || !galleryEditorUri) return;
    const saved = getGalleryItemCrop(galleryEditorTab, galleryEditorUri);
    const clamped = clampGalleryEditorCrop(saved);
    galleryEditorCropRef.current = clamped;
    setGalleryEditorCrop(clamped);
  }, [galleryEditorOpen, galleryEditorTab, galleryEditorUri, galleryEditorFit]);

  useEffect(() => {
    if (!galleryEditorOpen) return;
    if (galleryEditorTab !== 'photos') return;
    if (galleryEditorFit !== 'cover') return;
    updateGalleryEditorCrop(galleryEditorCrop, false);
  }, [galleryEditorPreviewSize.width, galleryEditorPreviewSize.height]);

  function clampContentImageEditorCrop(nextCrop) {
    const width = Number(contentImageEditorPreviewSize?.width || 0);
    const height = Number(contentImageEditorPreviewSize?.height || 0);
    const scale = Math.max(1, Math.min(3, normalizeGalleryCropNumber(nextCrop?.scale, 1.12)));
    const maxX = width > 0 ? ((scale - 1) * width) / 2 : 0;
    const maxY = height > 0 ? ((scale - 1) * height) / 2 : 0;
    return {
      x: Math.max(-maxX, Math.min(maxX, normalizeGalleryCropNumber(nextCrop?.x, 0))),
      y: Math.max(-maxY, Math.min(maxY, normalizeGalleryCropNumber(nextCrop?.y, 0))),
      scale,
    };
  }

  function updateContentImageEditorCrop(nextCrop, persist = true) {
    const clamped = clampContentImageEditorCrop(nextCrop);
    contentImageEditorCropRef.current = clamped;
    setContentImageEditorCrop(clamped);
    if (persist && contentImageEditorUri) {
      setContentImageCrop(contentImageEditorUri, clamped);
    }
  }

  function updateContentImageEditorScale(delta) {
    const base = contentImageEditorCropRef.current || contentImageEditorCrop;
    const nextScale = Math.max(1, Math.min(3, normalizeGalleryCropNumber(base?.scale, 1.12) + delta));
    updateContentImageEditorCrop({ ...base, scale: nextScale }, true);
  }

  const contentImageEditorPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => {
          if (!contentImageEditorOpen) return false;
          if (contentImageEditorFit !== 'cover') return false;
          if (!contentImageEditorUri) return false;
          return true;
        },
        onStartShouldSetPanResponderCapture: () => {
          if (!contentImageEditorOpen) return false;
          if (contentImageEditorFit !== 'cover') return false;
          if (!contentImageEditorUri) return false;
          return true;
        },
        onMoveShouldSetPanResponder: () => {
          if (!contentImageEditorOpen) return false;
          if (contentImageEditorFit !== 'cover') return false;
          if (!contentImageEditorUri) return false;
          return true;
        },
        onMoveShouldSetPanResponderCapture: () => {
          if (!contentImageEditorOpen) return false;
          if (contentImageEditorFit !== 'cover') return false;
          if (!contentImageEditorUri) return false;
          return true;
        },
        onPanResponderGrant: (evt) => {
          contentImageEditorMoveRef.current = { mode: 'drag', lastDx: 0, lastDy: 0 };
          const distance = getTouchesDistance(evt?.nativeEvent);
          if (distance > 0) {
            contentImageEditorPinchRef.current = {
              active: true,
              startDistance: distance,
              startScale: normalizeGalleryCropNumber(contentImageEditorCropRef.current?.scale, 1.12),
            };
            contentImageEditorMoveRef.current.mode = 'pinch';
          } else {
            contentImageEditorPinchRef.current = { active: false, startDistance: 0, startScale: 1.12 };
          }
        },
        onPanResponderStart: (evt) => {
          const distance = getTouchesDistance(evt?.nativeEvent);
          if (distance > 0) {
            contentImageEditorPinchRef.current = {
              active: true,
              startDistance: distance,
              startScale: normalizeGalleryCropNumber(contentImageEditorCropRef.current?.scale, 1.12),
            };
            contentImageEditorMoveRef.current.mode = 'pinch';
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          const activeTouches = Math.max(0, normalizeGalleryCropNumber(gestureState?.numberActiveTouches, 0));
          const pinchDistance = getTouchesDistance(evt?.nativeEvent);
          if (activeTouches >= 2 || pinchDistance > 0) {
            if (!contentImageEditorPinchRef.current.active) {
              contentImageEditorPinchRef.current = {
                active: true,
                startDistance: Math.max(1, pinchDistance),
                startScale: normalizeGalleryCropNumber(contentImageEditorCropRef.current?.scale, 1.12),
              };
            }
            contentImageEditorMoveRef.current.mode = 'pinch';
            if (pinchDistance <= 0) return;
            const baseDistance = Math.max(1, normalizeGalleryCropNumber(contentImageEditorPinchRef.current.startDistance, 1));
            const ratio = pinchDistance / baseDistance;
            const tunedRatio = 1 + (ratio - 1) * 1.35;
            const nextScale = Math.max(
              1,
              Math.min(3, normalizeGalleryCropNumber(contentImageEditorPinchRef.current.startScale, 1.12) * tunedRatio)
            );
            updateContentImageEditorCrop({ ...contentImageEditorCropRef.current, scale: nextScale }, false);
            return;
          }

          if (contentImageEditorPinchRef.current.active) return;

          const currentDx = normalizeGalleryCropNumber(gestureState?.dx, 0);
          const currentDy = normalizeGalleryCropNumber(gestureState?.dy, 0);
          const deltaX = currentDx - normalizeGalleryCropNumber(contentImageEditorMoveRef.current?.lastDx, 0);
          const deltaY = currentDy - normalizeGalleryCropNumber(contentImageEditorMoveRef.current?.lastDy, 0);
          contentImageEditorMoveRef.current.lastDx = currentDx;
          contentImageEditorMoveRef.current.lastDy = currentDy;

          updateContentImageEditorCrop(
            {
              ...contentImageEditorCropRef.current,
              x: normalizeGalleryCropNumber(contentImageEditorCropRef.current?.x, 0) + deltaX,
              y: normalizeGalleryCropNumber(contentImageEditorCropRef.current?.y, 0) + deltaY,
            },
            false
          );
        },
        onPanResponderRelease: () => {
          contentImageEditorPinchRef.current = { active: false, startDistance: 0, startScale: 1.12 };
          contentImageEditorMoveRef.current = { mode: 'drag', lastDx: 0, lastDy: 0 };
          if (!contentImageEditorUri) return;
          setContentImageCrop(contentImageEditorUri, contentImageEditorCropRef.current);
        },
        onPanResponderTerminate: () => {
          contentImageEditorPinchRef.current = { active: false, startDistance: 0, startScale: 1.12 };
          contentImageEditorMoveRef.current = { mode: 'drag', lastDx: 0, lastDy: 0 };
          if (!contentImageEditorUri) return;
          setContentImageCrop(contentImageEditorUri, contentImageEditorCropRef.current);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [contentImageEditorOpen, contentImageEditorFit, contentImageEditorUri, contentImageEditorPreviewSize]
  );

  useEffect(() => {
    if (!contentImageEditorOpen || !contentImageEditorUri) return;
    const fit = getContentImageFit(contentImageEditorUri);
    const crop = getContentImageCrop(contentImageEditorUri);
    setContentImageEditorFit(fit === 'contain' ? 'contain' : 'cover');
    const clamped = clampContentImageEditorCrop(crop);
    contentImageEditorCropRef.current = clamped;
    setContentImageEditorCrop(clamped);
  }, [contentImageEditorOpen, contentImageEditorUri]);

  useEffect(() => {
    if (!contentImageEditorOpen) return;
    if (contentImageEditorFit !== 'cover') return;
    updateContentImageEditorCrop(contentImageEditorCropRef.current, false);
  }, [contentImageEditorPreviewSize.width, contentImageEditorPreviewSize.height]);

  function setGalleryDrag(active, index) {
    const next = { active, index };
    galleryDragRef.current = next;
    setGalleryDragState(next);
  }

  const galleryPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: () => galleryDragRef.current.active,
        onMoveShouldSetPanResponderCapture: () => galleryDragRef.current.active,
        onPanResponderGrant: () => {
          galleryResponderActiveRef.current = true;
        },
        onPanResponderMove: (evt) => {
          if (!galleryDragRef.current.active) return;
          if (!galleryCurrentItems.length || galleryGridWidth <= 0) return;

          const gap = 8;
          const columns = 3;
          const usable = Math.max(galleryGridWidth - gap * (columns - 1), 1);
          const cell = usable / columns;
          const step = cell + gap;
          const x = Math.max(0, (evt?.nativeEvent?.pageX || 0) - (galleryGridFrame.x || 0));
          const y = Math.max(0, (evt?.nativeEvent?.pageY || 0) - (galleryGridFrame.y || 0));
          const col = Math.max(0, Math.min(columns - 1, Math.floor(x / step)));
          const row = Math.max(0, Math.floor(y / step));
          const nextIndex = row * columns + col;
          const safeIndex = Math.max(0, Math.min(galleryCurrentItems.length - 1, nextIndex));

          if (safeIndex !== galleryDragRef.current.index) {
            handleMoveGalleryItem(galleryDragRef.current.index, safeIndex);
          }
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: () => {
          galleryResponderActiveRef.current = false;
          setGalleryDrag(false, -1);
        },
        onPanResponderTerminate: () => {
          galleryResponderActiveRef.current = false;
          setGalleryDrag(false, -1);
        },
      }),
    [galleryCurrentItems.length, galleryGridWidth, galleryGridFrame.x, galleryGridFrame.y]
  );

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) || tabs[0] || null,
    [tabs, activeTabId]
  );

  function renderAboutEditor() {
    return (
      <>
        <Text style={styles.formHint}>{tr('edit_about_hint', 'Texto principal do perfil.')}</Text>
        <RichToolbar
          editor={aboutEditorRef}
          style={styles.aboutToolbar}
          iconSize={16}
          iconTint="#334155"
          selectedIconTint="#334155"
          itemStyle={styles.aboutToolbarItem}
          unselectedButtonStyle={styles.aboutToolBtn}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.insertBulletsList,
            actions.insertOrderedList,
          ]}
        />
        <RichEditor
          key={`about-editor-${profile?.id || 'new'}`}
          ref={aboutEditorRef}
          style={styles.aboutRichEditor}
          initialHeight={300}
          initialContentHTML={String(about || '')}
          placeholder={tr('edit_about_placeholder', 'Escreve algo sobre o perfil...')}
          editorStyle={{
            backgroundColor: '#fff',
            color: '#0f172a',
            placeholderColor: '#94a3b8',
            contentCSSText: 'font-size: 15px; line-height: 1.6; padding: 8px 6px;',
          }}
          onChange={(html) => setAbout(String(html || '').trim())}
        />
      </>
    );
  }

  function renderGalleryEditor() {
    const tabOptions = [
      { id: 'photos', label: tr('profile_tab_photos', 'Fotos') },
      { id: 'videos', label: tr('profile_tab_videos', 'Vídeos') },
    ];
    const currentItems = galleryCurrentItems;
    const addLabel =
      galleryTab === 'photos'
        ? tr('edit_media_photo', 'foto')
        : tr('edit_media_video', 'vídeo');

    return (
      <>
        <Text style={styles.formHint}>{tr('edit_gallery_hint', 'Sub-abas e grelha, igual ao perfil. Pressiona e arrasta para ordenar.')}</Text>
        <View style={[styles.profileGalleryTopRow, styles.editGalleryTopRow]}>
          <View style={styles.profileGallerySubtabs}>
            {tabOptions.map((tab) => {
              const active = galleryTab === tab.id;
              return (
                <Pressable
                  key={`gallery-tab-${tab.id}`}
                  style={[styles.profileGallerySubtabBtn, active && styles.profileGallerySubtabBtnActive]}
                  onPress={() => setGalleryTab(tab.id)}
                >
                  <Text style={[styles.profileGallerySubtabText, active && styles.profileGallerySubtabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable style={styles.profileGalleryAddBtn} onPress={handlePickGalleryMedia}>
            <Ionicons name="add" size={13} color="#fff" />
          </Pressable>
        </View>
        <Text style={styles.formHintInline}>{tr('edit_gallery_add_hint', 'Ao adicionar')} {addLabel}, {tr('edit_gallery_add_hint_2', 'abre o modal para editar. Toca num item da grelha para voltar a editar.')}</Text>

        {!currentItems.length && <Text style={styles.galleryEmptyText}>{tr('edit_gallery_empty_subtab', 'Sem itens nesta sub-aba.')}</Text>}

        {!!currentItems.length && (
          <View
            ref={galleryGridRef}
            style={[styles.profileMediaGrid, styles.editMediaGrid]}
            onLayout={(e) => {
              const width = e?.nativeEvent?.layout?.width || 0;
              setGalleryGridWidth(width);
              if (galleryGridRef.current && typeof galleryGridRef.current.measureInWindow === 'function') {
                galleryGridRef.current.measureInWindow((x, y, w, h) => {
                  setGalleryGridFrame({ x: x || 0, y: y || 0, width: w || width, height: h || 0 });
                });
              }
            }}
            {...galleryPanResponder.panHandlers}
          >
            {currentItems.map((item, idx) => {
              const isDragging = galleryDragState.active && galleryDragState.index === idx;
              return (
                <View
                  key={`gallery-item-${galleryTab}-${idx}`}
                  style={[styles.editMediaItemWrap, isDragging && styles.editMediaItemDragging]}
                >
                  <Pressable
                    style={styles.editMediaDragSurface}
                    delayLongPress={180}
                    onLongPress={() => setGalleryDrag(true, idx)}
                    onPress={() => {
                      if (galleryDragRef.current.active || galleryResponderActiveRef.current) return;
                      openGalleryItemEditor(galleryTab, idx);
                    }}
                    onPressOut={() => {
                      if (
                        galleryDragRef.current.active &&
                        galleryDragRef.current.index === idx &&
                        !galleryResponderActiveRef.current
                      ) {
                        setGalleryDrag(false, -1);
                      }
                    }}
                  >
                    {galleryTab === 'photos' ? (
                      <Image source={{ uri: resolveAvatarUri(item) || item }} style={styles.editMediaThumb} />
                    ) : (
                      <View style={styles.editMediaTile}>
                        <Ionicons name="videocam-outline" size={18} color="#334155" />
                        <Text style={styles.profileMediaTileText}>{`${tr('edit_media_video', 'Vídeo')} ${idx + 1}`}</Text>
                      </View>
                    )}
                  </Pressable>
                  <Pressable style={styles.editMediaRemoveBtn} onPress={() => handleRemoveGalleryItem(idx)}>
                    <Ionicons name="close" size={11} color="#fff" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </>
    );
  }

  function renderSectionTabs(sections, activeId, setActiveId, onAddSection, onRemoveSection, options = {}) {
    const showAddButton = options?.showAddButton !== false;
    return (
      <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.editTabsRow}
        >
          {sections.map((sec) => {
            const active = sec.id === activeId;
            const enabled = sec?.enabled !== false;
            return (
              <View
                key={`sub-${sec.id}`}
                style={[
                  styles.editTabPill,
                  !enabled && styles.editTabPillDisabled,
                  active && styles.editTabPillActive,
                  active && !enabled && styles.editTabPillDisabledActive,
                ]}
              >
                <Pressable style={styles.editTabPillPress} onPress={() => setActiveId(sec.id)}>
                  <Text
                    style={[
                      styles.editTabPillText,
                      !enabled && styles.editTabPillTextDisabled,
                      active && styles.editTabPillTextActive,
                      active && !enabled && styles.editTabPillTextDisabledActive,
                    ]}
                    numberOfLines={1}
                  >
                    {translateUiLabel(sec.label)}
                  </Text>
                </Pressable>
                {sections.length > 1 && (
                  <Pressable style={styles.editTabRemoveBtn} onPress={() => onRemoveSection(sec.id)}>
                    <Text style={[styles.editTabRemoveText, active && styles.editTabRemoveTextActive]}>x</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
        {showAddButton && (
          <Pressable style={styles.secondaryBtnWide} onPress={onAddSection}>
            <Text style={styles.secondaryBtnText}>{tr('edit_add_category', '+ Categoria')}</Text>
          </Pressable>
        )}
      </>
    );
  }

  function getSubtabMoveConfig() {
    const type = String(activeTab?.type || '').toLowerCase();
    if (type === 'servicos') {
      const sections = servicesSectionsState;
      const activeId = activeServicesSection?.id;
      const idx = sections.findIndex((sec) => sec.id === activeId);
      return {
        canLeft: idx > 0,
        canRight: idx >= 0 && idx < sections.length - 1,
        onMoveLeft: () => moveActiveSection(setServicesSectionsState, activeId, -1),
        onMoveRight: () => moveActiveSection(setServicesSectionsState, activeId, 1),
      };
    }
    if (type === 'menu') {
      const sections = menuSectionsState;
      const activeId = activeMenuSection?.id;
      const idx = sections.findIndex((sec) => sec.id === activeId);
      return {
        canLeft: idx > 0,
        canRight: idx >= 0 && idx < sections.length - 1,
        onMoveLeft: () => moveActiveSection(setMenuSectionsState, activeId, -1),
        onMoveRight: () => moveActiveSection(setMenuSectionsState, activeId, 1),
      };
    }
    if (type === 'produtos') {
      const sections = productsSectionsState;
      const activeId = activeProductsSection?.id;
      const idx = sections.findIndex((sec) => sec.id === activeId);
      return {
        canLeft: idx > 0,
        canRight: idx >= 0 && idx < sections.length - 1,
        onMoveLeft: () => moveActiveSection(setProductsSectionsState, activeId, -1),
        onMoveRight: () => moveActiveSection(setProductsSectionsState, activeId, 1),
      };
    }
    if (type === 'portfolio' || type === 'portofolio') {
      const sections = portfolioSectionsState;
      const activeId = activePortfolioSection?.id;
      const idx = sections.findIndex((sec) => sec.id === activeId);
      return {
        canLeft: idx > 0,
        canRight: idx >= 0 && idx < sections.length - 1,
        onMoveLeft: () => moveActiveSection(setPortfolioSectionsState, activeId, -1),
        onMoveRight: () => moveActiveSection(setPortfolioSectionsState, activeId, 1),
      };
    }
    if (type === 'casas') {
      const sections = housesSectionsState;
      const activeId = activeHousesSection?.id;
      const idx = sections.findIndex((sec) => sec.id === activeId);
      return {
        canLeft: idx > 0,
        canRight: idx >= 0 && idx < sections.length - 1,
        onMoveLeft: () => moveActiveSection(setHousesSectionsState, activeId, -1),
        onMoveRight: () => moveActiveSection(setHousesSectionsState, activeId, 1),
      };
    }
    if (type === 'quartos') {
      const sections = roomsSectionsState;
      const activeId = activeRoomsSection?.id;
      const idx = sections.findIndex((sec) => sec.id === activeId);
      return {
        canLeft: idx > 0,
        canRight: idx >= 0 && idx < sections.length - 1,
        onMoveLeft: () => moveActiveSection(setRoomsSectionsState, activeId, -1),
        onMoveRight: () => moveActiveSection(setRoomsSectionsState, activeId, 1),
      };
    }
    return null;
  }

  function renderServicesEditor() {
    const sections = servicesSectionsState;
    const activeId = activeServicesSection?.id;
    const items = activeServicesSection?.items || [];
    const safeEditIdx = items.length && editingServiceIndex >= 0 && editingServiceIndex < items.length
      ? editingServiceIndex
      : -1;
    const editingRow = safeEditIdx >= 0 ? items[safeEditIdx] : null;
    return (
      <>
        <Text style={styles.formHint}>{tr('edit_services_hint', 'Define serviços por sub-aba/categoria (ex: Treino, Reabilitação, Nutrição).')}</Text>
        {renderSectionTabs(
          sections,
          activeId,
          setActiveServicesSectionId,
          () => addSection(setServicesSectionsState, setActiveServicesSectionId, sections, 'Categoria', emptyServiceItem),
          (secId) => removeSection(setServicesSectionsState, setActiveServicesSectionId, sections, secId, 'Serviços', emptyServiceItem),
          {
            showAddButton: false,
            onMoveSection: (direction) => moveActiveSection(setServicesSectionsState, activeId, direction),
          }
        )}
        {!!activeServicesSection && (
          <>
            <View style={styles.editToggleRowPlain}>
              <Pressable
                style={styles.editPromoSwitchRow}
                onPress={() =>
                  updateSectionEnabled(
                    setServicesSectionsState,
                    activeId,
                    activeServicesSection?.enabled === false ? true : false
                  )
                }
              >
                <View style={styles.personalAlertLeft}>
                  <Ionicons name="albums-outline" size={15} color="#334155" />
                  <Text style={styles.personalAlertLabel}>{tr('edit_subtab_active', 'Sub-aba ativa')}</Text>
                </View>
                <View style={[styles.personalAlertToggle, activeServicesSection?.enabled !== false && styles.personalAlertToggleActive]}>
                  <View style={[styles.personalAlertKnob, activeServicesSection?.enabled !== false && styles.personalAlertKnobActive]} />
                </View>
              </Pressable>
            </View>
            <View style={styles.formLabelInlineRow}>
              <Text style={[styles.formLabel, styles.formLabelInlineNoMargin]}>{tr('edit_category_name', 'Nome da categoria')}</Text>
              <Pressable
                style={[styles.formInlineIconBtn, { width: 'auto', height: 24, paddingHorizontal: 8, flexDirection: 'row', gap: 4 }]}
                onPress={() => addSection(setServicesSectionsState, setActiveServicesSectionId, sections, 'Categoria', emptyServiceItem)}
              >
                <Ionicons name="add" size={14} color="#0f172a" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>{tr('edit_add', 'Adicionar')}</Text>
              </Pressable>
            </View>
            <TextInput
              value={activeServicesSection.label}
              onChangeText={(value) => updateSectionLabel(setServicesSectionsState, activeId, value)}
              style={styles.input}
            />
            {items.map((row, idx) => {
              const serviceTitle = String(row?.description || row?.name || '').trim() || `${tr('edit_service', 'Serviço')} ${idx + 1}`;
              const isBudget = String(row?.priceMode || '').trim().toLowerCase() === 'budget';
              const meta = [String(row?.time || '').trim(), isBudget ? tr('edit_under_quote', 'Sob orçamento') : String(row?.price || '').trim()].filter(Boolean).join(' • ');
              const enabled = row?.enabled !== false;
              const active = idx === safeEditIdx;
              return (
                <View key={`svc-row-${activeId}-${idx}`} style={[styles.editServiceListRow, active && styles.editServiceListRowActive, !enabled && styles.editServiceListRowDisabled]}>
                  <Pressable
                    style={styles.editServiceListMain}
                    onPress={() => {
                      setEditingServiceIndex((prev) => (prev === idx ? -1 : idx));
                      setServiceExtrasOpen(false);
                    }}
                  >
                    <Text style={styles.editServiceListTitle} numberOfLines={1}>{serviceTitle}</Text>
                    {!!meta && <Text style={styles.editServiceListMeta} numberOfLines={1}>{meta}</Text>}
                  </Pressable>
                  {!!row?.promoEnabled && !isBudget && (
                    <View style={styles.editServicePromoChip}>
                      <Text style={styles.editServicePromoChipText}>{tr('edit_promo', 'Promo')}</Text>
                    </View>
                  )}
                  <Pressable
                    style={styles.formListCopyBtn}
                    onPress={() => updateItemInActiveSection(setServicesSectionsState, activeId, idx, 'enabled', !enabled)}
                  >
                    <Ionicons name={enabled ? 'eye-outline' : 'eye-off-outline'} size={12} color="#334155" />
                  </Pressable>
                  <Pressable
                    style={styles.formListCopyBtn}
                    onPress={() => duplicateItemInActiveSection(setServicesSectionsState, activeId, idx)}
                  >
                    <Ionicons name="copy-outline" size={12} color="#334155" />
                  </Pressable>
                  <Pressable
                    style={styles.formListDangerBtn}
                    onPress={() => {
                      removeItemFromActiveSection(setServicesSectionsState, activeId, idx, emptyServiceItem);
                      setEditingServiceIndex((prev) => (prev > 0 ? prev - 1 : 0));
                    }}
                  >
                    <Text style={styles.formListDangerText}>x</Text>
                  </Pressable>
                </View>
              );
            })}

            {!!editingRow && (
              <View style={[styles.editItemCard, styles.editItemCardCompact]}>
                <View style={styles.editInputRow}>
                  <View style={styles.editInputFlex}>
                    <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_service', 'Serviço')}</Text>
                    <TextInput
                      value={editingRow.description}
                      onChangeText={(value) => {
                        updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'description', value);
                        updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'name', value);
                      }}
                      style={styles.input}
                    />
                  </View>
                </View>
                <View style={styles.editInputRow}>
                  <View style={styles.editInputFlex}>
                    <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_duration', 'Duração')}</Text>
                    <TextInput
                      value={editingRow.time}
                      onChangeText={(value) => updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'time', value)}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.editInputFlex}>
                    <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_price', 'Preço')}</Text>
                    <TextInput
                      value={editingRow.price}
                      onChangeText={(value) => updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'price', value)}
                      style={styles.input}
                      editable={String(editingRow?.priceMode || '').trim().toLowerCase() !== 'budget'}
                    />
                  </View>
                </View>
                <View style={styles.editToggleRowPlain}>
                  <Pressable
                    style={styles.editPromoSwitchRow}
                    onPress={() => {
                      const isBudget = String(editingRow?.priceMode || '').trim().toLowerCase() === 'budget';
                      const nextMode = isBudget ? 'fixed' : 'budget';
                      updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'priceMode', nextMode);
                      if (nextMode === 'budget') {
                        updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'promoEnabled', false);
                        updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'promoOldPrice', '');
                        updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'promoNowPrice', '');
                      }
                    }}
                  >
                    <View style={styles.personalAlertLeft}>
                      <Ionicons name="receipt-outline" size={15} color="#334155" />
                      <Text style={styles.personalAlertLabel}>{tr('edit_under_quote', 'Sob orçamento')}</Text>
                    </View>
                    <View style={[styles.personalAlertToggle, String(editingRow?.priceMode || '').trim().toLowerCase() === 'budget' && styles.personalAlertToggleActive]}>
                      <View style={[styles.personalAlertKnob, String(editingRow?.priceMode || '').trim().toLowerCase() === 'budget' && styles.personalAlertKnobActive]} />
                    </View>
                  </Pressable>
                </View>
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_service_image', 'Imagem do serviço')}</Text>
                <View style={styles.editImageRow}>
                  <Pressable
                    style={styles.lodgingMediaAddBtn}
                    onPress={async () => {
                      const uri = await pickSingleImageUri();
                      if (!uri) return;
                      updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'image', uri);
                      setContentImageFit(uri, 'cover');
                      setContentImageCrop(uri, { x: 0, y: 0, scale: 1.12 });
                      openContentImageEditor({ source: 'services', sectionId: activeId, itemIndex: safeEditIdx }, uri);
                    }}
                  >
                    <Ionicons name="image-outline" size={14} color="#0f172a" />
                    <Text style={styles.lodgingMediaAddText}>{tr('edit_upload_image', 'Carregar imagem')}</Text>
                  </Pressable>
                  {!!String(editingRow.image || '').trim() && (
                    <Pressable
                      style={styles.editInlineImagePreviewBtn}
                      onPress={() =>
                        openContentImageEditor(
                          { source: 'services', sectionId: activeId, itemIndex: safeEditIdx },
                          String(editingRow.image || '').trim()
                        )
                      }
                    >
                      <Image source={{ uri: resolveAvatarUri(editingRow.image) || editingRow.image }} style={styles.editInlineImagePreview} />
                    </Pressable>
                  )}
                </View>
                <View style={styles.editToggleRowPlain}>
                  <Pressable
                    style={styles.editPromoSwitchRow}
                    onPress={() =>
                      updateItemInActiveSection(
                        setServicesSectionsState,
                        activeId,
                        safeEditIdx,
                        'modalImageEnabled',
                        !editingRow.modalImageEnabled
                      )
                    }
                  >
                    <View style={styles.personalAlertLeft}>
                      <Ionicons name="images-outline" size={15} color="#334155" />
                      <Text style={styles.personalAlertLabel}>{tr('edit_show_image_modal', 'Mostrar imagem no modal')}</Text>
                    </View>
                    <View style={[styles.personalAlertToggle, editingRow.modalImageEnabled && styles.personalAlertToggleActive]}>
                      <View style={[styles.personalAlertKnob, editingRow.modalImageEnabled && styles.personalAlertKnobActive]} />
                    </View>
                  </Pressable>
                </View>
                {String(editingRow?.priceMode || '').trim().toLowerCase() !== 'budget' && (
                <View style={[styles.editPromoBox, styles.editPromoBoxCompact, editingRow.promoEnabled && styles.editPromoBoxActive]}>
                  <Pressable
                    style={styles.editPromoSwitchRow}
                    onPress={() =>
                      updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'promoEnabled', !editingRow.promoEnabled)
                    }
                  >
                    <View style={styles.personalAlertLeft}>
                      <Ionicons name="pricetag-outline" size={15} color="#334155" />
                      <Text style={styles.editPromoToggleBadge}>PROMO</Text>
                    </View>
                    <View style={[styles.personalAlertToggle, editingRow.promoEnabled && styles.personalAlertToggleActive]}>
                      <View style={[styles.personalAlertKnob, editingRow.promoEnabled && styles.personalAlertKnobActive]} />
                    </View>
                  </Pressable>
                  {editingRow.promoEnabled && (
                    <View style={styles.editPromoPricesRow}>
                      <View style={styles.editInputFlex}>
                        <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_price_before', 'Preço antes')}</Text>
                        <TextInput
                          value={editingRow.promoOldPrice}
                          onChangeText={(value) => updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'promoOldPrice', value)}
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.editInputFlex}>
                        <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_price_now', 'Preço agora')}</Text>
                        <TextInput
                          value={editingRow.promoNowPrice}
                          onChangeText={(value) => updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'promoNowPrice', value)}
                          style={styles.input}
                        />
                      </View>
                    </View>
                  )}
                </View>
                )}
                <View style={styles.editInputRow}>
                  <View style={styles.editInputFlex}>
                    <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>
                      {resolveServiceTypeMeta(editingRow?.serviceType).extra1}
                    </Text>
                    <TextInput
                      value={editingRow.extra1}
                      onChangeText={(value) => {
                        updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'extra1', value);
                        updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'detail1', value);
                      }}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.editInputFlex}>
                    <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>
                      {resolveServiceTypeMeta(editingRow?.serviceType).extra2}
                    </Text>
                    <TextInput
                      value={editingRow.extra2}
                      onChangeText={(value) => {
                        updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'extra2', value);
                        updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'detail2', value);
                      }}
                      style={styles.input}
                    />
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_service_description', 'Descrição do serviço')}</Text>
                <TextInput
                  value={editingRow.note}
                  onChangeText={(value) => {
                    updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'note', value);
                    updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'notes', value);
                  }}
                  style={[styles.input, styles.inputArea]}
                  multiline
                />
                <View style={styles.productExtraSection}>
                  <View style={styles.formLabelInlineRow}>
                    <Text style={[styles.formLabel, styles.formLabelInlineNoMargin]}>{tr('edit_optional_details', 'Detalhes opcionais')}</Text>
                    <View style={styles.editInputRow}>
                      <Pressable
                        style={styles.formInlineIconBtn}
                        onPress={() => setServiceExtrasOpen((prev) => !prev)}
                      >
                        <Ionicons name={serviceExtrasOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#0f172a" />
                      </Pressable>
                      <Pressable
                        style={styles.productExtraAddBtn}
                        onPress={() => {
                          const next = [...normalizeExtraFields(editingRow.extraFields, true), { label: '', value: '', description: '' }];
                          updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'extraFields', next);
                          setServiceExtrasOpen(true);
                        }}
                      >
                        <Ionicons name="add" size={12} color="#0f172a" />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#0f172a' }}>{tr('edit_add', 'Adicionar')}</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.formHint}>{tr('edit_service_details_modal_only', 'Estes detalhes aparecem apenas no modal do serviço.')}</Text>
                  {(serviceExtrasOpen || normalizeExtraFields(editingRow.extraFields).length > 0) && normalizeExtraFields(editingRow.extraFields, true).map((field, fieldIdx) => (
                    <View key={`svc-extra-${safeEditIdx}-${fieldIdx}`} style={styles.productExtraItem}>
                      <View style={styles.productExtraHeaderRow}>
                        <Text style={styles.productExtraFieldLabel}>{tr('edit_field_name', 'Nome do campo')}</Text>
                        <Pressable
                          style={styles.productExtraRemoveBtn}
                          onPress={() => {
                            const next = normalizeExtraFields(editingRow.extraFields, true).filter((_, idx) => idx !== fieldIdx);
                            updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'extraFields', next);
                          }}
                        >
                          <Text style={styles.formListDangerText}>x</Text>
                        </Pressable>
                      </View>
                      <TextInput
                        value={field.label}
                        onChangeText={(value) => {
                          const next = normalizeExtraFields(editingRow.extraFields, true);
                          next[fieldIdx] = { ...next[fieldIdx], label: value };
                          updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'extraFields', next);
                        }}
                        style={styles.input}
                      />
                      <Text style={styles.productExtraFieldLabel}>{tr('edit_field_value', 'Valor')}</Text>
                      <TextInput
                        value={field.value}
                        onChangeText={(value) => {
                          const next = normalizeExtraFields(editingRow.extraFields, true);
                          next[fieldIdx] = { ...next[fieldIdx], value };
                          updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'extraFields', next);
                        }}
                        style={styles.input}
                      />
                      <Text style={styles.productExtraFieldLabel}>{tr('edit_description', 'Descrição')}</Text>
                      <TextInput
                        value={field.description || ''}
                        onChangeText={(value) => {
                          const next = normalizeExtraFields(editingRow.extraFields, true);
                          next[fieldIdx] = { ...next[fieldIdx], description: value };
                          updateItemInActiveSection(setServicesSectionsState, activeId, safeEditIdx, 'extraFields', next);
                        }}
                        style={[styles.input, styles.inputArea]}
                        multiline
                      />
                    </View>
                  ))}
                </View>
                <View style={styles.rowBtnsTightRight}>
                  <Pressable
                    style={styles.miniActionBtnLongSecondary}
                    onPress={() => {
                      setServicePreviewItem({ ...editingRow });
                      setServicePreviewSectionLabel(String(activeServicesSection?.label || '').trim());
                      setServicePreviewOpen(true);
                    }}
                  >
                    <Text style={styles.secondaryBtnText}>{tr('edit_view_modal', 'Ver modal')}</Text>
                  </Pressable>
                </View>
              </View>
            )}
            <Pressable
              style={styles.miniActionBtnWideSecondary}
              onPress={() => addItemToActiveSection(setServicesSectionsState, activeId, emptyServiceItem)}
            >
              <Text style={styles.secondaryBtnText}>{tr('edit_add_service', '+ Adicionar serviço')}</Text>
            </Pressable>
          </>
        )}
      </>
    );
  }

  function renderMenuEditor() {
    const sections = menuSectionsState;
    const activeId = activeMenuSection?.id;
    const items = activeMenuSection?.items || [];
    const safeEditIdx = items.length && editingMenuIndex >= 0 && editingMenuIndex < items.length
      ? editingMenuIndex
      : -1;
    const editingItem = safeEditIdx >= 0 ? items[safeEditIdx] : null;
    return (
      <>
        <Text style={styles.formHint}>{tr('edit_menu_hint', 'Categorias de menu com nome, descrição e preço.')}</Text>
        {renderSectionTabs(
          sections,
          activeId,
          setActiveMenuSectionId,
          () => addSection(setMenuSectionsState, setActiveMenuSectionId, sections, 'Categoria', emptyMenuItem),
          (secId) => removeSection(setMenuSectionsState, setActiveMenuSectionId, sections, secId, 'Menu', emptyMenuItem),
          {
            showAddButton: false,
            onMoveSection: (direction) => moveActiveSection(setMenuSectionsState, activeId, direction),
          }
        )}
        {!!activeMenuSection && (
          <>
            <View style={styles.editToggleRowPlain}>
              <Pressable
                style={styles.editPromoSwitchRow}
                onPress={() =>
                  updateSectionEnabled(
                    setMenuSectionsState,
                    activeId,
                    activeMenuSection?.enabled === false ? true : false
                  )
                }
              >
                <View style={styles.personalAlertLeft}>
                  <Ionicons name="albums-outline" size={15} color="#334155" />
                  <Text style={styles.personalAlertLabel}>{tr('edit_subtab_active', 'Sub-aba ativa')}</Text>
                </View>
                <View style={[styles.personalAlertToggle, activeMenuSection?.enabled !== false && styles.personalAlertToggleActive]}>
                  <View style={[styles.personalAlertKnob, activeMenuSection?.enabled !== false && styles.personalAlertKnobActive]} />
                </View>
              </Pressable>
            </View>
            <View style={styles.formLabelInlineRow}>
              <Text style={[styles.formLabel, styles.formLabelInlineNoMargin]}>{tr('edit_category_name', 'Nome da categoria')}</Text>
              <Pressable
                style={[styles.formInlineIconBtn, { width: 'auto', height: 24, paddingHorizontal: 8, flexDirection: 'row', gap: 4 }]}
                onPress={() => addSection(setMenuSectionsState, setActiveMenuSectionId, sections, 'Categoria', emptyMenuItem)}
              >
                <Ionicons name="add" size={14} color="#0f172a" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>{tr('edit_add', 'Adicionar')}</Text>
              </Pressable>
            </View>
            <TextInput
              value={activeMenuSection.label}
              onChangeText={(value) => updateSectionLabel(setMenuSectionsState, activeId, value)}
              style={styles.input}
            />
            {items.map((item, idx) => {
              const menuTitle = String(item?.name || '').trim() || `Item ${idx + 1}`;
              const priceText = String(item?.price || '').trim() ? `${item.price} EUR` : '';
              const descText = String(item?.description || '').trim();
              const meta = [priceText, descText].filter(Boolean).join(' • ');
              const enabled = item?.enabled !== false;
              const active = idx === safeEditIdx;
              return (
                <View key={`menu-row-${activeId}-${idx}`} style={[styles.editServiceListRow, active && styles.editServiceListRowActive, !enabled && styles.editServiceListRowDisabled]}>
                  <Pressable
                    style={styles.editServiceListMain}
                    onPress={() => setEditingMenuIndex((prev) => (prev === idx ? -1 : idx))}
                  >
                    <Text style={styles.editServiceListTitle} numberOfLines={1}>{menuTitle}</Text>
                    {!!meta && <Text style={styles.editServiceListMeta} numberOfLines={1}>{meta}</Text>}
                  </Pressable>
                  {!!item?.promoEnabled && (
                    <View style={styles.editServicePromoChip}>
                      <Text style={styles.editServicePromoChipText}>{tr('edit_promo', 'Promo')}</Text>
                    </View>
                  )}
                  <Pressable
                    style={styles.formListCopyBtn}
                    onPress={() => updateItemInActiveSection(setMenuSectionsState, activeId, idx, 'enabled', !enabled)}
                  >
                    <Ionicons name={enabled ? 'eye-outline' : 'eye-off-outline'} size={12} color="#334155" />
                  </Pressable>
                  <Pressable
                    style={styles.formListDangerBtn}
                    onPress={() => {
                      removeItemFromActiveSection(setMenuSectionsState, activeId, idx, emptyMenuItem);
                      setEditingMenuIndex((prev) => (prev > 0 ? prev - 1 : 0));
                    }}
                  >
                    <Text style={styles.formListDangerText}>x</Text>
                  </Pressable>
                </View>
              );
            })}
            {!!editingItem && (
              <View style={[styles.editItemCard, styles.editItemCardCompact]}>
                <View style={styles.editInputRow}>
                  <View style={styles.editInputFlex}>
                    <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_item_name', 'Nome do item')}</Text>
                    <TextInput
                      value={editingItem.name}
                      onChangeText={(value) => updateItemInActiveSection(setMenuSectionsState, activeId, safeEditIdx, 'name', value)}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.editInputFlex}>
                    <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_price', 'Preço')}</Text>
                    <TextInput
                      value={editingItem.price}
                      onChangeText={(value) => updateItemInActiveSection(setMenuSectionsState, activeId, safeEditIdx, 'price', value)}
                      style={styles.input}
                    />
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_description', 'Descrição')}</Text>
                <TextInput
                  value={editingItem.description}
                  onChangeText={(value) => updateItemInActiveSection(setMenuSectionsState, activeId, safeEditIdx, 'description', value)}
                  style={[styles.input, styles.inputArea]}
                  multiline
                />
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_item_image', 'Imagem do item')}</Text>
                <View style={styles.editImageRow}>
                  <Pressable
                    style={styles.lodgingMediaAddBtn}
                    onPress={async () => {
                      const uri = await pickSingleImageUri();
                      if (!uri) return;
                      updateItemInActiveSection(setMenuSectionsState, activeId, safeEditIdx, 'image', uri);
                      setContentImageFit(uri, 'cover');
                      setContentImageCrop(uri, { x: 0, y: 0, scale: 1.12 });
                      openContentImageEditor({ source: 'menu', sectionId: activeId, itemIndex: safeEditIdx }, uri);
                    }}
                  >
                    <Ionicons name="image-outline" size={14} color="#0f172a" />
                    <Text style={styles.lodgingMediaAddText}>{tr('edit_upload_image', 'Carregar imagem')}</Text>
                  </Pressable>
                  {!!String(editingItem.image || '').trim() && (
                    <Pressable
                      style={styles.editInlineImagePreviewBtn}
                      onPress={() =>
                        openContentImageEditor(
                          { source: 'menu', sectionId: activeId, itemIndex: safeEditIdx },
                          String(editingItem.image || '').trim()
                        )
                      }
                    >
                      <Image source={{ uri: resolveAvatarUri(editingItem.image) || editingItem.image }} style={styles.editInlineImagePreview} />
                    </Pressable>
                  )}
                </View>
                <View style={[styles.editPromoBox, editingItem.promoEnabled && styles.editPromoBoxActive]}>
                  <Pressable
                    style={styles.editPromoSwitchRow}
                    onPress={() =>
                      updateItemInActiveSection(setMenuSectionsState, activeId, safeEditIdx, 'promoEnabled', !editingItem.promoEnabled)
                    }
                  >
                    <View style={styles.personalAlertLeft}>
                      <Ionicons name="pricetag-outline" size={15} color="#334155" />
                      <Text style={styles.editPromoToggleBadge}>PROMO</Text>
                    </View>
                    <View style={[styles.personalAlertToggle, editingItem.promoEnabled && styles.personalAlertToggleActive]}>
                      <View style={[styles.personalAlertKnob, editingItem.promoEnabled && styles.personalAlertKnobActive]} />
                    </View>
                  </Pressable>
                  {editingItem.promoEnabled && (
                    <View style={styles.editPromoPricesRow}>
                      <View style={styles.editInputFlex}>
                        <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_price_before', 'Preço antes')}</Text>
                        <TextInput
                          value={editingItem.promoOldPrice}
                          onChangeText={(value) => updateItemInActiveSection(setMenuSectionsState, activeId, safeEditIdx, 'promoOldPrice', value)}
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.editInputFlex}>
                        <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_price_now', 'Preço agora')}</Text>
                        <TextInput
                          value={editingItem.promoNowPrice}
                          onChangeText={(value) => updateItemInActiveSection(setMenuSectionsState, activeId, safeEditIdx, 'promoNowPrice', value)}
                          style={styles.input}
                        />
                      </View>
                    </View>
                  )}
                </View>
                <View style={styles.productExtraSection}>
                  <View style={styles.formLabelInlineRow}>
                    <Text style={[styles.formLabel, styles.formLabelInlineNoMargin]}>{tr('edit_extra_fields', 'Campos extra')}</Text>
                    <Pressable
                      style={styles.productExtraAddBtn}
                      onPress={() => {
                        const next = [...normalizeExtraFields(editingItem.extraFields, true), { label: '', value: '', description: '' }];
                        updateItemInActiveSection(setMenuSectionsState, activeId, safeEditIdx, 'extraFields', next);
                      }}
                    >
                      <Ionicons name="add" size={12} color="#0f172a" />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#0f172a' }}>{tr('edit_add', 'Adicionar')}</Text>
                    </Pressable>
                  </View>
                  {normalizeExtraFields(editingItem.extraFields, true).map((field, fieldIdx) => (
                    <View key={`menu-extra-${safeEditIdx}-${fieldIdx}`} style={styles.productExtraItem}>
                      <View style={styles.productExtraHeaderRow}>
                        <Text style={styles.productExtraFieldLabel}>{tr('edit_field_name', 'Nome do campo')}</Text>
                        <Pressable
                          style={styles.productExtraRemoveBtn}
                          onPress={() => {
                            const next = normalizeExtraFields(editingItem.extraFields, true).filter((_, i) => i !== fieldIdx);
                            updateItemInActiveSection(setMenuSectionsState, activeId, safeEditIdx, 'extraFields', next);
                          }}
                        >
                          <Text style={styles.formListDangerText}>x</Text>
                        </Pressable>
                      </View>
                      <TextInput
                        value={field.label}
                        onChangeText={(value) => {
                          const next = normalizeExtraFields(editingItem.extraFields, true);
                          next[fieldIdx] = { ...next[fieldIdx], label: value };
                          updateItemInActiveSection(setMenuSectionsState, activeId, safeEditIdx, 'extraFields', next);
                        }}
                        style={styles.input}
                      />
                      <Text style={styles.productExtraFieldLabel}>{tr('edit_field_value', 'Valor')}</Text>
                      <TextInput
                        value={field.value}
                        onChangeText={(value) => {
                          const next = normalizeExtraFields(editingItem.extraFields, true);
                          next[fieldIdx] = { ...next[fieldIdx], value };
                          updateItemInActiveSection(setMenuSectionsState, activeId, safeEditIdx, 'extraFields', next);
                        }}
                        style={styles.input}
                      />
                      <Text style={styles.productExtraFieldLabel}>{tr('edit_description', 'Descrição')}</Text>
                      <TextInput
                        value={field.description || ''}
                        onChangeText={(value) => {
                          const next = normalizeExtraFields(editingItem.extraFields, true);
                          next[fieldIdx] = { ...next[fieldIdx], description: value };
                          updateItemInActiveSection(setMenuSectionsState, activeId, safeEditIdx, 'extraFields', next);
                        }}
                        style={[styles.input, styles.inputArea]}
                        multiline
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
            <Pressable
              style={styles.miniActionBtnWideSecondary}
              onPress={() => {
                addItemToActiveSection(setMenuSectionsState, activeId, emptyMenuItem);
                setEditingMenuIndex(items.length);
              }}
            >
              <Text style={styles.secondaryBtnText}>{tr('edit_add_item', '+ Adicionar item')}</Text>
            </Pressable>
          </>
        )}
      </>
    );
  }

  function renderProductsEditor() {
    const sections = productsSectionsState;
    const activeId = activeProductsSection?.id;
    const items = activeProductsSection?.items || [];
    const safeEditIdx = items.length && editingProductIndex >= 0 && editingProductIndex < items.length
      ? editingProductIndex
      : -1;
    const editingItem = safeEditIdx >= 0 ? items[safeEditIdx] : null;
    return (
      <>
        <Text style={styles.formHint}>{tr('edit_products_hint', 'Produtos por categoria com stock, promoção e detalhes.')}</Text>
        {renderSectionTabs(
          sections,
          activeId,
          setActiveProductsSectionId,
          () => addSection(setProductsSectionsState, setActiveProductsSectionId, sections, 'Categoria', emptyProductItem),
          (secId) => removeSection(setProductsSectionsState, setActiveProductsSectionId, sections, secId, 'Produtos', emptyProductItem),
          {
            showAddButton: false,
            onMoveSection: (direction) => moveActiveSection(setProductsSectionsState, activeId, direction),
          }
        )}
        {!!activeProductsSection && (
          <>
            <View style={styles.editToggleRowPlain}>
              <Pressable
                style={styles.editPromoSwitchRow}
                onPress={() =>
                  updateSectionEnabled(
                    setProductsSectionsState,
                    activeId,
                    activeProductsSection?.enabled === false ? true : false
                  )
                }
              >
                <View style={styles.personalAlertLeft}>
                  <Ionicons name="albums-outline" size={15} color="#334155" />
                  <Text style={styles.personalAlertLabel}>{tr('edit_subtab_active', 'Sub-aba ativa')}</Text>
                </View>
                <View style={[styles.personalAlertToggle, activeProductsSection?.enabled !== false && styles.personalAlertToggleActive]}>
                  <View style={[styles.personalAlertKnob, activeProductsSection?.enabled !== false && styles.personalAlertKnobActive]} />
                </View>
              </Pressable>
            </View>
            <View style={styles.formLabelInlineRow}>
              <Text style={[styles.formLabel, styles.formLabelInlineNoMargin]}>{tr('edit_category_name', 'Nome da categoria')}</Text>
              <Pressable
                style={[styles.formInlineIconBtn, { width: 'auto', height: 24, paddingHorizontal: 8, flexDirection: 'row', gap: 4 }]}
                onPress={() => addSection(setProductsSectionsState, setActiveProductsSectionId, sections, 'Categoria', emptyProductItem)}
              >
                <Ionicons name="add" size={14} color="#0f172a" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>{tr('edit_add', 'Adicionar')}</Text>
              </Pressable>
            </View>
            <TextInput
              value={activeProductsSection.label}
              onChangeText={(value) => updateSectionLabel(setProductsSectionsState, activeId, value)}
              style={styles.input}
            />
            {items.map((item, idx) => {
              const productTitle = String(item?.name || '').trim() || `Produto ${idx + 1}`;
              const meta = [
                String(item?.price || '').trim() ? `${item.price} EUR` : '',
                String(item?.sku || '').trim(),
              ].filter(Boolean).join(' • ');
              const stockOut = String(item?.stock || '').trim().toLowerCase() === 'out';
              const enabled = item?.enabled !== false;
              const active = idx === safeEditIdx;
              return (
                <View
                  key={`product-row-${activeId}-${idx}`}
                  style={[
                    styles.editServiceListRow,
                    item?.promoEnabled && styles.editServiceListRowPromo,
                    active && styles.editServiceListRowActive,
                    !enabled && styles.editServiceListRowDisabled,
                  ]}
                >
                  <Pressable
                    style={styles.editServiceListMain}
                    onPress={() => {
                      setEditingProductIndex((prev) => {
                        const next = prev === idx ? -1 : idx;
                        if (next >= 0) {
                          const nextItem = items[next] || null;
                          setProductExtrasOpen(normalizeExtraFields(nextItem?.extraFields).length > 0);
                        } else {
                          setProductExtrasOpen(false);
                        }
                        return next;
                      });
                    }}
                  >
                    <Text style={styles.editServiceListTitle} numberOfLines={1}>{productTitle}</Text>
                    {!!meta && <Text style={styles.editServiceListMeta} numberOfLines={1}>{meta}</Text>}
                  </Pressable>
                  <View style={[styles.editStockChip, stockOut ? styles.editStockChipOut : styles.editStockChipIn]}>
                    <Text style={[styles.editStockChipText, stockOut ? styles.editStockChipTextOut : styles.editStockChipTextIn]}>
                      {stockOut ? tr('edit_stock_out_short', 'Esg.') : tr('edit_stock_short', 'Stock')}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.formListCopyBtn}
                    onPress={() => updateItemInActiveSection(setProductsSectionsState, activeId, idx, 'enabled', !enabled)}
                  >
                    <Ionicons name={enabled ? 'eye-outline' : 'eye-off-outline'} size={12} color="#334155" />
                  </Pressable>
                  <Pressable
                    style={styles.formListCopyBtn}
                    onPress={() => duplicateItemInActiveSection(setProductsSectionsState, activeId, idx)}
                  >
                    <Ionicons name="copy-outline" size={12} color="#334155" />
                  </Pressable>
                  <Pressable
                    style={styles.formListDangerBtn}
                    onPress={() => {
                      removeItemFromActiveSection(setProductsSectionsState, activeId, idx, emptyProductItem);
                      setEditingProductIndex((prev) => (prev > 0 ? prev - 1 : 0));
                    }}
                  >
                    <Text style={styles.formListDangerText}>x</Text>
                  </Pressable>
                </View>
              );
            })}

            {!!editingItem && (
              <View style={[styles.editItemCard, styles.editItemCardCompact]}>
                <View style={styles.editInputRow}>
                  <View style={styles.editInputFlex}>
                    <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_product_name', 'Nome do produto')}</Text>
                    <TextInput
                      value={editingItem.name}
                      onChangeText={(value) => updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'name', value)}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.editInputFlex}>
                    <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_price', 'Preço')}</Text>
                    <TextInput
                      value={editingItem.price}
                      onChangeText={(value) => updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'price', value)}
                      style={styles.input}
                    />
                  </View>
                </View>
                <View style={styles.editToggleRowPlain}>
                  <Pressable
                    style={styles.editPromoSwitchRow}
                    onPress={() => updateItemInActiveSection(
                      setProductsSectionsState,
                      activeId,
                      safeEditIdx,
                      'stock',
                      editingItem.stock === 'out' ? 'in' : 'out'
                    )}
                  >
                    <View style={styles.personalAlertLeft}>
                      <Ionicons name="cube-outline" size={15} color="#334155" />
                      <Text style={styles.personalAlertLabel}>{tr('edit_in_stock', 'Em stock')}</Text>
                    </View>
                    <View style={[styles.personalAlertToggle, editingItem.stock !== 'out' && styles.personalAlertToggleActive]}>
                      <View style={[styles.personalAlertKnob, editingItem.stock !== 'out' && styles.personalAlertKnobActive]} />
                    </View>
                  </Pressable>
                </View>
                <View style={styles.editPromoBox}>
                  <Pressable
                    style={styles.editPromoSwitchRow}
                    onPress={() =>
                      updateItemInActiveSection(
                        setProductsSectionsState,
                        activeId,
                        safeEditIdx,
                        'promoEnabled',
                        !editingItem.promoEnabled
                      )
                    }
                  >
                    <View style={styles.personalAlertLeft}>
                      <Ionicons name="pricetag-outline" size={15} color="#334155" />
                      <Text style={styles.editPromoToggleBadge}>PROMO</Text>
                    </View>
                    <View style={[styles.personalAlertToggle, editingItem.promoEnabled && styles.personalAlertToggleActive]}>
                      <View style={[styles.personalAlertKnob, editingItem.promoEnabled && styles.personalAlertKnobActive]} />
                    </View>
                  </Pressable>
                  {editingItem.promoEnabled && (
                    <View style={styles.editPromoPricesRow}>
                      <View style={styles.editInputFlex}>
                        <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_price_before', 'Preço antes')}</Text>
                        <TextInput
                          value={editingItem.promoOldPrice}
                          onChangeText={(value) => updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'promoOldPrice', value)}
                          style={styles.input}
                        />
                      </View>
                      <View style={styles.editInputFlex}>
                        <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_price_now', 'Preço agora')}</Text>
                        <TextInput
                          value={editingItem.promoNowPrice}
                          onChangeText={(value) => updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'promoNowPrice', value)}
                          style={styles.input}
                        />
                      </View>
                    </View>
                  )}
                </View>
                <View style={styles.editInputRow}>
                  <View style={styles.editInputFlex}>
                    <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_sku_reference', 'SKU / Referência')}</Text>
                    <TextInput
                      value={editingItem.sku}
                      onChangeText={(value) => updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'sku', value)}
                      style={styles.input}
                    />
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_product_image', 'Imagem do produto')}</Text>
                <View style={styles.editImageRow}>
                  <Pressable
                    style={styles.lodgingMediaAddBtn}
                    onPress={async () => {
                      const uri = await pickSingleImageUri();
                      if (!uri) return;
                      updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'image', uri);
                      setContentImageFit(uri, 'cover');
                      setContentImageCrop(uri, { x: 0, y: 0, scale: 1.12 });
                      openContentImageEditor({ source: 'products', sectionId: activeId, itemIndex: safeEditIdx }, uri);
                    }}
                  >
                    <Ionicons name="image-outline" size={14} color="#0f172a" />
                    <Text style={styles.lodgingMediaAddText}>{tr('edit_upload_image', 'Carregar imagem')}</Text>
                  </Pressable>
                  {!!String(editingItem.image || '').trim() && (
                    <Pressable
                      style={styles.editInlineImagePreviewBtn}
                      onPress={() =>
                        openContentImageEditor(
                          { source: 'products', sectionId: activeId, itemIndex: safeEditIdx },
                          String(editingItem.image || '').trim()
                        )
                      }
                    >
                      <Image source={{ uri: resolveAvatarUri(editingItem.image) || editingItem.image }} style={styles.editInlineImagePreview} />
                    </Pressable>
                  )}
                </View>
                <View style={styles.editToggleRowPlain}>
                  <Pressable
                    style={styles.editPromoSwitchRow}
                    onPress={() =>
                      updateItemInActiveSection(
                        setProductsSectionsState,
                        activeId,
                        safeEditIdx,
                        'modalImageEnabled',
                        !editingItem.modalImageEnabled
                      )
                    }
                  >
                    <View style={styles.personalAlertLeft}>
                      <Ionicons name="images-outline" size={15} color="#334155" />
                      <Text style={styles.personalAlertLabel}>{tr('edit_show_image_modal', 'Mostrar imagem no modal')}</Text>
                    </View>
                    <View style={[styles.personalAlertToggle, editingItem.modalImageEnabled && styles.personalAlertToggleActive]}>
                      <View style={[styles.personalAlertKnob, editingItem.modalImageEnabled && styles.personalAlertKnobActive]} />
                    </View>
                  </Pressable>
                </View>
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_short_description', 'Descrição curta')}</Text>
                <TextInput
                  value={editingItem.shortDescription}
                  onChangeText={(value) => updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'shortDescription', value)}
                  style={styles.input}
                />
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_full_description', 'Descrição completa')}</Text>
                <TextInput
                  value={editingItem.fullDescription}
                  onChangeText={(value) => updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'fullDescription', value)}
                  style={[styles.input, styles.inputArea, styles.inputAreaCompact]}
                  multiline
                />
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_how_to_use', 'Como usar')}</Text>
                <TextInput
                  value={editingItem.usage}
                  onChangeText={(value) => updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'usage', value)}
                  style={[styles.input, styles.inputArea, styles.inputAreaCompact]}
                  multiline
                />
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_materials', 'Materiais')}</Text>
                <TextInput
                  value={editingItem.ingredients}
                  onChangeText={(value) => updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'ingredients', value)}
                  style={[styles.input, styles.inputArea, styles.inputAreaCompact]}
                  multiline
                />
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_size_weight_volume', 'Peso / volume / tamanho')}</Text>
                <TextInput
                  value={editingItem.size}
                  onChangeText={(value) => updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'size', value)}
                  style={styles.input}
                />
                <View style={styles.productExtraSection}>
                  <View style={styles.formLabelInlineRow}>
                    <Text style={[styles.formLabel, styles.formLabelInlineNoMargin]}>{tr('edit_extra_fields', 'Campos extra')}</Text>
                    <View style={styles.editInputRow}>
                      <Pressable
                        style={styles.formInlineIconBtn}
                        onPress={() => setProductExtrasOpen((prev) => !prev)}
                      >
                        <Ionicons name={productExtrasOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#0f172a" />
                      </Pressable>
                      <Pressable
                        style={styles.productExtraAddBtn}
                        onPress={() => {
                          const next = [...normalizeExtraFields(editingItem.extraFields, true), { label: '', value: '', description: '' }];
                          updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'extraFields', next);
                          setProductExtrasOpen(true);
                        }}
                      >
                        <Ionicons name="add" size={12} color="#0f172a" />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#0f172a' }}>{tr('edit_add', 'Adicionar')}</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.formHint}>{tr('edit_product_fields_modal_only', 'Estes campos aparecem apenas no modal do produto.')}</Text>
                {productExtrasOpen && normalizeExtraFields(editingItem.extraFields, true).map((field, fieldIdx) => (
                  <View key={`product-extra-${safeEditIdx}-${fieldIdx}`} style={styles.productExtraItem}>
                    <View style={styles.productExtraHeaderRow}>
                      <Text style={styles.productExtraFieldLabel}>{tr('edit_field_name', 'Nome do campo')}</Text>
                      <Pressable
                        style={styles.productExtraRemoveBtn}
                        onPress={() => {
                          const next = normalizeExtraFields(editingItem.extraFields, true).filter((_, idx) => idx !== fieldIdx);
                          updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'extraFields', next);
                        }}
                      >
                        <Text style={styles.formListDangerText}>x</Text>
                      </Pressable>
                    </View>
                    <TextInput
                      value={field.label}
                      onChangeText={(value) => {
                        const next = normalizeExtraFields(editingItem.extraFields, true);
                        next[fieldIdx] = { ...next[fieldIdx], label: value };
                        updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'extraFields', next);
                      }}
                      style={styles.input}
                    />
                    <Text style={styles.productExtraFieldLabel}>Valor</Text>
                      <TextInput
                        value={field.value}
                        onChangeText={(value) => {
                          const next = normalizeExtraFields(editingItem.extraFields, true);
                          next[fieldIdx] = { ...next[fieldIdx], value };
                          updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'extraFields', next);
                        }}
                        style={styles.input}
                      />
                      <Text style={styles.productExtraFieldLabel}>{tr('edit_description', 'Descrição')}</Text>
                      <TextInput
                        value={field.description || ''}
                        onChangeText={(value) => {
                          const next = normalizeExtraFields(editingItem.extraFields, true);
                          next[fieldIdx] = { ...next[fieldIdx], description: value };
                          updateItemInActiveSection(setProductsSectionsState, activeId, safeEditIdx, 'extraFields', next);
                        }}
                        style={[styles.input, styles.inputArea]}
                        multiline
                      />
                    </View>
                  ))}
                </View>
                <View style={styles.rowBtnsTightRight}>
                  <Pressable
                    style={styles.miniActionBtnLongSecondary}
                    onPress={() => {
                      setProductPreviewItem({ ...editingItem });
                      setProductPreviewSectionLabel(String(activeProductsSection?.label || '').trim());
                      setProductPreviewOpen(true);
                    }}
                  >
                    <Text style={styles.secondaryBtnText}>{tr('edit_view_modal', 'Ver modal')}</Text>
                  </Pressable>
                </View>
              </View>
            )}
            <Pressable
              style={styles.miniActionBtnWideSecondary}
              onPress={() => {
                addItemToActiveSection(setProductsSectionsState, activeId, emptyProductItem);
                setEditingProductIndex(items.length);
                setProductExtrasOpen(false);
              }}
            >
              <Text style={styles.secondaryBtnText}>{tr('edit_add_product', '+ Adicionar produto')}</Text>
            </Pressable>
          </>
        )}
      </>
    );
  }

  function renderPortfolioEditor() {
    const sections = portfolioSectionsState;
    const activeId = activePortfolioSection?.id;
    const items = activePortfolioSection?.items || [];
    const safeEditIdx = items.length && editingPortfolioIndex >= 0 && editingPortfolioIndex < items.length
      ? editingPortfolioIndex
      : -1;
    const editingItem = safeEditIdx >= 0 ? items[safeEditIdx] : null;
    return (
      <>
        <Text style={styles.formHint}>Projetos por categoria (nome, descrição, imagem e link).</Text>
        {renderSectionTabs(
          sections,
          activeId,
          setActivePortfolioSectionId,
          () => addSection(setPortfolioSectionsState, setActivePortfolioSectionId, sections, 'Categoria', emptyPortfolioItem),
          (secId) => removeSection(setPortfolioSectionsState, setActivePortfolioSectionId, sections, secId, 'Portfolio', emptyPortfolioItem),
          {
            showAddButton: false,
            onMoveSection: (direction) => moveActiveSection(setPortfolioSectionsState, activeId, direction),
          }
        )}
        {!!activePortfolioSection && (
          <>
            <View style={styles.editToggleRowPlain}>
              <Pressable
                style={styles.editPromoSwitchRow}
                onPress={() =>
                  updateSectionEnabled(
                    setPortfolioSectionsState,
                    activeId,
                    activePortfolioSection?.enabled === false ? true : false
                  )
                }
              >
                <View style={styles.personalAlertLeft}>
                  <Ionicons name="albums-outline" size={15} color="#334155" />
                  <Text style={styles.personalAlertLabel}>{tr('edit_subtab_active', 'Sub-aba ativa')}</Text>
                </View>
                <View style={[styles.personalAlertToggle, activePortfolioSection?.enabled !== false && styles.personalAlertToggleActive]}>
                  <View style={[styles.personalAlertKnob, activePortfolioSection?.enabled !== false && styles.personalAlertKnobActive]} />
                </View>
              </Pressable>
            </View>
            <View style={styles.formLabelInlineRow}>
              <Text style={[styles.formLabel, styles.formLabelInlineNoMargin]}>{tr('edit_category_name', 'Nome da categoria')}</Text>
              <Pressable
                style={[styles.formInlineIconBtn, { width: 'auto', height: 24, paddingHorizontal: 8, flexDirection: 'row', gap: 4 }]}
                onPress={() => addSection(setPortfolioSectionsState, setActivePortfolioSectionId, sections, 'Categoria', emptyPortfolioItem)}
              >
                <Ionicons name="add" size={14} color="#0f172a" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>{tr('edit_add', 'Adicionar')}</Text>
              </Pressable>
            </View>
            <TextInput
              value={activePortfolioSection.label}
              onChangeText={(value) => updateSectionLabel(setPortfolioSectionsState, activeId, value)}
              style={styles.input}
            />
            {items.map((item, idx) => {
              const projectTitle = String(item?.name || '').trim() || `Projeto ${idx + 1}`;
              const meta = String(item?.link || '').trim();
              const enabled = item?.enabled !== false;
              const active = idx === safeEditIdx;
              return (
                <View
                  key={`portfolio-row-${activeId}-${idx}`}
                  style={[
                    styles.editServiceListRow,
                    active && styles.editServiceListRowActive,
                    !enabled && styles.editServiceListRowDisabled,
                  ]}
                >
                  <Pressable
                    style={styles.editServiceListMain}
                    onPress={() => {
                      setEditingPortfolioIndex((prev) => {
                        const next = prev === idx ? -1 : idx;
                        if (next >= 0) {
                          const nextItem = items[next] || null;
                          setPortfolioExtrasOpen(normalizeExtraFields(nextItem?.extraFields).length > 0);
                        } else {
                          setPortfolioExtrasOpen(false);
                        }
                        return next;
                      });
                    }}
                  >
                    <Text style={styles.editServiceListTitle} numberOfLines={1}>{projectTitle}</Text>
                    {!!meta && <Text style={styles.editServiceListMeta} numberOfLines={1}>{meta}</Text>}
                  </Pressable>
                  <Pressable
                    style={styles.formListCopyBtn}
                    onPress={() => updateItemInActiveSection(setPortfolioSectionsState, activeId, idx, 'enabled', !enabled)}
                  >
                    <Ionicons name={enabled ? 'eye-outline' : 'eye-off-outline'} size={12} color="#334155" />
                  </Pressable>
                  <Pressable
                    style={styles.formListCopyBtn}
                    onPress={() => duplicateItemInActiveSection(setPortfolioSectionsState, activeId, idx)}
                  >
                    <Ionicons name="copy-outline" size={12} color="#334155" />
                  </Pressable>
                  <Pressable
                    style={styles.formListDangerBtn}
                    onPress={() => {
                      removeItemFromActiveSection(setPortfolioSectionsState, activeId, idx, emptyPortfolioItem);
                      setEditingPortfolioIndex((prev) => (prev > 0 ? prev - 1 : 0));
                    }}
                  >
                    <Text style={styles.formListDangerText}>x</Text>
                  </Pressable>
                </View>
              );
            })}
            {!!editingItem && (
              <View style={[styles.editItemCard, styles.editItemCardCompact]}>
                <View style={styles.editInputRow}>
                  <View style={styles.editInputFlex}>
                    <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_project_name', 'Nome do projeto')}</Text>
                    <TextInput
                      value={editingItem.name}
                      onChangeText={(value) => updateItemInActiveSection(setPortfolioSectionsState, activeId, safeEditIdx, 'name', value)}
                      style={styles.input}
                    />
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_project_link', 'Link do projeto')}</Text>
                <TextInput
                  value={editingItem.link}
                  onChangeText={(value) => updateItemInActiveSection(setPortfolioSectionsState, activeId, safeEditIdx, 'link', value)}
                  style={styles.input}
                  autoCapitalize="none"
                />
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_project_image', 'Imagem do projeto')}</Text>
                <View style={styles.editImageRow}>
                  <Pressable
                    style={styles.lodgingMediaAddBtn}
                    onPress={async () => {
                      const uri = await pickSingleImageUri();
                      if (!uri) return;
                      updateItemInActiveSection(setPortfolioSectionsState, activeId, safeEditIdx, 'image', uri);
                      setContentImageFit(uri, 'cover');
                      setContentImageCrop(uri, { x: 0, y: 0, scale: 1.12 });
                      openContentImageEditor({ source: 'portfolio', sectionId: activeId, itemIndex: safeEditIdx }, uri);
                    }}
                  >
                    <Ionicons name="image-outline" size={14} color="#0f172a" />
                    <Text style={styles.lodgingMediaAddText}>{tr('edit_upload_image', 'Carregar imagem')}</Text>
                  </Pressable>
                  {!!String(editingItem.image || '').trim() && (
                    <Pressable
                      style={styles.editInlineImagePreviewBtn}
                      onPress={() =>
                        openContentImageEditor(
                          { source: 'portfolio', sectionId: activeId, itemIndex: safeEditIdx },
                          String(editingItem.image || '').trim()
                        )
                      }
                    >
                      <Image source={{ uri: resolveAvatarUri(editingItem.image) || editingItem.image }} style={styles.editInlineImagePreview} />
                    </Pressable>
                  )}
                </View>
                <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_project_description', 'Descrição do projeto')}</Text>
                <TextInput
                  value={editingItem.description}
                  onChangeText={(value) => updateItemInActiveSection(setPortfolioSectionsState, activeId, safeEditIdx, 'description', value)}
                  style={[styles.input, styles.inputArea]}
                  multiline
                />
                <View style={styles.productExtraSection}>
                  <View style={styles.formLabelInlineRow}>
                    <Text style={[styles.formLabel, styles.formLabelInlineNoMargin]}>{tr('edit_extra_fields', 'Campos extra')}</Text>
                    <View style={styles.editInputRow}>
                      <Pressable
                        style={styles.formInlineIconBtn}
                        onPress={() => setPortfolioExtrasOpen((prev) => !prev)}
                      >
                        <Ionicons name={portfolioExtrasOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#0f172a" />
                      </Pressable>
                      <Pressable
                        style={styles.productExtraAddBtn}
                        onPress={() => {
                          const next = [...normalizeExtraFields(editingItem.extraFields, true), { label: '', value: '', description: '' }];
                          updateItemInActiveSection(setPortfolioSectionsState, activeId, safeEditIdx, 'extraFields', next);
                          setPortfolioExtrasOpen(true);
                        }}
                      >
                        <Ionicons name="add" size={12} color="#0f172a" />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#0f172a' }}>{tr('edit_add', 'Adicionar')}</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.formHint}>{tr('edit_project_fields_details_only', 'Estes campos aparecem apenas no detalhe do projeto.')}</Text>
                  {(portfolioExtrasOpen || normalizeExtraFields(editingItem.extraFields).length > 0) && normalizeExtraFields(editingItem.extraFields, true).map((field, fieldIdx) => (
                    <View key={`portfolio-extra-${safeEditIdx}-${fieldIdx}`} style={styles.productExtraItem}>
                      <View style={styles.productExtraHeaderRow}>
                        <Text style={styles.productExtraFieldLabel}>{tr('edit_field_name', 'Nome do campo')}</Text>
                        <Pressable
                          style={styles.productExtraRemoveBtn}
                          onPress={() => {
                            const next = normalizeExtraFields(editingItem.extraFields, true).filter((_, idx) => idx !== fieldIdx);
                            updateItemInActiveSection(setPortfolioSectionsState, activeId, safeEditIdx, 'extraFields', next);
                          }}
                        >
                          <Text style={styles.formListDangerText}>x</Text>
                        </Pressable>
                      </View>
                      <TextInput
                        value={field.label}
                        onChangeText={(value) => {
                          const next = normalizeExtraFields(editingItem.extraFields, true);
                          next[fieldIdx] = { ...next[fieldIdx], label: value };
                          updateItemInActiveSection(setPortfolioSectionsState, activeId, safeEditIdx, 'extraFields', next);
                        }}
                        style={styles.input}
                      />
                      <Text style={styles.productExtraFieldLabel}>Valor</Text>
                      <TextInput
                        value={field.value}
                        onChangeText={(value) => {
                          const next = normalizeExtraFields(editingItem.extraFields, true);
                          next[fieldIdx] = { ...next[fieldIdx], value };
                          updateItemInActiveSection(setPortfolioSectionsState, activeId, safeEditIdx, 'extraFields', next);
                        }}
                        style={styles.input}
                      />
                      <Text style={styles.productExtraFieldLabel}>{tr('edit_description', 'Descrição')}</Text>
                      <TextInput
                        value={field.description || ''}
                        onChangeText={(value) => {
                          const next = normalizeExtraFields(editingItem.extraFields, true);
                          next[fieldIdx] = { ...next[fieldIdx], description: value };
                          updateItemInActiveSection(setPortfolioSectionsState, activeId, safeEditIdx, 'extraFields', next);
                        }}
                        style={[styles.input, styles.inputArea]}
                        multiline
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
            <Pressable
              style={styles.miniActionBtnWideSecondary}
              onPress={() => {
                addItemToActiveSection(setPortfolioSectionsState, activeId, emptyPortfolioItem);
                setEditingPortfolioIndex(items.length);
                setPortfolioExtrasOpen(false);
              }}
            >
              <Text style={styles.secondaryBtnText}>{tr('edit_add_project', '+ Adicionar projeto')}</Text>
            </Pressable>
          </>
        )}
      </>
    );
  }

  function renderCampaignsEditor() {
    const rows = Array.isArray(campaignsRows) ? campaignsRows : [];
    const safeRows = rows.length ? rows : [emptyCampaignItem()];
    const safeEditIdx = safeRows.length && editingCampaignIndex >= 0 && editingCampaignIndex < safeRows.length
      ? editingCampaignIndex
      : -1;
    const editingItem = safeEditIdx >= 0 ? safeRows[safeEditIdx] : null;
    return (
      <>
        <Text style={styles.formHint}>{tr('edit_campaigns_hint', 'Aba visual para campanhas (outlet, novas coleções), sem sub-abas.')}</Text>
        {safeRows.map((item, idx) => {
          const enabled = item?.enabled !== false;
          const active = idx === safeEditIdx;
          return (
            <View
              key={`campaign-row-${idx}`}
              style={[
                styles.editServiceListRow,
                active && styles.editServiceListRowActive,
                !enabled && styles.editServiceListRowDisabled,
                { marginBottom: 8 },
              ]}
            >
              <Pressable
                style={[styles.editServiceListMain, { gap: 2 }]}
                onPress={() => setEditingCampaignIndex(idx)}
              >
                <Text style={styles.editServiceListTitle} numberOfLines={1}>
                  {String(item?.title || '').trim() || `${tr('edit_campaign', 'Campanha')} ${idx + 1}`}
                </Text>
                <Text style={styles.editServiceListMeta} numberOfLines={1}>
                  {String(item?.badge || '').trim() || tr('edit_no_badge', 'Sem badge')}
                </Text>
              </Pressable>
              <Pressable
                style={styles.formListCopyBtn}
                onPress={() =>
                  setCampaignsRows((prev) =>
                    prev.map((row, i) => (i === idx ? { ...row, enabled: !(row?.enabled !== false) } : row))
                  )
                }
              >
                <Ionicons name={enabled ? 'eye-outline' : 'eye-off-outline'} size={12} color="#334155" />
              </Pressable>
              <Pressable
                style={styles.formListCopyBtn}
                onPress={() =>
                  setCampaignsRows((prevRows) => {
                    const prev = Array.isArray(prevRows) ? prevRows : [];
                    const src = prev[idx];
                    if (!src) return prev;
                    const clone = { ...src };
                    const next = [...prev];
                    next.splice(idx + 1, 0, clone);
                    setEditingCampaignIndex(idx + 1);
                    return next;
                  })
                }
              >
                <Ionicons name="copy-outline" size={12} color="#334155" />
              </Pressable>
              <Pressable
                style={styles.formListDangerBtn}
                onPress={() =>
                  setCampaignsRows((prevRows) => {
                    const prev = Array.isArray(prevRows) ? prevRows : [];
                    const next = prev.filter((_, i) => i !== idx);
                    setEditingCampaignIndex((prevIdx) => {
                      if (prevIdx === idx) return next.length ? Math.min(idx, next.length - 1) : -1;
                      if (prevIdx > idx) return prevIdx - 1;
                      return prevIdx;
                    });
                    return next.length ? next : [emptyCampaignItem()];
                  })
                }
              >
                <Text style={styles.formListDangerText}>x</Text>
              </Pressable>
            </View>
          );
        })}
        {!!editingItem && (
          <View key={`campaign-edit-${safeEditIdx}`} style={[styles.editItemCard, styles.editItemCardCompact]}>
            <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_title', 'Título')}</Text>
            <TextInput
              value={editingItem?.title || ''}
              onChangeText={(value) =>
                setCampaignsRows((prev) => prev.map((row, i) => (i === safeEditIdx ? { ...row, title: value } : row)))
              }
              style={styles.input}
              maxLength={60}
              placeholder={tr('edit_campaign_title_placeholder', 'Ex: Outlet de Verão')}
            />
            <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_badge_optional', 'Badge (opcional)')}</Text>
            <TextInput
              value={editingItem?.badge || ''}
              onChangeText={(value) =>
                setCampaignsRows((prev) => prev.map((row, i) => (i === safeEditIdx ? { ...row, badge: value } : row)))
              }
              style={styles.input}
              maxLength={24}
              placeholder={tr('edit_badge_placeholder', 'Outlet / Novo / -30%')}
            />
            <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_campaign_image', 'Imagem da campanha')}</Text>
            <View style={styles.editImageRow}>
              <Pressable
                style={styles.lodgingMediaAddBtn}
                onPress={async () => {
                  const uri = await pickSingleImageUri();
                  if (!uri) return;
                  setCampaignsRows((prev) =>
                    prev.map((row, i) => {
                      if (i !== safeEditIdx) return row;
                      const images = uniqueAmenityList([
                        ...normalizeMediaList(row?.images),
                        ...normalizeMediaList(row?.image ? [row.image] : []),
                        uri,
                      ]);
                      return { ...row, images, image: images[0] || '' };
                    })
                  );
                }}
              >
                <Ionicons name="image-outline" size={14} color="#0f172a" />
                <Text style={styles.lodgingMediaAddText}>{tr('edit_upload_image', 'Carregar imagem')}</Text>
              </Pressable>
            </View>
            {(() => {
              const imageList = uniqueAmenityList([
                ...normalizeMediaList(editingItem?.images),
                ...normalizeMediaList(editingItem?.image ? [editingItem.image] : []),
              ]);
              if (!imageList.length) return null;
              return (
                <View style={styles.campaignThumbsRow}>
                  {imageList.map((imgUri, imgIdx) => (
                    <View key={`campaign-img-${safeEditIdx}-${imgIdx}`} style={styles.campaignThumbWrap}>
                      <Pressable
                        onPress={() => {
                          const uri = resolveAvatarUri(imgUri) || imgUri;
                          if (!uri) return;
                          openContentImageEditor(
                            { source: 'campaigns', itemIndex: safeEditIdx, imageIndex: imgIdx },
                            uri
                          );
                        }}
                      >
                        <Image source={{ uri: resolveAvatarUri(imgUri) || imgUri }} style={styles.campaignThumbImage} />
                      </Pressable>
                      <Pressable
                        style={styles.campaignThumbRemoveBtn}
                        onPress={() =>
                          setCampaignsRows((prev) =>
                            prev.map((row, i) => {
                              if (i !== safeEditIdx) return row;
                              const nextImages = uniqueAmenityList([
                                ...normalizeMediaList(row?.images),
                                ...normalizeMediaList(row?.image ? [row.image] : []),
                              ]).filter((_, k) => k !== imgIdx);
                              return { ...row, images: nextImages, image: nextImages[0] || '' };
                            })
                          )
                        }
                      >
                        <Text style={styles.campaignThumbRemoveText}>x</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              );
            })()}
            <Text style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{tr('edit_campaign_video_label', 'Vídeo da campanha')}</Text>
            <View style={styles.editImageRow}>
              <Pressable
                style={styles.lodgingMediaAddBtn}
                onPress={async () => {
                  const uri = await pickSingleVideoUri();
                  if (!uri) return;
                  setCampaignsRows((prev) =>
                    prev.map((row, i) => {
                      if (i !== safeEditIdx) return row;
                      const videos = uniqueAmenityList([
                        ...normalizeMediaList(row?.videos),
                        ...normalizeMediaList(row?.video ? [row.video] : []),
                        uri,
                      ]);
                      return { ...row, videos, video: videos[0] || '' };
                    })
                  );
                }}
              >
                <Ionicons name="videocam-outline" size={14} color="#0f172a" />
                <Text style={styles.lodgingMediaAddText}>{tr('edit_upload_video', 'Carregar vídeo')}</Text>
              </Pressable>
            </View>
            {(() => {
              const videoList = uniqueAmenityList([
                ...normalizeMediaList(editingItem?.videos),
                ...normalizeMediaList(editingItem?.video ? [editingItem.video] : []),
              ]);
              if (!videoList.length) return null;
              return (
                <View style={styles.campaignThumbsRow}>
                  {videoList.map((videoUri, videoIdx) => (
                    <View key={`campaign-video-${safeEditIdx}-${videoIdx}`} style={styles.campaignThumbWrap}>
                      <Pressable
                        style={styles.campaignVideoThumb}
                        onPress={() => {
                          const uri = resolveAvatarUri(videoUri) || videoUri;
                          if (!uri) return;
                          openCampaignVideoEditor(safeEditIdx, videoIdx, uri);
                        }}
                      >
                        <Ionicons name="film-outline" size={14} color="#334155" />
                      </Pressable>
                      <Pressable
                        style={styles.campaignThumbRemoveBtn}
                        onPress={() =>
                          setCampaignsRows((prev) =>
                            prev.map((row, i) => {
                              if (i !== safeEditIdx) return row;
                              const nextVideos = uniqueAmenityList([
                                ...normalizeMediaList(row?.videos),
                                ...normalizeMediaList(row?.video ? [row.video] : []),
                              ]).filter((_, k) => k !== videoIdx);
                              return { ...row, videos: nextVideos, video: nextVideos[0] || '' };
                            })
                          )
                        }
                      >
                        <Text style={styles.campaignThumbRemoveText}>x</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        )}
        <Pressable
          style={styles.miniActionBtnWideSecondary}
          onPress={() =>
            setCampaignsRows((prevRows) => {
              const prev = Array.isArray(prevRows) ? prevRows : [];
              setEditingCampaignIndex(prev.length);
              return [...prev, emptyCampaignItem()];
            })
          }
        >
          <Text style={styles.secondaryBtnText}>{tr('edit_add_campaign', '+ Adicionar campanha')}</Text>
        </Pressable>
      </>
    );
  }

  function renderLodgingEditor(kind = 'casas') {
    const isHouses = kind === 'casas';
    const sections = isHouses ? housesSectionsState : roomsSectionsState;
    const setSections = isHouses ? setHousesSectionsState : setRoomsSectionsState;
    const activeSection = isHouses ? activeHousesSection : activeRoomsSection;
    const setActiveSection = isHouses ? setActiveHousesSectionId : setActiveRoomsSectionId;
    const activeItemIndex = isHouses ? activeHouseItemIndex : activeRoomItemIndex;
    const setActiveItemIndex = isHouses ? setActiveHouseItemIndex : setActiveRoomItemIndex;
    const amenityDraft = isHouses ? houseAmenityDraft : roomAmenityDraft;
    const setAmenityDraft = isHouses ? setHouseAmenityDraft : setRoomAmenityDraft;
    const ruleDraft = isHouses ? houseRuleDraft : roomRuleDraft;
    const setRuleDraft = isHouses ? setHouseRuleDraft : setRoomRuleDraft;
    const activeId = activeSection?.id;
    const items = activeSection?.items || [];
    const safeItemIndex = Math.max(0, Math.min(activeItemIndex, Math.max(0, items.length - 1)));
    const activeItem = items[safeItemIndex] || emptyLodgingItem();
    const amenities = normalizeAmenityList(activeItem?.amenities);
    const rules = normalizeAmenityList(activeItem?.houseRules);
    const lodgingImages = uniqueAmenityList([
      ...normalizeMediaList(activeItem?.images),
      ...normalizeMediaList(activeItem?.image ? [activeItem.image] : []),
    ]);
    const availabilityValue = String(activeItem?.availability || '').trim().toLowerCase();
    const isAvailableSelected =
      availabilityValue === 'disponivel' ||
      availabilityValue === 'disponível';
    const isUnavailableSelected =
      availabilityValue === 'indisponivel' ||
      availabilityValue === 'indisponível';
    const labelBase = isHouses ? 'Casa' : 'Quarto';
    const sectionBase = isHouses ? 'Casas' : 'Quartos';
    const addAmenityValue = (rawValue) => {
      const next = String(rawValue || '').trim();
      if (!next) return;
      if (amenities.some((entry) => entry.toLowerCase() === next.toLowerCase())) {
        setAmenityDraft('');
        return;
      }
      updateItemInActiveSection(setSections, activeId, safeItemIndex, 'amenities', [...amenities, next]);
      setAmenityCatalog((prev) => uniqueAmenityList([...prev, next]));
      setAmenityDraft('');
    };
    const addAmenity = () => addAmenityValue(amenityDraft);
    const addAmenityFromCatalog = (value) => addAmenityValue(value);
    const removeAmenity = (idx) => {
      updateItemInActiveSection(
        setSections,
        activeId,
        safeItemIndex,
        'amenities',
        amenities.filter((_, entryIdx) => entryIdx !== idx)
      );
    };
    const addRuleValue = (rawValue) => {
      const next = String(rawValue || '').trim();
      if (!next) return;
      if (rules.some((entry) => entry.toLowerCase() === next.toLowerCase())) {
        setRuleDraft('');
        return;
      }
      updateItemInActiveSection(setSections, activeId, safeItemIndex, 'houseRules', [...rules, next]);
      setRulesCatalog((prev) => uniqueAmenityList([...prev, next]));
      setRuleDraft('');
    };
    const addRule = () => addRuleValue(ruleDraft);
    const addRuleFromCatalog = (value) => addRuleValue(value);
    const removeRule = (idx) => {
      updateItemInActiveSection(
        setSections,
        activeId,
        safeItemIndex,
        'houseRules',
        rules.filter((_, entryIdx) => entryIdx !== idx)
      );
    };
    const updateLodgingImages = (nextImages) => {
      const cleaned = uniqueAmenityList(nextImages).filter(Boolean).slice(0, 18);
      updateItemInActiveSection(setSections, activeId, safeItemIndex, 'images', cleaned);
      updateItemInActiveSection(setSections, activeId, safeItemIndex, 'image', cleaned[0] || '');
    };
    const removeLodgingImage = (idx) => {
      updateLodgingImages(lodgingImages.filter((_, imageIdx) => imageIdx !== idx));
    };
    const makePrimaryLodgingImage = (idx) => {
      if (idx <= 0 || idx >= lodgingImages.length) return;
      const next = [...lodgingImages];
      const [selected] = next.splice(idx, 1);
      next.unshift(selected);
      updateLodgingImages(next);
    };
    async function handlePickLodgingImages() {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission?.granted) {
        Alert.alert(tr('edit_permission', 'Permissao'), tr('edit_permission_photos_needed', 'Permite acesso a fotos para adicionar imagens.'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (result?.canceled || !Array.isArray(result?.assets) || !result.assets.length) return;
      const pickedUris = result.assets
        .map((asset) => String(asset?.uri || '').trim())
        .filter(Boolean);
      if (!pickedUris.length) return;
      updateLodgingImages([...lodgingImages, ...pickedUris]);
    }
    return (
      <>
        <Text style={styles.formHint}>{sectionBase} {tr('edit_lodging_hint_suffix', 'por categoria com sub-abas (ex:')} {labelBase} 1, {labelBase} 2).</Text>
        {renderSectionTabs(
          sections,
          activeId,
          setActiveSection,
          () => {
            addSection(setSections, setActiveSection, sections, 'Categoria', emptyLodgingItem);
            setActiveItemIndex(0);
            setAmenityDraft('');
            setRuleDraft('');
          },
          (secId) => removeSection(setSections, setActiveSection, sections, secId, sectionBase, emptyLodgingItem),
          {
            onMoveSection: (direction) => moveActiveSection(setSections, activeId, direction),
          }
        )}
        {!!activeSection && (
          <>
            <Text style={styles.formLabel}>{tr('edit_category_name', 'Nome da categoria')}</Text>
            <TextInput
              value={activeSection.label}
              onChangeText={(value) => updateSectionLabel(setSections, activeId, value)}
              style={styles.input}
            />
            {!!items.length && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editTabsRow}>
                {items.map((item, idx) => {
                  const active = idx === safeItemIndex;
                  const label = String(item?.name || '').trim() || `${labelBase} ${idx + 1}`;
                  return (
                    <View key={`${kind}-item-tab-${idx}`} style={[styles.editTabPill, active && styles.editTabPillActive]}>
                      <Pressable style={styles.editTabPillPress} onPress={() => setActiveItemIndex(idx)}>
                        <Text style={[styles.editTabPillText, active && styles.editTabPillTextActive]} numberOfLines={1}>
                          {label}
                        </Text>
                      </Pressable>
                      {items.length > 1 && (
                        <Pressable
                          style={styles.editTabRemoveBtn}
                          onPress={() => {
                            removeItemFromActiveSection(setSections, activeId, idx, emptyLodgingItem);
                            setActiveItemIndex((prev) => {
                              if (prev > idx) return prev - 1;
                              if (prev === idx) return Math.max(0, prev - 1);
                              return prev;
                            });
                            setAmenityDraft('');
                            setRuleDraft('');
                          }}
                        >
                          <Text style={[styles.editTabRemoveText, active && styles.editTabRemoveTextActive]}>x</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.editItemCard}>
              <View style={styles.editInputRow}>
                <View style={[styles.editIconInputWrap, styles.editInputFlex]}>
                  <Ionicons name="home-outline" size={14} color="#64748b" style={styles.editIconInputIcon} />
                  <TextInput
                    value={activeItem.name}
                    onChangeText={(value) => updateItemInActiveSection(setSections, activeId, safeItemIndex, 'name', value)}
                    style={[styles.input, styles.inputWithLeadingIcon]}
                      placeholder={`${tr('edit_name', 'Nome')} ${labelBase.toLowerCase()}`}
                  />
                </View>
              </View>
              <View style={[styles.editPromoBox, activeItem.promoEnabled && styles.editPromoBoxActive]}>
                <Pressable
                  style={styles.editPromoSwitchRow}
                  onPress={() =>
                    updateItemInActiveSection(setSections, activeId, safeItemIndex, 'promoEnabled', !activeItem.promoEnabled)
                  }
                >
                  <View style={styles.personalAlertLeft}>
                    <Ionicons name="pricetag-outline" size={15} color="#334155" />
                    <Text style={styles.editPromoToggleBadge}>PROMO</Text>
                  </View>
                  <View style={[styles.personalAlertToggle, activeItem.promoEnabled && styles.personalAlertToggleActive]}>
                    <View style={[styles.personalAlertKnob, activeItem.promoEnabled && styles.personalAlertKnobActive]} />
                  </View>
                </Pressable>
                {activeItem.promoEnabled && (
                  <View style={styles.editPromoPricesRow}>
                    <TextInput
                      value={activeItem.promoOldPrice}
                      onChangeText={(value) => updateItemInActiveSection(setSections, activeId, safeItemIndex, 'promoOldPrice', value)}
                      style={[styles.input, styles.editInputFlex]}
                      placeholder={tr('edit_price_before', 'Preço antes')}
                    />
                    <TextInput
                      value={activeItem.promoNowPrice}
                      onChangeText={(value) => updateItemInActiveSection(setSections, activeId, safeItemIndex, 'promoNowPrice', value)}
                      style={[styles.input, styles.editInputFlex]}
                      placeholder={tr('edit_price_now', 'Preço agora')}
                    />
                  </View>
                )}
              </View>
              <View style={styles.editInputRow}>
                <View style={[styles.editIconInputWrap, styles.editInputFlex]}>
                  <Ionicons name="people-outline" size={14} color="#64748b" style={styles.editIconInputIcon} />
                  <TextInput
                    value={activeItem.capacity}
                    onChangeText={(value) => updateItemInActiveSection(setSections, activeId, safeItemIndex, 'capacity', value)}
                    style={[styles.input, styles.inputWithLeadingIcon]}
                    placeholder={tr('edit_capacity', 'Capacidade')}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.editIconInputWrap, styles.editInputFlex]}>
                  <Ionicons name="pricetag-outline" size={14} color="#64748b" style={styles.editIconInputIcon} />
                  <TextInput
                    value={activeItem.priceNight}
                    onChangeText={(value) => updateItemInActiveSection(setSections, activeId, safeItemIndex, 'priceNight', value)}
                    style={[styles.input, styles.inputWithLeadingIcon]}
                    placeholder={tr('edit_price_per_night', 'Preço/noite')}
                  />
                </View>
              </View>
              <View style={styles.editInputRow}>
                <View style={[styles.editIconInputWrap, styles.editInputFlex]}>
                  <Ionicons name="bed-outline" size={14} color="#64748b" style={styles.editIconInputIcon} />
                  <TextInput
                    value={activeItem.beds}
                    onChangeText={(value) => updateItemInActiveSection(setSections, activeId, safeItemIndex, 'beds', value)}
                    style={[styles.input, styles.inputWithLeadingIcon]}
                    placeholder={tr('edit_beds', 'Camas')}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.editIconInputWrap, styles.editInputFlex]}>
                  <Ionicons name="water-outline" size={14} color="#64748b" style={styles.editIconInputIcon} />
                  <TextInput
                    value={activeItem.bathrooms}
                    onChangeText={(value) => updateItemInActiveSection(setSections, activeId, safeItemIndex, 'bathrooms', value)}
                    style={[styles.input, styles.inputWithLeadingIcon]}
                    placeholder={tr('edit_wc', 'WC')}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.editInputRow}>
                <View style={[styles.editIconInputWrap, styles.editInputFlex]}>
                  <Ionicons name="log-in-outline" size={14} color="#64748b" style={styles.editIconInputIcon} />
                  <TextInput
                    value={activeItem.checkIn}
                    onChangeText={(value) => updateItemInActiveSection(setSections, activeId, safeItemIndex, 'checkIn', value)}
                    style={[styles.input, styles.inputWithLeadingIcon]}
                    placeholder={tr('edit_checkin_placeholder', 'Check-in (ex: 15:00)')}
                  />
                </View>
                <View style={[styles.editIconInputWrap, styles.editInputFlex]}>
                  <Ionicons name="log-out-outline" size={14} color="#64748b" style={styles.editIconInputIcon} />
                  <TextInput
                    value={activeItem.checkOut}
                    onChangeText={(value) => updateItemInActiveSection(setSections, activeId, safeItemIndex, 'checkOut', value)}
                    style={[styles.input, styles.inputWithLeadingIcon]}
                    placeholder={tr('edit_checkout_placeholder', 'Check-out (ex: 11:00)')}
                  />
                </View>
              </View>
              <Text style={styles.formLabelCompact}>Disponibilidade</Text>
              <View style={styles.editInputRow}>
                <Pressable
                  style={[styles.editToggleBtn, styles.editInputFlex, isAvailableSelected && styles.editToggleBtnActive]}
                  onPress={() => updateItemInActiveSection(setSections, activeId, safeItemIndex, 'availability', 'disponivel')}
                >
                  <Text style={[styles.editToggleText, isAvailableSelected && styles.editToggleTextActive]}>{tr('edit_available', 'Disponivel')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.editToggleBtn, styles.editInputFlex, isUnavailableSelected && styles.editToggleBtnActive]}
                  onPress={() => updateItemInActiveSection(setSections, activeId, safeItemIndex, 'availability', 'indisponivel')}
                >
                  <Text style={[styles.editToggleText, isUnavailableSelected && styles.editToggleTextActive]}>{tr('edit_unavailable', 'Indisponivel')}</Text>
                </Pressable>
              </View>
              <View style={styles.lodgingMediaRow}>
                <Pressable style={styles.lodgingMediaAddBtn} onPress={handlePickLodgingImages}>
                  <Ionicons name="image-outline" size={14} color="#0f172a" />
                  <Text style={styles.lodgingMediaAddText}>{tr('edit_upload_photos', 'Carregar fotos')}</Text>
                </Pressable>
                {!!lodgingImages.length && (
                  <Text style={styles.formHintInline}>{lodgingImages.length} imagens</Text>
                )}
              </View>
              {!!lodgingImages.length && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lodgingThumbsRow}>
                  {lodgingImages.map((uri, idx) => (
                    <View key={`lodging-thumb-${kind}-${safeItemIndex}-${idx}`} style={styles.lodgingThumbWrap}>
                      <Pressable
                        style={[styles.lodgingThumbBtn, idx === 0 && styles.lodgingThumbBtnPrimary]}
                        onPress={() =>
                          openContentImageEditor(
                            {
                              source: 'lodging',
                              kind,
                              sectionId: activeId,
                              itemIndex: safeItemIndex,
                              imageIndex: idx,
                              imagesSnapshot: lodgingImages,
                            },
                            uri
                          )
                        }
                      >
                        <Image source={{ uri: resolveAvatarUri(uri) || uri }} style={styles.lodgingThumbImage} />
                      </Pressable>
                      {idx !== 0 && (
                        <Pressable style={styles.lodgingThumbPrimaryBtn} onPress={() => makePrimaryLodgingImage(idx)}>
                          <Ionicons name="arrow-up" size={9} color="#fff" />
                        </Pressable>
                      )}
                      <Pressable style={styles.lodgingThumbRemoveBtn} onPress={() => removeLodgingImage(idx)}>
                        <Ionicons name="close" size={10} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
                <Text style={styles.formLabelCompact}>{tr('edit_description', 'Descrição')}</Text>
              <TextInput
                value={activeItem.description}
                onChangeText={(value) => updateItemInActiveSection(setSections, activeId, safeItemIndex, 'description', value)}
                style={[styles.input, styles.inputArea]}
                multiline
                placeholder={tr('edit_description', 'Descrição')}
              />
              <Text style={styles.formLabelCompact}>{tr('edit_rules', 'Regras')}</Text>
              <View style={styles.editInputRow}>
                <TextInput
                  value={ruleDraft}
                  onChangeText={setRuleDraft}
                  onSubmitEditing={addRule}
                  style={[styles.input, styles.editInputFlex]}
                  placeholder={tr('edit_rules_placeholder', 'Ex: Sem festas, Sem fumar')}
                  returnKeyType="done"
                />
                <Pressable style={styles.editAmenityAddBtn} onPress={addRule}>
                  <Text style={styles.editAmenityAddBtnText}>{tr('edit_add', '+ Adicionar')}</Text>
                </Pressable>
              </View>
              {!!rules.length && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editTabsRow}>
                  {rules.map((entry, idx) => (
                    <View key={`rule-${kind}-${safeItemIndex}-${idx}`} style={styles.editTabPill}>
                      <View style={styles.editTabPillPress}>
                        <Text style={styles.editTabPillText} numberOfLines={1}>{entry}</Text>
                      </View>
                      <Pressable style={styles.editTabRemoveBtn} onPress={() => removeRule(idx)}>
                        <Text style={styles.editTabRemoveText}>x</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
              {!!rulesCatalog.length && (
                <>
                  <Text style={styles.formLabelCompact}>{tr('edit_rule_suggestions', 'Sugestões de regras')}</Text>
                  <View style={styles.formChipsWrap}>
                    {rulesCatalog.map((entry, idx) => {
                      const active = rules.some((item) => item.toLowerCase() === entry.toLowerCase());
                      return (
                        <Pressable
                          key={`rule-suggestion-${kind}-${idx}`}
                          style={[styles.formChip, active && styles.formChipActive]}
                          onPress={() => addRuleFromCatalog(entry)}
                        >
                          <Text style={[styles.formChipText, active && styles.formChipTextActive]}>{entry}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
              <Text style={styles.formLabelCompact}>{tr('edit_amenities', 'Comodidades')}</Text>
              <View style={styles.editInputRow}>
                <TextInput
                  value={amenityDraft}
                  onChangeText={setAmenityDraft}
                  onSubmitEditing={addAmenity}
                  style={[styles.input, styles.editInputFlex]}
                  placeholder={tr('edit_amenities_placeholder', 'Ex: Wi-Fi, Piscina, Ar condicionado')}
                  returnKeyType="done"
                />
                <Pressable style={styles.editAmenityAddBtn} onPress={addAmenity}>
                  <Text style={styles.editAmenityAddBtnText}>{tr('edit_add', '+ Adicionar')}</Text>
                </Pressable>
              </View>
              {!!amenities.length && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editTabsRow}>
                  {amenities.map((entry, idx) => (
                    <View key={`amenity-${kind}-${safeItemIndex}-${idx}`} style={styles.editTabPill}>
                      <View style={styles.editTabPillPress}>
                        <Text style={styles.editTabPillText} numberOfLines={1}>{entry}</Text>
                      </View>
                      <Pressable style={styles.editTabRemoveBtn} onPress={() => removeAmenity(idx)}>
                        <Text style={styles.editTabRemoveText}>x</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
              {!!amenityCatalog.length && (
                <>
                  <Text style={styles.formLabelCompact}>{tr('edit_suggestions', 'Sugestões')}</Text>
                  <View style={styles.formChipsWrap}>
                    {amenityCatalog.map((entry, idx) => {
                      const active = amenities.some((item) => item.toLowerCase() === entry.toLowerCase());
                      return (
                        <Pressable
                          key={`amenity-suggestion-${kind}-${idx}`}
                          style={[styles.formChip, active && styles.formChipActive]}
                          onPress={() => addAmenityFromCatalog(entry)}
                        >
                          <Text style={[styles.formChipText, active && styles.formChipTextActive]}>{entry}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
            <Pressable
              style={styles.secondaryBtnWide}
              onPress={() => {
                addItemToActiveSection(setSections, activeId, emptyLodgingItem);
                setActiveItemIndex(items.length);
                setAmenityDraft('');
                setRuleDraft('');
              }}
            >
              <Text style={styles.secondaryBtnText}>+ {tr('edit_add', 'Adicionar')} {labelBase.toLowerCase()}</Text>
            </Pressable>
          </>
        )}
      </>
    );
  }

  function renderLocationsEditor() {
    return (
      <>
        <Text style={styles.formHint}>{tr('edit_locations_hint', 'Nome, morada, nota e coordenadas.')}</Text>
        {locationsRows.map((row, idx) => (
          <View key={`loc-${idx}`} style={styles.editItemCard}>
            <TextInput
              value={row.title}
              onChangeText={(value) => setLocationsRows((prev) => prev.map((r, i) => (i === idx ? { ...r, title: value } : r)))}
              style={styles.input}
              placeholder={tr('edit_location_name_placeholder', 'Nome do local')}
            />
            <TextInput
              value={row.address}
              onChangeText={(value) => setLocationsRows((prev) => prev.map((r, i) => (i === idx ? { ...r, address: value } : r)))}
              style={styles.input}
              placeholder={tr('edit_address_placeholder', 'Morada')}
            />
            <TextInput
              value={row.note}
              onChangeText={(value) => setLocationsRows((prev) => prev.map((r, i) => (i === idx ? { ...r, note: value } : r)))}
              style={styles.input}
              placeholder={tr('edit_note_optional', 'Nota (opcional)')}
            />
            <View style={styles.editInputRow}>
              <TextInput
                value={row.coords}
                onChangeText={(value) => setLocationsRows((prev) => prev.map((r, i) => (i === idx ? { ...r, coords: value } : r)))}
                style={[styles.input, styles.editInputFlex]}
                placeholder={tr('edit_coordinates_placeholder', 'Coordenadas (lat,lng)')}
              />
              <Pressable
                style={styles.formListDangerBtn}
                onPress={() => setLocationsRows((prev) => {
                  const next = prev.filter((_, i) => i !== idx);
                  return next.length ? next : [emptyLocationRow()];
                })}
              >
                <Text style={styles.formListDangerText}>x</Text>
              </Pressable>
            </View>
            <TextInput
              value={row.link}
              onChangeText={(value) => setLocationsRows((prev) => prev.map((r, i) => (i === idx ? { ...r, link: value } : r)))}
              style={styles.input}
              placeholder={tr('edit_map_link_optional', 'Link mapa (opcional)')}
              autoCapitalize="none"
            />
          </View>
        ))}
        <Pressable style={styles.miniActionBtnWideSecondary} onPress={() => setLocationsRows((prev) => [...prev, emptyLocationRow()])}>
          <Text style={styles.secondaryBtnText}>{tr('edit_add_location', '+ Adicionar local')}</Text>
        </Pressable>
      </>
    );
  }

  function renderPartnersEditor() {
    return (
      <>
        <Text style={styles.formHint}>{tr('edit_partners_hint', 'Parceiros com nome, imagem e link.')}</Text>
        {partnersRows.map((row, idx) => (
          <View key={`partner-${idx}`} style={styles.editItemCard}>
            <View style={styles.editInputRow}>
              <TextInput
                value={row.name}
                onChangeText={(value) => setPartnersRows((prev) => prev.map((r, i) => (i === idx ? { ...r, name: value } : r)))}
                style={[styles.input, styles.editInputFlex]}
                placeholder={tr('edit_name', 'Nome')}
              />
              <Pressable
                style={styles.formListDangerBtn}
                onPress={() => setPartnersRows((prev) => {
                  const next = prev.filter((_, i) => i !== idx);
                  return next.length ? next : [emptyPartnerRow()];
                })}
              >
                <Text style={styles.formListDangerText}>x</Text>
              </Pressable>
            </View>
            <TextInput
              value={row.image}
              onChangeText={(value) => setPartnersRows((prev) => prev.map((r, i) => (i === idx ? { ...r, image: value } : r)))}
              style={styles.input}
              placeholder={tr('edit_image_url', 'Imagem URL')}
              autoCapitalize="none"
            />
            <TextInput
              value={row.link}
              onChangeText={(value) => setPartnersRows((prev) => prev.map((r, i) => (i === idx ? { ...r, link: value } : r)))}
              style={styles.input}
              placeholder={tr('edit_link_optional', 'Link (opcional)')}
              autoCapitalize="none"
            />
          </View>
        ))}
        <Pressable style={styles.secondaryBtnWide} onPress={() => setPartnersRows((prev) => [...prev, emptyPartnerRow()])}>
          <Text style={styles.secondaryBtnText}>{tr('edit_add_partner', '+ Adicionar parceiro')}</Text>
        </Pressable>
      </>
    );
  }

  function renderActiveTabEditor() {
    if (!activeTab) return <Text style={styles.formHint}>{tr('edit_no_active_tabs', 'Sem abas ativas.')}</Text>;
    const type = String(activeTab?.type || 'sobre').toLowerCase();
    if (type === 'sobre') return renderAboutEditor();
    if (type === 'galeria') return renderGalleryEditor();
    if (type === 'servicos') return renderServicesEditor();
    if (type === 'menu') return renderMenuEditor();
    if (type === 'produtos') return renderProductsEditor();
    if (type === 'campanhas' || type === 'campanha') return renderCampaignsEditor();
    if (type === 'portfolio' || type === 'portofolio') return renderPortfolioEditor();
    if (type === 'casas') return renderLodgingEditor('casas');
    if (type === 'quartos') return renderLodgingEditor('quartos');
    if (type === 'horario') {
      return (
        <>
          <Text style={styles.formHint}>{tr('edit_schedule_hint', 'Define o horário por dia.')}</Text>
          <View style={styles.editDaysGrid}>
            {SCHEDULE_DAYS.map((day) => (
              <View key={day.key} style={styles.editDaysItem}>
                <Text style={styles.formLabelCompact}>{day.label}</Text>
                <TextInput
                  value={schedule[day.key]}
                  onChangeText={(value) => setSchedule((prev) => ({ ...prev, [day.key]: value }))}
                  style={styles.input}
                  placeholder={tr('edit_schedule_placeholder', '09:00-18:00')}
                />
              </View>
            ))}
          </View>
        </>
      );
    }
    if (type === 'agenda') {
      return (
        <>
          <Text style={styles.formHint}>{tr('edit_agenda_hint', 'Descrição, link de reserva e horários disponíveis.')}</Text>
          <Text style={styles.formLabel}>{tr('edit_description', 'Descrição')}</Text>
          <TextInput
            value={agendaDescription}
            onChangeText={setAgendaDescription}
            style={[styles.input, styles.inputArea]}
            multiline
          />
          <Text style={styles.formLabel}>{tr('edit_booking_link', 'Link de reserva')}</Text>
          <TextInput
            value={agendaReserveLink}
            onChangeText={setAgendaReserveLink}
            style={styles.input}
            autoCapitalize="none"
            placeholder={tr('edit_link_placeholder', 'https://...')}
          />
          <Text style={styles.formLabel}>{tr('edit_day_and_hours', 'Dia e horas')}</Text>
          {agendaSlotsRows.map((slot, idx) => (
            <View key={`agenda-slot-${idx}`} style={styles.editItemCard}>
              <View style={styles.editInputRow}>
                <View style={styles.editInputFlex}>
                  <Text style={styles.formLabelCompact}>{tr('edit_day_date', 'Dia (data)')}</Text>
                  <TextInput
                    value={slot.day}
                    onChangeText={(value) => setAgendaSlotsRows((prev) => prev.map((s, i) => (i === idx ? { ...s, day: value } : s)))}
                    style={styles.input}
                    placeholder={tr('edit_day_date_placeholder', 'Ex: 15/03/2026')}
                  />
                </View>
                <Pressable
                  style={styles.formListDangerBtn}
                  onPress={() => setAgendaSlotsRows((prev) => {
                    const next = prev.filter((_, i) => i !== idx);
                    return next.length ? next : [{ day: '', weekday: '', times: '' }];
                  })}
                >
                  <Text style={styles.formListDangerText}>x</Text>
                </Pressable>
              </View>
              <Text style={styles.formLabelCompact}>{tr('edit_weekday', 'Dia da semana')}</Text>
              <TextInput
                value={slot.weekday}
                onChangeText={(value) => setAgendaSlotsRows((prev) => prev.map((s, i) => (i === idx ? { ...s, weekday: value } : s)))}
                style={styles.input}
                placeholder={tr('edit_weekday_placeholder', 'Ex: Segunda-feira')}
              />
              <Text style={styles.formLabelCompact}>{tr('edit_hours', 'Horas')}</Text>
              <TextInput
                value={slot.times}
                onChangeText={(value) => setAgendaSlotsRows((prev) => prev.map((s, i) => (i === idx ? { ...s, times: value } : s)))}
                style={styles.input}
                placeholder={tr('edit_hours_placeholder', 'Ex: 09h 11h 14h 18h')}
              />
            </View>
          ))}
          <Pressable
            style={styles.miniActionBtnWideSecondary}
            onPress={() => setAgendaSlotsRows((prev) => [...prev, { day: '', weekday: '', times: '' }])}
          >
            <Text style={styles.secondaryBtnText}>{tr('edit_add_slot', '+ Adicionar vaga')}</Text>
          </Pressable>
        </>
      );
    }
    if (type === 'locais') return renderLocationsEditor();
    if (type === 'parcerias') return renderPartnersEditor();
    return <Text style={styles.formHint}>{tr('edit_no_editor_for_tab', 'Sem editor configurado para esta aba.')}</Text>;
  }

  function handleSaveProfile() {
    if (!validateRequiredFields()) return;

    const effectiveCategory = String(customCategory || '').trim() || String(category || '').trim();
    const cleanLinks = links.map((item) => ({
      type: String(item.type || 'website'),
      url: String(item.url || '').trim(),
      label: String(item.label || '').trim(),
    }));
    const getFirst = (type) =>
      cleanLinks.find((item) => item.type === type && item.url)?.url || '';
    const websiteFromLinks = getFirst('website') || getFirst('outro') || '';
    const normalizedPhotos = normalizeMediaList(galleryPhotos);
    const normalizedVideos = uniqueAmenityList([
      ...normalizeMediaList(galleryVideos),
      ...normalizeMediaList(galleryReels),
    ]);
    const normalizedReels = [];
    const normalizedModalFit = normalizeGalleryModalFit(galleryModalFit);
    const normalizedItemFitMap = filterGalleryItemFitMap(galleryItemFitMap, {
      photos: normalizedPhotos,
      videos: normalizedVideos,
      reels: normalizedReels,
    });
    const normalizedItemCropMap = filterGalleryItemCropMap(galleryItemCropMap, {
      photos: normalizedPhotos,
      videos: normalizedVideos,
      reels: normalizedReels,
    });

    onSave(
      sanitizeProfilePayload({
        name,
        category: effectiveCategory,
        type: profileType,
        location,
        about,
        dataPatch: {
          type: profileType,
          role: effectiveCategory,
          customCategory: String(customCategory || '').trim(),
          avatar: String(avatar || '').trim(),
          tabsMode: isBlueprintTabs ? 'blueprint' : 'custom',
          tabs,
          links: cleanLinks,
          website: websiteFromLinks,
          site: websiteFromLinks,
          social: {
            instagram: getFirst('instagram'),
            youtube: getFirst('youtube'),
            facebook: getFirst('facebook'),
            linkedin: getFirst('linkedin'),
            tiktok: getFirst('tiktok'),
          },
          contentCategories: hashtagReferences,
          tags: hashtagReferences,
          services: toServicesPayload(servicesSectionsToRows(servicesSectionsState)),
          servicesSections: toSectionsPayload(servicesSectionsState, 'services'),
          schedule: {
            seg: String(schedule.seg || '').trim(),
            ter: String(schedule.ter || '').trim(),
            qua: String(schedule.qua || '').trim(),
            qui: String(schedule.qui || '').trim(),
            sex: String(schedule.sex || '').trim(),
            sab: String(schedule.sab || '').trim(),
            dom: String(schedule.dom || '').trim(),
          },
          agenda: {
            description: String(agendaDescription || '').trim(),
            reserveLink: String(agendaReserveLink || '').trim(),
            slots: toAgendaSlotsPayload(agendaSlotsRows),
          },
          locations: toLocationsPayload(locationsRows),
          partners: toPartnersPayload(partnersRows),
          amenitiesCatalog: uniqueAmenityList(amenityCatalog),
          rulesCatalog: uniqueAmenityList(rulesCatalog),
          menuSections: toSectionsPayload(menuSectionsState, 'menu'),
          productsSections: toSectionsPayload(productsSectionsState, 'products'),
          campaigns: (Array.isArray(campaignsRows) ? campaignsRows : [])
            .map((item) => ({
              title: String(item?.title || item?.name || '').trim(),
              name: String(item?.title || item?.name || '').trim(),
              badge: String(item?.badge || '').trim(),
              images: uniqueAmenityList([
                ...normalizeMediaList(item?.images),
                ...normalizeMediaList(item?.image ? [item.image] : []),
              ]),
              videos: uniqueAmenityList([
                ...normalizeMediaList(item?.videos),
                ...normalizeMediaList(item?.video || item?.videoUrl ? [item?.video || item?.videoUrl] : []),
              ]),
              image: uniqueAmenityList([
                ...normalizeMediaList(item?.images),
                ...normalizeMediaList(item?.image ? [item.image] : []),
              ])[0] || '',
              video: uniqueAmenityList([
                ...normalizeMediaList(item?.videos),
                ...normalizeMediaList(item?.video || item?.videoUrl ? [item?.video || item?.videoUrl] : []),
              ])[0] || '',
              enabled: !(
                item?.enabled === false ||
                item?.active === false ||
                String(item?.enabled || item?.active || '').trim().toLowerCase() === 'false'
              ),
            }))
            .filter((item) => item.title || item.badge || item.image || item.video || item.images?.length || item.videos?.length),
          portfolioSections: toSectionsPayload(portfolioSectionsState, 'portfolio'),
          housesSections: toSectionsPayload(housesSectionsState, 'lodging'),
          roomsSections: toSectionsPayload(roomsSectionsState, 'lodging'),
          gallery: {
            photos: normalizedPhotos,
            videos: normalizedVideos,
            reels: [],
            modalFit: normalizedModalFit,
            itemFitMap: normalizedItemFitMap,
            itemCropMap: normalizedItemCropMap,
          },
          photos: normalizedPhotos,
          videos: normalizedVideos,
          reels: [],
          galleryModalFit: normalizedModalFit,
          galleryItemFitMap: normalizedItemFitMap,
          galleryItemCropMap: normalizedItemCropMap,
          contentImageFitMap,
          contentImageCropMap,
          stories: normalizeMediaList(storiesList),
        },
      })
    );
  }

  const subtabMove = getSubtabMoveConfig();

  return (
    <View style={styles.editRoot}>
      <View style={styles.editSection}>
        <Text style={styles.editSectionTitle}>{tr('edit_profile_photo_title', 'Foto de perfil')}</Text>
        <View style={styles.editAvatarCenter}>
          {avatarPreviewUri ? (
            <Image source={{ uri: avatarPreviewUri }} style={styles.editAvatarPreview} />
          ) : (
            <View style={styles.editAvatarPreviewEmpty}>
              <Text style={styles.editAvatarPreviewEmptyText}>{tr('edit_no_photo', 'Sem foto')}</Text>
            </View>
          )}
          <View style={styles.editAvatarButtonsRow}>
            <Pressable
              style={styles.editSmallBtn}
              onPress={handleUploadAvatar}
            >
              <Text style={styles.editSmallBtnText}>{tr('edit_upload_photo', 'Carregar foto')}</Text>
            </Pressable>
            <Pressable
              style={[styles.editSmallBtn, styles.editSmallBtnGhost]}
              onPress={() => setAvatar('')}
            >
              <Text style={[styles.editSmallBtnText, styles.editSmallBtnTextGhost]}>{tr('edit_remove', 'Remover')}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.editSection}>
        <Text style={styles.editSectionTitle}>{tr('edit_basic_info', 'Informacoes basicas')}</Text>
        <Text style={styles.formLabel}>{tr('edit_name', 'Nome')}</Text>
        <TextInput
          value={name}
          onChangeText={(value) => {
            setName(value);
            clearFieldError('name');
          }}
          maxLength={PROFILE_LIMITS.name}
          style={[styles.input, !!fieldErrors.name && styles.inputError]}
        />
        {!!fieldErrors.name && <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>}

        <Text style={styles.formLabel}>{tr('edit_profile_type', 'Tipo de perfil')}</Text>
        <View style={[styles.formSelectWrap, styles.formSelectWrapTop]}>
          <Pressable
            style={styles.formSelect}
            onPress={() => {
              setIsCategoryMenuOpen(false);
              setIsLinkTypeMenuOpen(false);
              setIsNewTabTypeMenuOpen(false);
              setIsTypeMenuOpen((prev) => !prev);
            }}
          >
            <Text style={styles.formSelectText}>
              {profileTypeOptions.find((item) => item.id === profileType)?.label || tr('edit_select', 'Selecionar')}
            </Text>
            <Text style={styles.formSelectCaret}>{isTypeMenuOpen ? '^' : 'v'}</Text>
          </Pressable>
          {isTypeMenuOpen && (
            <ScrollView
              style={styles.formSelectMenu}
              contentContainerStyle={styles.formSelectMenuContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {profileTypeOptions.map((item) => {
                const active = profileType === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.formSelectOption, active && styles.formSelectOptionActive]}
                    onPress={() => {
                      setProfileType(item.id);
                      setIsCategoryMenuOpen(false);
                      setIsTypeMenuOpen(false);
                    }}
                  >
                    <Text style={[styles.formSelectOptionText, active && styles.formSelectOptionTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <Text style={styles.formLabel}>{tr('edit_main_category', 'Categoria principal')}</Text>
        <View
          pointerEvents={isTypeMenuOpen ? 'none' : 'auto'}
          style={[
            styles.formSelectWrap,
            styles.formSelectWrapBottom,
            isTypeMenuOpen && styles.formSelectWrapUnderOverlay,
          ]}
        >
          <Pressable
            style={styles.formSelect}
            onPress={() => {
              setIsTypeMenuOpen(false);
              setIsLinkTypeMenuOpen(false);
              setIsNewTabTypeMenuOpen(false);
              setIsCategoryMenuOpen((prev) => !prev);
            }}
          >
            <Text style={styles.formSelectText}>{category || tr('edit_select_category', 'Selecionar categoria')}</Text>
            <Text style={styles.formSelectCaret}>{isCategoryMenuOpen ? '^' : 'v'}</Text>
          </Pressable>
          {isCategoryMenuOpen && (
            <ScrollView
              style={styles.formSelectMenu}
              contentContainerStyle={styles.formSelectMenuContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {categoryOptions.map((item) => {
                const active = String(category || '').toLowerCase() === String(item).toLowerCase();
                return (
                  <Pressable
                    key={`cat-${item}`}
                    style={[styles.formSelectOption, active && styles.formSelectOptionActive]}
                    onPress={() => {
                      setCategory(item);
                      setIsCategoryMenuOpen(false);
                      clearFieldError('category');
                    }}
                  >
                    <Text style={[styles.formSelectOptionText, active && styles.formSelectOptionTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
        <Text style={styles.formLabel}>{tr('edit_custom_category_optional', 'Categoria personalizada (opcional)')}</Text>
        <TextInput
          value={customCategory}
          onChangeText={(value) => {
            setCustomCategory(value);
            clearFieldError('category');
          }}
          maxLength={PROFILE_LIMITS.category}
          style={[styles.input, !!fieldErrors.category && styles.inputError]}
          placeholder={tr('edit_example_personal_trainer', 'Ex: Personal Trainer')}
        />
        {!!fieldErrors.category && <Text style={styles.fieldErrorText}>{fieldErrors.category}</Text>}
        <Text style={styles.formHint}>{tr('edit_custom_category_hint', 'Se preenchida, substitui a categoria selecionada acima.')}</Text>

        <Text style={styles.formLabel}>{tr('edit_hashtags', 'Referencias (#hashtags)')}</Text>
        <TextInput
          value={hashtagsInput}
          onChangeText={setHashtagsInput}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={tr('edit_hashtags_placeholder', '#massagem #depilacao #maquilhagem')}
        />
        <Text style={styles.formHint}>{tr('edit_hashtags_hint', 'Ajuda a aparecer em pesquisa por nicho.')}</Text>
        {!!hashtagReferences.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formChipsWrap}>
            {hashtagReferences.map((tag) => (
              <View key={`tag-preview-${tag}`} style={styles.formChip}>
                <Text style={styles.formChipText}>#{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <Text style={styles.formLabel}>{tr('edit_location', 'Localização')}</Text>
        <TextInput
          value={location}
          onChangeText={(value) => {
            setLocation(value);
            clearFieldError('location');
          }}
          maxLength={PROFILE_LIMITS.location}
          style={[styles.input, !!fieldErrors.location && styles.inputError]}
        />
        {!!fieldErrors.location && <Text style={styles.fieldErrorText}>{fieldErrors.location}</Text>}
      </View>

      <View style={styles.editSection}>
        <Text style={styles.editSectionTitle}>{tr('edit_links_title', 'Redes e links')}</Text>
        {!!links.length && (
          <View style={styles.formList}>
            {links.map((item) => (
              <View key={item.key} style={styles.formListRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.formListTitle}>
                    {(LINK_TYPES.find((opt) => opt.value === item.type)?.label || item.type || tr('edit_link', 'Link'))}
                  </Text>
                  <Text style={styles.formListValue} numberOfLines={1}>{item.url}</Text>
                  {!!item.label && <Text style={styles.formListValue}>{item.label}</Text>}
                </View>
                <Pressable style={styles.linkRowMiniBtn} onPress={() => handleEditLink(item)}>
                  <Text style={styles.linkRowMiniBtnText}>{tr('edit_edit', 'Editar')}</Text>
                </Pressable>
                <Pressable style={styles.linkRowMiniDangerBtn} onPress={() => handleRemoveLink(item.key)}>
                  <Text style={styles.linkRowMiniDangerBtnText}>{tr('edit_remove', 'Remover')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.formLabel}>{tr('edit_link_type', 'Tipo de link')}</Text>
        <View style={styles.formSelectWrap}>
          <Pressable
            style={styles.formSelect}
            onPress={() => {
              setIsCategoryMenuOpen(false);
              setIsTypeMenuOpen(false);
              setIsNewTabTypeMenuOpen(false);
              setIsLinkTypeMenuOpen((prev) => {
                const next = !prev;
                if (next) setLinkTypeSearch('');
                return next;
              });
            }}
          >
            <Text style={styles.formSelectText}>
              {LINK_TYPES.find((item) => item.value === newLinkType)?.label || tr('edit_select', 'Selecionar')}
            </Text>
            <Text style={styles.formSelectCaret}>{isLinkTypeMenuOpen ? '^' : 'v'}</Text>
          </Pressable>
          {isLinkTypeMenuOpen && (
            <ScrollView
              style={styles.formSelectMenu}
              contentContainerStyle={styles.formSelectMenuContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              <TextInput
                value={linkTypeSearch}
                onChangeText={setLinkTypeSearch}
                style={[styles.input, styles.formSelectSearchInput]}
                placeholder={tr('edit_search_network', 'Pesquisar rede...')}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {filteredLinkTypes.map((item) => {
                const active = newLinkType === item.value;
                return (
                  <Pressable
                    key={item.value}
                    style={[styles.formSelectOption, active && styles.formSelectOptionActive]}
                    onPress={() => {
                      setNewLinkType(item.value);
                      setIsLinkTypeMenuOpen(false);
                      setLinkTypeSearch('');
                    }}
                  >
                    <Text style={[styles.formSelectOptionText, active && styles.formSelectOptionTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
              {!filteredLinkTypes.length && (
                <Text style={styles.formHint}>{tr('edit_no_results_search', 'Sem resultados para esta pesquisa.')}</Text>
              )}
            </ScrollView>
          )}
        </View>

        <Text style={styles.formLabel}>{tr('edit_link_or_user', 'Link / utilizador')}</Text>
        <TextInput
          value={newLinkValue}
          onChangeText={(value) => {
            setNewLinkValue(value);
            clearFieldError('link');
          }}
          style={[styles.input, !!fieldErrors.link && styles.inputError]}
          autoCapitalize="none"
          placeholder={tr('edit_link_or_user_placeholder', 'https://... ou @utilizador')}
        />
        {!!fieldErrors.link && <Text style={styles.fieldErrorText}>{fieldErrors.link}</Text>}

        <Text style={styles.formLabel}>{tr('edit_display_name_optional', 'Nome a mostrar (opcional)')}</Text>
        <TextInput
          value={newLinkLabel}
          onChangeText={setNewLinkLabel}
          style={styles.input}
          placeholder={tr('edit_display_name_placeholder', 'Ex: Portfolio, Loja')}
        />

        <View style={styles.rowBtns}>
          {!!editingLinkKey && (
            <Pressable style={styles.miniActionBtnLongSecondary} onPress={handleCancelEditLink}>
              <Text style={styles.secondaryBtnText}>{tr('edit_cancel_edit', 'Cancelar edição')}</Text>
            </Pressable>
          )}
          <Pressable style={styles.miniActionBtnLongSecondary} onPress={handleAddLink}>
            <Text style={styles.secondaryBtnText}>{editingLinkKey ? tr('edit_save_link', 'Guardar link') : tr('edit_add_link', '+ Adicionar link')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.editSection}>
        <View style={styles.formLabelInlineRow}>
          <Text style={[styles.editSectionTitle, styles.formLabelInlineNoMargin]}>{tr('edit_profile_tabs', 'Abas do perfil')}</Text>
          <View style={styles.editMoveArrowsRow}>
            <Pressable
              style={styles.editMoveArrowBtn}
              onPress={() => moveActiveTab(-1)}
              disabled={!tabs.length || tabs.findIndex((tab) => tab.id === activeTabId) <= 0}
            >
              <Ionicons
                name="chevron-back"
                size={11}
                color={!tabs.length || tabs.findIndex((tab) => tab.id === activeTabId) <= 0 ? '#94a3b8' : '#0f172a'}
              />
            </Pressable>
            <Pressable
              style={styles.editMoveArrowBtn}
              onPress={() => moveActiveTab(1)}
              disabled={!tabs.length || tabs.findIndex((tab) => tab.id === activeTabId) >= tabs.length - 1}
            >
              <Ionicons
                name="chevron-forward"
                size={11}
                color={!tabs.length || tabs.findIndex((tab) => tab.id === activeTabId) >= tabs.length - 1 ? '#94a3b8' : '#0f172a'}
              />
            </Pressable>
          </View>
        </View>
        <Text style={styles.formHint}>{tr('edit_tabs_hint', 'Ativa/desativa e remove as abas conforme precisares.')}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editTabsRow}>
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const isEnabled = tab?.enabled !== false;
            return (
              <View
                key={`edit-tab-${tab.id}`}
                style={[
                  styles.editTabPill,
                  !isEnabled && styles.editTabPillDisabled,
                  isActive && styles.editTabPillActive,
                  isActive && !isEnabled && styles.editTabPillDisabledActive,
                ]}
              >
                <Pressable
                  onPress={() => setActiveTabId(tab.id)}
                  style={styles.editTabPillPress}
                >
                  <Text
                    style={[
                      styles.editTabPillText,
                      !isEnabled && styles.editTabPillTextDisabled,
                      isActive && styles.editTabPillTextActive,
                      isActive && !isEnabled && styles.editTabPillTextDisabledActive,
                    ]}
                    numberOfLines={1}
                  >
                    {translateUiLabel(tab.label)}
                  </Text>
                </Pressable>
                <Pressable style={[styles.formInlineIconBtn, styles.editTabEyeBtn]} onPress={() => handleToggleTabEnabled(tab.id)}>
                  <Ionicons name={isEnabled ? 'eye-outline' : 'eye-off-outline'} size={12} color="#334155" />
                </Pressable>
                <Pressable style={styles.editTabRemoveBtn} onPress={() => handleRemoveTab(tab.id)}>
                  <Text style={[styles.editTabRemoveText, isActive && styles.editTabRemoveTextActive]}>x</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>

        <Text style={styles.formLabel}>{tr('edit_new_tab_type', 'Tipo de aba nova')}</Text>
        <View style={styles.formSelectWrap}>
          <Pressable
            style={styles.formSelect}
            onPress={() => {
              setIsCategoryMenuOpen(false);
              setIsTypeMenuOpen(false);
              setIsLinkTypeMenuOpen(false);
              setIsNewTabTypeMenuOpen((prev) => !prev);
            }}
          >
            <Text style={styles.formSelectText}>
              {tabTemplateOptions.find((item) => item.type === newTabType)?.label || tr('edit_select', 'Selecionar')}
            </Text>
            <Text style={styles.formSelectCaret}>{isNewTabTypeMenuOpen ? '^' : 'v'}</Text>
          </Pressable>
          {isNewTabTypeMenuOpen && (
            <ScrollView
              style={styles.formSelectMenu}
              contentContainerStyle={styles.formSelectMenuContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {tabTemplateOptions.map((item) => {
                const active = newTabType === item.type;
                return (
                  <Pressable
                    key={item.type}
                    style={[styles.formSelectOption, active && styles.formSelectOptionActive]}
                    onPress={() => {
                      setNewTabType(item.type);
                      setIsNewTabTypeMenuOpen(false);
                    }}
                  >
                    <Text style={[styles.formSelectOptionText, active && styles.formSelectOptionTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <Text style={styles.formLabel}>{tr('edit_display_name_optional', 'Nome a mostrar (opcional)')}</Text>
        <TextInput
          value={newTabLabel}
          onChangeText={setNewTabLabel}
          style={styles.input}
          placeholder={tr('edit_tab_name_placeholder', 'Ex: Agenda VIP')}
        />
        <View style={styles.rowBtns}>
          <Pressable style={styles.miniActionBtnLong} onPress={handleAddTab}>
            <Text style={styles.primaryBtnText}>{tr('edit_add_tab', '+ Adicionar aba')}</Text>
          </Pressable>
        </View>

        <View style={styles.editTabEditorPanel}>
          <View style={styles.formLabelInlineRow}>
            <Text style={[styles.formSectionTitle, styles.formLabelInlineNoMargin]}>{tr('edit_editing', 'Editar')}: {translateUiLabel(activeTab?.label || tr('edit_tab', 'Aba'))}</Text>
            {!!subtabMove && (
              <View style={styles.editMoveArrowsRow}>
                <Pressable
                  style={styles.editMoveArrowBtn}
                  onPress={() => subtabMove?.onMoveLeft?.()}
                  disabled={!subtabMove?.canLeft}
                >
                  <Ionicons name="chevron-back" size={11} color={subtabMove?.canLeft ? '#0f172a' : '#94a3b8'} />
                </Pressable>
                <Pressable
                  style={styles.editMoveArrowBtn}
                  onPress={() => subtabMove?.onMoveRight?.()}
                  disabled={!subtabMove?.canRight}
                >
                  <Ionicons name="chevron-forward" size={11} color={subtabMove?.canRight ? '#0f172a' : '#94a3b8'} />
                </Pressable>
              </View>
            )}
          </View>
          {renderActiveTabEditor()}
        </View>
      </View>

      {!!error && <Text style={styles.authError}>{error}</Text>}

      <View style={styles.rowBtns}>
        <Pressable style={styles.miniActionBtnLongSecondary} onPress={onCancel} disabled={saving}>
          <Text style={styles.secondaryBtnText}>{tr('edit_cancel', 'Cancelar')}</Text>
        </Pressable>
        <Pressable
          style={styles.miniActionBtnLong}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          <Text style={styles.primaryBtnText}>{saving ? tr('saving', 'A guardar...') : tr('save', 'Guardar')}</Text>
        </Pressable>
      </View>

      <Modal
        visible={campaignVideoEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={closeCampaignVideoEditor}
      >
        <View style={styles.storyModalBackdrop}>
          <Pressable style={styles.shareModalBackdropFill} onPress={closeCampaignVideoEditor} />
          <View
            style={[styles.editMediaModalPanel, styles.campaignVideoEditPanel]}
          >
            <View style={styles.editMediaModalHeader}>
              <Text style={styles.editMediaModalTitle}>{tr('edit_campaign_video', 'Editar vídeo da campanha')}</Text>
              <Pressable style={styles.editMediaModalCloseBtn} onPress={closeCampaignVideoEditor}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
            <View style={[styles.editMediaModalPreviewWrap, styles.campaignEditMediaPreviewWrap]}>
              {!!String(campaignVideoEditorUri || '').trim() ? (
                <WebView
                  source={{ html: buildInlineVideoHtml(campaignVideoEditorUri) }}
                  style={styles.editMediaModalPreviewImage}
                  scrollEnabled={false}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback
                  javaScriptEnabled
                  domStorageEnabled
                />
              ) : (
                <View style={styles.editMediaModalPreviewFallback}>
                  <Ionicons name="videocam-outline" size={24} color="#94a3b8" />
                </View>
              )}
            </View>
            <View style={styles.rowBtns}>
              <Pressable
                style={[styles.editMediaModalActionBtn, styles.editMediaModalActionBtnSecondary]}
                onPress={handleReplaceCampaignVideoEditorItem}
              >
                <Text style={styles.editMediaModalActionText}>Substituir</Text>
              </Pressable>
              <Pressable
                style={[styles.editMediaModalActionBtn, styles.editMediaModalDangerBtn]}
                onPress={handleRemoveCampaignVideoEditorItem}
              >
                <Text style={styles.editMediaModalDangerText}>{tr('edit_remove', 'Remover')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={productPreviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProductPreviewOpen(false)}
      >
        <View style={styles.storyModalBackdrop}>
          <Pressable style={styles.shareModalBackdropFill} onPress={() => setProductPreviewOpen(false)} />
          <View style={styles.productModalPanel}>
            <View style={styles.productModalHeader}>
              <View>
                {!!productPreviewSectionLabel && (
                  <Text style={styles.productModalSectionText}>{productPreviewSectionLabel}</Text>
                )}
                <Text style={styles.productModalTitleText} numberOfLines={2}>
                  {String(productPreviewItem?.name || 'Produto')}
                </Text>
              </View>
              <Pressable onPress={() => setProductPreviewOpen(false)} style={styles.productModalCloseBtn}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
            {Boolean(productPreviewItem?.modalImageEnabled) && (
              <View style={styles.productModalImageWrap}>
                {!!String(productPreviewItem?.image || '').trim() ? (
                  <Image
                    source={{ uri: resolveAvatarUri(productPreviewItem?.image) || String(productPreviewItem?.image || '') }}
                    style={styles.productModalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.productModalImageFallback}>
                    <Ionicons name="image-outline" size={26} color="#64748b" />
                  </View>
                )}
              </View>
            )}
            <ScrollView
              style={styles.productModalInfoScroll}
              contentContainerStyle={styles.productModalInfoContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.productModalInfo}>
                {Boolean(productPreviewItem?.promoEnabled) && String(productPreviewItem?.promoNowPrice || '').trim() ? (
                  <View style={styles.productModalPromoRow}>
                    <Text style={styles.profilePromoBadge}>PROMO</Text>
                    <Text style={styles.profilePromoNowPrice}>{String(productPreviewItem?.promoNowPrice || '').trim()}€</Text>
                    {!!String(productPreviewItem?.promoOldPrice || '').trim() && (
                      <Text style={styles.profilePromoOldPrice}>{String(productPreviewItem?.promoOldPrice || '').trim()}€</Text>
                    )}
                  </View>
                ) : (
                  !!String(productPreviewItem?.price || '').trim() && (
                    <Text style={styles.productModalPriceText}>{String(productPreviewItem?.price || '').trim()}€</Text>
                  )
                )}
                {!!String(productPreviewItem?.fullDescription || productPreviewItem?.shortDescription || '').trim() && (
                  <Text style={styles.productModalDescriptionText}>
                    {String(productPreviewItem?.fullDescription || productPreviewItem?.shortDescription || '').trim()}
                  </Text>
                )}
                <View style={styles.productModalMetaList}>
                  {!!String(productPreviewItem?.sku || '').trim() && (
                    <View style={styles.productModalMetaItem}>
                      <Text style={styles.productModalMetaLabel}>SKU</Text>
                      <Text style={styles.productModalMetaValue}>{String(productPreviewItem?.sku || '').trim()}</Text>
                    </View>
                  )}
                  {!!String(productPreviewItem?.size || '').trim() && (
                    <View style={styles.productModalMetaItem}>
                      <Text style={styles.productModalMetaLabel}>Tamanho</Text>
                      <Text style={styles.productModalMetaValue}>{String(productPreviewItem?.size || '').trim()}</Text>
                    </View>
                  )}
                  {!!String(productPreviewItem?.usage || '').trim() && (
                    <View style={styles.productModalMetaItem}>
                      <Text style={styles.productModalMetaLabel}>Como usar</Text>
                      <Text style={styles.productModalMetaValue}>{String(productPreviewItem?.usage || '').trim()}</Text>
                    </View>
                  )}
                  {!!String(productPreviewItem?.ingredients || '').trim() && (
                    <View style={styles.productModalMetaItem}>
                      <Text style={styles.productModalMetaLabel}>Materiais</Text>
                      <Text style={styles.productModalMetaValue}>{String(productPreviewItem?.ingredients || '').trim()}</Text>
                    </View>
                  )}
                  {normalizeExtraFields(productPreviewItem?.extraFields || []).map((field, idx) => {
                    const label = String(field?.label || '').trim() || 'Detalhe';
                    const value = [String(field?.value || '').trim(), String(field?.description || '').trim()]
                      .filter(Boolean)
                      .join(' — ');
                    if (!value) return null;
                    return (
                      <View key={`product-preview-extra-${idx}`} style={styles.productModalMetaItem}>
                        <Text style={styles.productModalMetaLabel}>{label}</Text>
                        <Text style={styles.productModalMetaValue}>{value}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={servicePreviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setServicePreviewOpen(false)}
      >
        <View style={styles.storyModalBackdrop}>
          <Pressable style={styles.shareModalBackdropFill} onPress={() => setServicePreviewOpen(false)} />
          <View style={styles.productModalPanel}>
            <View style={styles.productModalHeader}>
              <View>
                {!!servicePreviewSectionLabel && (
                  <Text style={styles.productModalSectionText}>{servicePreviewSectionLabel}</Text>
                )}
                <Text style={styles.productModalTitleText} numberOfLines={2}>
                  {String(servicePreviewItem?.description || servicePreviewItem?.name || 'Serviço')}
                </Text>
              </View>
              <Pressable onPress={() => setServicePreviewOpen(false)} style={styles.productModalCloseBtn}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
            {Boolean(servicePreviewItem?.modalImageEnabled) && (
              <View style={styles.productModalImageWrap}>
                {!!String(servicePreviewItem?.image || '').trim() ? (
                  <Image
                    source={{ uri: resolveAvatarUri(servicePreviewItem?.image) || String(servicePreviewItem?.image || '') }}
                    style={styles.productModalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.productModalImageFallback}>
                    <Ionicons name="briefcase-outline" size={26} color="#64748b" />
                  </View>
                )}
              </View>
            )}
            <ScrollView
              style={styles.productModalInfoScroll}
              contentContainerStyle={styles.productModalInfoContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.productModalInfo}>
                {(!!String(servicePreviewItem?.time || '').trim() || !!String(servicePreviewItem?.price || '').trim() || String(servicePreviewItem?.priceMode || '').trim().toLowerCase() === 'budget' || (Boolean(servicePreviewItem?.promoEnabled) && String(servicePreviewItem?.promoNowPrice || '').trim())) && (
                  <View style={styles.serviceModalFactsRow}>
                    {!!String(servicePreviewItem?.time || '').trim() && (
                      <View style={styles.serviceModalFactChip}>
                        <Text style={styles.serviceModalFactLabel}>{tr('edit_duration', 'Duração')}</Text>
                        <Text style={styles.serviceModalFactValue}>{String(servicePreviewItem?.time || '').trim()}</Text>
                      </View>
                    )}
                    {String(servicePreviewItem?.priceMode || '').trim().toLowerCase() === 'budget' ? (
                      <View style={styles.serviceModalFactChip}>
                        <Text style={styles.serviceModalFactLabel}>{tr('edit_price', 'Preço')}</Text>
                        <Text style={styles.serviceModalFactValue}>{tr('edit_under_quote', 'Sob orçamento')}</Text>
                      </View>
                    ) : Boolean(servicePreviewItem?.promoEnabled) && String(servicePreviewItem?.promoNowPrice || '').trim() ? (
                      <View style={styles.serviceModalFactChip}>
                        <Text style={styles.serviceModalFactLabel}>{tr('edit_price', 'Preço')}</Text>
                        <View style={styles.serviceModalPromoInlineRow}>
                          <Text style={styles.profilePromoBadge}>PROMO</Text>
                          <Text style={styles.serviceModalPromoValue}>{String(servicePreviewItem?.promoNowPrice || '').trim()}€</Text>
                          {!!String(servicePreviewItem?.promoOldPrice || '').trim() && (
                            <Text style={styles.serviceModalPromoOldValue}>{String(servicePreviewItem?.promoOldPrice || '').trim()}€</Text>
                          )}
                        </View>
                      </View>
                    ) : (
                      !!String(servicePreviewItem?.price || '').trim() && (
                        <View style={styles.serviceModalFactChip}>
                          <Text style={styles.serviceModalFactLabel}>{tr('edit_price', 'Preço')}</Text>
                          <Text style={styles.serviceModalFactValue}>{String(servicePreviewItem?.price || '').trim()}€</Text>
                        </View>
                      )
                    )}
                  </View>
                )}
                <View style={styles.productModalMetaList}>
                  {!!String(servicePreviewItem?.extra1 || '').trim() && (
                    <View style={styles.productModalMetaItem}>
                      <Text style={styles.productModalMetaLabel}>{tr('edit_detail_1', 'Detalhe 1')}</Text>
                      <Text style={styles.productModalMetaValue}>{String(servicePreviewItem?.extra1 || '').trim()}</Text>
                    </View>
                  )}
                  {!!String(servicePreviewItem?.extra2 || '').trim() && (
                    <View style={styles.productModalMetaItem}>
                      <Text style={styles.productModalMetaLabel}>{tr('edit_detail_2', 'Detalhe 2')}</Text>
                      <Text style={styles.productModalMetaValue}>{String(servicePreviewItem?.extra2 || '').trim()}</Text>
                    </View>
                  )}
                  {!!String(servicePreviewItem?.note || '').trim() && (
                    <View style={styles.productModalMetaItem}>
                      <Text style={styles.productModalMetaLabel}>{tr('edit_description', 'Descrição')}</Text>
                      <Text style={styles.productModalMetaValue}>{String(servicePreviewItem?.note || '').trim()}</Text>
                    </View>
                  )}
                  {normalizeExtraFields(servicePreviewItem?.extraFields || []).map((field, idx) => {
                    const label = String(field?.label || '').trim() || tr('edit_detail', 'Detalhe');
                    const value = [String(field?.value || '').trim(), String(field?.description || '').trim()]
                      .filter(Boolean)
                      .join(' — ');
                    if (!value) return null;
                    return (
                      <View key={`svc-preview-extra-${idx}`} style={styles.productModalMetaItem}>
                        <Text style={styles.productModalMetaLabel}>{label}</Text>
                        <Text style={styles.productModalMetaValue}>{value}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={galleryEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={closeGalleryItemEditor}
      >
        <View style={styles.storyModalBackdrop}>
          <Pressable style={styles.shareModalBackdropFill} onPress={closeGalleryItemEditor} />
          <View
            style={[
              styles.editMediaModalPanel,
              contentImageEditorContext?.source === 'campaigns' && styles.campaignImageEditPanel,
            ]}
          >
            <View style={styles.editMediaModalHeader}>
              <Text style={styles.editMediaModalTitle}>
                {galleryEditorTab === 'photos' ? 'Editar foto' : 'Editar vídeo'}
              </Text>
              <Pressable style={styles.editMediaModalCloseBtn} onPress={closeGalleryItemEditor}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>

            <View
              style={[
                styles.editMediaModalPreviewWrap,
                contentImageEditorContext?.source === 'campaigns' && styles.campaignPreviewMediaWrap,
              ]}
              onLayout={(event) => {
                const nextWidth = Number(event?.nativeEvent?.layout?.width || 0);
                const nextHeight = Number(event?.nativeEvent?.layout?.height || 0);
                if (!nextWidth || !nextHeight) return;
                setGalleryEditorPreviewSize((prev) => {
                  if (prev.width === nextWidth && prev.height === nextHeight) return prev;
                  return { width: nextWidth, height: nextHeight };
                });
              }}
              {...(galleryEditorTab === 'photos' && galleryEditorFit === 'cover'
                ? galleryEditorPanResponder.panHandlers
                : {})}
            >
              {galleryEditorTab === 'photos' ? (
                galleryEditorPreviewUri ? (
                  <Image
                    source={{ uri: galleryEditorPreviewUri }}
                    pointerEvents="none"
                    style={[
                      styles.editMediaModalPreviewImage,
                      galleryEditorFit === 'cover'
                        ? {
                            transform: [
                              { translateX: galleryEditorCrop.x },
                              { translateY: galleryEditorCrop.y },
                              { scale: galleryEditorCrop.scale },
                            ],
                          }
                        : null,
                    ]}
                    resizeMode={galleryEditorFit === 'cover' ? 'cover' : 'contain'}
                  />
                ) : (
                  <View style={styles.editMediaModalPreviewFallback}>
                    <Ionicons name="image-outline" size={24} color="#94a3b8" />
                  </View>
                )
              ) : (
                <View style={styles.editMediaModalPreviewFallback}>
                  <Ionicons
                    name="videocam-outline"
                    size={24}
                    color="#475569"
                  />
                  <Text style={styles.formHintInline}>
                    Pré-visualização de vídeo
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.formLabelCompact}>Visual no modal</Text>
            <View style={styles.formChipsWrap}>
              {[
                { id: 'contain', label: 'Ajustar' },
                { id: 'cover', label: 'Cortar' },
              ].map((option) => {
                const active = galleryEditorFit === option.id;
                return (
                  <Pressable
                    key={`editor-fit-${option.id}`}
                    style={[styles.formChip, active && styles.formChipActive]}
                    onPress={() => {
                      if (!galleryEditorUri) return;
                      setGalleryItemFit(galleryEditorTab, galleryEditorUri, option.id);
                      if (option.id === 'cover') {
                        const current = getGalleryItemCrop(galleryEditorTab, galleryEditorUri);
                        updateGalleryEditorCrop(
                          {
                            x: normalizeGalleryCropNumber(current?.x, 0),
                            y: normalizeGalleryCropNumber(current?.y, 0),
                            scale: Math.max(1.08, normalizeGalleryCropNumber(current?.scale, 1.12)),
                          },
                          true
                        );
                      } else {
                        updateGalleryEditorCrop({ x: 0, y: 0, scale: 1 }, false);
                      }
                    }}
                  >
                    <Text style={[styles.formChipText, active && styles.formChipTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {galleryEditorTab === 'photos' && galleryEditorFit === 'cover' && (
              <>
                <Text style={styles.formHintInline}>Arrasta para posicionar. Usa dois dedos para zoom.</Text>
                <View style={styles.editMediaZoomRow}>
                  <Pressable
                    style={styles.editMediaZoomBtn}
                    onPress={() => updateGalleryEditorScale(-0.1)}
                  >
                    <Text style={styles.editMediaZoomBtnText}>-</Text>
                  </Pressable>
                  <Text style={styles.editMediaZoomValue}>
                    Zoom {Math.round(normalizeGalleryCropNumber(galleryEditorCrop?.scale, 1) * 100)}%
                  </Text>
                  <Pressable
                    style={styles.editMediaZoomBtn}
                    onPress={() => updateGalleryEditorScale(0.1)}
                  >
                    <Text style={styles.editMediaZoomBtnText}>+</Text>
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.rowBtns}>
              <Pressable
                style={[styles.editMediaModalActionBtn, styles.editMediaModalActionBtnSecondary]}
                onPress={handleReplaceGalleryEditorItem}
              >
                <Text style={styles.editMediaModalActionText}>Substituir</Text>
              </Pressable>
              <Pressable
                style={[styles.editMediaModalActionBtn, styles.editMediaModalDangerBtn]}
                onPress={() => handleRemoveGalleryItem(galleryEditorIndex, galleryEditorTab)}
              >
                <Text style={styles.editMediaModalDangerText}>Remover</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={contentImageEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={closeContentImageEditor}
      >
        <View style={styles.storyModalBackdrop}>
          <Pressable style={styles.shareModalBackdropFill} onPress={closeContentImageEditor} />
          <View style={styles.editMediaModalPanel}>
            <View style={styles.editMediaModalHeader}>
              <Text style={styles.editMediaModalTitle}>{tr('edit_image', 'Editar imagem')}</Text>
              <Pressable style={styles.editMediaModalCloseBtn} onPress={closeContentImageEditor}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>

            <View
              style={[
                styles.editMediaModalPreviewWrap,
                contentImageEditorContext?.source === 'campaigns' && styles.campaignEditMediaPreviewWrap,
              ]}
              onLayout={(event) => {
                const nextWidth = Number(event?.nativeEvent?.layout?.width || 0);
                const nextHeight = Number(event?.nativeEvent?.layout?.height || 0);
                if (!nextWidth || !nextHeight) return;
                setContentImageEditorPreviewSize((prev) => {
                  if (prev.width === nextWidth && prev.height === nextHeight) return prev;
                  return { width: nextWidth, height: nextHeight };
                });
              }}
              {...(contentImageEditorFit === 'cover' ? contentImageEditorPanResponder.panHandlers : {})}
            >
              {!!contentImageEditorUri ? (
                <Image
                  source={{ uri: resolveAvatarUri(contentImageEditorUri) || contentImageEditorUri }}
                  pointerEvents="none"
                  style={[
                    styles.editMediaModalPreviewImage,
                    contentImageEditorFit === 'cover'
                      ? {
                          transform: [
                            { translateX: contentImageEditorCrop.x },
                            { translateY: contentImageEditorCrop.y },
                            { scale: contentImageEditorCrop.scale },
                          ],
                        }
                      : null,
                  ]}
                  resizeMode={contentImageEditorFit === 'cover' ? 'cover' : 'contain'}
                />
              ) : (
                <View style={styles.editMediaModalPreviewFallback}>
                  <Ionicons name="image-outline" size={24} color="#94a3b8" />
                </View>
              )}
            </View>

            <Text style={styles.formLabelCompact}>Visual no perfil</Text>
            <View style={styles.formChipsWrap}>
              {[
                { id: 'contain', label: 'Ajustar' },
                { id: 'cover', label: 'Cortar' },
              ].map((option) => {
                const active = contentImageEditorFit === option.id;
                return (
                  <Pressable
                    key={`content-editor-fit-${option.id}`}
                    style={[styles.formChip, active && styles.formChipActive]}
                    onPress={() => {
                      if (!contentImageEditorUri) return;
                      const nextFit = option.id === 'contain' ? 'contain' : 'cover';
                      setContentImageEditorFit(nextFit);
                      setContentImageFit(contentImageEditorUri, nextFit);
                      if (nextFit === 'cover') {
                        const current = getContentImageCrop(contentImageEditorUri);
                        updateContentImageEditorCrop(
                          {
                            x: normalizeGalleryCropNumber(current?.x, 0),
                            y: normalizeGalleryCropNumber(current?.y, 0),
                            scale: Math.max(1.08, normalizeGalleryCropNumber(current?.scale, 1.12)),
                          },
                          true
                        );
                      } else {
                        updateContentImageEditorCrop({ x: 0, y: 0, scale: 1 }, false);
                      }
                    }}
                  >
                    <Text style={[styles.formChipText, active && styles.formChipTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {contentImageEditorFit === 'cover' && (
              <>
                <Text style={styles.formHintInline}>Arrasta para posicionar. Usa dois dedos para zoom.</Text>
                <View style={styles.editMediaZoomRow}>
                  <Pressable
                    style={styles.editMediaZoomBtn}
                    onPress={() => updateContentImageEditorScale(-0.1)}
                  >
                    <Text style={styles.editMediaZoomBtnText}>-</Text>
                  </Pressable>
                  <Text style={styles.editMediaZoomValue}>
                    Zoom {Math.round(normalizeGalleryCropNumber(contentImageEditorCrop?.scale, 1) * 100)}%
                  </Text>
                  <Pressable
                    style={styles.editMediaZoomBtn}
                    onPress={() => updateContentImageEditorScale(0.1)}
                  >
                    <Text style={styles.editMediaZoomBtnText}>+</Text>
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.rowBtns}>
              <Pressable
                style={[styles.editMediaModalActionBtn, styles.editMediaModalActionBtnSecondary]}
                onPress={handleReplaceContentImageEditorItem}
              >
                <Text style={styles.editMediaModalActionText}>Substituir</Text>
              </Pressable>
              <Pressable
                style={[styles.editMediaModalActionBtn, styles.editMediaModalDangerBtn]}
                onPress={handleRemoveContentImageEditorItem}
              >
                <Text style={styles.editMediaModalDangerText}>{tr('edit_remove', 'Remover')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}










