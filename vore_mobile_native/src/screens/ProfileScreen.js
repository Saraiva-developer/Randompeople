import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, Linking, Modal, PanResponder, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { styles } from '../styles/appStyles';
import { getApiBase, recommendationsSearchUsers, profileReviewsList, profileReviewsUpsert } from '../api/client';
import mapPlaceholder from '../assets/map-placeholder.png';
import { t } from '../i18n';

function resolveMediaUri(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  const safeUri = (value) => {
    try {
      return encodeURI(String(value || ''));
    } catch (_e) {
      return String(value || '');
    }
  };
  if (/^data:(image|video)\//i.test(raw)) return raw;
  if (/^(https?|file|content|asset|ph):\/\//i.test(raw)) return safeUri(raw);

  const base = String(getApiBase() || '').trim();
  if (!base) return safeUri(raw);
  const origin = base.replace(/\/api\/?$/i, '');
  if (raw.startsWith('/')) return safeUri(`${origin}${raw}`);
  return safeUri(`${origin}/${raw.replace(/^\/+/, '')}`);
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

function escapeHtml(rawValue) {
  return String(rawValue || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeAboutHtml(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  const escaped = escapeHtml(raw)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
  return `<p>${escaped}</p>`;
}

function buildAboutWebViewHtml(rawValue) {
  const content = normalizeAboutHtml(rawValue);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; background: transparent; }
      body { color: #0f172a; font: 400 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      p { margin: 0 0 8px; }
      ul, ol { margin: 0 0 8px 20px; padding: 0; }
      strong { font-weight: 700; }
      em { font-style: italic; }
      u { text-decoration: underline; }
    </style>
  </head>
  <body>
    ${content}
    <script>
      (function () {
        function emitHeight() {
          var h = document.documentElement.scrollHeight || document.body.scrollHeight || 120;
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(String(h));
        }
        window.addEventListener('load', emitHeight);
        setTimeout(emitHeight, 30);
        setTimeout(emitHeight, 160);
      })();
    </script>
  </body>
</html>`;
}

async function translateRuntimeText(rawValue, targetLang) {
  const raw = String(rawValue || '').trim();
  const target = String(targetLang || '').trim().toLowerCase();
  if (!raw || !target || target === 'pt') return raw;
  try {
    const url =
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(raw)}`;
    const response = await fetch(url);
    if (!response.ok) return raw;
    const data = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) return raw;
    const translated = data[0]
      .map((row) => (Array.isArray(row) ? String(row[0] || '') : ''))
      .join('')
      .trim();
    return translated || raw;
  } catch (_e) {
    return raw;
  }
}

function normalizeMediaList(rawList) {
  let list = rawList;
  if (typeof list === 'string') {
    const maybeJson = list.trim();
    if (!maybeJson) return [];
    if (!maybeJson.includes(',') && !maybeJson.includes('\n') && !maybeJson.startsWith('[') && !maybeJson.startsWith('{')) {
      return [maybeJson];
    }
    if (
      (maybeJson.startsWith('[') && maybeJson.endsWith(']')) ||
      (maybeJson.startsWith('{') && maybeJson.endsWith('}'))
    ) {
      try {
        const parsed = JSON.parse(maybeJson);
        list = parsed;
      } catch (_e) {}
    } else if (maybeJson.includes(',') || maybeJson.includes('\n')) {
      list = maybeJson
        .split(/[\n,]/g)
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    }
  }
  if (list && typeof list === 'object' && !Array.isArray(list)) {
    if (
      Object.prototype.hasOwnProperty.call(list, 'url') ||
      Object.prototype.hasOwnProperty.call(list, 'src') ||
      Object.prototype.hasOwnProperty.call(list, 'uri') ||
      Object.prototype.hasOwnProperty.call(list, 'path') ||
      Object.prototype.hasOwnProperty.call(list, 'image') ||
      Object.prototype.hasOwnProperty.call(list, 'value')
    ) {
      list = [list];
    } else {
      list = Object.values(list);
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return item.url || item.src || item.uri || item.path || item.image || item.value || '';
      }
      return '';
    })
    .filter(Boolean);
}

function getFirstNonEmptyMediaList(...sources) {
  for (const source of sources) {
    const parsed = normalizeMediaList(source);
    if (parsed.length) return parsed;
  }
  return [];
}

function uniqueMediaList(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach((item) => {
    const value = String(item || '').trim();
    if (!value) return;
    if (seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out;
}

function getModalImageList(item) {
  if (!item || typeof item !== 'object') return [];
  const merged = uniqueMediaList([
    ...normalizeMediaList(item?.images),
    ...normalizeMediaList(item?.gallery?.photos),
    ...normalizeMediaList(item?.photos),
    ...normalizeMediaList(item?.image),
  ]);
  return merged.map(resolveMediaUri).filter(Boolean);
}

function isLikelyVideoUri(uri) {
  const raw = String(uri || '').trim().toLowerCase();
  if (!raw) return false;
  if (raw.startsWith('data:video/')) return true;
  return /\.(mp4|mov|webm|m4v|avi)(\?.*)?$/.test(raw);
}

function normalizeExtraFields(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return { label: '', value: '', description: '' };
      return {
        label: String(entry.label || entry.name || entry.key || '').trim(),
        value: String(entry.value || entry.content || '').trim(),
        description: String(entry.description || entry.desc || entry.details || '').trim(),
      };
    })
    .filter((entry) => entry.label || entry.value || entry.description);
}

function toBoolLike(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'yes', 'y', 'on', 'sim'].includes(raw)) return true;
  if (['0', 'false', 'no', 'n', 'off', 'nao', 'não'].includes(raw)) return false;
  return fallback;
}

const PROFILE_TYPE_BLUEPRINTS = {
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

function normalizeTabs(profile) {
  const rawTabs = profile?.data?.tabs;
  if (Array.isArray(rawTabs) && rawTabs.length) {
    const parsed = rawTabs
      .map((tab, idx) => ({
        id: String(tab?.id || `tab-${idx + 1}`),
        type: String(tab?.type || 'outro').toLowerCase(),
        label: normalizeTabLabel(tab?.label || tab?.type || `Aba ${idx + 1}`, tab?.type),
        enabled: !(
          tab?.enabled === false ||
          tab?.active === false ||
          String(tab?.enabled || tab?.active || '').trim().toLowerCase() === 'false'
        ),
      }))
      .filter((tab) => tab.id);
    return parsed.filter((tab) => tab.enabled !== false);
  }

  const key = String(profile?.type || 'service_pro').toLowerCase();
  return (PROFILE_TYPE_BLUEPRINTS[key] || PROFILE_TYPE_BLUEPRINTS.service_pro).map((tab) => ({ ...tab }));
}

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
      items: (Array.isArray(sec?.items) ? sec.items : []).map((item) => {
        if (!item || typeof item !== 'object') return item;
        return {
          ...item,
          enabled: !(
            item?.enabled === false ||
            item?.active === false ||
            String(item?.enabled || item?.active || '').trim().toLowerCase() === 'false'
          ),
        };
      }),
    }))
    .filter((sec) => sec.items.length);
}

function normalizePrice(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const cleaned = raw.replace(/\s*(eur|euro|euros)\b/gi, '').trim();
  if (!cleaned) return '';
  if (cleaned.includes('€')) return cleaned.replace(/\s*€\s*/g, '€');
  return `${cleaned}€`;
}

function serviceTypeToLabel(value) {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'beauty') return 'Beleza';
  if (key === 'wellness') return 'Bem-estar';
  if (key === 'fitness') return 'Treino';
  if (key === 'consulting') return 'Consultoria';
  if (key === 'general') return 'Geral';
  return '';
}

function getScheduleRows(schedule) {
  const s = schedule && typeof schedule === 'object' ? schedule : {};
  return [
    { key: 'seg', label: 'Segunda', value: s.seg || '' },
    { key: 'ter', label: 'Terça', value: s.ter || '' },
    { key: 'qua', label: 'Quarta', value: s.qua || '' },
    { key: 'qui', label: 'Quinta', value: s.qui || '' },
    { key: 'sex', label: 'Sexta', value: s.sex || '' },
    { key: 'sab', label: 'Sábado', value: s.sab || '' },
    { key: 'dom', label: 'Domingo', value: s.dom || '' },
  ];
}

function toOpenableUrl(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(raw)) return raw;
  if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(raw)) return `mailto:${raw}`;
  if (/^\+?[\d\s()-]{7,}$/.test(raw)) return `tel:${raw.replace(/\s+/g, '')}`;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
  return '';
}

function parseCoords(rawValue) {
  const text = String(rawValue || '').trim();
  if (!text) return null;
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

function buildLocationMapData(loc) {
  const coords = parseCoords(loc?.coords);
  const address = String(loc?.address || '').trim();
  const title = String(loc?.title || '').trim();
  const queryText = [address, title].filter(Boolean).join(' ').trim();
  const defaultPreviewSource = mapPlaceholder;

  if (coords) {
    const { lat, lon } = coords;
    const latStr = String(lat);
    const lonStr = String(lon);
    return {
      previewSource: defaultPreviewSource,
      openUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latStr},${lonStr}`)}`,
    };
  }

  if (queryText) {
    return {
      previewSource: defaultPreviewSource,
      openUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryText)}`,
    };
  }

  return { previewSource: defaultPreviewSource, openUrl: '' };
}

function toSocialUrl(type, rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (type === 'email') return /^mailto:/i.test(raw) ? raw : `mailto:${raw}`;
  if (type === 'phone') return /^tel:/i.test(raw) ? raw : `tel:${raw.replace(/\s+/g, '')}`;
  const clean = raw.replace(/^@/, '');
  if (!clean) return '';
  if (type === 'whatsapp') return `https://wa.me/${clean.replace(/\D+/g, '')}`;
  if (type === 'telegram') return `https://t.me/${clean}`;
  if (type === 'instagram') return `https://instagram.com/${clean}`;
  if (type === 'tiktok') return `https://www.tiktok.com/@${clean}`;
  if (type === 'threads') return `https://www.threads.net/@${clean}`;
  if (type === 'youtube') return `https://youtube.com/${clean}`;
  if (type === 'facebook') return `https://facebook.com/${clean}`;
  if (type === 'linkedin') return `https://linkedin.com/in/${clean}`;
  if (type === 'x') return `https://x.com/${clean}`;
  if (type === 'discord') return `https://discord.com/users/${clean}`;
  if (type === 'snapchat') return `https://www.snapchat.com/add/${clean}`;
  if (type === 'pinterest') return `https://www.pinterest.com/${clean}`;
  if (type === 'twitch') return `https://www.twitch.tv/${clean}`;
  if (type === 'reddit') return `https://www.reddit.com/user/${clean}`;
  if (type === 'github') return `https://github.com/${clean}`;
  if (type === 'gitlab') return `https://gitlab.com/${clean}`;
  if (type === 'behance') return `https://www.behance.net/${clean}`;
  if (type === 'dribbble') return `https://dribbble.com/${clean}`;
  if (type === 'medium') return `https://medium.com/@${clean}`;
  if (type === 'substack') return `https://${clean}.substack.com`;
  if (type === 'patreon') return `https://www.patreon.com/${clean}`;
  if (type === 'soundcloud') return `https://soundcloud.com/${clean}`;
  if (type === 'spotify') return `https://open.spotify.com/${clean}`;
  if (type === 'apple_music') return `https://music.apple.com/${clean}`;
  if (type === 'deezer') return `https://www.deezer.com/${clean}`;
  if (type === 'linktree') return `https://linktr.ee/${clean}`;
  if (type === 'calendly') return `https://calendly.com/${clean}`;
  if (type === 'maps') return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
  if (type === 'drive') return `https://drive.google.com/${clean}`;
  if (type === 'dropbox') return `https://www.dropbox.com/${clean}`;
  return toOpenableUrl(raw);
}

function detectSocialIcon(url, typeHint = '') {
  const hint = String(typeHint || '').toLowerCase();
  const normalized = String(url || '').toLowerCase();
  if (hint.includes('whatsapp') || normalized.includes('wa.me') || normalized.includes('whatsapp.com')) return 'logo-whatsapp';
  if (hint.includes('telegram') || normalized.includes('t.me') || normalized.includes('telegram.')) return 'paper-plane-outline';
  if (hint.includes('threads') || normalized.includes('threads.net')) return 'at-outline';
  if (hint === 'x' || hint.includes('twitter') || normalized.includes('x.com') || normalized.includes('twitter.com')) return 'logo-twitter';
  if (hint.includes('discord') || normalized.includes('discord.com')) return 'logo-discord';
  if (hint.includes('snapchat') || normalized.includes('snapchat.com')) return 'logo-snapchat';
  if (hint.includes('pinterest') || normalized.includes('pinterest.com')) return 'logo-pinterest';
  if (hint.includes('twitch') || normalized.includes('twitch.tv')) return 'logo-twitch';
  if (hint.includes('reddit') || normalized.includes('reddit.com')) return 'logo-reddit';
  if (hint.includes('github') || normalized.includes('github.com')) return 'logo-github';
  if (hint.includes('gitlab') || normalized.includes('gitlab.com')) return 'code-working-outline';
  if (hint.includes('behance') || normalized.includes('behance.net')) return 'color-palette-outline';
  if (hint.includes('dribbble') || normalized.includes('dribbble.com')) return 'basketball-outline';
  if (hint.includes('medium') || normalized.includes('medium.com')) return 'newspaper-outline';
  if (hint.includes('substack') || normalized.includes('substack.com')) return 'newspaper-outline';
  if (hint.includes('patreon') || normalized.includes('patreon.com')) return 'card-outline';
  if (hint.includes('soundcloud') || normalized.includes('soundcloud.com')) return 'musical-note-outline';
  if (hint.includes('spotify') || normalized.includes('spotify.com')) return 'musical-notes-outline';
  if (hint.includes('apple_music') || normalized.includes('music.apple.com')) return 'musical-notes-outline';
  if (hint.includes('deezer') || normalized.includes('deezer.com')) return 'musical-note-outline';
  if (hint.includes('linktree') || normalized.includes('linktr.ee')) return 'link-outline';
  if (hint.includes('calendly') || normalized.includes('calendly.com')) return 'calendar-outline';
  if (hint.includes('maps') || normalized.includes('/maps/') || normalized.includes('google.com/maps')) return 'map-outline';
  if (hint.includes('drive') || normalized.includes('drive.google.com')) return 'folder-outline';
  if (hint.includes('dropbox') || normalized.includes('dropbox.com')) return 'file-tray-full-outline';
  if (hint.includes('instagram') || normalized.includes('instagram.com')) return 'logo-instagram';
  if (hint.includes('youtube') || normalized.includes('youtube.com') || normalized.includes('youtu.be')) return 'logo-youtube';
  if (hint.includes('facebook') || normalized.includes('facebook.com')) return 'logo-facebook';
  if (hint.includes('linkedin') || normalized.includes('linkedin.com')) return 'logo-linkedin';
  if (hint.includes('tiktok') || normalized.includes('tiktok.com')) return 'logo-tiktok';
  if (hint.includes('email') || normalized.startsWith('mailto:')) return 'mail-outline';
  if (hint.includes('phone') || normalized.startsWith('tel:')) return 'call-outline';
  return 'globe-outline';
}

function detectSocialColor(iconName, url = '') {
  const icon = String(iconName || '').toLowerCase();
  const normalized = String(url || '').toLowerCase();
  if (icon === 'logo-whatsapp') return '#25d366';
  if (icon === 'paper-plane-outline' && (normalized.includes('t.me') || normalized.includes('telegram.'))) return '#229ed9';
  if (icon === 'logo-twitter') return '#111827';
  if (icon === 'logo-discord') return '#5865f2';
  if (icon === 'logo-snapchat') return '#fffc00';
  if (icon === 'logo-pinterest') return '#e60023';
  if (icon === 'logo-twitch') return '#9146ff';
  if (icon === 'logo-reddit') return '#ff4500';
  if (icon === 'logo-github') return '#111827';
  if (icon === 'code-working-outline') return '#fc6d26';
  if (icon === 'basketball-outline') return '#ea4c89';
  if (icon === 'newspaper-outline') return '#111827';
  if (icon === 'card-outline') return '#ff424d';
  if (icon === 'logo-tiktok') return '#111827';
  if (icon === 'musical-note-outline' || icon === 'musical-notes-outline') return '#1f2937';
  if (icon === 'map-outline') return '#16a34a';
  if (icon === 'folder-outline') return '#2563eb';
  if (icon === 'file-tray-full-outline') return '#0061ff';
  if (icon === 'logo-instagram') return '#e4405f';
  if (icon === 'logo-youtube') return '#ff0000';
  if (icon === 'logo-facebook') return '#1877f2';
  if (icon === 'logo-linkedin') return '#0a66c2';
  if (icon === 'musical-notes-outline') return '#111827';
  if (normalized.includes('wa.me') || normalized.includes('whatsapp.com')) return '#25d366';
  return '#334155';
}

function normalizeGalleryModalFitValue(rawValue) {
  const raw = String(rawValue || '').trim().toLowerCase();
  if (!raw) return 'contain';
  if (['cover', 'crop', 'cortar'].includes(raw)) return 'cover';
  if (['contain', 'fit', 'ajustar', 'completo'].includes(raw)) return 'contain';
  return 'contain';
}

function normalizeGalleryModalFitMap(rawValue) {
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

function getSocialItems(profileData) {
  const items = [];
  const seen = new Set();
  const social = profileData?.social && typeof profileData.social === 'object' ? profileData.social : {};

  function pushItem(type, rawValue) {
    const url = ['instagram', 'tiktok', 'youtube', 'facebook', 'linkedin'].includes(type)
      ? toSocialUrl(type, rawValue)
      : toOpenableUrl(rawValue);
    if (!url) return;
    const icon = detectSocialIcon(url, type);
    const key = `${icon}|${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ icon, url });
  }

  pushItem('instagram', social.instagram);
  pushItem('tiktok', social.tiktok);
  pushItem('youtube', social.youtube);
  pushItem('facebook', social.facebook);
  pushItem('linkedin', social.linkedin);
  pushItem('website', profileData?.website);
  pushItem('website', profileData?.site);

  if (Array.isArray(profileData?.links)) {
    profileData.links.forEach((link) => {
      const raw = typeof link === 'string' ? link : link?.url || '';
      if (!raw) return;
      const linkType = typeof link === 'string' ? '' : String(link?.type || '').toLowerCase();
      const openable = linkType ? toSocialUrl(linkType, raw) : toOpenableUrl(raw);
      if (!openable) return;
      const icon = detectSocialIcon(openable, linkType);
      const key = `${icon}|${openable}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ icon, url: openable });
    });
  }

  return items.slice(0, 12);
}

export default function ProfileScreen({
  currentLanguage = 'pt',
  profile,
  viewerUser = null,
  isGuest = false,
  loading = false,
  canEdit,
  onEditPress,
  onAddStory,
  onBackPress,
  allowPrivateShare = false,
  onShareRecommendation,
  recentShareUsers = [],
  onToggleSaveMedia,
  isSavedMedia,
  openProfileIntent = null,
  onConsumeProfileOpenIntent,
}) {
  const L = currentLanguage || 'pt';
  const tr = useCallback(
    (key, fallback) => {
      const value = t(L, key);
      return value === key ? fallback : value;
    },
    [L]
  );
  const translateUiLabel = useCallback(
    (value) => {
      const raw = String(value || '').trim();
      if (!raw) return raw;
      const normalized = raw.toLowerCase();
      const map = {
        sobre: t(L, 'profile_tab_about'),
        'serviços': t(L, 'profile_tab_services'),
        servicos: t(L, 'profile_tab_services'),
        galeria: t(L, 'profile_tab_gallery'),
        horário: t(L, 'profile_tab_schedule'),
        horario: t(L, 'profile_tab_schedule'),
        agenda: t(L, 'profile_tab_agenda'),
        parcerias: t(L, 'profile_tab_partners'),
        localização: t(L, 'profile_tab_location'),
        localizacao: t(L, 'profile_tab_location'),
        menu: t(L, 'profile_tab_menu'),
        produtos: t(L, 'profile_tab_products'),
        campanhas: t(L, 'profile_tab_campaigns'),
        portfolio: t(L, 'profile_tab_portfolio'),
        portofolio: t(L, 'profile_tab_portfolio'),
        casas: t(L, 'profile_tab_houses'),
        quartos: t(L, 'profile_tab_rooms'),
        fotos: t(L, 'profile_tab_photos'),
        'vídeos': t(L, 'profile_tab_videos'),
        videos: t(L, 'profile_tab_videos'),
        reels: t(L, 'profile_tab_reels'),
        promoções: t(L, 'profile_tab_promotions'),
        promocoes: t(L, 'profile_tab_promotions'),
      };
      return map[normalized] || raw;
    },
    [L]
  );
  const isNonTranslatableValue = useCallback((value) => {
    const raw = String(value || '').trim();
    if (!raw) return true;
    if (/^(https?:\/\/|mailto:|tel:)/i.test(raw)) return true;
    if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(raw)) return true;
    if (/^\+?[\d\s().,/-]+$/.test(raw)) return true;
    if (/^#/.test(raw)) return true;
    return false;
  }, []);
  const translateDisplay = useCallback((value) => {
    const raw = String(value || '').trim();
    if (!raw) return raw;
    if (L === 'pt' || isNonTranslatableValue(raw)) return raw;
    const key = `${L}::${raw}`;
    const cached = runtimeTranslateCacheRef.current.get(key);
    if (typeof cached === 'string' && cached.trim()) return cached;
    if (runtimeTranslatePendingRef.current.has(key)) return raw;
    runtimeTranslatePendingRef.current.add(key);
    translateRuntimeText(raw, L)
      .then((translated) => {
        const finalText = String(translated || raw).trim() || raw;
        runtimeTranslateCacheRef.current.set(key, finalText);
      })
      .finally(() => {
        runtimeTranslatePendingRef.current.delete(key);
        setRuntimeTranslateTick((n) => n + 1);
      });
    return raw;
  }, [L, isNonTranslatableValue]);
  const translateUiOrRuntime = useCallback((value) => {
    const raw = String(value || '').trim();
    if (!raw) return raw;
    const ui = translateUiLabel(raw);
    if (ui && ui !== raw) return ui;
    return translateDisplay(raw);
  }, [translateUiLabel, translateDisplay]);
  const [activeTabId, setActiveTabId] = useState('');
  const [galleryView, setGalleryView] = useState('photos');
  const [servicesSectionId, setServicesSectionId] = useState('');
  const [menuSectionId, setMenuSectionId] = useState('');
  const [productsSectionId, setProductsSectionId] = useState('');
  const [portfolioSectionId, setPortfolioSectionId] = useState('');
  const [housesSectionId, setHousesSectionId] = useState('');
  const [roomsSectionId, setRoomsSectionId] = useState('');
  const [housesItemIndex, setHousesItemIndex] = useState(0);
  const [roomsItemIndex, setRoomsItemIndex] = useState(0);
  const [housesMediaIndex, setHousesMediaIndex] = useState(0);
  const [roomsMediaIndex, setRoomsMediaIndex] = useState(0);
  const [housesAmenitiesExpanded, setHousesAmenitiesExpanded] = useState(false);
  const [roomsAmenitiesExpanded, setRoomsAmenitiesExpanded] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyBusy, setStoryBusy] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryModalType, setGalleryModalType] = useState('photos');
  const [galleryModalIndex, setGalleryModalIndex] = useState(0);
  const [galleryViewportWidth, setGalleryViewportWidth] = useState(0);
  const [galleryModalItemsOverride, setGalleryModalItemsOverride] = useState([]);
  const [photoErrorMap, setPhotoErrorMap] = useState({});
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalItem, setProductModalItem] = useState(null);
  const [productModalSectionLabel, setProductModalSectionLabel] = useState('');
  const [productModalKind, setProductModalKind] = useState('produtos');
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [portfolioModalItem, setPortfolioModalItem] = useState(null);
  const [portfolioModalSectionLabel, setPortfolioModalSectionLabel] = useState('');
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceModalItem, setServiceModalItem] = useState(null);
  const [serviceModalSectionLabel, setServiceModalSectionLabel] = useState('');
  const [productsViewMode, setProductsViewMode] = useState('list');
  const [menuViewMode, setMenuViewMode] = useState('list');
  const [contentModalViewportWidth, setContentModalViewportWidth] = useState(0);
  const [productModalImageIndex, setProductModalImageIndex] = useState(0);
  const [portfolioModalImageIndex, setPortfolioModalImageIndex] = useState(0);
  const [serviceModalImageIndex, setServiceModalImageIndex] = useState(0);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignModalItem, setCampaignModalItem] = useState(null);
  const [campaignModalVideoIndex, setCampaignModalVideoIndex] = useState(0);
  const [shareQuery, setShareQuery] = useState('');
  const [shareCandidates, setShareCandidates] = useState([]);
  const [shareSelectedUser, setShareSelectedUser] = useState(null);
  const [shareDraft, setShareDraft] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareSearchBusy, setShareSearchBusy] = useState(false);
  const [shareError, setShareError] = useState('');
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsSaving, setReviewsSaving] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewsSummary, setReviewsSummary] = useState({ average: 0, total: 0, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } });
  const [reviewCanRate, setReviewCanRate] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSortMode, setReviewSortMode] = useState('recent');
  const [aboutRuntimeText, setAboutRuntimeText] = useState('');
  const [aboutWebHeight, setAboutWebHeight] = useState(120);
  const [, setRuntimeTranslateTick] = useState(0);
  const [profileViewportHeight, setProfileViewportHeight] = useState(0);
  const [stickyWrapHeight, setStickyWrapHeight] = useState(0);
  const [stickyLockActive, setStickyLockActive] = useState(false);
  const storyClosingRef = useRef(false);
  const storyDragYRef = useRef(0);
  const storyTranslateY = useRef(new Animated.Value(0)).current;
  const storyCloseY = useRef(new Animated.Value(0)).current;
  const storyCloseScale = useRef(new Animated.Value(1)).current;
  const storyCloseOpacity = useRef(new Animated.Value(1)).current;
  const galleryClosingRef = useRef(false);
  const galleryScrollRef = useRef(null);
  const profileScrollRef = useRef(null);
  const profileScrollYRef = useRef(0);
  const stickyAnchorYRef = useRef(0);
  const stickyLockRef = useRef(false);
  const galleryCloseY = useRef(new Animated.Value(0)).current;
  const galleryCloseScale = useRef(new Animated.Value(1)).current;
  const galleryCloseOpacity = useRef(new Animated.Value(1)).current;
  const runtimeTranslateCacheRef = useRef(new Map());
  const runtimeTranslatePendingRef = useRef(new Set());

  const profileData = profile?.data && typeof profile.data === 'object' ? profile.data : {};
  const viewerAccountType = String(viewerUser?.account_type || '').trim().toLowerCase();
  const viewerIsCommon = !isGuest && viewerAccountType === 'common';
  const avatarUri = resolveMediaUri(profileData?.avatar);
  const tabs = useMemo(
    () => normalizeTabs(profile),
    [profile?.id, profile?.type, profile?.data?.tabs]
  );

  useEffect(() => {
    const firstId = tabs[0]?.id || '';
    setActiveTabId((prev) => {
      if (prev && tabs.some((tab) => tab.id === prev)) return prev;
      return firstId;
    });
  }, [profile?.id, tabs]);

  useEffect(() => {
    setGalleryView('photos');
    setServicesSectionId('');
    setMenuSectionId('');
    setProductsSectionId('');
    setPortfolioSectionId('');
    setHousesSectionId('');
    setRoomsSectionId('');
    setHousesItemIndex(0);
    setRoomsItemIndex(0);
    setHousesMediaIndex(0);
    setRoomsMediaIndex(0);
    setHousesAmenitiesExpanded(false);
    setRoomsAmenitiesExpanded(false);
    setPhotoErrorMap({});
    setGalleryModalOpen(false);
    setGalleryModalItemsOverride([]);
    setProductModalOpen(false);
    setProductModalItem(null);
    setProductModalSectionLabel('');
    setProductModalKind('produtos');
    setPortfolioModalOpen(false);
    setPortfolioModalItem(null);
    setPortfolioModalSectionLabel('');
    setServiceModalOpen(false);
    setServiceModalItem(null);
    setServiceModalSectionLabel('');
    setProductsViewMode('list');
    setMenuViewMode('list');
    setAboutWebHeight(120);
    setReviewsModalOpen(false);
    setReviewsLoading(false);
    setReviewsSaving(false);
    setReviewsError('');
    setReviewsList([]);
    setReviewsSummary({ average: 0, total: 0, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } });
    setReviewCanRate(false);
    setReviewRating(0);
    setReviewComment('');
    setReviewSortMode('recent');
  }, [profile?.id]);

  useEffect(() => {
    const id = storyTranslateY.addListener(({ value }) => {
      storyDragYRef.current = value;
    });
    return () => {
      storyTranslateY.removeListener(id);
    };
  }, [storyTranslateY]);

  useEffect(() => {
    if (!galleryModalOpen || !galleryViewportWidth) return;
    const timer = setTimeout(() => {
      galleryScrollRef.current?.scrollTo({
        x: galleryModalIndex * galleryViewportWidth,
        animated: false,
      });
    }, 0);
    return () => clearTimeout(timer);
    }, [galleryModalOpen, galleryModalType, galleryViewportWidth]);

  useEffect(() => {
    if (shareModalOpen) return;
    setShareQuery('');
    setShareSelectedUser(null);
    setShareError('');
    setShareSearchBusy(false);
    setShareCandidates((prev) => (prev.length ? [] : prev));
  }, [shareModalOpen]);

  useEffect(() => {
    if (!shareModalOpen) return;
    const query = String(shareQuery || '').trim();
    if (query.length < 2) {
      const seed = Array.isArray(recentShareUsers) ? recentShareUsers : [];
      setShareCandidates((prev) => {
        if (prev === seed) return prev;
        if (
          prev.length === seed.length &&
          prev.every((item, idx) => {
            const leftId = String(item?.id || '');
            const rightId = String(seed[idx]?.id || '');
            const leftEmail = String(item?.email || '').trim().toLowerCase();
            const rightEmail = String(seed[idx]?.email || '').trim().toLowerCase();
            return leftId === rightId && leftEmail === rightEmail;
          })
        ) {
          return prev;
        }
        return seed;
      });
      setShareSearchBusy(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setShareSearchBusy(true);
      try {
        const resp = await recommendationsSearchUsers(query);
        if (cancelled) return;
        const users = Array.isArray(resp?.users) ? resp.users : [];
        setShareCandidates((prev) => {
          if (
            prev.length === users.length &&
            prev.every((item, idx) => {
              const leftId = String(item?.id || '');
              const rightId = String(users[idx]?.id || '');
              const leftEmail = String(item?.email || '').trim().toLowerCase();
              const rightEmail = String(users[idx]?.email || '').trim().toLowerCase();
              return leftId === rightId && leftEmail === rightEmail;
            })
          ) {
            return prev;
          }
          return users;
        });
      } catch (_e) {
        if (!cancelled) {
          setShareCandidates((prev) => (prev.length ? [] : prev));
        }
      } finally {
        if (!cancelled) setShareSearchBusy(false);
      }
    }, 260);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shareModalOpen, shareQuery, recentShareUsers]);
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) || tabs[0] || null,
    [tabs, activeTabId]
  );
  const aboutRaw = String(profile?.about || profileData?.about || '').trim();
  useEffect(() => {
    const source = aboutRaw;
    if (!source) {
      setAboutRuntimeText('');
      return;
    }
    if (L === 'pt') {
      setAboutRuntimeText(source);
      return;
    }
    const key = `${L}::${source}`;
    const cached = runtimeTranslateCacheRef.current.get(key);
    if (typeof cached === 'string' && cached.trim()) {
      setAboutRuntimeText(cached);
      return;
    }
    let cancelled = false;
    translateRuntimeText(source, L).then((translated) => {
      if (cancelled) return;
      const finalText = String(translated || source);
      runtimeTranslateCacheRef.current.set(key, finalText);
      setAboutRuntimeText(finalText);
    });
    return () => {
      cancelled = true;
    };
  }, [aboutRaw, L]);
  const aboutHtmlPage = useMemo(
    () => buildAboutWebViewHtml(aboutRuntimeText || aboutRaw),
    [aboutRaw, aboutRuntimeText]
  );

  const badgeText =
    profile?.badge === 'verif'
      ? tr('profile_badge_verified', 'Verificado')
      : profile?.badge === 'promo'
      ? tr('profile_badge_promo', 'Promoção')
      : profile?.badge === 'novo'
      ? tr('profile_badge_new', 'Novo')
      : '';
  const isVerifiedBadge = profile?.badge === 'verif';
  const isTextBadge = profile?.badge === 'promo' || profile?.badge === 'novo';

  const photoUrls = useMemo(() => {
    return getFirstNonEmptyMediaList(
      profileData?.gallery?.photos,
      profileData?.gallery?.fotos,
      profileData?.gallery?.images,
      profileData?.photos
      ,
      profileData?.fotos,
      profileData?.images
    )
      .map(resolveMediaUri)
      .filter(Boolean);
  }, [profileData]);
  const videoUrls = useMemo(() => {
    return getFirstNonEmptyMediaList(
      profileData?.gallery?.videos,
      profileData?.videos,
      profileData?.gallery?.reels,
      profileData?.reels
    )
      .map(resolveMediaUri)
      .filter(Boolean);
  }, [profileData]);
  const storyUrls = useMemo(() => {
    const explicit = normalizeMediaList(profileData?.stories).map(resolveMediaUri).filter(Boolean);
    if (explicit.length) return explicit.slice(0, 20);
    return photoUrls.slice(0, 20);
  }, [profileData, photoUrls]);
  useEffect(() => {
    const candidates = [
      avatarUri,
      ...photoUrls.slice(0, 16),
      ...videoUrls.slice(0, 10),
      ...storyUrls.slice(0, 10),
    ].filter(Boolean);
    const unique = [...new Set(candidates)];
    unique.forEach((uri) => {
      if (/^https?:\/\//i.test(uri)) Image.prefetch(uri);
    });
  }, [avatarUri, photoUrls, videoUrls, storyUrls]);
  const getGalleryItemsByType = useCallback(
    (type) => {
      if (type === 'videos') return videoUrls;
      return photoUrls;
    },
    [photoUrls, videoUrls]
  );
  const activeGalleryItems = useMemo(
    () =>
      Array.isArray(galleryModalItemsOverride) && galleryModalItemsOverride.length
        ? galleryModalItemsOverride
        : getGalleryItemsByType(galleryModalType),
    [galleryModalItemsOverride, galleryModalType, getGalleryItemsByType]
  );

  const infoItems = useMemo(() => {
    const entries = [];
    if (profileData?.phone) entries.push({ icon: 'call-outline', text: String(profileData.phone) });
    if (profileData?.email) entries.push({ icon: 'mail-outline', text: String(profileData.email) });
    if (profileData?.website) entries.push({ icon: 'globe-outline', text: String(profileData.website) });
    if (profileData?.site) entries.push({ icon: 'globe-outline', text: String(profileData.site) });
    if (Array.isArray(profileData?.links)) {
      profileData.links.forEach((link) => {
        const url = typeof link === 'string' ? link : link?.url || '';
        if (url) entries.push({ icon: 'link-outline', text: String(url) });
      });
    }
    return entries.slice(0, 8);
  }, [profileData]);

  const socialItems = useMemo(() => getSocialItems(profileData), [profileData]);
  function renderSocialIcon(item) {
    return (
      <Ionicons
        name={item?.icon}
        size={20}
        color={detectSocialColor(item?.icon, item?.url)}
      />
    );
  }
  const galleryModalFitMap = useMemo(
    () =>
      normalizeGalleryModalFitMap(
        profileData?.gallery?.modalFit || profileData?.gallery?.modalMediaFit || profileData?.galleryModalFit
      ),
    [profileData?.gallery?.modalFit, profileData?.gallery?.modalMediaFit, profileData?.galleryModalFit]
  );
  const galleryItemFitMap = useMemo(
    () =>
      normalizeGalleryItemFitMap(
        profileData?.gallery?.itemFitMap || profileData?.gallery?.mediaItemFitMap || profileData?.galleryItemFitMap
      ),
    [profileData?.gallery?.itemFitMap, profileData?.gallery?.mediaItemFitMap, profileData?.galleryItemFitMap]
  );
  const galleryItemCropMap = useMemo(
    () =>
      normalizeGalleryItemCropMap(
        profileData?.gallery?.itemCropMap || profileData?.gallery?.mediaItemCropMap || profileData?.galleryItemCropMap
      ),
    [profileData?.gallery?.itemCropMap, profileData?.gallery?.mediaItemCropMap, profileData?.galleryItemCropMap]
  );
  const galleryModalResizeMode = useMemo(() => {
    if (galleryModalType === 'videos') return galleryModalFitMap.videos === 'cover' ? 'cover' : 'contain';
    return galleryModalFitMap.photos === 'cover' ? 'cover' : 'contain';
  }, [galleryModalFitMap, galleryModalType]);
  const galleryModalItemResizeMode = useMemo(() => {
    const tab = galleryModalType === 'videos' ? 'videos' : 'photos';
    const uri = String(activeGalleryItems?.[galleryModalIndex] || '').trim();
    if (!uri) return galleryModalResizeMode;
    const byItem = galleryItemFitMap?.[tab]?.[uri];
    if (!byItem) return galleryModalResizeMode;
    return normalizeGalleryModalFitValue(byItem);
  }, [activeGalleryItems, galleryModalIndex, galleryModalType, galleryItemFitMap, galleryModalResizeMode]);
  const galleryModalItemCrop = useMemo(() => {
    const tab = galleryModalType === 'videos' ? 'videos' : 'photos';
    const uri = String(activeGalleryItems?.[galleryModalIndex] || '').trim();
    if (!uri) return { x: 0, y: 0, scale: 1 };
    const crop = galleryItemCropMap?.[tab]?.[uri];
    if (!crop || typeof crop !== 'object') return { x: 0, y: 0, scale: 1 };
    return {
      x: normalizeGalleryCropNumber(crop?.x, 0),
      y: normalizeGalleryCropNumber(crop?.y, 0),
      scale: Math.max(1, Math.min(3, normalizeGalleryCropNumber(crop?.scale, 1))),
    };
  }, [activeGalleryItems, galleryModalIndex, galleryModalType, galleryItemCropMap]);
  const contentImageFitMap = useMemo(
    () =>
      normalizeContentImageFitMap(
        profileData?.contentImageFitMap || profileData?.itemImageFitMap
      ),
    [profileData?.contentImageFitMap, profileData?.itemImageFitMap]
  );
  const contentImageCropMap = useMemo(
    () =>
      normalizeContentImageCropMap(
        profileData?.contentImageCropMap || profileData?.itemImageCropMap
      ),
    [profileData?.contentImageCropMap, profileData?.itemImageCropMap]
  );

  const getContentImageDisplayProps = useCallback(
    (uri, rawUri = '') => {
      const key = String(uri || '').trim();
      const rawKey = String(rawUri || '').trim();
      if (!key && !rawKey) return { resizeMode: 'cover', style: null };
      const fitRaw = contentImageFitMap?.[rawKey] || contentImageFitMap?.[key] || 'cover';
      const fit = normalizeGalleryModalFitValue(fitRaw);
      const crop = contentImageCropMap?.[rawKey] || contentImageCropMap?.[key];
      if (fit !== 'cover' || !crop) {
        return { resizeMode: fit === 'contain' ? 'contain' : 'cover', style: null };
      }
      return {
        resizeMode: 'cover',
        style: {
          transform: [
            { translateX: normalizeGalleryCropNumber(crop?.x, 0) },
            { translateY: normalizeGalleryCropNumber(crop?.y, 0) },
            { scale: Math.max(1, Math.min(3, normalizeGalleryCropNumber(crop?.scale, 1.12))) },
          ],
        },
      };
    },
    [contentImageFitMap, contentImageCropMap]
  );

  if (loading) {
    return (
      <View style={styles.profileSkeletonWrap}>
        <View style={styles.profileSkeletonTopRow}>
          <View style={styles.profileSkeletonIconBtn} />
          <View style={styles.profileSkeletonIconBtn} />
        </View>
        <View style={styles.profileSkeletonAvatar} />
        <View style={styles.profileSkeletonName} />
        <View style={styles.profileSkeletonSubline} />
        <View style={styles.profileSkeletonSublineShort} />
        <View style={styles.profileSkeletonLinksRow}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <View key={`profile-link-skeleton-${idx}`} style={styles.profileSkeletonLinkDot} />
          ))}
        </View>
        <View style={styles.profileSkeletonTabsRow}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <View key={`profile-tab-skeleton-${idx}`} style={styles.profileSkeletonTabPill} />
          ))}
        </View>
        <View style={styles.profileSkeletonContentCard} />
        <View style={[styles.profileSkeletonContentCard, styles.profileSkeletonContentCardShort]} />
      </View>
    );
  }

  if (!profile) {
    return <Text style={styles.placeholder}>{tr('profile_no_profile', 'Sem perfil para mostrar.')}</Text>;
  }

  function renderEmpty(text) {
    return <Text style={styles.profileSectionEmpty}>{text}</Text>;
  }

  function openExternalUrl(url) {
    const target = String(url || '').trim();
    if (!target) return;
    Linking.openURL(target).catch(() => {});
  }

  function openShareModal(payload) {
    if (!allowPrivateShare || typeof onShareRecommendation !== 'function') return;
    setShareDraft(payload || null);
    setShareModalOpen(true);
    setShareError('');
    setShareSelectedUser(null);
  }

  function requestShareProfile() {
    const profileId = Number(profile?.remoteId || profile?.id) || 0;
    openShareModal({
      content_type: 'profile',
      profile_id: profileId > 0 ? profileId : undefined,
      profile_slug: String(profile?.slug || ''),
      source_profile_name: String(profile?.name || ''),
      content_uri: '',
    });
  }

  async function loadReviews() {
    const profileId = Number(profile?.remoteId || profile?.id) || 0;
    const slug = String(profile?.slug || '').trim();
    if (profileId <= 0 && !slug) return false;
    setReviewsLoading(true);
    setReviewsError('');
    try {
      const resp = await profileReviewsList({
        profileId: profileId > 0 ? profileId : undefined,
        slug,
      });
      const summary = resp?.summary && typeof resp.summary === 'object' ? resp.summary : {};
      const distribution = summary?.distribution && typeof summary.distribution === 'object'
        ? summary.distribution
        : {};
      setReviewsSummary({
        average: Number(summary?.average || 0),
        total: Number(summary?.total || 0),
        distribution: {
          '1': Number(distribution?.['1'] || 0),
          '2': Number(distribution?.['2'] || 0),
          '3': Number(distribution?.['3'] || 0),
          '4': Number(distribution?.['4'] || 0),
          '5': Number(distribution?.['5'] || 0),
        },
      });
      const list = Array.isArray(resp?.reviews) ? resp.reviews : [];
      setReviewsList(list);
      const canRate = !!resp?.viewer?.can_rate && viewerIsCommon && !canEdit;
      setReviewCanRate(canRate);
      if (resp?.viewer?.review && typeof resp.viewer.review === 'object') {
        setReviewRating(Number(resp.viewer.review.rating || 0));
        setReviewComment(String(resp.viewer.review.comment || ''));
      } else {
        setReviewRating(0);
        setReviewComment('');
      }
      return true;
    } catch (e) {
      setReviewsError(e?.message || tr('reviews_error_load', 'Não foi possível carregar avaliações.'));
      return false;
    } finally {
      setReviewsLoading(false);
    }
  }

  async function openReviewsModal() {
    setReviewsModalOpen(true);
    await loadReviews();
  }

  async function submitReview() {
    if (!reviewCanRate || reviewsSaving) return;
    const rating = Math.max(1, Math.min(5, Number(reviewRating || 0)));
    if (!rating) {
      setReviewsError(tr('reviews_error_pick_rating', 'Seleciona uma classificação.'));
      return;
    }
    const profileId = Number(profile?.remoteId || profile?.id) || 0;
    const slug = String(profile?.slug || '').trim();
    setReviewsSaving(true);
    setReviewsError('');
    try {
      await profileReviewsUpsert({
        profileId: profileId > 0 ? profileId : undefined,
        slug,
        rating,
        comment: reviewComment,
      });
      await loadReviews();
    } catch (e) {
      setReviewsError(e?.message || tr('reviews_error_save', 'Não foi possível guardar avaliação.'));
    } finally {
      setReviewsSaving(false);
    }
  }

  function requestShareMedia(type, uri) {
    const normalizedType = String(type || '').toLowerCase();
    if (!['photo', 'video', 'reel'].includes(normalizedType)) return;
    const profileId = Number(profile?.remoteId || profile?.id) || 0;
    openShareModal({
      content_type: normalizedType,
      profile_id: profileId > 0 ? profileId : undefined,
      profile_slug: String(profile?.slug || ''),
      source_profile_name: String(profile?.name || ''),
      content_uri: String(uri || ''),
    });
  }

  function buildItemShareUri(kind, item, sectionLabel = '') {
    const data = item && typeof item === 'object' ? item : {};
    const payload = {
      v: 1,
      kind: String(kind || '').trim().toLowerCase(),
      section: String(sectionLabel || '').trim(),
      name: String(data?.name || data?.description || '').trim(),
      price: normalizePrice(data?.promoNowPrice || data?.newPrice || data?.priceNow || data?.price || ''),
      oldPrice: normalizePrice(data?.promoOldPrice || data?.oldPrice || data?.priceBefore || ''),
      time: String(data?.time || '').trim(),
      note: String(data?.shortDescription || data?.description || data?.note || data?.notes || '').trim(),
      image: resolveMediaUri(data?.image || normalizeMediaList(data?.images)?.[0] || ''),
    };
    try {
      return `itemshare:${encodeURIComponent(JSON.stringify(payload))}`;
    } catch (_e) {
      return '';
    }
  }

  function requestShareItemFromModal(kind, item, sectionLabel = '') {
    if (!allowPrivateShare || typeof onShareRecommendation !== 'function') return;
    const profileId = Number(profile?.remoteId || profile?.id) || 0;
    const contentUri = buildItemShareUri(kind, item, sectionLabel);
    openShareModal({
      content_type: 'profile',
      profile_id: profileId > 0 ? profileId : undefined,
      profile_slug: String(profile?.slug || ''),
      source_profile_name: String(profile?.name || ''),
      content_uri: contentUri,
    });
  }

  function requestShareItemFromOverlay(kind, item, sectionLabel = '', closeOverlay) {
    if (!allowPrivateShare || typeof onShareRecommendation !== 'function') return;
    const itemSnapshot = item && typeof item === 'object' ? { ...item } : item;
    const labelSnapshot = String(sectionLabel || '');
    if (typeof closeOverlay === 'function') {
      closeOverlay();
      setTimeout(() => {
        requestShareItemFromModal(kind, itemSnapshot, labelSnapshot);
      }, 120);
      return;
    }
    requestShareItemFromModal(kind, itemSnapshot, labelSnapshot);
  }

  function buildSaveItemPayload(kind, item, sectionLabel = '') {
    const data = item && typeof item === 'object' ? item : {};
    const normalizedKind = String(kind || '').trim().toLowerCase();
    if (!normalizedKind) return null;
    const uri = buildItemShareUri(normalizedKind, data, sectionLabel);
    if (!uri) return null;
    const profileId = Number(profile?.remoteId || profile?.id) || 0;
    return {
      type: 'content',
      uri,
      kind: normalizedKind,
      section: String(sectionLabel || '').trim(),
      name: String(data?.name || data?.description || '').trim(),
      note: String(data?.shortDescription || data?.description || data?.note || data?.notes || '').trim(),
      price: normalizePrice(data?.promoNowPrice || data?.newPrice || data?.priceNow || data?.price || ''),
      oldPrice: normalizePrice(data?.promoOldPrice || data?.oldPrice || data?.priceBefore || ''),
      time: String(data?.time || '').trim(),
      category: String(profile?.category || profile?.type || '').trim(),
      profileName: String(profile?.name || '').trim(),
      profileId: profileId > 0 ? String(profileId) : String(profile?.id || ''),
      profileSlug: String(profile?.slug || '').trim(),
      savedAt: new Date().toISOString(),
    };
  }

  function toggleSaveItem(kind, item, sectionLabel = '') {
    if (typeof onToggleSaveMedia !== 'function') return;
    const payload = buildSaveItemPayload(kind, item, sectionLabel);
    if (!payload) return;
    onToggleSaveMedia(payload);
  }

  function checkSavedItem(kind, item, sectionLabel = '') {
    if (typeof isSavedMedia !== 'function') return false;
    const payload = buildSaveItemPayload(kind, item, sectionLabel);
    if (!payload) return false;
    return !!isSavedMedia(payload);
  }

  function buildSaveMediaPayload(type, uri) {
    const normalizedType = String(type || '').toLowerCase();
    if (!['photo', 'video', 'reel'].includes(normalizedType)) return null;
    const cleanUri = String(uri || '').trim();
    if (!cleanUri) return null;
    const profileId = Number(profile?.remoteId || profile?.id) || 0;
    return {
      type: normalizedType,
      uri: cleanUri,
      category: String(profile?.category || profile?.type || '').trim(),
      profileName: String(profile?.name || '').trim(),
      profileId: profileId > 0 ? String(profileId) : String(profile?.id || ''),
    };
  }

  function toggleSaveMedia(type, uri) {
    if (typeof onToggleSaveMedia !== 'function') return;
    const payload = buildSaveMediaPayload(type, uri);
    if (!payload) return;
    onToggleSaveMedia(payload);
  }

  function checkSavedMedia(type, uri) {
    if (typeof isSavedMedia !== 'function') return false;
    const payload = buildSaveMediaPayload(type, uri);
    if (!payload) return false;
    return !!isSavedMedia(payload);
  }

  function getCurrentModalMedia() {
    if (!activeGalleryItems.length) return null;
    const safeIndex = Math.max(0, Math.min(galleryModalIndex, activeGalleryItems.length - 1));
    const uri = String(activeGalleryItems[safeIndex] || '').trim();
    if (!uri) return null;
    const mediaType = galleryModalType === 'videos' ? 'video' : 'photo';
    return { uri, mediaType };
  }

  function renderGalleryGridActions(type, uri) {
    const canSave = typeof onToggleSaveMedia === 'function';
    const canShare = !!allowPrivateShare;
    if (!canSave && !canShare) return null;
    const cleanUri = String(uri || '').trim();
    if (!cleanUri) return null;
    return (
      <View style={styles.profileMediaActionsBar}>
        {canShare && (
          <Pressable
            style={({ pressed }) => [
              styles.profileMediaActionBtn,
              styles.profileMediaShareBtn,
              pressed && styles.profileMediaActionBtnPressed,
            ]}
            android_ripple={{ color: 'rgba(15,23,42,0.08)', borderless: false }}
            onPress={(event) => {
              event?.stopPropagation?.();
              requestShareMedia(type, cleanUri);
            }}
          >
            <Ionicons name="paper-plane-outline" size={13} color="#0f172a" />
          </Pressable>
        )}
        {canShare && canSave && <View style={styles.profileMediaActionsDivider} />}
        {canSave && (
          <Pressable
            style={({ pressed }) => [
              styles.profileMediaActionBtn,
              styles.profileMediaSaveBtn,
              checkSavedMedia(type, cleanUri) && styles.profileMediaActionBtnActive,
              pressed && styles.profileMediaActionBtnPressed,
            ]}
            android_ripple={{ color: 'rgba(15,23,42,0.08)', borderless: false }}
            onPress={(event) => {
              event?.stopPropagation?.();
              toggleSaveMedia(type, cleanUri);
            }}
          >
            <Ionicons
              name={checkSavedMedia(type, cleanUri) ? 'bookmark' : 'bookmark-outline'}
              size={13}
              color={checkSavedMedia(type, cleanUri) ? '#fff' : '#0f172a'}
            />
          </Pressable>
        )}
      </View>
    );
  }

  async function submitShare() {
    if (!shareDraft) return;
    if (!shareSelectedUser?.id) {
      setShareError('Seleciona um utilizador.');
      return;
    }
    setShareBusy(true);
    setShareError('');
    try {
      const result = await onShareRecommendation({
        ...shareDraft,
        recipient_id: shareSelectedUser.id,
      });
      if (result?.ok) {
        setShareModalOpen(false);
        Alert.alert('Enviado', 'Partilha enviada com sucesso.');
      } else if (String(result?.error || '') === 'permission_required') {
        setShareModalOpen(false);
        Alert.alert('Permissao enviada', 'Foi enviado um pedido de permissao ao utilizador.');
      } else {
        setShareError(result?.error || 'Não foi possível enviar.');
      }
    } catch (_e) {
      setShareError('Não foi possível enviar.');
    } finally {
      setShareBusy(false);
    }
  }

  function openStoryModal(index = 0) {
    if (!storyUrls.length) return;
    const safe = Math.max(0, Math.min(index, storyUrls.length - 1));
    storyTranslateY.setValue(0);
    storyCloseY.setValue(0);
    storyCloseScale.setValue(1);
    storyCloseOpacity.setValue(1);
    storyClosingRef.current = false;
    setStoryIndex(safe);
    setStoryModalOpen(true);
  }

  function closeStoryModalImmediate() {
    storyClosingRef.current = false;
    setStoryModalOpen(false);
    storyDragYRef.current = 0;
  }

  const closeStoryModal = useCallback(() => {
    if (storyClosingRef.current) return;
    storyClosingRef.current = true;

    const finalize = () => {
      closeStoryModalImmediate();
    };

    const { height: windowHeight } = Dimensions.get('window');
    const dropDistance = Math.max(260, windowHeight * 0.88);

    Animated.parallel([
      Animated.timing(storyCloseY, {
        toValue: dropDistance - storyDragYRef.current,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.timing(storyCloseScale, {
        toValue: 0.9,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.timing(storyCloseOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(finalize);
  }, [storyCloseOpacity, storyCloseScale, storyCloseY]);

  const storyPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: (_evt, gestureState) =>
      gestureState.dy > 2 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 0.2,
    onMoveShouldSetPanResponderCapture: (_evt, gestureState) =>
      gestureState.dy > 2 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 0.2,
    onPanResponderMove: (_evt, gestureState) => {
      const y = gestureState.dy > 0 ? gestureState.dy : 0;
      storyTranslateY.setValue(y);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_evt, gestureState) => {
      const shouldClose = gestureState.dy > 45 || (gestureState.vy > 0.35 && gestureState.dy > 8);
      if (shouldClose) {
        closeStoryModal();
      } else {
        Animated.spring(storyTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 22,
          bounciness: 0,
        }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(storyTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 22,
        bounciness: 0,
      }).start();
    },
  });

  function nextStory() {
    if (!storyUrls.length) return;
    setStoryIndex((prev) => (prev + 1) % storyUrls.length);
  }

  function prevStory() {
    if (!storyUrls.length) return;
    setStoryIndex((prev) => (prev - 1 + storyUrls.length) % storyUrls.length);
  }

  async function handleAddStoryPress() {
    if (!canEdit) return;
    const existing = new Set(storyUrls);
    const candidate =
      photoUrls.find((url) => !existing.has(url)) ||
      photoUrls[0] ||
      avatarUri ||
      '';

    if (!candidate) {
      Alert.alert('Story', 'Adiciona primeiro uma foto na galeria para usar como story.');
      if (onEditPress) onEditPress();
      return;
    }
    if (typeof onAddStory !== 'function') {
      Alert.alert('Story', 'Editar perfil para adicionar story.');
      if (onEditPress) onEditPress();
      return;
    }

    setStoryBusy(true);
    try {
      const ok = await onAddStory(candidate);
      if (ok) {
        setTimeout(() => openStoryModal(0), 250);
      } else {
        Alert.alert('Story', 'Não foi possível adicionar o story.');
      }
    } catch (_e) {
      Alert.alert('Story', 'Não foi possível adicionar o story.');
    } finally {
      setStoryBusy(false);
    }
  }

  function handleAvatarPress() {
    if (storyUrls.length) {
      openStoryModal(0);
      return;
    }
    if (canEdit) {
      handleAddStoryPress();
    }
  }

  function openGalleryModal(type, index = 0) {
    const targetType = type === 'videos' ? 'videos' : 'photos';
    const items = getGalleryItemsByType(targetType);
    if (!items.length) return;
    const safe = Math.max(0, Math.min(index, items.length - 1));
    galleryCloseY.setValue(0);
    galleryCloseScale.setValue(1);
    galleryCloseOpacity.setValue(1);
    galleryClosingRef.current = false;
    setGalleryModalItemsOverride([]);
    setGalleryModalType(targetType);
    setGalleryModalIndex(safe);
    setGalleryModalOpen(true);
  }

  function openProductModal(item, sectionLabel = '', kind = 'produtos') {
    const target = item && typeof item === 'object' ? item : null;
    if (!target) return;
    setProductModalImageIndex(0);
    setProductModalItem(target);
    setProductModalSectionLabel(String(sectionLabel || '').trim());
    setProductModalKind(String(kind || 'produtos').toLowerCase());
    setProductModalOpen(true);
  }

  function closeProductModal() {
    setProductModalOpen(false);
    setProductModalImageIndex(0);
    setProductModalItem(null);
    setProductModalSectionLabel('');
    setProductModalKind('produtos');
  }

  function openPortfolioModal(item, sectionLabel = '') {
    if (!item || typeof item !== 'object') return;
    setPortfolioModalImageIndex(0);
    setPortfolioModalItem(item);
    setPortfolioModalSectionLabel(String(sectionLabel || '').trim());
    setPortfolioModalOpen(true);
  }

  function closePortfolioModal() {
    setPortfolioModalOpen(false);
    setPortfolioModalImageIndex(0);
    setTimeout(() => {
      setPortfolioModalItem(null);
      setPortfolioModalSectionLabel('');
    }, 120);
  }

  function openServiceModal(item, sectionLabel = '') {
    const target = item && typeof item === 'object' ? item : null;
    if (!target) return;
    setServiceModalImageIndex(0);
    setServiceModalItem(target);
    setServiceModalSectionLabel(String(sectionLabel || '').trim());
    setServiceModalOpen(true);
  }

  function closeServiceModal() {
    setServiceModalOpen(false);
    setServiceModalImageIndex(0);
    setServiceModalItem(null);
    setServiceModalSectionLabel('');
  }

  function openCampaignModal(item) {
    const target = item && typeof item === 'object' ? item : null;
    if (!target) return;
    const images = normalizeMediaList(target.images).map(resolveMediaUri).filter(Boolean);
    const videos = normalizeMediaList(target.videos).map(resolveMediaUri).filter(Boolean);
    if (images.length) {
      openGalleryModalWithItems(images, 0);
      return;
    }
    if (!videos.length) return;
    setCampaignModalVideoIndex(0);
    setCampaignModalItem({ ...target, videos });
    setCampaignModalOpen(true);
  }

  function closeCampaignModal() {
    setCampaignModalOpen(false);
    setCampaignModalVideoIndex(0);
    setCampaignModalItem(null);
  }

  function openGalleryModalWithItems(items, index = 0) {
    const prepared = normalizeMediaList(items).map(resolveMediaUri).filter(Boolean);
    if (!prepared.length) return;
    const safe = Math.max(0, Math.min(index, prepared.length - 1));
    galleryCloseY.setValue(0);
    galleryCloseScale.setValue(1);
    galleryCloseOpacity.setValue(1);
    galleryClosingRef.current = false;
    setGalleryModalItemsOverride(prepared);
    setGalleryModalType('photos');
    setGalleryModalIndex(safe);
    setGalleryModalOpen(true);
  }

  function closeGalleryModalImmediate() {
    galleryClosingRef.current = false;
    setGalleryModalOpen(false);
    setGalleryModalItemsOverride([]);
  }

  const closeGalleryModal = useCallback(() => {
    if (galleryClosingRef.current) return;
    galleryClosingRef.current = true;
    const finalize = () => {
      closeGalleryModalImmediate();
    };

    const { height: windowHeight } = Dimensions.get('window');
    const dropDistance = Math.max(260, windowHeight * 0.88);

    Animated.parallel([
      Animated.timing(galleryCloseY, {
        toValue: dropDistance,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.timing(galleryCloseScale, {
        toValue: 0.9,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.timing(galleryCloseOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(finalize);
  }, [galleryCloseOpacity, galleryCloseScale, galleryCloseY]);

  useEffect(() => {
    const intent = openProfileIntent && typeof openProfileIntent === 'object' ? openProfileIntent : null;
    if (!intent || !profile) return;
    if (String(intent.profileId || '') !== String(profile.id || '')) return;
    const itemShare = intent.itemShare && typeof intent.itemShare === 'object' ? intent.itemShare : null;
    const kind = String(itemShare?.kind || '').trim().toLowerCase();
    if (!kind) {
      onConsumeProfileOpenIntent?.();
      return;
    }

    const normalizeKey = (value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
    const sectionHint = normalizeKey(itemShare?.section || '');
    const nameHint = normalizeKey(itemShare?.name || '');
    const resolveSectionAndItem = (sections) => {
      const list = Array.isArray(sections) ? sections : [];
      if (!list.length) return null;
      let section = list[0];
      if (sectionHint) {
        const found = list.find((sec) => normalizeKey(sec?.label) === sectionHint);
        if (found) section = found;
      }
      const items = Array.isArray(section?.items) ? section.items : [];
      let itemIndex = 0;
      if (nameHint && items.length) {
        const foundIdx = items.findIndex((entry) => {
          const candidates = [
            entry?.name,
            entry?.description,
            entry?.title,
            entry?.shortDescription,
          ].map(normalizeKey);
          return candidates.some((candidate) => candidate && candidate === nameHint);
        });
        if (foundIdx >= 0) itemIndex = foundIdx;
      }
      const item = items[itemIndex] || null;
      return { section, item, itemIndex };
    };
    const switchToTabByType = (targetType) => {
      const tab = tabs.find((entry) => normalizeKey(entry?.type) === normalizeKey(targetType));
      if (tab?.id) setActiveTabId(tab.id);
      return tab || null;
    };

    if (kind === 'service') {
      switchToTabByType('servicos');
      const sections = normalizeSections(profileData.servicesSections, profileData.services, 'Serviços');
      const resolved = resolveSectionAndItem(sections);
      if (resolved?.section?.id) setServicesSectionId(String(resolved.section.id));
      if (resolved?.item) openServiceModal(resolved.item, translateUiOrRuntime(resolved.section?.label || 'Serviços'));
      onConsumeProfileOpenIntent?.();
      return;
    }

    if (kind === 'product' || kind === 'menu') {
      const isMenu = kind === 'menu';
      switchToTabByType(isMenu ? 'menu' : 'produtos');
      const sections = normalizeSections(
        isMenu ? profileData.menuSections : profileData.productsSections,
        isMenu ? profileData.menu : profileData.products,
        isMenu ? 'Menu' : 'Produtos'
      );
      const resolved = resolveSectionAndItem(sections);
      if (resolved?.section?.id) {
        if (isMenu) setMenuSectionId(String(resolved.section.id));
        else setProductsSectionId(String(resolved.section.id));
      }
      if (resolved?.item) openProductModal(resolved.item, translateUiOrRuntime(resolved.section?.label || (isMenu ? 'Menu' : 'Produtos')), isMenu ? 'menu' : 'produtos');
      onConsumeProfileOpenIntent?.();
      return;
    }

    if (kind === 'portfolio') {
      switchToTabByType('portfolio');
      const sections = normalizeSections(profileData.portfolioSections, [], 'Portfolio')
        .map((sec) => ({ ...sec, items: (Array.isArray(sec.items) ? sec.items : []).filter((item) => item && item.enabled !== false) }))
        .filter((sec) => sec.items.length);
      const resolved = resolveSectionAndItem(sections);
      if (resolved?.section?.id) setPortfolioSectionId(String(resolved.section.id));
      if (resolved?.item) openPortfolioModal(resolved.item, translateUiOrRuntime(resolved.section?.label || 'Portfolio'));
      onConsumeProfileOpenIntent?.();
      return;
    }

    if (kind === 'house' || kind === 'room') {
      const isHouse = kind === 'house';
      switchToTabByType(isHouse ? 'casas' : 'quartos');
      const sections = normalizeSections(
        isHouse ? profileData.housesSections : profileData.roomsSections,
        isHouse ? profileData.houses : profileData.rooms,
        isHouse ? 'Casas' : 'Quartos'
      );
      const resolved = resolveSectionAndItem(sections);
      if (resolved?.section?.id) {
        if (isHouse) setHousesSectionId(String(resolved.section.id));
        else setRoomsSectionId(String(resolved.section.id));
      }
      if (typeof resolved?.itemIndex === 'number') {
        if (isHouse) setHousesItemIndex(resolved.itemIndex);
        else setRoomsItemIndex(resolved.itemIndex);
      }
      if (isHouse) setHousesMediaIndex(0);
      else setRoomsMediaIndex(0);
      onConsumeProfileOpenIntent?.();
      return;
    }

    if (kind === 'campaign') {
      switchToTabByType('campanhas');
      const direct = Array.isArray(profileData.campaigns) ? profileData.campaigns : [];
      const fromSections = Array.isArray(profileData.campaignSections)
        ? profileData.campaignSections.flatMap((sec) => (Array.isArray(sec?.items) ? sec.items : []))
        : [];
      const items = [...direct, ...fromSections].filter((item) => item && item.enabled !== false);
      let target = items[0] || null;
      if (nameHint && items.length) {
        const found = items.find((entry) => normalizeKey(entry?.title || entry?.name || '') === nameHint);
        if (found) target = found;
      }
      if (target) openCampaignModal(target);
      onConsumeProfileOpenIntent?.();
      return;
    }

    onConsumeProfileOpenIntent?.();
  }, [
    openProfileIntent,
    profile?.id,
    tabs,
    profileData,
    translateUiOrRuntime,
    onConsumeProfileOpenIntent,
  ]);

  function nextGalleryItem() {
    if (!activeGalleryItems.length) return;
    const next = (galleryModalIndex + 1) % activeGalleryItems.length;
    setGalleryModalIndex(next);
    if (galleryViewportWidth > 0) {
      galleryScrollRef.current?.scrollTo({
        x: next * galleryViewportWidth,
        animated: true,
      });
    }
  }

  function prevGalleryItem() {
    if (!activeGalleryItems.length) return;
    const prev = (galleryModalIndex - 1 + activeGalleryItems.length) % activeGalleryItems.length;
    setGalleryModalIndex(prev);
    if (galleryViewportWidth > 0) {
      galleryScrollRef.current?.scrollTo({
        x: prev * galleryViewportWidth,
        animated: true,
      });
    }
  }

  function renderServices() {
    const baseSections = normalizeSections(profileData.servicesSections, profileData.services, 'Serviços')
      .filter((sec) => sec?.enabled !== false)
      .map((sec) => ({ ...sec, items: (Array.isArray(sec?.items) ? sec.items : []).filter((item) => item?.enabled !== false) }))
      .filter((sec) => sec.items.length);
    if (!baseSections.length) return renderEmpty(tr('profile_no_services', 'Sem serviços definidos.'));
    const promoItems = baseSections.flatMap((sec) =>
      (Array.isArray(sec?.items) ? sec.items : []).filter((item) => {
        const isBudget =
          String(item?.priceMode || item?.budgetMode || '').trim().toLowerCase() === 'budget' ||
          item?.isBudget === true ||
          item?.quoteOnly === true;
        const promoEnabled = !!(item?.promoEnabled || item?.isPromo || item?.promo);
        const promoNowPrice = normalizePrice(item?.promoNowPrice || item?.newPrice || item?.priceNow || '');
        return !isBudget && promoEnabled && !!promoNowPrice;
      })
    );
    const sections = promoItems.length
      ? [{ id: 'services-promocoes', label: 'Promoções', items: promoItems }, ...baseSections]
      : baseSections;
    const activeSection = sections.find((sec) => sec.id === servicesSectionId) || sections[0];
    return (
      <>
      <View style={styles.profileInfoList}>
        {activeSection.items.map((svc, idx) => {
          const name = svc?.description || svc?.name || tr('edit_service', 'Serviço');
          const time = String(svc?.time || '').trim();
          const price = normalizePrice(svc?.price || '');
          const isBudget =
            String(svc?.priceMode || svc?.budgetMode || '').trim().toLowerCase() === 'budget' ||
            svc?.isBudget === true ||
            svc?.quoteOnly === true;
          const promoEnabled = !!(svc?.promoEnabled || svc?.isPromo || svc?.promo);
          const promoOldPrice = normalizePrice(svc?.promoOldPrice || svc?.oldPrice || svc?.priceBefore || '');
          const promoNowPrice = normalizePrice(svc?.promoNowPrice || svc?.newPrice || svc?.priceNow || '');
          const showPromo = !isBudget && promoEnabled && !!promoNowPrice;
          const typeLabel = serviceTypeToLabel(svc?.serviceType || svc?.type);
          const extra1 = String(svc?.extra1 || svc?.detail1 || '').trim();
          const extra2 = String(svc?.extra2 || svc?.detail2 || '').trim();
          const note = String(svc?.note || svc?.notes || '').trim();
          return (
            <Pressable
              key={`svc-${activeSection.id}-${idx}`}
              style={styles.profileServiceBlockSimple}
                onPress={() => openServiceModal(svc, translateUiOrRuntime(activeSection.label))}
            >
              <View style={styles.profileServiceTopRow}>
                <Text style={styles.profileServiceTitle} numberOfLines={1}>{translateDisplay(name)}</Text>
                {showPromo ? (
                  <View style={styles.profilePromoPriceRow}>
                    <Text style={styles.profilePromoBadge}>PROMO</Text>
                    <Text style={styles.profilePromoNowPrice}>{promoNowPrice}</Text>
                    {!!promoOldPrice && <Text style={styles.profilePromoOldPrice}>{promoOldPrice}</Text>}
                  </View>
                ) : (
                  isBudget
                    ? <Text style={styles.profileListPrice}>{tr('edit_under_quote', 'Sob orçamento')}</Text>
                    : (!!price && <Text style={styles.profileListPrice}>{price}</Text>)
                )}
              </View>
              {!!time && <Text style={styles.profileServiceDuration}>{tr('edit_duration', 'Duração')}: {time}</Text>}
              {!!typeLabel && typeLabel.toLowerCase() !== 'geral' && (
                <Text style={styles.profileServiceDetailValue}>{typeLabel}</Text>
              )}
              {!!extra1 && <Text style={styles.profileServiceDetailValue}>{translateDisplay(extra1)}</Text>}
              {!!extra2 && <Text style={styles.profileServiceDetailValue}>{translateDisplay(extra2)}</Text>}
              {!!note && <Text style={styles.profileServiceNoteStrong}>{translateDisplay(note)}</Text>}
            </Pressable>
          );
        })}
      </View>
      </>
    );
  }

  function renderMenuOrProducts(mode) {
    const isProducts = mode === 'produtos';
    const isMenu = mode === 'menu';
    const baseSections = (isProducts
      ? normalizeSections(profileData.productsSections, profileData.products, 'Produtos')
      : normalizeSections(profileData.menuSections, profileData.menu, 'Menu'))
      .filter((sec) => sec?.enabled !== false)
      .map((sec) => ({ ...sec, items: (Array.isArray(sec?.items) ? sec.items : []).filter((item) => item?.enabled !== false) }))
      .filter((sec) => sec.items.length);
    const promoItems = (isProducts || isMenu)
      ? baseSections.flatMap((sec) =>
          (Array.isArray(sec?.items) ? sec.items : []).filter((item) => {
            const promoEnabled = !!(item?.promoEnabled || item?.isPromo || item?.promo);
            const promoNowPrice = normalizePrice(item?.promoNowPrice || item?.newPrice || item?.priceNow || '');
            return promoEnabled && !!promoNowPrice;
          })
        )
      : [];
    const promoSectionId = isProducts ? 'products-promocoes' : 'menu-promocoes';
    const sections = (isProducts || isMenu) && promoItems.length
      ? [{ id: promoSectionId, label: 'Promoções', items: promoItems }, ...baseSections]
      : baseSections;
    if (!sections.length) return renderEmpty(isProducts ? tr('profile_no_products', 'Sem produtos definidos.') : tr('profile_no_menu', 'Sem menu definido.'));
    const selectedId = isProducts ? productsSectionId : menuSectionId;
    const activeSection = sections.find((sec) => sec.id === selectedId) || sections[0];
    const currentViewMode = isProducts ? productsViewMode : menuViewMode;
    const setCurrentViewMode = isProducts ? setProductsViewMode : setMenuViewMode;
    const useGridView = currentViewMode === 'grid';

    return (
      <>
        <View style={styles.profileBlock}>
          <View style={styles.profileBlockHeaderRow}>
            <Text style={styles.profileBlockTitle}>{translateUiOrRuntime(activeSection.label)}</Text>
            {(isProducts || isMenu) && (
              <View style={styles.profileViewToggleRow}>
                <Pressable
                  style={[styles.profileViewToggleBtn, currentViewMode === 'list' && styles.profileViewToggleBtnActive]}
                  onPress={() => setCurrentViewMode('list')}
                >
                  <Ionicons
                    name="list-outline"
                    size={13}
                    color={currentViewMode === 'list' ? '#0f172a' : '#64748b'}
                  />
                </Pressable>
                <Pressable
                  style={[styles.profileViewToggleBtn, currentViewMode === 'grid' && styles.profileViewToggleBtnActive]}
                  onPress={() => setCurrentViewMode('grid')}
                >
                  <Ionicons
                    name="grid-outline"
                    size={13}
                    color={currentViewMode === 'grid' ? '#0f172a' : '#64748b'}
                  />
                </Pressable>
              </View>
            )}
          </View>
          <View style={useGridView ? styles.profilePromoGridWrap : null}>
            {activeSection.items.map((item, idx) => {
              const image = resolveMediaUri(item?.image);
              const imageDisplay = getContentImageDisplayProps(image, item?.image);
              const price = normalizePrice(item?.price || '');
              const promoEnabled = !!(item?.promoEnabled || item?.isPromo || item?.promo);
              const promoOldPrice = normalizePrice(item?.promoOldPrice || item?.oldPrice || item?.priceBefore || '');
              const promoNowPrice = normalizePrice(item?.promoNowPrice || item?.newPrice || item?.priceNow || '');
              const showPromo = promoEnabled && !!promoNowPrice;
              const desc = item?.shortDescription || item?.description || '';
              const rowContent = (
                <>
                  {!!image && (
                    <Image
                      source={{ uri: image }}
                      style={[styles.profileProductThumb, imageDisplay.style]}
                      resizeMode={imageDisplay.resizeMode}
                    />
                  )}
                  <View style={styles.profileListBody}>
                    <View style={styles.profileListTopRow}>
                      <Text style={styles.profileListTitle}>{translateDisplay(item?.name || (isProducts ? tr('profile_product', 'Produto') : tr('profile_item', 'Item')))}</Text>
                      {showPromo ? (
                        <View style={styles.profilePromoPriceWrap}>
                          <View style={styles.profilePromoPriceRow}>
                            <Text style={styles.profilePromoBadge}>PROMO</Text>
                            <Text style={styles.profilePromoNowPrice}>{promoNowPrice}</Text>
                            {!!promoOldPrice && <Text style={styles.profilePromoOldPrice}>{promoOldPrice}</Text>}
                          </View>
                        </View>
                      ) : (
                        !!price && <Text style={styles.profileListPrice}>{price}</Text>
                      )}
                    </View>
                    {!!desc && <Text style={styles.profileListDescription}>{translateDisplay(desc)}</Text>}
                  </View>
                </>
              );
              if (isProducts || isMenu) {
                if (useGridView) {
                  return (
                    <Pressable
                      key={`${activeSection.id}-${idx}`}
                      style={styles.profilePromoGridItem}
                      onPress={() => openProductModal(item, translateUiOrRuntime(activeSection.label), isProducts ? 'produtos' : 'menu')}
                    >
                      {!!image && (
                        <Image
                          source={{ uri: image }}
                          style={[styles.profilePromoGridImage, imageDisplay.style]}
                          resizeMode={imageDisplay.resizeMode}
                        />
                      )}
                      <View style={styles.profilePromoGridBody}>
                        <Text style={styles.profilePromoGridTitle} numberOfLines={1} ellipsizeMode="tail">
                          {translateDisplay(item?.name || (isProducts ? tr('profile_product', 'Produto') : tr('profile_item', 'Item')))}
                        </Text>
                        {!!desc && <Text style={styles.profilePromoGridDescription} numberOfLines={2}>{translateDisplay(desc)}</Text>}
                        <View style={styles.profilePromoGridPriceFixed}>
                          {showPromo ? (
                            <View style={styles.profilePromoPriceRow}>
                              <Text style={styles.profilePromoBadge}>PROMO</Text>
                              <Text style={styles.profilePromoNowPrice}>{promoNowPrice}</Text>
                              {!!promoOldPrice && <Text style={styles.profilePromoOldPrice}>{promoOldPrice}</Text>}
                            </View>
                          ) : (
                            !!price && <Text style={styles.profileListPrice}>{price}</Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                }
                return (
                  <Pressable
                    key={`${activeSection.id}-${idx}`}
                    style={styles.profileListItem}
                    onPress={() => openProductModal(item, translateUiOrRuntime(activeSection.label), isProducts ? 'produtos' : 'menu')}
                  >
                    {rowContent}
                  </Pressable>
                );
              }
              return (
                <View key={`${activeSection.id}-${idx}`} style={styles.profileListItem}>
                  {rowContent}
                </View>
              );
            })}
          </View>
        </View>
      </>
    );
  }

  function renderSchedule() {
    const rows = getScheduleRows(profileData.schedule).filter((row) => row.value);
    if (!rows.length) return renderEmpty(tr('profile_no_schedule', 'Sem horário definido.'));
    const weekdayByKey = {
      seg: tr('profile_weekday_mon', 'Segunda'),
      ter: tr('profile_weekday_tue', 'Terça'),
      qua: tr('profile_weekday_wed', 'Quarta'),
      qui: tr('profile_weekday_thu', 'Quinta'),
      sex: tr('profile_weekday_fri', 'Sexta'),
      sab: tr('profile_weekday_sat', 'Sábado'),
      dom: tr('profile_weekday_sun', 'Domingo'),
    };
    return (
      <View style={styles.profileScheduleList}>
        {rows.map((row) => (
          <View key={row.key} style={styles.profileScheduleCard}>
            <Text style={styles.profileScheduleDayText}>
              {weekdayByKey[row.key] || translateDisplay(row.label)}
            </Text>
            <View style={styles.profileScheduleTimeWrap}>
              <Ionicons name="time-outline" size={13} color="#475569" />
              <Text style={styles.profileScheduleTimeText}>{translateDisplay(row.value)}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  function renderAgenda() {
    const agenda = profileData?.agenda && typeof profileData.agenda === 'object' ? profileData.agenda : {};
    const slots = Array.isArray(agenda.slots) ? agenda.slots : [];
    const hasData = String(agenda.description || '').trim() || String(agenda.reserveLink || '').trim() || slots.length;
    if (!hasData) return renderEmpty(tr('profile_no_agenda', 'Sem agenda definida.'));
    const reserveUrl = toOpenableUrl(agenda.reserveLink);
    return (
      <View style={styles.profileInfoList}>
        {!!agenda.description && (
          <View style={styles.profileInfoItem}>
            <Ionicons name="calendar-outline" size={14} color="#334155" />
            <Text style={styles.profileInfoText}>{translateDisplay(agenda.description)}</Text>
          </View>
        )}
        {slots.map((slot, idx) => (
          <View key={`slot-${idx}`} style={styles.profileAgendaCard}>
            <View style={styles.profileAgendaCardHeader}>
              <View style={styles.profileAgendaDayRow}>
                <Text style={styles.profileAgendaDay}>
                  {translateDisplay(String(slot?.weekday || slot?.displayDay || '').trim()) || `${tr('profile_day', 'Dia')} ${idx + 1}`}
                </Text>
                {!!String(slot?.day || slot?.date || slot?.rawDay || '').trim() && (
                  <Text style={styles.profileAgendaDateInline}>
                    {translateDisplay(String(slot?.day || slot?.date || slot?.rawDay || '').trim())}
                  </Text>
                )}
              </View>
              <View style={styles.profileAgendaStatusBadge}>
                <Text style={styles.profileAgendaStatusText}>{tr('edit_available', 'Disponível')}</Text>
              </View>
            </View>
            <Text style={styles.profileAgendaTimes}>
              {Array.isArray(slot?.times) && slot.times.length
                ? slot.times.map((entry) => translateDisplay(entry)).join(' | ')
                : '-'}
            </Text>
          </View>
        ))}
        {!!reserveUrl && (
          <Pressable style={styles.profileAgendaReserveBtnWide} onPress={() => openExternalUrl(reserveUrl)}>
            <Ionicons name="calendar-clear-outline" size={14} color="#fff" />
            <Text style={styles.profileAgendaReserveText}>{tr('profile_book_now', 'Reservar agora')}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  function renderLocations() {
    const locations = Array.isArray(profileData.locations) ? profileData.locations : [];
    if (!locations.length) return renderEmpty(tr('profile_no_locations', 'Sem locais adicionados.'));
    return (
      <View style={styles.profileBlocksWrap}>
        {locations.map((loc, idx) => (
          <View key={`loc-${idx}`} style={styles.profileBlock}>
            {(() => {
              const mapData = buildLocationMapData(loc);
              const explicitLink = toOpenableUrl(loc?.link);
              const targetUrl = explicitLink || mapData.openUrl;
              return (
                <View style={styles.profileLocationRow}>
                  <View style={styles.profileLocationInfo}>
                    <Text style={styles.profileBlockTitle}>{translateUiOrRuntime(loc?.title || tr('profile_location', 'Local'))}</Text>
                    {!!loc?.address && <Text style={styles.profileListDescription}>{translateDisplay(loc.address)}</Text>}
                    {!!loc?.note && <Text style={styles.profileListDescription}>{translateDisplay(loc.note)}</Text>}
                  </View>
                  <Pressable
                    style={[styles.profileLocationMapBtn, !targetUrl && styles.profileLocationMapBtnDisabled]}
                    onPress={() => {
                      if (!targetUrl) return;
                      openExternalUrl(targetUrl);
                    }}
                  >
                    {mapData.previewSource ? (
                      <Image source={mapData.previewSource} style={styles.profileLocationMapThumb} />
                    ) : (
                      <View style={styles.profileLocationMapFallback}>
                        <Ionicons name="map-outline" size={16} color="#334155" />
                        <Text style={styles.profileLocationMapFallbackText}>{tr('profile_map', 'Mapa')}</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              );
            })()}
          </View>
        ))}
      </View>
    );
  }

  function renderPartners() {
    const partners = Array.isArray(profileData.partners) ? profileData.partners : [];
    if (!partners.length) return renderEmpty(tr('profile_no_partners', 'Sem parcerias adicionadas.'));
    return (
      <View style={styles.profilePartnersGrid}>
        {partners.map((partner, idx) => {
          const image = resolveMediaUri(partner?.image);
          return (
            <View key={`partner-${idx}`} style={styles.profilePartnerCard}>
              {image ? (
                <Image source={{ uri: image }} style={styles.profilePartnerImage} />
              ) : (
                <View style={styles.profilePartnerImagePlaceholder}>
                  <Ionicons name="people-outline" size={16} color="#64748b" />
                </View>
              )}
              <Text style={styles.profilePartnerName} numberOfLines={1}>{translateDisplay(partner?.name || tr('profile_partner', 'Parceiro'))}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  function renderPortfolio() {
    const sections = normalizeSections(profileData.portfolioSections, [], 'Portfolio')
      .filter((sec) => sec?.enabled !== false)
      .map((sec) => ({ ...sec, items: (Array.isArray(sec?.items) ? sec.items : []).filter((item) => item?.enabled !== false) }))
      .filter((sec) => sec.items.length);
    if (!sections.length) return renderEmpty(tr('profile_no_portfolio', 'Sem portfolio definido.'));
    const activeSection = sections.find((sec) => sec.id === portfolioSectionId) || sections[0];
    return (
      <View style={styles.profileBlocksWrap}>
        <View key={activeSection.id} style={styles.profileBlock}>
          <Text style={styles.profileBlockTitle}>{translateUiOrRuntime(activeSection.label)}</Text>
          {activeSection.items.map((item, idx) => {
            const image = resolveMediaUri(item?.image);
            const imageDisplay = getContentImageDisplayProps(image, item?.image);
            return (
              <Pressable
                key={`${activeSection.id}-${idx}`}
                style={styles.profileListItem}
                onPress={() => openPortfolioModal(item, translateUiOrRuntime(activeSection.label))}
              >
                {!!image && (
                  <Image
                    source={{ uri: image }}
                    style={[styles.profileProductThumb, imageDisplay.style]}
                    resizeMode={imageDisplay.resizeMode}
                  />
                )}
                <View style={styles.profileListBody}>
                  <Text style={styles.profileListTitle}>{translateDisplay(item?.name || tr('profile_project', 'Projeto'))}</Text>
                  {!!item?.description && <Text style={styles.profileListDescription}>{translateDisplay(item.description)}</Text>}
                  {!!item?.link && <Text style={styles.profileListMeta} numberOfLines={1}>{String(item.link)}</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  function renderCampaigns() {
    const direct = Array.isArray(profileData.campaigns) ? profileData.campaigns : [];
    const fromSections = Array.isArray(profileData.campaignSections)
      ? profileData.campaignSections.flatMap((sec) => (Array.isArray(sec?.items) ? sec.items : []))
      : [];
    const items = (direct.length ? direct : fromSections)
      .map((item) => ({
        title: String(item?.title || item?.name || '').trim(),
        badge: String(item?.badge || item?.tag || '').trim(),
        images: normalizeMediaList(item?.images),
        videos: normalizeMediaList(item?.videos),
        image: resolveMediaUri(item?.image),
        video: resolveMediaUri(item?.video || item?.videoUrl),
        enabled: !(
          item?.enabled === false ||
          item?.active === false ||
          String(item?.enabled || item?.active || '').trim().toLowerCase() === 'false'
        ),
      }))
      .map((item) => {
        const images = uniqueMediaList([
          ...normalizeMediaList(item?.images),
          ...normalizeMediaList(item?.image ? [item.image] : []),
        ]).map(resolveMediaUri).filter(Boolean);
        const videos = uniqueMediaList([
          ...normalizeMediaList(item?.videos),
          ...normalizeMediaList(item?.video ? [item.video] : []),
        ]).map(resolveMediaUri).filter(Boolean);
        return {
          ...item,
          images,
          videos,
          image: images[0] || '',
          video: videos[0] || '',
        };
      })
      .filter((item) => item.enabled !== false)
      .filter((item) => item.title || item.badge || item.image || item.video || item.images?.length || item.videos?.length);

    if (!items.length) return renderEmpty(tr('profile_no_campaigns', 'Sem campanhas definidas.'));

    return (
      <View style={styles.profileCampaignGrid}>
        {items.map((item, idx) => {
          const media = item.image || item.video;
          const isVideo = !item.image && isLikelyVideoUri(item.video);
          return (
            <Pressable
              key={`campaign-${idx}`}
              style={styles.profileCampaignCard}
              onPress={() => openCampaignModal(item)}
            >
              <View style={styles.profileCampaignMediaWrap}>
                {!!item.image && <Image source={{ uri: item.image }} style={styles.profileCampaignMedia} resizeMode="cover" />}
                {!item.image && !!item.video && (
                  <View style={styles.profileCampaignVideoTile}>
                    <Ionicons name="videocam" size={20} color="#fff" />
                    <Text style={styles.profileCampaignVideoText}>{tr('profile_video', 'Vídeo')}</Text>
                  </View>
                )}
                {!media && (
                  <View style={styles.profileCampaignVideoTile}>
                    <Ionicons name="image-outline" size={20} color="#fff" />
                  </View>
                )}
                {!!item.badge && (
                  <View style={styles.profileCampaignBadgeWrap}>
                    <Text style={styles.profileCampaignBadgeText} numberOfLines={1}>{translateDisplay(item.badge)}</Text>
                  </View>
                )}
                {isVideo && (
                  <View style={styles.profileCampaignPlayIcon}>
                    <Ionicons name="play" size={11} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.profileCampaignFooter}>
                <Text style={styles.profileCampaignTitle} numberOfLines={1}>
                  {translateDisplay(item.title) || `${tr('profile_campaign', 'Campanha')} ${idx + 1}`}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderLodging(kind) {
    const isHouses = kind === 'casas';
    const baseSections = isHouses
      ? normalizeSections(profileData.housesSections, profileData.houses, 'Casas')
      : normalizeSections(profileData.roomsSections, profileData.rooms, 'Quartos');
    const promoItems = baseSections.flatMap((sec) =>
      (Array.isArray(sec?.items) ? sec.items : []).filter((item) => {
        const promoEnabled = !!(item?.promoEnabled || item?.isPromo || item?.promo);
        const promoNowPrice = normalizePrice(item?.promoNowPrice || item?.newPrice || item?.priceNow || '');
        return promoEnabled && !!promoNowPrice;
      })
    );
    const sections = promoItems.length
      ? [{ id: `${kind}-promocoes`, label: 'Promoções', items: promoItems }, ...baseSections]
      : baseSections;
    if (!sections.length) return renderEmpty(isHouses ? tr('profile_no_houses', 'Sem casas definidas.') : tr('profile_no_rooms', 'Sem quartos definidos.'));
    const selectedSectionId = isHouses ? housesSectionId : roomsSectionId;
    const selectedItemIndex = isHouses ? housesItemIndex : roomsItemIndex;
    const selectedMediaIndex = isHouses ? housesMediaIndex : roomsMediaIndex;
    const setSelectedMediaIndex = isHouses ? setHousesMediaIndex : setRoomsMediaIndex;
    const amenitiesExpanded = isHouses ? housesAmenitiesExpanded : roomsAmenitiesExpanded;
    const setAmenitiesExpanded = isHouses ? setHousesAmenitiesExpanded : setRoomsAmenitiesExpanded;
    const activeSection = sections.find((sec) => sec.id === selectedSectionId) || sections[0];
    const items = Array.isArray(activeSection?.items) ? activeSection.items : [];
    if (!items.length) return renderEmpty(isHouses ? tr('profile_no_houses', 'Sem casas definidas.') : tr('profile_no_rooms', 'Sem quartos definidos.'));
    const safeItemIndex = Math.max(0, Math.min(selectedItemIndex, items.length - 1));
    const activeItem = items[safeItemIndex];
    const labelBase = isHouses ? 'Casa' : 'Quarto';
    const itemLabel = String(activeItem?.name || '').trim() || `${labelBase} ${safeItemIndex + 1}`;
    const lodgingShareKind = isHouses ? 'house' : 'room';
    const lodgingShareSectionLabel = translateUiOrRuntime(activeSection?.label || (isHouses ? 'Casas' : 'Quartos'));
    const lodgingImages = uniqueMediaList([
      ...normalizeMediaList(activeItem?.images),
      ...normalizeMediaList(activeItem?.gallery?.photos),
      ...normalizeMediaList(activeItem?.photos),
      ...normalizeMediaList(activeItem?.image),
      ...normalizeMediaList(profileData?.gallery?.photos),
      ...normalizeMediaList(profileData?.photos),
    ])
      .map(resolveMediaUri)
      .filter(Boolean)
      .slice(0, 20);
    const safeMediaIndex = Math.max(0, Math.min(selectedMediaIndex, Math.max(0, lodgingImages.length - 1)));
    const mainImage = lodgingImages[safeMediaIndex] || '';
    const mainImageDisplay = getContentImageDisplayProps(mainImage);
    const priceNight = normalizePrice(activeItem?.priceNight || '');
    const promoEnabled = !!(activeItem?.promoEnabled || activeItem?.isPromo || activeItem?.promo);
    const promoOldPrice = normalizePrice(activeItem?.promoOldPrice || activeItem?.oldPrice || activeItem?.priceBefore || '');
    const promoNowPrice = normalizePrice(activeItem?.promoNowPrice || activeItem?.newPrice || activeItem?.priceNow || '');
    const showPromo = promoEnabled && !!promoNowPrice;
    const priceHasNightSuffix = /noite/i.test(priceNight);
    const amenitiesList = Array.isArray(activeItem?.amenities)
      ? activeItem.amenities.map((entry) => String(entry || '').trim()).filter(Boolean)
      : String(activeItem?.amenities || '')
          .split(/[,\n;]+/g)
          .map((entry) => entry.trim())
          .filter(Boolean);
    const visibleAmenities = amenitiesExpanded ? amenitiesList : amenitiesList.slice(0, 8);
    const hasMoreAmenities = amenitiesList.length > visibleAmenities.length;
    const summaryItems = [
      { key: 'capacity', icon: 'people-outline', label: tr('edit_capacity', 'Capacidade'), value: String(activeItem?.capacity || '').trim() },
      { key: 'beds', icon: 'bed-outline', label: tr('edit_beds', 'Camas'), value: String(activeItem?.beds || '').trim() },
      { key: 'bathrooms', icon: 'water-outline', label: tr('edit_wc', 'WC'), value: String(activeItem?.bathrooms || '').trim() },
    ].filter((item) => item.value);
    const stayInfoItems = [
      { key: 'availability', icon: 'checkmark-circle-outline', label: tr('profile_availability', 'Disponibilidade'), value: String(activeItem?.availability || '').trim() },
      { key: 'checkIn', icon: 'log-in-outline', label: tr('profile_checkin', 'Check-in'), value: String(activeItem?.checkIn || '').trim() },
      { key: 'checkOut', icon: 'log-out-outline', label: tr('profile_checkout', 'Check-out'), value: String(activeItem?.checkOut || '').trim() },
    ].filter((item) => item.value);
    const rulesList = Array.isArray(activeItem?.houseRules)
      ? activeItem.houseRules.map((entry) => String(entry || '').trim()).filter(Boolean)
      : String(activeItem?.houseRules || '')
          .split(/[,\n;]+/g)
          .map((entry) => entry.trim())
          .filter(Boolean);
    const rulesText = rulesList.map((entry) => translateDisplay(entry)).join(' • ');
    return (
      <>
        <View style={styles.profileBlock}>
          <View style={styles.profileLodgingHeaderRow}>
            <Text style={styles.profileLodgingHeaderTitle} numberOfLines={1}>{itemLabel}</Text>
            <View style={styles.profileLodgingHeaderRight}>
              {showPromo ? (
                <View style={styles.profilePromoPriceRow}>
                  <Text style={styles.profilePromoBadge}>PROMO</Text>
                  <Text style={styles.profilePromoNowPrice}>{promoNowPrice}</Text>
                  {!!promoOldPrice && <Text style={styles.profilePromoOldPrice}>{promoOldPrice}</Text>}
                </View>
              ) : (
                !!priceNight && (
                <View style={styles.profileLodgingHeaderPriceBadge}>
                  <Ionicons name="pricetag-outline" size={11} color="#9a3412" />
                  <Text style={styles.profileLodgingHeaderPrice}>{priceNight}</Text>
                  {!priceHasNightSuffix && (
                    <Text style={styles.profileLodgingHeaderPriceSuffix}>/noite</Text>
                  )}
                </View>
                )
              )}
              {allowPrivateShare && (
                <Pressable
                  onPress={() => requestShareItemFromModal(lodgingShareKind, activeItem, lodgingShareSectionLabel)}
                  style={styles.profileLodgingShareBtn}
                >
                  <Ionicons name="paper-plane-outline" size={14} color="#0f172a" />
                </Pressable>
              )}
              {typeof onToggleSaveMedia === 'function' && (
                <Pressable
                  onPress={() => toggleSaveItem(lodgingShareKind, activeItem, lodgingShareSectionLabel)}
                  style={styles.profileLodgingShareBtn}
                >
                  <Ionicons
                    name={checkSavedItem(lodgingShareKind, activeItem, lodgingShareSectionLabel) ? 'bookmark' : 'bookmark-outline'}
                    size={14}
                    color="#0f172a"
                  />
                </Pressable>
              )}
            </View>
          </View>
          <View style={styles.profileLodgingMediaWrap}>
            {mainImage ? (
              <Pressable
                style={styles.profileLodgingImagePress}
                onPress={() => openGalleryModalWithItems(lodgingImages, safeMediaIndex)}
              >
                <Image
                  source={{ uri: mainImage }}
                  style={[styles.profileLodgingMainImage, mainImageDisplay.style]}
                  resizeMode={mainImageDisplay.resizeMode}
                />
              </Pressable>
            ) : (
              <View style={styles.profileLodgingImagePlaceholder}>
                <Ionicons name="image-outline" size={22} color="#64748b" />
              </View>
            )}
            {lodgingImages.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.profileLodgingThumbScroller}
              >
                {lodgingImages.map((uri, idx) => {
                  const active = idx === safeMediaIndex;
                  const thumbDisplay = getContentImageDisplayProps(uri);
                  return (
                    <Pressable
                      key={`lodging-image-thumb-${kind}-${safeItemIndex}-${idx}`}
                      style={[styles.profileLodgingThumbBtn, active && styles.profileLodgingThumbBtnActive]}
                      onPress={() => {
                        setSelectedMediaIndex(idx);
                      }}
                    >
                      <Image
                        source={{ uri }}
                        style={[styles.profileLodgingThumbImage, thumbDisplay.style]}
                        resizeMode={thumbDisplay.resizeMode}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
          <View style={styles.profileListBody}>
            {!!activeItem?.description && (
              <Text style={styles.profileLodgingDescription} numberOfLines={3}>
                {translateDisplay(activeItem.description)}
              </Text>
            )}
            {!!summaryItems.length && (
              <View style={styles.profileLodgingFactsCard}>
                {summaryItems.map((item) => (
                  <View key={`lodging-summary-${kind}-${item.key}`} style={styles.profileLodgingFactRow}>
                    <View style={styles.profileLodgingFactLeft}>
                      <Ionicons name={item.icon} size={14} color="#334155" />
                      <Text style={styles.profileLodgingFactLabel}>{item.label}</Text>
                    </View>
                    <Text
                      style={styles.profileLodgingFactValue}
                    >
                      {translateDisplay(item.value)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {!!stayInfoItems.length && (
              <View style={styles.profileLodgingFactsCard}>
                {stayInfoItems.map((item) => (
                  <View key={`lodging-stay-${kind}-${item.key}`} style={styles.profileLodgingFactRow}>
                    <View style={styles.profileLodgingFactLeft}>
                      <Ionicons name={item.icon} size={14} color="#334155" />
                      <Text style={styles.profileLodgingFactLabel}>{item.label}</Text>
                    </View>
                    <Text style={styles.profileLodgingFactValue}>{translateDisplay(item.value)}</Text>
                  </View>
                ))}
              </View>
            )}
            {!!rulesText && (
              <>
                <Text style={styles.profileLodgingSectionTitle}>{tr('edit_rules', 'Regras')}</Text>
                <Text style={styles.profileLodgingRulesText}>{rulesText}</Text>
              </>
            )}
            {!!amenitiesList.length && (
              <>
                <Text style={styles.profileLodgingSectionTitle}>{tr('edit_amenities', 'Comodidades')}</Text>
                <View style={styles.profileLodgingAmenitiesWrap}>
                  {visibleAmenities.map((item, idx) => (
                    <Text key={`lodging-amenity-${kind}-${idx}`} style={styles.profileLodgingAmenityChip}>
                      {translateDisplay(item)}
                    </Text>
                  ))}
                </View>
                {(hasMoreAmenities || amenitiesExpanded) && (
                  <Pressable
                    style={styles.profileLodgingMoreBtn}
                    onPress={() => setAmenitiesExpanded((prev) => !prev)}
                  >
                    <Text style={styles.profileLodgingMoreText}>
                      {amenitiesExpanded ? tr('profile_show_less', 'Ver menos') : `${tr('profile_show_more', 'Ver mais')} (${amenitiesList.length})`}
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </>
    );
  }

  function renderStickySubtabs() {
    if (!activeTab) return null;
    const type = String(activeTab?.type || 'sobre').toLowerCase();

    if (type === 'galeria' || type === 'fotos') {
      const hasGallery = photoUrls.length || videoUrls.length;
      if (!hasGallery) return null;
      return (
        <ScrollView
          horizontal
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.profileSectionTabsScroller}
        >
          {[
            { key: 'photos', label: tr('profile_tab_photos', 'Fotos') },
            { key: 'videos', label: tr('profile_tab_videos', 'Vídeos') },
          ].map((tab) => {
            const active = galleryView === tab.key;
            return (
              <Pressable
                key={`gallery-sticky-${tab.key}`}
                style={[
                  styles.profileGallerySubtabBtn,
                  active && styles.profileGallerySubtabBtnActive,
                ]}
                onPress={() => {
                  setGalleryView(tab.key);
                  keepStickyOnSwitch();
                }}
              >
                <Text
                  style={[
                    styles.profileGallerySubtabText,
                    active && styles.profileGallerySubtabTextActive,
                  ]}
                >
                  {translateUiOrRuntime(tab.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      );
    }

    if (type === 'servicos') {
      const baseSections = normalizeSections(profileData.servicesSections, profileData.services, 'Serviços')
        .filter((sec) => sec?.enabled !== false)
        .map((sec) => ({ ...sec, items: (Array.isArray(sec?.items) ? sec.items : []).filter((item) => item?.enabled !== false) }))
        .filter((sec) => sec.items.length);
      if (!baseSections.length) return null;
      const promoItems = baseSections.flatMap((sec) =>
        (Array.isArray(sec?.items) ? sec.items : []).filter((item) => {
          const promoEnabled = !!(item?.promoEnabled || item?.isPromo || item?.promo);
          const promoNowPrice = normalizePrice(item?.promoNowPrice || item?.newPrice || item?.priceNow || '');
          return promoEnabled && !!promoNowPrice;
        })
      );
      const sections = promoItems.length
        ? [{ id: 'services-promocoes', label: 'Promoções', items: promoItems }, ...baseSections]
        : baseSections;
      if (sections.length <= 1) return null;
      const activeSection = sections.find((sec) => sec.id === servicesSectionId) || sections[0];
      return (
        <ScrollView
          horizontal
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.profileSectionTabsScroller}
        >
          {sections.map((sec) => {
            const active = sec.id === activeSection.id;
            const isPromoSection = /-promocoes$/.test(String(sec.id || ''));
            return (
              <Pressable
                key={`svc-sticky-tab-${sec.id}`}
                style={[
                  styles.profileGallerySubtabBtn,
                  isPromoSection && styles.profileGallerySubtabBtnPromo,
                  active && styles.profileGallerySubtabBtnActive,
                  active && isPromoSection && styles.profileGallerySubtabBtnPromoActive,
                ]}
                onPress={() => {
                  setServicesSectionId(sec.id);
                  keepStickyOnSwitch();
                }}
              >
                <Text
                  style={[
                    styles.profileGallerySubtabText,
                    isPromoSection && styles.profileGallerySubtabTextPromo,
                    active && styles.profileGallerySubtabTextActive,
                    active && isPromoSection && styles.profileGallerySubtabTextPromoActive,
                  ]}
                  numberOfLines={1}
                >
                  {translateUiOrRuntime(sec.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      );
    }

    if (type === 'menu' || type === 'produtos') {
      const isProducts = type === 'produtos';
      const isMenu = type === 'menu';
      const baseSections = (isProducts
        ? normalizeSections(profileData.productsSections, profileData.products, 'Produtos')
        : normalizeSections(profileData.menuSections, profileData.menu, 'Menu'))
        .filter((sec) => sec?.enabled !== false)
        .map((sec) => ({ ...sec, items: (Array.isArray(sec?.items) ? sec.items : []).filter((item) => item?.enabled !== false) }))
        .filter((sec) => sec.items.length);
      if (!baseSections.length) return null;
      const promoItems = (isProducts || isMenu)
        ? baseSections.flatMap((sec) =>
            (Array.isArray(sec?.items) ? sec.items : []).filter((item) => {
              const promoEnabled = !!(item?.promoEnabled || item?.isPromo || item?.promo);
              const promoNowPrice = normalizePrice(item?.promoNowPrice || item?.newPrice || item?.priceNow || '');
              return promoEnabled && !!promoNowPrice;
            })
          )
        : [];
      const promoSectionId = isProducts ? 'products-promocoes' : 'menu-promocoes';
      const sections = (isProducts || isMenu) && promoItems.length
        ? [{ id: promoSectionId, label: 'Promoções', items: promoItems }, ...baseSections]
        : baseSections;
      if (sections.length <= 1) return null;
      const selectedId = isProducts ? productsSectionId : menuSectionId;
      const setSelectedId = isProducts ? setProductsSectionId : setMenuSectionId;
      const activeSection = sections.find((sec) => sec.id === selectedId) || sections[0];
      return (
        <ScrollView
          horizontal
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.profileSectionTabsScroller}
        >
          {sections.map((sec) => {
            const active = sec.id === activeSection.id;
            const isPromoSection = /-promocoes$/.test(String(sec.id || ''));
            return (
              <Pressable
                key={`sticky-sec-tab-${sec.id}`}
                style={[
                  styles.profileGallerySubtabBtn,
                  isPromoSection && styles.profileGallerySubtabBtnPromo,
                  active && styles.profileGallerySubtabBtnActive,
                  active && isPromoSection && styles.profileGallerySubtabBtnPromoActive,
                ]}
                onPress={() => {
                  setSelectedId(sec.id);
                  keepStickyOnSwitch();
                }}
              >
                <Text
                  style={[
                    styles.profileGallerySubtabText,
                    isPromoSection && styles.profileGallerySubtabTextPromo,
                    active && styles.profileGallerySubtabTextActive,
                    active && isPromoSection && styles.profileGallerySubtabTextPromoActive,
                  ]}
                  numberOfLines={1}
                >
                  {translateUiOrRuntime(sec.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      );
    }

    if (type === 'portfolio' || type === 'portofolio') {
      const sections = normalizeSections(profileData.portfolioSections, [], 'Portfolio')
        .filter((sec) => sec?.enabled !== false)
        .map((sec) => ({ ...sec, items: (Array.isArray(sec?.items) ? sec.items : []).filter((item) => item?.enabled !== false) }))
        .filter((sec) => sec.items.length);
      if (sections.length <= 1) return null;
      const activeSection = sections.find((sec) => sec.id === portfolioSectionId) || sections[0];
      return (
        <ScrollView
          horizontal
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.profileSectionTabsScroller}
        >
          {sections.map((sec) => {
            const active = sec.id === activeSection.id;
            return (
              <Pressable
                key={`portfolio-sticky-sec-${sec.id}`}
                style={[
                  styles.profileGallerySubtabBtn,
                  active && styles.profileGallerySubtabBtnActive,
                ]}
                onPress={() => {
                  setPortfolioSectionId(sec.id);
                  keepStickyOnSwitch();
                }}
              >
                <Text
                  style={[
                    styles.profileGallerySubtabText,
                    active && styles.profileGallerySubtabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {translateUiOrRuntime(sec.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      );
    }

    if (type === 'casas' || type === 'quartos') {
      const isHouses = type === 'casas';
      const baseSections = isHouses
        ? normalizeSections(profileData.housesSections, profileData.houses, 'Casas')
        : normalizeSections(profileData.roomsSections, profileData.rooms, 'Quartos');
      const promoItems = baseSections.flatMap((sec) =>
        (Array.isArray(sec?.items) ? sec.items : []).filter((item) => {
          const promoEnabled = !!(item?.promoEnabled || item?.isPromo || item?.promo);
          const promoNowPrice = normalizePrice(item?.promoNowPrice || item?.newPrice || item?.priceNow || '');
          return promoEnabled && !!promoNowPrice;
        })
      );
      const sections = promoItems.length
        ? [{ id: `${type}-promocoes`, label: 'Promoções', items: promoItems }, ...baseSections]
        : baseSections;
      if (!sections.length) return null;
      const selectedSectionId = isHouses ? housesSectionId : roomsSectionId;
      const setSelectedSectionId = isHouses ? setHousesSectionId : setRoomsSectionId;
      const selectedItemIndex = isHouses ? housesItemIndex : roomsItemIndex;
      const setSelectedItemIndex = isHouses ? setHousesItemIndex : setRoomsItemIndex;
      const setSelectedMediaIndex = isHouses ? setHousesMediaIndex : setRoomsMediaIndex;
      const setAmenitiesExpanded = isHouses ? setHousesAmenitiesExpanded : setRoomsAmenitiesExpanded;
      const activeSection = sections.find((sec) => sec.id === selectedSectionId) || sections[0];
      const items = Array.isArray(activeSection?.items) ? activeSection.items : [];
      const safeItemIndex = Math.max(0, Math.min(selectedItemIndex, Math.max(0, items.length - 1)));
      const labelBase = isHouses ? 'Casa' : 'Quarto';
      return (
        <>
          {sections.length > 1 && (
            <ScrollView
              horizontal
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.profileSectionTabsScroller}
            >
              {sections.map((sec) => {
                const active = sec.id === activeSection.id;
                const isPromoSection = /-promocoes$/.test(String(sec.id || ''));
                return (
                  <Pressable
                    key={`lodging-sticky-sec-${type}-${sec.id}`}
                    style={[
                      styles.profileGallerySubtabBtn,
                      isPromoSection && styles.profileGallerySubtabBtnPromo,
                      active && styles.profileGallerySubtabBtnActive,
                      active && isPromoSection && styles.profileGallerySubtabBtnPromoActive,
                    ]}
                    onPress={() => {
                      setSelectedSectionId(sec.id);
                      setSelectedItemIndex(0);
                      setSelectedMediaIndex(0);
                      setAmenitiesExpanded(false);
                      keepStickyOnSwitch();
                    }}
                  >
                    <Text
                      style={[
                        styles.profileGallerySubtabText,
                        isPromoSection && styles.profileGallerySubtabTextPromo,
                        active && styles.profileGallerySubtabTextActive,
                        active && isPromoSection && styles.profileGallerySubtabTextPromoActive,
                      ]}
                      numberOfLines={1}
                    >
                      {translateUiOrRuntime(sec.label)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {items.length > 1 && (
            <ScrollView
              horizontal
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.profileSectionTabsScroller}
            >
              {items.map((item, idx) => {
                const active = idx === safeItemIndex;
                const label = String(item?.name || '').trim() || `${labelBase} ${idx + 1}`;
                return (
                  <Pressable
                    key={`lodging-sticky-item-${type}-${idx}`}
                    style={[styles.profileGallerySubtabBtn, active && styles.profileGallerySubtabBtnActive]}
                    onPress={() => {
                      setSelectedItemIndex(idx);
                      setSelectedMediaIndex(0);
                      setAmenitiesExpanded(false);
                      keepStickyOnSwitch();
                    }}
                  >
                    <Text style={[styles.profileGallerySubtabText, active && styles.profileGallerySubtabTextActive]} numberOfLines={1}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </>
      );
    }

    return null;
  }

  function renderTabContent() {
    if (!activeTab) return renderEmpty(tr('edit_no_active_tabs', 'Sem abas ativas.'));
    const type = String(activeTab?.type || 'sobre').toLowerCase();
    if (type === 'sobre') {
      if (!aboutRaw) {
        return (
          <View style={styles.profileAboutCard}>
            <Text style={styles.profileAbout}>{tr('profile_no_description_yet', 'Sem descrição ainda.')}</Text>
          </View>
        );
      }
      return (
        <View style={styles.profileAboutCard}>
          <View style={styles.profileAboutWebWrap}>
            <WebView
              originWhitelist={['*']}
              source={{ html: aboutHtmlPage }}
              style={[styles.profileAboutWebView, { height: Math.max(92, aboutWebHeight) }]}
              scrollEnabled={false}
              nestedScrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              automaticallyAdjustContentInsets={false}
              onMessage={(event) => {
                const nextHeight = Number(event?.nativeEvent?.data || 0);
                if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
                setAboutWebHeight((prev) => {
                  const normalized = Math.max(92, Math.min(1100, Math.round(nextHeight + 8)));
                  return Math.abs(normalized - prev) > 2 ? normalized : prev;
                });
              }}
            />
          </View>
        </View>
      );
    }
    if (type === 'galeria' || type === 'fotos') {
      const hasGallery = photoUrls.length || videoUrls.length;
      if (!hasGallery) return renderEmpty(tr('profile_no_gallery_items', 'Sem fotos ou vídeos.'));
      const isPhotos = galleryView === 'photos';
      const isVideos = galleryView === 'videos';
      const currentItems = isPhotos ? photoUrls : videoUrls;
      const visibleItems = currentItems.slice(0, 24);
      const fillCount = visibleItems.length % 3 === 0 ? 0 : 3 - (visibleItems.length % 3);
      const gridItems = fillCount ? [...visibleItems, ...Array(fillCount).fill(null)] : visibleItems;
      const currentLabel = isPhotos ? 'fotos' : 'videos';
      return (
        <>
          {!currentItems.length ? (
            renderEmpty(`${tr('profile_no', 'Sem')} ${translateUiOrRuntime(currentLabel)}.`)
          ) : (
            <View style={[styles.profileMediaGrid, isPhotos && styles.profileMediaGridPhotos]}>
              {isPhotos
                ? gridItems.map((url, idx) => {
                    if (!url) {
                      return <View key={`photo-pad-${idx}`} style={[styles.profileMediaCardWrap, styles.profileMediaGridPad]} />;
                    }
                    const key = `photo-${idx}`;
                    const failed = !!photoErrorMap[url];
                    return (
                      <View key={key} style={styles.profileMediaCardWrap}>
                        <Pressable style={styles.profileMediaPhotoTile} onPress={() => openGalleryModal('photos', idx)}>
                          <View style={styles.profileMediaPhotoFallback}>
                            <Ionicons name="image-outline" size={18} color="#334155" />
                            <Text style={styles.profileMediaTileText} numberOfLines={1}>{`Foto ${idx + 1}`}</Text>
                          </View>
                          {!failed && (
                            <Image
                              source={{ uri: url }}
                              style={styles.profileMediaPhotoImage}
                              onError={() =>
                                setPhotoErrorMap((prev) => ({
                                  ...prev,
                                  [url]: true,
                                }))
                              }
                            />
                          )}
                        </Pressable>
                        {renderGalleryGridActions('photo', url)}
                      </View>
                    );
                  })
                : gridItems.map((url, idx) => {
                    if (!url) {
                      return <View key={`${currentLabel}-pad-${idx}`} style={[styles.profileMediaCardWrap, styles.profileMediaGridPad]} />;
                    }
                    return (
                    <View key={`${currentLabel}-${idx}`} style={styles.profileMediaCardWrap}>
                      <Pressable
                        style={[
                          styles.profileMediaTile,
                          styles.profileMediaVideoTile,
                        ]}
                        onPress={() => openGalleryModal('videos', idx)}
                      >
                        <View
                          style={[
                            styles.profileMediaTypeBadge,
                            styles.profileMediaTypeBadgeVideo,
                          ]}
                        >
                          <Text style={styles.profileMediaTypeBadgeText}>VIDEO</Text>
                        </View>
                        <Ionicons name="videocam" size={24} color="#fff" />
                        <Text style={styles.profileMediaTileTextLight} numberOfLines={1}>
                          {`Video ${idx + 1}`}
                        </Text>
                      </Pressable>
                      {renderGalleryGridActions('video', url)}
                    </View>
                    );
                  })}
            </View>
          )}
        </>
      );
    }
    if (type === 'servicos') return renderServices();
    if (type === 'menu') return renderMenuOrProducts('menu');
    if (type === 'produtos') return renderMenuOrProducts('produtos');
    if (type === 'campanhas' || type === 'campanha') return renderCampaigns();
    if (type === 'horario') return renderSchedule();
    if (type === 'agenda') return renderAgenda();
    if (type === 'locais') return renderLocations();
    if (type === 'parcerias') return renderPartners();
    if (type === 'portfolio' || type === 'portofolio') return renderPortfolio();
    if (type === 'casas' || type === 'quartos') return renderLodging(type);

    if (!infoItems.length) return renderEmpty(tr('profile_no_content_tab', 'Sem conteúdo nesta aba.'));
    return (
      <View style={styles.profileInfoList}>
        {infoItems.map((item, idx) => (
          <View key={`info-${idx}`} style={styles.profileInfoItem}>
            <Ionicons name={item.icon} size={14} color="#334155" />
            <Text style={styles.profileInfoText} numberOfLines={1}>{item.text}</Text>
          </View>
        ))}
      </View>
    );
  }

  const currentModalMedia = getCurrentModalMedia();
  const productModalImages = getModalImageList(productModalItem);
  const safeProductModalImageIndex = productModalImages.length
    ? Math.max(0, Math.min(productModalImageIndex, productModalImages.length - 1))
    : 0;
  const productModalImageEnabled = toBoolLike(
    productModalItem?.modalImageEnabled ?? productModalItem?.showImageInModal,
    productModalImages.length > 0
  );
  const productModalPrice = normalizePrice(productModalItem?.price || '');
  const productModalPromoEnabled = !!(productModalItem?.promoEnabled || productModalItem?.isPromo || productModalItem?.promo);
  const productModalPromoOldPrice = normalizePrice(
    productModalItem?.promoOldPrice || productModalItem?.oldPrice || productModalItem?.priceBefore || ''
  );
  const productModalPromoNowPrice = normalizePrice(
    productModalItem?.promoNowPrice || productModalItem?.newPrice || productModalItem?.priceNow || ''
  );
  const productModalShowPromo = productModalPromoEnabled && !!productModalPromoNowPrice;
  const productModalLongDescription = String(
    productModalItem?.fullDescription ||
    productModalItem?.description ||
    productModalItem?.shortDescription ||
    ''
  ).trim();
  const productModalMetaRows = (() => {
    const item = productModalItem && typeof productModalItem === 'object' ? productModalItem : {};
    const rows = [];
    const pushRow = (label, value) => {
      const text = String(value ?? '').trim();
      if (!text) return;
      rows.push({ label: translateUiOrRuntime(label), value: translateDisplay(text) });
    };

    pushRow('SKU', item.sku);
    if (String(item.stock || '').trim()) {
      pushRow('Stock', String(item.stock).toLowerCase() === 'out' ? 'Esgotado' : 'Em stock');
    }
    pushRow('Tamanho', item.size);
    pushRow('Como usar', item.usage);
    pushRow('Materiais', item.ingredients);
    normalizeExtraFields(item.extraFields || item.attributes || item.specs).forEach((field) => {
      const label = String(field.label || '').trim() || 'Detalhe';
      const value = String(field.value || '').trim();
      const description = String(field.description || '').trim();
      const composed = [value, description].filter(Boolean).join(' — ');
      if (!composed) return;
      pushRow(label, composed);
    });

    const knownKeys = new Set([
      'name', 'image', 'price', 'promoEnabled', 'promoOldPrice', 'promoNowPrice',
      'description', 'shortDescription', 'fullDescription', 'usage', 'ingredients',
      'size', 'sku', 'stock', 'enabled', 'active', 'modalImageEnabled', 'showImageInModal',
      'extraFields', 'attributes', 'specs',
    ]);
    Object.keys(item).forEach((key) => {
      if (knownKeys.has(key)) return;
      const raw = item[key];
      if (raw === null || raw === undefined) return;
      if (typeof raw === 'object') return;
      const value = String(raw).trim();
      if (!value) return;
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const finalLabel = label.charAt(0).toUpperCase() + label.slice(1);
      rows.push({ label: finalLabel, value });
    });

    return rows;
  })();
  const portfolioModalImages = getModalImageList(portfolioModalItem);
  const safePortfolioModalImageIndex = portfolioModalImages.length
    ? Math.max(0, Math.min(portfolioModalImageIndex, portfolioModalImages.length - 1))
    : 0;
  const portfolioModalName = String(portfolioModalItem?.name || tr('profile_project', 'Projeto')).trim();
  const portfolioModalDescription = String(
    portfolioModalItem?.fullDescription ||
    portfolioModalItem?.description ||
    portfolioModalItem?.shortDescription ||
    ''
  ).trim();
  const portfolioModalLink = toOpenableUrl(portfolioModalItem?.link);
  const portfolioModalMetaRows = (() => {
    const item = portfolioModalItem && typeof portfolioModalItem === 'object' ? portfolioModalItem : {};
    const rows = [];
    const pushRow = (label, value) => {
      const text = String(value ?? '').trim();
      if (!text) return;
      rows.push({ label: translateUiOrRuntime(label), value: translateDisplay(text) });
    };
    normalizeExtraFields(item.extraFields || item.attributes || item.specs).forEach((field) => {
      const label = String(field.label || '').trim() || 'Detalhe';
      const value = String(field.value || '').trim();
      const description = String(field.description || '').trim();
      const composed = [value, description].filter(Boolean).join(' — ');
      if (!composed) return;
      pushRow(label, composed);
    });
    return rows;
  })();
  const serviceModalName = String(
    serviceModalItem?.description || serviceModalItem?.name || tr('edit_service', 'Serviço')
  ).trim();
  const serviceModalImages = getModalImageList(serviceModalItem);
  const safeServiceModalImageIndex = serviceModalImages.length
    ? Math.max(0, Math.min(serviceModalImageIndex, serviceModalImages.length - 1))
    : 0;
  const serviceModalImageEnabled = toBoolLike(
    serviceModalItem?.modalImageEnabled ?? serviceModalItem?.showImageInModal,
    serviceModalImages.length > 0
  );
  const serviceModalTime = String(serviceModalItem?.time || '').trim();
  const serviceModalPrice = normalizePrice(serviceModalItem?.price || '');
  const serviceModalIsBudget =
    String(serviceModalItem?.priceMode || serviceModalItem?.budgetMode || '').trim().toLowerCase() === 'budget' ||
    serviceModalItem?.isBudget === true ||
    serviceModalItem?.quoteOnly === true;
  const serviceModalPromoEnabled = !!(serviceModalItem?.promoEnabled || serviceModalItem?.isPromo || serviceModalItem?.promo);
  const serviceModalPromoOldPrice = normalizePrice(
    serviceModalItem?.promoOldPrice || serviceModalItem?.oldPrice || serviceModalItem?.priceBefore || ''
  );
  const serviceModalPromoNowPrice = normalizePrice(
    serviceModalItem?.promoNowPrice || serviceModalItem?.newPrice || serviceModalItem?.priceNow || ''
  );
  const serviceModalShowPromo = !serviceModalIsBudget && serviceModalPromoEnabled && !!serviceModalPromoNowPrice;
  const serviceModalTypeLabel = serviceTypeToLabel(serviceModalItem?.serviceType || serviceModalItem?.type);
  const serviceModalExtra1 = translateDisplay(String(serviceModalItem?.extra1 || serviceModalItem?.detail1 || '').trim());
  const serviceModalExtra2 = translateDisplay(String(serviceModalItem?.extra2 || serviceModalItem?.detail2 || '').trim());
  const serviceModalNote = translateDisplay(String(serviceModalItem?.note || serviceModalItem?.notes || '').trim());
  const serviceModalMetaRows = (() => {
    const item = serviceModalItem && typeof serviceModalItem === 'object' ? serviceModalItem : {};
    const rows = [];
    const pushRow = (label, value) => {
      const text = String(value ?? '').trim();
      if (!text) return;
      rows.push({ label: translateUiOrRuntime(label), value: translateDisplay(text) });
    };
    if (serviceModalTypeLabel && serviceModalTypeLabel.toLowerCase() !== 'geral') {
      pushRow('Tipo', serviceModalTypeLabel);
    }
    pushRow('Detalhe 1', serviceModalExtra1);
    pushRow('Detalhe 2', serviceModalExtra2);
    pushRow('Descrição', serviceModalNote);
    normalizeExtraFields(item.extraFields || item.attributes || item.specs).forEach((field) => {
      const label = String(field.label || '').trim() || 'Detalhe';
      const value = String(field.value || '').trim();
      const description = String(field.description || '').trim();
      const composed = [value, description].filter(Boolean).join(' — ');
      if (!composed) return;
      pushRow(label, composed);
    });
    return rows;
  })();
  const campaignModalVideos = normalizeMediaList(campaignModalItem?.videos).map(resolveMediaUri).filter(Boolean);
  const safeCampaignModalVideoIndex = campaignModalVideos.length
    ? Math.max(0, Math.min(campaignModalVideoIndex, campaignModalVideos.length - 1))
    : 0;
  const campaignModalVideoUri = campaignModalVideos[safeCampaignModalVideoIndex] || '';
  const currentModalLegend = (() => {
    if (!currentModalMedia) return '';
    const total = Math.max(1, activeGalleryItems.length);
    const position = Math.max(1, Math.min(galleryModalIndex + 1, total));
    const label =
      galleryModalType === 'videos'
        ? 'Video'
        : 'Foto';
    return `${label} ${position}/${total}`;
  })();
  const stickySubtabs = renderStickySubtabs();
  const hasTopActions = typeof onBackPress === 'function' || allowPrivateShare || canEdit;
  const keepStickyOnSwitch = useCallback(() => {
    const anchor = Math.max(0, Number(stickyAnchorYRef.current || 0));
    if (profileScrollYRef.current + 1 < anchor) return;
    if (!stickyLockRef.current) {
      stickyLockRef.current = true;
      setStickyLockActive(true);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        profileScrollRef.current?.scrollTo({ y: anchor, animated: false });
      });
    });
  }, []);
  const stickyPanelMinHeight = !stickyLockActive || !profileViewportHeight || !stickyWrapHeight
    ? 0
    : Math.max(0, profileViewportHeight - stickyWrapHeight + 8);

  return (
    <>
      <ScrollView
        ref={profileScrollRef}
        style={styles.profileContentScroll}
        contentContainerStyle={styles.profileScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickyHeaderIndices={[1]}
        scrollEventThrottle={16}
        onLayout={(event) => {
          const h = Math.max(0, Number(event?.nativeEvent?.layout?.height || 0));
          setProfileViewportHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
        }}
        onScroll={(event) => {
          const y = Number(event?.nativeEvent?.contentOffset?.y || 0);
          profileScrollYRef.current = y;
          const anchor = Math.max(0, Number(stickyAnchorYRef.current || 0));
          if (stickyLockRef.current && y + 1 < anchor) {
            stickyLockRef.current = false;
            setStickyLockActive(false);
          }
        }}
      >
        <View style={styles.profileCard}>
          {typeof onBackPress === 'function' && (
            <Pressable style={styles.profileBackBtn} onPress={onBackPress}>
              <Ionicons name="chevron-back" size={15} color="#0f172a" />
            </Pressable>
          )}
          {allowPrivateShare && (
            <Pressable style={[styles.profileShareBtn, canEdit && styles.profileShareBtnWithMenu]} onPress={requestShareProfile}>
              <Ionicons name="paper-plane-outline" size={14} color="#0f172a" />
            </Pressable>
          )}
          {canEdit && (
            <Pressable style={styles.profileMoreBtn} onPress={onEditPress}>
              <Ionicons name="ellipsis-vertical" size={15} color="#0f172a" />
            </Pressable>
          )}
          <View style={[styles.profileAvatarWrap, hasTopActions && styles.profileAvatarWrapWithTopActions]}>
            <View style={styles.profileAvatarStoryWrap}>
              <Pressable
                style={[styles.profileStoryAvatarPress, storyUrls.length > 0 && styles.profileStoryAvatarPressActive]}
                onPress={handleAvatarPress}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.profileAvatarImage} />
                ) : (
                  <View style={styles.profileAvatar}>
                    <Ionicons name="person" size={30} color="#64748b" />
                  </View>
                )}
              </Pressable>
              {canEdit && (
                <Pressable style={styles.profileStoryAddBtn} onPress={handleAddStoryPress} disabled={storyBusy}>
                  {storyBusy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="add" size={10} color="#fff" />
                  )}
                </Pressable>
              )}
            </View>
          </View>
          <View style={styles.profileBody}>
            {isTextBadge && !!badgeText && (
              <View style={styles.profileBadgeRow}>
                <Text
                  style={[
                    styles.profileBadge,
                    profile?.badge === 'promo'
                      ? styles.profileBadgePromo
                      : profile?.badge === 'novo'
                      ? styles.profileBadgeNovo
                      : styles.profileBadgeVerif,
                  ]}
                >
                  {badgeText}
                </Text>
              </View>
            )}

            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{profile.name}</Text>
              {isVerifiedBadge && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="#2563eb"
                  style={styles.profileVerifiedIcon}
                />
              )}
            </View>
            <Text style={styles.profileMetaRole}>{profile.category}</Text>

            <View style={styles.profileMetaRow}>
              <View style={styles.profileMetaPill}>
                <Ionicons name="location-outline" size={14} color="#334155" />
                <Text style={styles.profileMetaPillText}>{profile.location}</Text>
              </View>
              <Pressable style={styles.profileMetaPill} onPress={openReviewsModal}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.profileMetaPillText}>{profile.rating}</Text>
              </Pressable>
            </View>

            {!!socialItems.length && (
              <View style={styles.profileSocialRow}>
                {socialItems.map((item, idx) => (
                  <Pressable
                    key={`social-${idx}`}
                    style={styles.profileSocialBtn}
                    onPress={() => openExternalUrl(item.url)}
                  >
                    {renderSocialIcon(item)}
                  </Pressable>
                ))}
              </View>
            )}

            {!!socialItems.length && <View style={styles.profileTopDivider} />}
          </View>
        </View>

        <View
          style={styles.profileTabsStickyWrap}
          onLayout={(event) => {
            stickyAnchorYRef.current = Math.max(0, Number(event?.nativeEvent?.layout?.y || 0));
            const h = Math.max(0, Number(event?.nativeEvent?.layout?.height || 0));
            setStickyWrapHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
          }}
        >
          <ScrollView
            horizontal
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.profileTabsScroll}
          >
            {tabs.map((tab) => (
              <Pressable
                key={tab.id}
                style={[styles.profileTabBtn, activeTabId === tab.id && styles.profileTabBtnActive]}
                onPress={() => {
                  setActiveTabId(tab.id);
                  keepStickyOnSwitch();
                }}
              >
                <Text style={[styles.profileTabText, activeTabId === tab.id && styles.profileTabTextActive]}>
                  {translateUiOrRuntime(tab.label)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {!!stickySubtabs && (
            <View style={styles.profileSubtabsStickyWrap}>
              {stickySubtabs}
            </View>
          )}
        </View>

        <View style={[styles.profileTabPanel, stickyPanelMinHeight ? { minHeight: stickyPanelMinHeight } : null]}>
          {renderTabContent()}
        </View>
      </ScrollView>
    {productModalOpen && (
    <Modal visible={productModalOpen} transparent animationType="fade" onRequestClose={closeProductModal}>
      <View style={styles.storyModalBackdrop}>
        <Pressable style={styles.shareModalBackdropFill} onPress={closeProductModal} />
        <View style={styles.productModalPanel}>
          <View style={styles.productModalHeader}>
            <View>
              {!!productModalSectionLabel && (
                <Text style={styles.productModalSectionText}>{productModalSectionLabel}</Text>
              )}
              <Text style={styles.productModalTitleText} numberOfLines={2}>
                {String(productModalItem?.name || (productModalKind === 'menu' ? tr('profile_menu_item', 'Item do menu') : tr('profile_product', 'Produto')))}
              </Text>
            </View>
            <View style={styles.productModalHeaderActions}>
              {!!allowPrivateShare && (
                <Pressable
                  onPress={() =>
                    requestShareItemFromOverlay(
                      productModalKind === 'menu' ? 'menu' : 'product',
                      productModalItem,
                      productModalSectionLabel,
                      closeProductModal
                    )
                  }
                  style={styles.productModalHeaderIconBtn}
                >
                  <Ionicons name="paper-plane-outline" size={14} color="#0f172a" />
                </Pressable>
              )}
              {typeof onToggleSaveMedia === 'function' && (
                <Pressable
                  onPress={() =>
                    toggleSaveItem(
                      productModalKind === 'menu' ? 'menu' : 'product',
                      productModalItem,
                      productModalSectionLabel
                    )
                  }
                  style={styles.productModalHeaderIconBtn}
                >
                  <Ionicons
                    name={
                      checkSavedItem(
                        productModalKind === 'menu' ? 'menu' : 'product',
                        productModalItem,
                        productModalSectionLabel
                      )
                        ? 'bookmark'
                        : 'bookmark-outline'
                    }
                    size={14}
                    color="#0f172a"
                  />
                </Pressable>
              )}
              <Pressable onPress={closeProductModal} style={styles.productModalCloseBtn}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
          {productModalImageEnabled && (
            <View
              style={styles.productModalImageWrap}
              onLayout={(event) => {
                const width = Math.max(0, Number(event?.nativeEvent?.layout?.width || 0));
                if (Math.abs(width - contentModalViewportWidth) > 1) setContentModalViewportWidth(width);
              }}
            >
              {!!productModalImages.length ? (
                <>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(event) => {
                      const pageWidth = contentModalViewportWidth || Number(event?.nativeEvent?.layoutMeasurement?.width || 1);
                      const x = Number(event?.nativeEvent?.contentOffset?.x || 0);
                      const next = Math.max(0, Math.min(productModalImages.length - 1, Math.round(x / Math.max(1, pageWidth))));
                      if (next !== safeProductModalImageIndex) setProductModalImageIndex(next);
                    }}
                  >
                    {productModalImages.map((img, idx) => (
                      <View
                        key={`product-modal-image-${idx}`}
                        style={[styles.productModalImagePage, contentModalViewportWidth ? { width: contentModalViewportWidth } : null]}
                      >
                        <Image source={{ uri: img }} style={styles.productModalImage} resizeMode="cover" />
                      </View>
                    ))}
                  </ScrollView>
                  {productModalImages.length > 1 && (
                    <View style={styles.productModalImageIndicatorsWrap} pointerEvents="none">
                      {productModalImages.map((_, idx) => (
                        <View
                          key={`product-indicator-${idx}`}
                          style={[
                            styles.productModalImageIndicator,
                            idx === safeProductModalImageIndex && styles.productModalImageIndicatorActive,
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </>
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
              {productModalShowPromo ? (
                <View style={styles.productModalPromoRow}>
                  <Text style={styles.profilePromoBadge}>PROMO</Text>
                  <Text style={styles.profilePromoNowPrice}>{productModalPromoNowPrice}</Text>
                  {!!productModalPromoOldPrice && (
                    <Text style={styles.profilePromoOldPrice}>{productModalPromoOldPrice}</Text>
                  )}
                </View>
              ) : (
                !!productModalPrice && <Text style={styles.productModalPriceText}>{productModalPrice}</Text>
              )}
              {!!productModalLongDescription && (
                <Text style={styles.productModalDescriptionText}>
                  {productModalLongDescription}
                </Text>
              )}
              {!!productModalMetaRows.length && (
                <View style={styles.productModalMetaList}>
                  {productModalMetaRows.map((row, idx) => (
                    <View key={`product-meta-${idx}`} style={styles.productModalMetaItem}>
                      <Text style={styles.productModalMetaLabel}>{row.label}</Text>
                      <Text style={styles.productModalMetaValue}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
    )}
    {portfolioModalOpen && (
    <Modal visible={portfolioModalOpen} transparent animationType="fade" onRequestClose={closePortfolioModal}>
      <View style={styles.storyModalBackdrop}>
        <Pressable style={styles.shareModalBackdropFill} onPress={closePortfolioModal} />
        <View style={styles.productModalPanel}>
          <View style={styles.productModalHeader}>
            <View>
              {!!portfolioModalSectionLabel && (
                <Text style={styles.productModalSectionText}>{portfolioModalSectionLabel}</Text>
              )}
              <Text style={styles.productModalTitleText} numberOfLines={2}>
                {portfolioModalName || tr('profile_project', 'Projeto')}
              </Text>
            </View>
            <View style={styles.productModalHeaderActions}>
              {!!allowPrivateShare && (
                <Pressable
                  onPress={() =>
                    requestShareItemFromOverlay(
                      'portfolio',
                      portfolioModalItem,
                      portfolioModalSectionLabel,
                      closePortfolioModal
                    )
                  }
                  style={styles.productModalHeaderIconBtn}
                >
                  <Ionicons name="paper-plane-outline" size={14} color="#0f172a" />
                </Pressable>
              )}
              {typeof onToggleSaveMedia === 'function' && (
                <Pressable
                  onPress={() => toggleSaveItem('portfolio', portfolioModalItem, portfolioModalSectionLabel)}
                  style={styles.productModalHeaderIconBtn}
                >
                  <Ionicons
                    name={checkSavedItem('portfolio', portfolioModalItem, portfolioModalSectionLabel) ? 'bookmark' : 'bookmark-outline'}
                    size={14}
                    color="#0f172a"
                  />
                </Pressable>
              )}
              <Pressable onPress={closePortfolioModal} style={styles.productModalCloseBtn}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
          {!!portfolioModalImages.length && (
            <View
              style={styles.productModalImageWrap}
              onLayout={(event) => {
                const width = Math.max(0, Number(event?.nativeEvent?.layout?.width || 0));
                if (Math.abs(width - contentModalViewportWidth) > 1) setContentModalViewportWidth(width);
              }}
            >
              <ScrollView
                horizontal
                pagingEnabled
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const pageWidth = contentModalViewportWidth || Number(event?.nativeEvent?.layoutMeasurement?.width || 1);
                  const x = Number(event?.nativeEvent?.contentOffset?.x || 0);
                  const next = Math.max(0, Math.min(portfolioModalImages.length - 1, Math.round(x / Math.max(1, pageWidth))));
                  if (next !== safePortfolioModalImageIndex) setPortfolioModalImageIndex(next);
                }}
              >
                {portfolioModalImages.map((img, idx) => (
                  <View
                    key={`portfolio-modal-image-${idx}`}
                    style={[styles.productModalImagePage, contentModalViewportWidth ? { width: contentModalViewportWidth } : null]}
                  >
                    <Image source={{ uri: img }} style={styles.productModalImage} resizeMode="cover" />
                  </View>
                ))}
              </ScrollView>
              {portfolioModalImages.length > 1 && (
                <View style={styles.productModalImageIndicatorsWrap} pointerEvents="none">
                  {portfolioModalImages.map((_, idx) => (
                    <View
                      key={`portfolio-indicator-${idx}`}
                      style={[
                        styles.productModalImageIndicator,
                        idx === safePortfolioModalImageIndex && styles.productModalImageIndicatorActive,
                      ]}
                    />
                  ))}
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
              {!!portfolioModalDescription && (
                <Text style={styles.productModalDescriptionText}>
                  {portfolioModalDescription}
                </Text>
              )}
              {!!portfolioModalLink && (
                <Pressable style={styles.profileAgendaReserveBtnWide} onPress={() => openExternalUrl(portfolioModalLink)}>
                  <Ionicons name="open-outline" size={14} color="#fff" />
                  <Text style={styles.profileAgendaReserveText}>{tr('profile_open_project', 'Abrir projeto')}</Text>
                </Pressable>
              )}
              {!!portfolioModalMetaRows.length && (
                <View style={styles.productModalMetaList}>
                  {portfolioModalMetaRows.map((row, idx) => (
                    <View key={`portfolio-meta-${idx}`} style={styles.productModalMetaItem}>
                      <Text style={styles.productModalMetaLabel}>{row.label}</Text>
                      <Text style={styles.productModalMetaValue}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
    )}
    {serviceModalOpen && (
    <Modal visible={serviceModalOpen} transparent animationType="fade" onRequestClose={closeServiceModal}>
      <View style={styles.storyModalBackdrop}>
        <Pressable style={styles.shareModalBackdropFill} onPress={closeServiceModal} />
        <View style={styles.productModalPanel}>
          <View style={styles.productModalHeader}>
            <View>
              {!!serviceModalSectionLabel && (
                <Text style={styles.productModalSectionText}>{serviceModalSectionLabel}</Text>
              )}
              <Text style={styles.productModalTitleText} numberOfLines={2}>
                {serviceModalName || 'Serviço'}
              </Text>
            </View>
            <View style={styles.productModalHeaderActions}>
              {!!allowPrivateShare && (
                <Pressable
                  onPress={() =>
                    requestShareItemFromOverlay(
                      'service',
                      serviceModalItem,
                      serviceModalSectionLabel,
                      closeServiceModal
                    )
                  }
                  style={styles.productModalHeaderIconBtn}
                >
                  <Ionicons name="paper-plane-outline" size={14} color="#0f172a" />
                </Pressable>
              )}
              {typeof onToggleSaveMedia === 'function' && (
                <Pressable
                  onPress={() => toggleSaveItem('service', serviceModalItem, serviceModalSectionLabel)}
                  style={styles.productModalHeaderIconBtn}
                >
                  <Ionicons
                    name={checkSavedItem('service', serviceModalItem, serviceModalSectionLabel) ? 'bookmark' : 'bookmark-outline'}
                    size={14}
                    color="#0f172a"
                  />
                </Pressable>
              )}
              <Pressable onPress={closeServiceModal} style={styles.productModalCloseBtn}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
          {serviceModalImageEnabled && (
          <View
            style={styles.productModalImageWrap}
            onLayout={(event) => {
              const width = Math.max(0, Number(event?.nativeEvent?.layout?.width || 0));
              if (Math.abs(width - contentModalViewportWidth) > 1) setContentModalViewportWidth(width);
            }}
          >
            {!!serviceModalImages.length ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const pageWidth = contentModalViewportWidth || Number(event?.nativeEvent?.layoutMeasurement?.width || 1);
                    const x = Number(event?.nativeEvent?.contentOffset?.x || 0);
                    const next = Math.max(0, Math.min(serviceModalImages.length - 1, Math.round(x / Math.max(1, pageWidth))));
                    if (next !== safeServiceModalImageIndex) setServiceModalImageIndex(next);
                  }}
                >
                  {serviceModalImages.map((img, idx) => (
                    <View
                      key={`service-modal-image-${idx}`}
                      style={[styles.productModalImagePage, contentModalViewportWidth ? { width: contentModalViewportWidth } : null]}
                    >
                      <Image source={{ uri: img }} style={styles.productModalImage} resizeMode="cover" />
                    </View>
                  ))}
                </ScrollView>
                {serviceModalImages.length > 1 && (
                  <View style={styles.productModalImageIndicatorsWrap} pointerEvents="none">
                    {serviceModalImages.map((_, idx) => (
                      <View
                        key={`service-indicator-${idx}`}
                        style={[
                          styles.productModalImageIndicator,
                          idx === safeServiceModalImageIndex && styles.productModalImageIndicatorActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </>
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
              {(!!serviceModalTime || !!serviceModalPrice || serviceModalShowPromo || serviceModalIsBudget) && (
                <View style={styles.serviceModalFactsRow}>
                  {!!serviceModalTime && (
                    <View style={styles.serviceModalFactChip}>
                      <Text style={styles.serviceModalFactLabel}>Duração</Text>
                      <Text style={styles.serviceModalFactValue}>{serviceModalTime}</Text>
                    </View>
                  )}
                  {serviceModalIsBudget && (
                    <View style={styles.serviceModalFactChip}>
                      <Text style={styles.serviceModalFactLabel}>Preço</Text>
                      <Text style={styles.serviceModalFactValue}>{tr('edit_under_quote', 'Sob orçamento')}</Text>
                    </View>
                  )}
                  {!serviceModalIsBudget && !serviceModalShowPromo && !!serviceModalPrice && (
                    <View style={styles.serviceModalFactChip}>
                      <Text style={styles.serviceModalFactLabel}>Preço</Text>
                      <Text style={styles.serviceModalFactValue}>{serviceModalPrice}</Text>
                    </View>
                  )}
                  {!serviceModalIsBudget && serviceModalShowPromo && !!serviceModalPromoNowPrice && (
                    <View style={styles.serviceModalFactChip}>
                      <Text style={styles.serviceModalFactLabel}>Preço</Text>
                      <View style={styles.serviceModalPromoInlineRow}>
                        <Text style={styles.profilePromoBadge}>PROMO</Text>
                        <Text style={styles.serviceModalPromoValue}>{serviceModalPromoNowPrice}</Text>
                        {!!serviceModalPromoOldPrice && (
                          <Text style={styles.serviceModalPromoOldValue}>{serviceModalPromoOldPrice}</Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}
              {!!serviceModalMetaRows.length && (
                <View style={styles.productModalMetaList}>
                  {serviceModalMetaRows.map((row, idx) => (
                    <View key={`service-meta-${idx}`} style={styles.productModalMetaItem}>
                      <Text style={styles.productModalMetaLabel}>{row.label}</Text>
                      <Text style={styles.productModalMetaValue}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
    )}
    {storyModalOpen && (
    <Modal visible={storyModalOpen} transparent animationType="none" onRequestClose={closeStoryModal}>
      <Pressable style={styles.storyModalBackdrop} onPress={closeStoryModal}>
        <Pressable
          style={styles.storyModalPanelWrap}
          onPress={(e) => e.stopPropagation()}
          {...storyPanResponder.panHandlers}
        >
          <Animated.View
            style={[
              styles.storyModalPanel,
              {
                opacity: storyCloseOpacity,
                transform: [
                  { translateY: Animated.add(storyTranslateY, storyCloseY) },
                  { scale: storyCloseScale },
                ],
              },
            ]}
            {...storyPanResponder.panHandlers}
          >
          <View style={styles.storyProgressRow}>
            {storyUrls.map((_, idx) => (
              <View
                key={`story-progress-${idx}`}
                style={[
                  styles.storyProgressBar,
                  idx <= storyIndex ? styles.storyProgressBarActive : null,
                ]}
              />
            ))}
          </View>

          <View style={styles.storyModalHeader}>
            <View style={styles.storyModalProfile}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.storyModalAvatar} />
              ) : (
                <View style={styles.storyModalAvatar}>
                  <Ionicons name="person" size={14} color="#64748b" />
                </View>
              )}
              <View style={styles.storyModalMeta}>
                <Text style={styles.storyModalName} numberOfLines={1}>{profile.name}</Text>
              </View>
            </View>
            <Pressable onPress={closeStoryModal} style={styles.storyModalCloseBtn}>
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.storyModalMediaWrap}>
            {!!storyUrls[storyIndex] && (
              <Image
                source={{ uri: storyUrls[storyIndex] }}
                style={styles.storyModalImage}
                resizeMode="cover"
                pointerEvents="none"
              />
            )}
            {storyUrls.length > 1 && (
              <>
                <Pressable style={styles.storyNavLeft} onPress={prevStory}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </Pressable>
                <Pressable style={styles.storyNavRight} onPress={nextStory}>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </Pressable>
              </>
            )}
          </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
    )}
    {galleryModalOpen && (
    <Modal visible={galleryModalOpen} transparent animationType="none" onRequestClose={closeGalleryModal}>
      <View style={styles.storyModalBackdrop}>
        <View style={styles.storyModalPanelWrap}>
          <Animated.View
            style={[
              styles.galleryModalPanel,
              {
                opacity: galleryCloseOpacity,
                transform: [
                  { translateY: galleryCloseY },
                  { scale: galleryCloseScale },
                ],
              },
            ]}
          >
            {!!currentModalMedia && (
              <View style={styles.galleryModalActionsLeft}>
                {allowPrivateShare && (
                  <Pressable
                    onPress={() => requestShareMedia(currentModalMedia.mediaType, currentModalMedia.uri)}
                    style={styles.galleryModalShareBtn}
                  >
                    <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                  </Pressable>
                )}
                {typeof onToggleSaveMedia === 'function' && (
                  <Pressable
                    onPress={() => toggleSaveMedia(currentModalMedia.mediaType, currentModalMedia.uri)}
                    style={styles.galleryModalSaveBtn}
                  >
                    <Ionicons
                      name={checkSavedMedia(currentModalMedia.mediaType, currentModalMedia.uri) ? 'bookmark' : 'bookmark-outline'}
                      size={16}
                      color="#fff"
                    />
                  </Pressable>
                )}
              </View>
            )}
            <Pressable onPress={closeGalleryModal} style={styles.galleryModalCloseBtn}>
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>

            <View
              style={styles.galleryModalMediaWrap}
              onLayout={(event) => setGalleryViewportWidth(event.nativeEvent.layout.width)}
            >
              <ScrollView
                ref={galleryScrollRef}
                horizontal
                pagingEnabled
                bounces={false}
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: galleryModalIndex * (galleryViewportWidth || 1), y: 0 }}
                onMomentumScrollEnd={(event) => {
                  if (!galleryViewportWidth || !activeGalleryItems.length) return;
                  const rawIndex = event.nativeEvent.contentOffset.x / galleryViewportWidth;
                  const safeIndex = Math.max(0, Math.min(Math.round(rawIndex), activeGalleryItems.length - 1));
                  if (safeIndex !== galleryModalIndex) {
                    setGalleryModalIndex(safeIndex);
                  }
                }}
              >
                {activeGalleryItems.map((uri, index) => (
                  <View
                    key={`gallery-modal-item-${galleryModalType}-${index}`}
                    style={[styles.galleryModalPage, { width: galleryViewportWidth || 1 }]}
                  >
                    {galleryModalType === 'photos' ? (
                      <Image
                        source={{ uri }}
                        style={[
                          styles.galleryModalImage,
                          galleryModalItemResizeMode === 'cover'
                            ? {
                                transform: [
                                  { translateX: galleryModalItemCrop.x },
                                  { translateY: galleryModalItemCrop.y },
                                  { scale: galleryModalItemCrop.scale },
                                ],
                              }
                            : null,
                        ]}
                        resizeMode={galleryModalItemResizeMode}
                      />
                    ) : (
                      <View style={styles.galleryModalVideoTile}>
                        <Ionicons
                          name={galleryModalType === 'videos' ? 'videocam' : 'film'}
                          size={42}
                          color="#fff"
                        />
                        <Text style={styles.galleryModalVideoText}>
                          Video {index + 1}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
              {activeGalleryItems.length > 1 && (
                <>
                  <Pressable style={styles.galleryNavBtnLeft} onPress={prevGalleryItem}>
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </Pressable>
                  <Pressable style={styles.galleryNavBtnRight} onPress={nextGalleryItem}>
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </Pressable>
                </>
              )}
            </View>
            {!!currentModalLegend && (
              <View style={styles.galleryModalLegendWrap} pointerEvents="none">
                <Text style={styles.galleryModalLegendText} numberOfLines={2}>
                  {currentModalLegend}
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
    )}
    {campaignModalOpen && (
    <Modal visible={campaignModalOpen} transparent animationType="fade" onRequestClose={closeCampaignModal}>
      <View style={styles.storyModalBackdrop}>
        <View style={styles.storyModalPanelWrap}>
          <View style={styles.galleryModalPanel}>
            {(!!allowPrivateShare || typeof onToggleSaveMedia === 'function') && !!campaignModalVideoUri && (
              <View style={styles.galleryModalActionsLeft}>
                {!!allowPrivateShare && (
                  <Pressable
                    onPress={() => {
                      const videoToShare = String(campaignModalVideoUri || '').trim();
                      if (!videoToShare) return;
                      closeCampaignModal();
                      setTimeout(() => requestShareMedia('video', videoToShare), 120);
                    }}
                    style={styles.galleryModalShareBtn}
                  >
                    <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                  </Pressable>
                )}
                {typeof onToggleSaveMedia === 'function' && (
                  <Pressable
                    onPress={() => toggleSaveItem('campaign', campaignModalItem, tr('profile_tab_campaigns', 'Campanhas'))}
                    style={styles.galleryModalSaveBtn}
                  >
                    <Ionicons
                      name={
                        checkSavedItem('campaign', campaignModalItem, tr('profile_tab_campaigns', 'Campanhas'))
                          ? 'bookmark'
                          : 'bookmark-outline'
                      }
                      size={16}
                      color="#fff"
                    />
                  </Pressable>
                )}
              </View>
            )}
            <Pressable onPress={closeCampaignModal} style={styles.galleryModalCloseBtn}>
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
            <View style={styles.galleryModalMediaWrap}>
              {!!campaignModalVideoUri ? (
                <WebView
                  source={{ html: buildInlineVideoHtml(campaignModalVideoUri) }}
                  style={styles.galleryModalImage}
                  scrollEnabled={false}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback
                  javaScriptEnabled
                  domStorageEnabled
                />
              ) : (
                <View style={styles.galleryModalVideoTile}>
                  <Ionicons name="videocam-outline" size={42} color="#fff" />
                  <Text style={styles.galleryModalVideoText}>{tr('profile_video_unavailable', 'Vídeo indisponível')}</Text>
                </View>
              )}
              {campaignModalVideos.length > 1 && (
                <>
                  <Pressable
                    style={styles.galleryNavBtnLeft}
                    onPress={() => setCampaignModalVideoIndex((prev) => (prev - 1 + campaignModalVideos.length) % campaignModalVideos.length)}
                  >
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </Pressable>
                  <Pressable
                    style={styles.galleryNavBtnRight}
                    onPress={() => setCampaignModalVideoIndex((prev) => (prev + 1) % campaignModalVideos.length)}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </Pressable>
                </>
              )}
            </View>
            <View style={styles.galleryModalLegendWrap} pointerEvents="none">
              <Text style={styles.galleryModalLegendText} numberOfLines={2}>
                {(campaignModalItem?.title || tr('profile_campaign', 'Campanha')).toString()}
                {campaignModalVideos.length > 1 ? ` • ${tr('profile_video', 'Vídeo')} ${safeCampaignModalVideoIndex + 1}/${campaignModalVideos.length}` : ''}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
    )}
    {reviewsModalOpen && (
    <Modal visible={reviewsModalOpen} transparent animationType="fade" onRequestClose={() => setReviewsModalOpen(false)}>
      <View style={styles.storyModalBackdrop}>
        <Pressable style={styles.shareModalBackdropFill} onPress={() => setReviewsModalOpen(false)} />
        <View style={styles.reviewsModalHost}>
        <View style={styles.shareModalPanel}>
          <View style={styles.reviewsHeaderRow}>
            <Text style={styles.shareModalTitle}>{tr('reviews_title', 'Avaliações')}</Text>
            <Pressable onPress={() => setReviewsModalOpen(false)} style={styles.reviewsCloseBtn}>
              <Ionicons name="close" size={16} color="#334155" />
            </Pressable>
          </View>
          <View style={styles.reviewsSummaryBox}>
            <Text style={styles.reviewsSummaryAvg}>{Number(reviewsSummary?.average || profile?.rating || 0).toFixed(1)}</Text>
            <Text style={styles.reviewsSummaryCount}>
              {`${Number(reviewsSummary?.total || 0)} ${tr('reviews_label_count', 'avaliações')}`}
            </Text>
            <View style={styles.reviewsDistributionWrap}>
              {[5, 4, 3, 2, 1].map((stars) => {
                const total = Math.max(0, Number(reviewsSummary?.total || 0));
                const count = Math.max(0, Number(reviewsSummary?.distribution?.[String(stars)] || 0));
                const pct = total > 0 ? Math.max(0, Math.min(100, (count / total) * 100)) : 0;
                return (
                  <View key={`review-dist-${stars}`} style={styles.reviewsDistributionRow}>
                    <Text style={styles.reviewsDistributionLabel}>{`${stars}★`}</Text>
                    <View style={styles.reviewsDistributionTrack}>
                      <View style={[styles.reviewsDistributionFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.reviewsDistributionCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          {!!reviewsError && <Text style={styles.authError}>{reviewsError}</Text>}

          {reviewCanRate && (
            <View style={styles.reviewsComposer}>
              <Text style={styles.reviewsComposerTitle}>{tr('reviews_add', 'Deixar avaliação')}</Text>
              <View style={styles.reviewsStarsRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable key={`review-star-${value}`} onPress={() => setReviewRating(value)}>
                    <Ionicons name={reviewRating >= value ? 'star' : 'star-outline'} size={22} color="#f59e0b" />
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={styles.reviewsCommentInput}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder={tr('reviews_comment_placeholder', 'Comentário (opcional)')}
                multiline
                maxLength={1200}
              />
              <Text style={styles.reviewsCommentCount}>{`${String(reviewComment || '').length}/1200`}</Text>
              <Pressable style={styles.primaryBtnWide} onPress={submitReview} disabled={reviewsSaving}>
                <Text style={styles.primaryBtnText}>
                  {reviewsSaving ? tr('reviews_saving', 'A guardar...') : tr('reviews_send', 'Enviar')}
                </Text>
              </Pressable>
            </View>
          )}

          {!reviewCanRate && (
            <Text style={styles.formHint}>
              {viewerIsCommon
                ? tr('reviews_only_vis', 'Podes ver avaliações deste perfil.')
                : tr('reviews_only_common', 'Só contas pessoais podem comentar.')}
            </Text>
          )}

          {reviewsLoading ? (
            <View style={styles.reviewsLoadingWrap}>
              <ActivityIndicator size="small" color="#334155" />
            </View>
          ) : (
            <ScrollView style={styles.reviewsList} contentContainerStyle={styles.reviewsListContent} showsVerticalScrollIndicator={false}>
              <View style={styles.reviewsSortRow}>
                <Pressable
                  style={[styles.reviewsSortBtn, reviewSortMode === 'recent' && styles.reviewsSortBtnActive]}
                  onPress={() => setReviewSortMode('recent')}
                >
                  <Text style={[styles.reviewsSortText, reviewSortMode === 'recent' && styles.reviewsSortTextActive]}>
                    {tr('reviews_sort_recent', 'Mais recentes')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.reviewsSortBtn, reviewSortMode === 'top' && styles.reviewsSortBtnActive]}
                  onPress={() => setReviewSortMode('top')}
                >
                  <Text style={[styles.reviewsSortText, reviewSortMode === 'top' && styles.reviewsSortTextActive]}>
                    {tr('reviews_sort_top', 'Melhor avaliados')}
                  </Text>
                </Pressable>
              </View>
              {(() => {
                const withComment = reviewsList.filter((entry) => String(entry?.comment || '').trim());
                const sorted = [...withComment].sort((a, b) => {
                  if (reviewSortMode === 'top') {
                    const byRating = Number(b?.rating || 0) - Number(a?.rating || 0);
                    if (byRating !== 0) return byRating;
                  }
                  const ad = String(a?.updated_at || a?.created_at || '').trim();
                  const bd = String(b?.updated_at || b?.created_at || '').trim();
                  return new Date(bd).getTime() - new Date(ad).getTime();
                });
                if (!sorted.length) {
                  return <Text style={styles.profileSectionEmpty}>{tr('reviews_empty_comments', 'Sem comentários ainda.')}</Text>;
                }
                return sorted.map((item, idx) => {
                  const userName = String(item?.user?.name || tr('reviews_user', 'Utilizador')).trim();
                  const rating = Math.max(1, Math.min(5, Number(item?.rating || 0)));
                  const comment = String(item?.comment || '').trim();
                  const when = String(item?.updated_at || item?.created_at || '').trim();
                  const whenText = when ? String(new Date(when).toLocaleDateString()) : '';
                  return (
                    <View key={`review-item-${item?.id || idx}`} style={styles.reviewsItem}>
                      <View style={styles.reviewsItemHead}>
                        <View style={styles.reviewsItemIdentity}>
                          <Text style={styles.reviewsItemUser}>{userName}</Text>
                          <View style={styles.reviewsItemStars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={`review-item-star-${item?.id || idx}-${star}`}
                                name={rating >= star ? 'star' : 'star-outline'}
                                size={12}
                                color="#f59e0b"
                              />
                            ))}
                          </View>
                        </View>
                        {!!whenText && <Text style={styles.reviewsItemDate}>{whenText}</Text>}
                      </View>
                      {!!comment && <Text style={styles.reviewsItemComment}>{translateDisplay(comment)}</Text>}
                    </View>
                  );
                });
              })()}
            </ScrollView>
          )}
        </View>
        </View>
      </View>
    </Modal>
    )}
    {shareModalOpen && (
    <Modal visible={shareModalOpen} transparent animationType="fade" onRequestClose={() => setShareModalOpen(false)}>
      <View style={styles.storyModalBackdrop}>
        <Pressable style={styles.shareModalBackdropFill} onPress={() => setShareModalOpen(false)} />
        <View style={styles.shareModalPanel}>
          <Text style={styles.shareModalTitle}>{t(L, 'profile_share_title')}</Text>
          <Text style={styles.formHint}>
            Seleciona um utilizador para enviar esta partilha privada.
          </Text>

          <TextInput
            value={shareQuery}
            onChangeText={setShareQuery}
            placeholder={t(L, 'profile_share_search')}
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          {!String(shareQuery || '').trim() && !!shareCandidates.length && (
            <Text style={styles.formHint}>Recentes</Text>
          )}

          <ScrollView style={styles.shareUsersList} keyboardShouldPersistTaps="handled">
            {shareSearchBusy ? (
              <Text style={styles.placeholder}>A pesquisar...</Text>
            ) : !shareCandidates.length ? (
              <Text style={styles.placeholder}>
                {String(shareQuery || '').trim().length >= 2
                  ? t(L, 'profile_share_no_results')
                  : t(L, 'profile_share_no_recent')}
              </Text>
            ) : (
              shareCandidates.map((candidate) => {
                const active = shareSelectedUser?.id === candidate.id;
                return (
                  <Pressable
                    key={`share-user-${candidate.id}`}
                    style={[styles.shareUserRow, active && styles.shareUserRowActive]}
                    onPress={() => setShareSelectedUser(candidate)}
                  >
                    <View style={styles.recommendationUserAvatarSmall}>
                      <Ionicons name="person" size={12} color="#475569" />
                    </View>
                    <View style={styles.editInputFlex}>
                      <Text style={styles.formListTitle} numberOfLines={1}>{candidate.name || candidate.email}</Text>
                      <Text style={styles.formListValue} numberOfLines={1}>{candidate.email}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={16} color="#0f172a" />}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {!!shareError && <Text style={styles.authError}>{shareError}</Text>}

          <View style={styles.rowBtns}>
            <Pressable
              style={[styles.shareModalActionBtn, styles.shareModalActionBtnSecondary]}
              onPress={() => setShareModalOpen(false)}
              disabled={shareBusy}
            >
              <Text style={styles.shareModalActionTextSecondary}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.shareModalActionBtn, styles.shareModalActionBtnPrimary]}
              onPress={submitShare}
              disabled={shareBusy}
            >
              <Text style={styles.shareModalActionTextPrimary}>{shareBusy ? 'A enviar...' : 'Enviar'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
    )}
    </>
  );
}











