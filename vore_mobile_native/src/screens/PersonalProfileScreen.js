import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MiniCard from '../components/MiniCard';
import { getApiBase } from '../api/client';
import { styles } from '../styles/appStyles';

const ALERT_OPTIONS = [
  { key: 'newProfiles', label: 'Novos perfis', icon: 'sparkles-outline' },
  { key: 'promos', label: 'Promoções', icon: 'pricetag-outline' },
  { key: 'nearby', label: 'Perto de mim', icon: 'location-outline' },
];
const MAX_CATEGORY_CHIPS = 5;
const GRID_PAGE_SIZE = 18;

function resolveMediaUri(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  if (/^data:(image|video)\//i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!raw.startsWith('/')) return '';

  const base = String(getApiBase() || '').trim();
  if (!base) return '';
  const origin = base.replace(/\/api\/?$/i, '');
  return `${origin}${raw}`;
}

function formatConversationTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'ontem';
  }

  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

function normalizeRecommendationContentType(rawType) {
  const type = String(rawType || '').trim().toLowerCase();
  if (['photo', 'photos', 'foto', 'fotos', 'image', 'images'].includes(type)) return 'photo';
  if (['video', 'videos', 'reel', 'reels'].includes(type)) return 'video';
  return 'profile';
}

function iconForSavedContentKind(rawKind) {
  const kind = String(rawKind || '').trim().toLowerCase();
  if (kind === 'service') return 'construct-outline';
  if (kind === 'product') return 'cube-outline';
  if (kind === 'menu') return 'restaurant-outline';
  if (kind === 'portfolio') return 'briefcase-outline';
  if (kind === 'house') return 'home-outline';
  if (kind === 'room') return 'bed-outline';
  if (kind === 'campaign') return 'megaphone-outline';
  return 'layers-outline';
}

function parseSharedItemPayload(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw || !raw.startsWith('itemshare:')) return null;
  const encoded = raw.slice('itemshare:'.length);
  if (!encoded) return null;
  try {
    const json = decodeURIComponent(encoded);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    const kind = String(parsed.kind || '').trim().toLowerCase();
    if (!['service', 'product', 'menu', 'portfolio', 'house', 'room', 'campaign'].includes(kind)) return null;
    return {
      kind,
      section: String(parsed.section || '').trim(),
      name: String(parsed.name || '').trim(),
      price: String(parsed.price || '').trim(),
      oldPrice: String(parsed.oldPrice || '').trim(),
      time: String(parsed.time || '').trim(),
      note: String(parsed.note || '').trim(),
      image: String(parsed.image || '').trim(),
    };
  } catch (_e) {
    return null;
  }
}

function renderEmpty(text, actionLabel = '', onAction = null) {
  return (
    <View style={styles.panel}>
      <Text style={styles.placeholder}>{text}</Text>
      {!!actionLabel && typeof onAction === 'function' && (
        <Pressable style={styles.personalEmptyCtaBtn} onPress={onAction}>
          <Text style={styles.personalEmptyCtaText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function renderAlertProfilesBlock({ title, list, keyPrefix, emptyText, onOpenProfile, count = 0 }) {
  return (
    <View style={styles.personalSectionCard}>
      <View style={styles.personalSectionHeaderRow}>
        <Text style={styles.section}>{title}</Text>
        <Text style={styles.formHintInline}>{count}</Text>
      </View>
      {!list.length ? (
        <Text style={styles.formHint}>{emptyText}</Text>
      ) : (
        <View style={styles.alertsScrollerBox}>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.suggestedScroller}>
            {list.map((p) => (
              <MiniCard
                key={`${keyPrefix}-${p.id}`}
                profile={p}
                onPress={() => onOpenProfile?.(p.id)}
                compact
                showSave={false}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function PersonalProfileScreen({
  user,
  profiles = [],
  savedProfiles = [],
  recentProfiles = [],
  savedMedia = { photos: [], videos: [], reels: [], contentItems: [] },
  alerts = {},
  recommendations = [],
  recommendationsSent = [],
  recommendationRequests = [],
  recommendationsLoading = false,
  recommendationsError = '',
  onToggleAlert,
  onRefreshRecommendations,
  onRecommendationPermissionAction,
  onOpenProfile,
  onOpenProfileItem,
  onOpenExplore,
  onToggleSaveProfile,
  isSavedProfile,
  onToggleSaveMedia,
}) {
  const toastTimerRef = useRef(null);
  const [tab, setTab] = useState('saved');
  const [savedSubTab, setSavedSubTab] = useState('profiles');
  const [savedProfilesSearchQuery, setSavedProfilesSearchQuery] = useState('');
  const [savedProfilesLimit, setSavedProfilesLimit] = useState(GRID_PAGE_SIZE);
  const [recentProfilesLimit, setRecentProfilesLimit] = useState(GRID_PAGE_SIZE);
  const [toastMessage, setToastMessage] = useState('');
  const [mediaTab, setMediaTab] = useState('all');
  const [mediaCategoryFilters, setMediaCategoryFilters] = useState([]);
  const [mediaCategoryModalOpen, setMediaCategoryModalOpen] = useState(false);
  const [mediaCategoryModalMode, setMediaCategoryModalMode] = useState('filter');
  const [mediaCategoryFilterDraft, setMediaCategoryFilterDraft] = useState([]);
  const [mediaCategoryOrder, setMediaCategoryOrder] = useState([]);
  const [mediaCategoryManageSelected, setMediaCategoryManageSelected] = useState('');
  const [customMediaSubtabs, setCustomMediaSubtabs] = useState([]);
  const [hiddenMediaCategories, setHiddenMediaCategories] = useState([]);
  const [removedMediaCategories, setRemovedMediaCategories] = useState([]);
  const [mediaCategoryManageQuery, setMediaCategoryManageQuery] = useState('');
  const [newMediaSubtabName, setNewMediaSubtabName] = useState('');
  const [recommendationActionBusy, setRecommendationActionBusy] = useState({});
  const [recommendationConversationKey, setRecommendationConversationKey] = useState(null);
  const [conversationContentTab, setConversationContentTab] = useState('received');
  const [conversationMediaPreview, setConversationMediaPreview] = useState(null);
  const [savedMediaPreview, setSavedMediaPreview] = useState(null);
  const [savedContentView, setSavedContentView] = useState('list');
  const [contentCategoryFilters, setContentCategoryFilters] = useState([]);
  const [contentCategoryModalOpen, setContentCategoryModalOpen] = useState(false);
  const [contentCategoryModalMode, setContentCategoryModalMode] = useState('filter');
  const [contentCategoryFilterDraft, setContentCategoryFilterDraft] = useState([]);
  const [contentCategoryOrder, setContentCategoryOrder] = useState([]);
  const [contentCategoryManageSelected, setContentCategoryManageSelected] = useState('');
  const [customContentSubtabs, setCustomContentSubtabs] = useState([]);
  const [hiddenContentCategories, setHiddenContentCategories] = useState([]);
  const [removedContentCategories, setRemovedContentCategories] = useState([]);
  const [contentCategoryManageQuery, setContentCategoryManageQuery] = useState('');
  const [newContentSubtabName, setNewContentSubtabName] = useState('');
  const [seenRecommendationIds, setSeenRecommendationIds] = useState([]);
  const [recommendationSearchQuery, setRecommendationSearchQuery] = useState('');
  const [pinnedConversationKeys, setPinnedConversationKeys] = useState([]);
  const previewTouchStartXRef = useRef(null);

  function showToast(message) {
    const text = String(message || '').trim();
    if (!text) return;
    setToastMessage(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage('');
      toastTimerRef.current = null;
    }, 1800);
  }

  useEffect(() => {
    if (tab !== 'recommendations') return;
    onRefreshRecommendations?.(user);
  }, [tab, user?.id]);

  useEffect(() => {
    setSavedMediaPreview(null);
  }, [tab, savedSubTab, mediaTab, mediaCategoryFilters]);

  const mediaData = useMemo(() => {
    const sourceItems = Array.isArray(savedMedia?.items) ? savedMedia.items : [];
    let normalizedAll;

    if (sourceItems.length) {
      normalizedAll = sourceItems
        .map((item, idx) => ({
          key: `${item?.type || 'media'}-${idx}-${item?.uri || ''}`,
          type: ['reel', 'reels'].includes(String(item?.type || '').toLowerCase()) ? 'videos' : String(item?.type || 'photos'),
          uri: String(item?.uri || ''),
          category: String(item?.category || '').trim(),
          profileName: String(item?.profileName || '').trim(),
          profileId: item?.profileId || item?.profile_id || '',
          profileSlug: item?.profileSlug || item?.profile_slug || '',
          profileAvatar: String(item?.profileAvatar || item?.profile_avatar || '').trim(),
        }))
        .filter((item) => item.uri);
    } else {
      const photos = Array.isArray(savedMedia?.photos) ? savedMedia.photos : [];
      const videos = [
        ...(Array.isArray(savedMedia?.videos) ? savedMedia.videos : []),
        ...(Array.isArray(savedMedia?.reels) ? savedMedia.reels : []),
      ];
      const reels = Array.isArray(savedMedia?.reels) ? savedMedia.reels : [];
      normalizedAll = [
        ...photos.map((uri, idx) => ({ type: 'photos', uri, key: `ap-${idx}`, category: '', profileName: '', profileId: '', profileSlug: '', profileAvatar: '' })),
        ...videos.map((uri, idx) => ({ type: 'videos', uri, key: `av-${idx}`, category: '', profileName: '', profileId: '', profileSlug: '', profileAvatar: '' })),
        ...reels.map((uri, idx) => ({ type: 'videos', uri, key: `ar-${idx}`, category: '', profileName: '', profileId: '', profileSlug: '', profileAvatar: '' })),
      ];
    }

    const photos = normalizedAll.filter((item) => item.type === 'photos');
    const videos = normalizedAll.filter((item) => item.type === 'videos');

    const baseCategories = Array.isArray(savedMedia?.categories) ? savedMedia.categories : [];
    const uniqueCategories = [];
    const seenCategories = new Set();

    [...baseCategories, ...normalizedAll.map((item) => item.category)]
      .map((name) => String(name || '').trim())
      .filter(Boolean)
      .forEach((name) => {
        const key = name.toLowerCase();
        if (seenCategories.has(key)) return;
        seenCategories.add(key);
        uniqueCategories.push(name);
      });

    return { all: normalizedAll, photos, videos, categories: uniqueCategories };
  }, [savedMedia]);

  const savedContentItems = useMemo(() => {
    const list = Array.isArray(savedMedia?.contentItems) ? savedMedia.contentItems : [];
    return [...list].sort((a, b) => {
      const ta = Date.parse(String(a?.savedAt || ''));
      const tb = Date.parse(String(b?.savedAt || ''));
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
  }, [savedMedia?.contentItems]);

  const contentCategorySeedDefs = useMemo(() => {
    const out = [];
    const seen = new Set();
    const pushLabel = (raw) => {
      const label = String(raw || '').trim();
      if (!label) return;
      const key = label.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ key, label });
    };
    savedContentItems.forEach((item) => {
      pushLabel(item?.category || item?.section || item?.kind || '');
    });
    return out;
  }, [savedContentItems]);

  const allContentCategoryDefs = useMemo(() => {
    const merged = [...contentCategorySeedDefs.map((item) => item.label), ...customContentSubtabs];
    const out = [];
    const seen = new Set();
    const removed = new Set(
      (Array.isArray(removedContentCategories) ? removedContentCategories : []).map((entry) =>
        String(entry || '').trim().toLowerCase()
      )
    );
    merged
      .map((name) => String(name || '').trim())
      .filter(Boolean)
      .forEach((label) => {
        const key = label.toLowerCase();
        if (removed.has(key)) return;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ key, label });
      });
    return out;
  }, [contentCategorySeedDefs, customContentSubtabs, removedContentCategories]);

  const hiddenContentCategoryKeys = useMemo(
    () =>
      new Set(
        (Array.isArray(hiddenContentCategories) ? hiddenContentCategories : []).map((entry) =>
          String(entry || '').trim().toLowerCase()
        )
      ),
    [hiddenContentCategories]
  );

  const contentCategoryDefs = useMemo(
    () => allContentCategoryDefs.filter((item) => !hiddenContentCategoryKeys.has(item.key)),
    [allContentCategoryDefs, hiddenContentCategoryKeys]
  );

  useEffect(() => {
    const keys = allContentCategoryDefs.map((item) => item.key);
    setContentCategoryOrder((prev) => {
      const kept = prev.filter((key) => keys.includes(key));
      const toAppend = keys.filter((key) => !kept.includes(key));
      return [...kept, ...toAppend];
    });
  }, [allContentCategoryDefs]);

  const orderedAllContentCategoryDefs = useMemo(() => {
    const map = new Map(allContentCategoryDefs.map((item) => [item.key, item]));
    const ordered = contentCategoryOrder.map((key) => map.get(key)).filter(Boolean);
    const missing = allContentCategoryDefs.filter((item) => !contentCategoryOrder.includes(item.key));
    return [...ordered, ...missing];
  }, [allContentCategoryDefs, contentCategoryOrder]);

  const orderedContentCategoryDefs = useMemo(
    () => orderedAllContentCategoryDefs.filter((item) => !hiddenContentCategoryKeys.has(item.key)),
    [orderedAllContentCategoryDefs, hiddenContentCategoryKeys]
  );

  const visibleContentManageCategoryDefs = useMemo(
    () =>
      orderedAllContentCategoryDefs.filter((item) => {
        const q = String(contentCategoryManageQuery || '').trim().toLowerCase();
        if (!q) return true;
        return String(item?.label || '').toLowerCase().includes(q);
      }),
    [orderedAllContentCategoryDefs, contentCategoryManageQuery]
  );

  const visibleContentCategoryDefs = useMemo(
    () => {
      const usageMap = new Map();
      savedContentItems.forEach((item) => {
        const key = String(item?.category || item?.section || item?.kind || '').trim().toLowerCase();
        if (!key) return;
        usageMap.set(key, (usageMap.get(key) || 0) + 1);
      });
      return [...orderedContentCategoryDefs]
        .sort((a, b) => {
          const ac = usageMap.get(a.key) || 0;
          const bc = usageMap.get(b.key) || 0;
          if (bc !== ac) return bc - ac;
          return String(a.label || '').localeCompare(String(b.label || ''), 'pt');
        })
        .slice(0, MAX_CATEGORY_CHIPS);
    },
    [orderedContentCategoryDefs, savedContentItems]
  );

  const activeContentCategoryLabel = useMemo(
    () =>
      contentCategoryDefs
        .filter((item) => contentCategoryFilters.includes(item.key))
        .map((item) => item.label)
        .join(', '),
    [contentCategoryDefs, contentCategoryFilters]
  );

  useEffect(() => {
    if (!Array.isArray(contentCategoryFilters) || !contentCategoryFilters.length) return;
    const valid = new Set(contentCategoryDefs.map((item) => item.key));
    setContentCategoryFilters((prev) => {
      const next = prev.filter((key) => valid.has(key));
      if (next.length === prev.length && next.every((key, idx) => key === prev[idx])) return prev;
      return next;
    });
  }, [contentCategoryDefs, contentCategoryFilters]);

  useEffect(() => {
    if (contentCategoryModalMode !== 'manage') return;
    if (!contentCategoryManageSelected) return;
    const exists = visibleContentManageCategoryDefs.some((item) => item.key === contentCategoryManageSelected);
    if (!exists) setContentCategoryManageSelected('');
  }, [contentCategoryModalMode, contentCategoryManageSelected, visibleContentManageCategoryDefs]);

  const selectedContentManageIdx = useMemo(
    () => visibleContentManageCategoryDefs.findIndex((item) => item.key === contentCategoryManageSelected),
    [visibleContentManageCategoryDefs, contentCategoryManageSelected]
  );

  function moveContentCategory(key, direction) {
    setContentCategoryOrder((prev) => {
      const idx = prev.indexOf(key);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[target];
      next[target] = tmp;
      return next;
    });
  }

  function moveSelectedContentManageCategory(direction) {
    const target = String(contentCategoryManageSelected || '').trim();
    if (!target) return;
    moveContentCategory(target, direction);
  }

  function handleAddContentSubtab() {
    const name = String(newContentSubtabName || '').trim();
    if (!name) return;
    setCustomContentSubtabs((prev) => {
      const exists = prev.some((entry) => String(entry || '').trim().toLowerCase() === name.toLowerCase());
      if (exists) return prev;
      return [...prev, name];
    });
    setHiddenContentCategories((prev) => prev.filter((entry) => String(entry || '').trim().toLowerCase() !== name.toLowerCase()));
    setRemovedContentCategories((prev) => prev.filter((entry) => String(entry || '').trim().toLowerCase() !== name.toLowerCase()));
    setNewContentSubtabName('');
    setContentCategoryFilters((prev) => {
      const key = name.toLowerCase();
      if (prev.includes(key)) return prev;
      return [...prev, key];
    });
  }

  function toggleContentCategoryFilter(key) {
    const target = String(key || '').trim().toLowerCase();
    if (!target) return;
    setContentCategoryFilters((prev) =>
      prev.includes(target) ? prev.filter((item) => item !== target) : [...prev, target]
    );
  }

  function toggleContentCategoryFilterDraft(key) {
    const target = String(key || '').trim().toLowerCase();
    if (!target) return;
    setContentCategoryFilterDraft((prev) =>
      prev.includes(target) ? prev.filter((item) => item !== target) : [...prev, target]
    );
  }

  function toggleManageContentCategoryHidden(key) {
    const target = String(key || '').trim().toLowerCase();
    if (!target) return;
    const isHidden = hiddenContentCategoryKeys.has(target);
    setHiddenContentCategories((prev) => {
      const set = new Set((Array.isArray(prev) ? prev : []).map((entry) => String(entry || '').trim().toLowerCase()));
      if (isHidden) set.delete(target);
      else set.add(target);
      return Array.from(set);
    });
    if (!isHidden) {
      setContentCategoryFilters((prev) => prev.filter((entry) => entry !== target));
    }
  }

  function removeManageContentCategoryItem(item) {
    const key = String(item?.key || '').trim().toLowerCase();
    const label = String(item?.label || '').trim().toLowerCase();
    if (!key && !label) return;
    const target = key || label;
    setCustomContentSubtabs((prev) =>
      (Array.isArray(prev) ? prev : []).filter((entry) => String(entry || '').trim().toLowerCase() !== target)
    );
    setRemovedContentCategories((prev) => {
      const set = new Set((Array.isArray(prev) ? prev : []).map((entry) => String(entry || '').trim().toLowerCase()));
      set.add(target);
      return Array.from(set);
    });
    setHiddenContentCategories((prev) => prev.filter((entry) => String(entry || '').trim().toLowerCase() !== target));
    setContentCategoryOrder((prev) => prev.filter((entry) => String(entry || '').trim().toLowerCase() !== target));
    setContentCategoryFilters((prev) => prev.filter((entry) => entry !== target));
    if (contentCategoryManageSelected === target) setContentCategoryManageSelected('');
  }

  const filteredSavedContentItems = useMemo(() => {
    if (!Array.isArray(contentCategoryFilters) || !contentCategoryFilters.length) return savedContentItems;
    return savedContentItems.filter((item) => {
      const label = String(item?.category || item?.section || item?.kind || '').trim().toLowerCase();
      return contentCategoryFilters.includes(label);
    });
  }, [savedContentItems, contentCategoryFilters]);

  const filteredSavedProfiles = useMemo(() => {
    const list = Array.isArray(savedProfiles) ? savedProfiles : [];
    const q = String(savedProfilesSearchQuery || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const haystack = `${p?.name || ''} ${p?.category || ''} ${p?.location || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [savedProfiles, savedProfilesSearchQuery]);

  const visibleSavedProfiles = useMemo(
    () => filteredSavedProfiles.slice(0, savedProfilesLimit),
    [filteredSavedProfiles, savedProfilesLimit]
  );
  const hasMoreSavedProfiles = visibleSavedProfiles.length < filteredSavedProfiles.length;

  const visibleRecentProfiles = useMemo(() => {
    const list = Array.isArray(recentProfiles) ? recentProfiles : [];
    return list.slice(0, recentProfilesLimit);
  }, [recentProfiles, recentProfilesLimit]);
  const hasMoreRecentProfiles = visibleRecentProfiles.length < (Array.isArray(recentProfiles) ? recentProfiles.length : 0);

  useEffect(() => {
    setSavedProfilesLimit(GRID_PAGE_SIZE);
  }, [savedProfilesSearchQuery, savedSubTab]);

  useEffect(() => {
    setRecentProfilesLimit(GRID_PAGE_SIZE);
  }, [tab]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const mediaTabItems = useMemo(() => {
    let baseItems = mediaData.photos;
    if (mediaTab === 'all') baseItems = mediaData.all;
    if (mediaTab === 'videos') baseItems = mediaData.videos;

    return baseItems.filter((item) => {
      const haystack = `${item?.category || ''} ${item?.profileName || ''} ${item?.uri || ''}`.toLowerCase();
      const categoryMatch =
        !Array.isArray(mediaCategoryFilters) ||
        !mediaCategoryFilters.length ||
        mediaCategoryFilters.some((selected) => haystack.includes(String(selected || '').toLowerCase()));
      return categoryMatch;
    });
  }, [mediaData, mediaTab, mediaCategoryFilters]);

  const mediaTabDefs = useMemo(
    () => [
      { key: 'all', label: 'Tudo', count: mediaData.all.length },
      { key: 'photos', label: 'Fotos', count: mediaData.photos.length },
      { key: 'videos', label: 'Vídeos', count: mediaData.videos.length },
    ],
    [mediaData]
  );

  const allMediaCategoryDefs = useMemo(() => {
    const merged = [...mediaData.categories, ...customMediaSubtabs];
    const output = [];
    const seen = new Set();
    const removed = new Set(
      (Array.isArray(removedMediaCategories) ? removedMediaCategories : []).map((name) =>
        String(name || '').trim().toLowerCase()
      )
    );

    merged
      .map((name) => String(name || '').trim())
      .filter(Boolean)
      .forEach((name) => {
        const key = name.toLowerCase();
        if (removed.has(key)) return;
        if (seen.has(key)) return;
        seen.add(key);
        output.push({ key, label: name });
      });

    return output;
  }, [mediaData.categories, customMediaSubtabs, removedMediaCategories]);

  const hiddenMediaCategoryKeys = useMemo(
    () =>
      new Set(
        (Array.isArray(hiddenMediaCategories) ? hiddenMediaCategories : []).map((name) =>
          String(name || '').trim().toLowerCase()
        )
      ),
    [hiddenMediaCategories]
  );

  const mediaCategoryDefs = useMemo(
    () => allMediaCategoryDefs.filter((item) => !hiddenMediaCategoryKeys.has(item.key)),
    [allMediaCategoryDefs, hiddenMediaCategoryKeys]
  );

  useEffect(() => {
    const keys = allMediaCategoryDefs.map((item) => item.key);
    setMediaCategoryOrder((prev) => {
      const kept = prev.filter((key) => keys.includes(key));
      const toAppend = keys.filter((key) => !kept.includes(key));
      return [...kept, ...toAppend];
    });
  }, [allMediaCategoryDefs]);

  const orderedAllMediaCategoryDefs = useMemo(() => {
    const map = new Map(allMediaCategoryDefs.map((item) => [item.key, item]));
    const ordered = mediaCategoryOrder.map((key) => map.get(key)).filter(Boolean);
    const missing = allMediaCategoryDefs.filter((item) => !mediaCategoryOrder.includes(item.key));
    return [...ordered, ...missing];
  }, [allMediaCategoryDefs, mediaCategoryOrder]);

  const orderedMediaCategoryDefs = useMemo(
    () => orderedAllMediaCategoryDefs.filter((item) => !hiddenMediaCategoryKeys.has(item.key)),
    [orderedAllMediaCategoryDefs, hiddenMediaCategoryKeys]
  );

  const visibleManageCategoryDefs = useMemo(
    () =>
      orderedAllMediaCategoryDefs.filter((item) => {
        const q = String(mediaCategoryManageQuery || '').trim().toLowerCase();
        if (!q) return true;
        return String(item?.label || '').toLowerCase().includes(q);
      }),
    [orderedAllMediaCategoryDefs, mediaCategoryManageQuery]
  );

  const visibleMediaCategoryDefs = useMemo(
    () => {
      const usageMap = new Map();
      mediaData.all.forEach((item) => {
        const key = String(item?.category || '').trim().toLowerCase();
        if (!key) return;
        usageMap.set(key, (usageMap.get(key) || 0) + 1);
      });
      return [...orderedMediaCategoryDefs]
        .sort((a, b) => {
          const ac = usageMap.get(a.key) || 0;
          const bc = usageMap.get(b.key) || 0;
          if (bc !== ac) return bc - ac;
          return String(a.label || '').localeCompare(String(b.label || ''), 'pt');
        })
        .slice(0, MAX_CATEGORY_CHIPS);
    },
    [orderedMediaCategoryDefs, mediaData.all]
  );
  const activeMediaCategoryLabel = useMemo(
    () =>
      mediaCategoryDefs
        .filter((item) => mediaCategoryFilters.includes(item.key))
        .map((item) => item.label)
        .join(', '),
    [mediaCategoryDefs, mediaCategoryFilters]
  );

  useEffect(() => {
    if (!Array.isArray(mediaCategoryFilters) || !mediaCategoryFilters.length) return;
    const valid = new Set(mediaCategoryDefs.map((item) => item.key));
    setMediaCategoryFilters((prev) => {
      const next = prev.filter((key) => valid.has(key));
      if (next.length === prev.length && next.every((key, idx) => key === prev[idx])) return prev;
      return next;
    });
  }, [mediaCategoryDefs, mediaCategoryFilters]);

  useEffect(() => {
    if (mediaCategoryModalMode !== 'manage') return;
    if (!mediaCategoryManageSelected) return;
    const exists = visibleManageCategoryDefs.some((item) => item.key === mediaCategoryManageSelected);
    if (!exists) setMediaCategoryManageSelected('');
  }, [mediaCategoryModalMode, mediaCategoryManageSelected, visibleManageCategoryDefs]);

  function moveMediaCategory(key, direction) {
    setMediaCategoryOrder((prev) => {
      const idx = prev.indexOf(key);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[target];
      next[target] = tmp;
      return next;
    });
  }

  const alertNewProfiles = useMemo(() => {
    const list = Array.isArray(profiles) ? profiles : [];
    return list.filter((p) => p?.badge === 'novo' || p?.filter === 'novidades').slice(0, 8);
  }, [profiles]);
  const alertPromoProfiles = useMemo(() => {
    const list = Array.isArray(profiles) ? profiles : [];
    return list.filter((p) => p?.badge === 'promo' || p?.filter === 'promocoes').slice(0, 8);
  }, [profiles]);

  const alertNearbyProfiles = useMemo(() => {
    const list = Array.isArray(profiles) ? profiles : [];
    const near = list.filter((p) => p?.filter === 'perto');
    if (near.length) return near.slice(0, 8);
    return list.slice(0, 8);
  }, [profiles]);
  const alertPreviewCounts = useMemo(
    () => ({
      newProfiles: alertNewProfiles.length,
      promos: alertPromoProfiles.length,
      nearby: alertNearbyProfiles.length,
    }),
    [alertNewProfiles.length, alertPromoProfiles.length, alertNearbyProfiles.length]
  );

  const activeRecommendations = useMemo(() => {
    const inbox = Array.isArray(recommendations) ? recommendations : [];
    const sent = Array.isArray(recommendationsSent) ? recommendationsSent : [];
    return [...inbox, ...sent];
  }, [recommendations, recommendationsSent]);
  const recommendationConversations = useMemo(() => {
    const source = Array.isArray(activeRecommendations) ? activeRecommendations : [];
    const grouped = new Map();
    const currentUserId = Number(user?.id || 0);
    source.forEach((item) => {
      const senderId = Number(item?.sender_user_id || item?.sender?.id || 0);
      const receiverId = Number(item?.receiver_user_id || item?.receiver?.id || 0);
      const side = senderId > 0 && currentUserId > 0 && senderId === currentUserId
        ? item?.receiver
        : receiverId > 0 && currentUserId > 0 && receiverId === currentUserId
          ? item?.sender
          : item?.sender || item?.receiver;
      const sideId = Number(side?.id || 0);
      const sideEmail = String(side?.email || '').trim().toLowerCase();
      const key = sideId > 0 ? `id:${sideId}` : `email:${sideEmail || 'unknown'}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          user: side || {},
          items: [],
        });
      }
      grouped.get(key).items.push(item);
    });
    return Array.from(grouped.values());
  }, [activeRecommendations, user?.id]);

  useEffect(() => {
    const validKeys = new Set(recommendationConversations.map((item) => item.key));
    setPinnedConversationKeys((prev) => prev.filter((key) => validKeys.has(key)));
  }, [recommendationConversations]);

  const filteredRecommendationConversations = useMemo(() => {
    const q = String(recommendationSearchQuery || '').trim().toLowerCase();
    const base = recommendationConversations.filter((conversation) => {
      if (!q) return true;
      const name = String(conversation?.user?.name || '').toLowerCase();
      const email = String(conversation?.user?.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });

    const latestTsFor = (conversation) => {
      const items = Array.isArray(conversation?.items) ? conversation.items : [];
      return items.reduce((maxTs, rec) => Math.max(maxTs, getRecommendationTimestamp(rec)), 0);
    };

    return [...base].sort((a, b) => {
      const aPinned = pinnedConversationKeys.includes(a.key) ? 1 : 0;
      const bPinned = pinnedConversationKeys.includes(b.key) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return latestTsFor(b) - latestTsFor(a);
    });
  }, [recommendationConversations, recommendationSearchQuery, pinnedConversationKeys]);

  function togglePinnedConversation(key) {
    const target = String(key || '').trim();
    if (!target) return;
    setPinnedConversationKeys((prev) => {
      const willUnpin = prev.includes(target);
      showToast(willUnpin ? 'Conversa desafixada' : 'Conversa fixada');
      return willUnpin ? prev.filter((k) => k !== target) : [target, ...prev];
    });
  }

  function handleToggleSaveProfile(profileId) {
    const wasSaved = !!isSavedProfile?.(profileId);
    onToggleSaveProfile?.(profileId);
    showToast(wasSaved ? 'Perfil removido dos guardados' : 'Perfil guardado');
  }

  function handleToggleSaveContentItem(item, event) {
    event?.stopPropagation?.();
    onToggleSaveMedia?.(buildSavedContentTogglePayload(item));
    showToast('Item removido dos guardados');
  }

  function handleAddMediaSubtab() {
    const name = String(newMediaSubtabName || '').trim();
    if (!name) return;
    setCustomMediaSubtabs((prev) => {
      const exists = prev.some((entry) => String(entry || '').trim().toLowerCase() === name.toLowerCase());
      if (exists) return prev;
      return [...prev, name];
    });
    setHiddenMediaCategories((prev) => prev.filter((entry) => String(entry || '').trim().toLowerCase() !== name.toLowerCase()));
    setRemovedMediaCategories((prev) => prev.filter((entry) => String(entry || '').trim().toLowerCase() !== name.toLowerCase()));
    setNewMediaSubtabName('');
    setMediaCategoryFilters((prev) => {
      const key = name.toLowerCase();
      if (prev.includes(key)) return prev;
      return [...prev, key];
    });
  }

  const selectedManageIdx = useMemo(
    () => visibleManageCategoryDefs.findIndex((item) => item.key === mediaCategoryManageSelected),
    [visibleManageCategoryDefs, mediaCategoryManageSelected]
  );

  function moveSelectedManageCategory(direction) {
    const target = String(mediaCategoryManageSelected || '').trim();
    if (!target) return;
    moveMediaCategory(target, direction);
  }

  function toggleManageCategoryHidden(key) {
    const target = String(key || '').trim().toLowerCase();
    if (!target) return;
    const isHidden = hiddenMediaCategoryKeys.has(target);
    setHiddenMediaCategories((prev) => {
      const set = new Set((Array.isArray(prev) ? prev : []).map((entry) => String(entry || '').trim().toLowerCase()));
      if (isHidden) {
        set.delete(target);
      } else {
        set.add(target);
      }
      return Array.from(set);
    });
    if (!isHidden) {
      setMediaCategoryFilters((prev) => prev.filter((entry) => entry !== target));
    }
  }

  function removeManageCategoryItem(item) {
    const key = String(item?.key || '').trim().toLowerCase();
    const label = String(item?.label || '').trim().toLowerCase();
    if (!key && !label) return;
    setCustomMediaSubtabs((prev) =>
      (Array.isArray(prev) ? prev : []).filter((entry) => String(entry || '').trim().toLowerCase() !== label)
    );
    const target = key || label;
    setRemovedMediaCategories((prev) => {
      const set = new Set((Array.isArray(prev) ? prev : []).map((entry) => String(entry || '').trim().toLowerCase()));
      set.add(target);
      return Array.from(set);
    });
    setHiddenMediaCategories((prev) => prev.filter((entry) => String(entry || '').trim().toLowerCase() !== target));
    setMediaCategoryOrder((prev) => prev.filter((entry) => String(entry || '').trim().toLowerCase() !== target));
    setMediaCategoryFilters((prev) => prev.filter((entry) => entry !== target));
    if (mediaCategoryManageSelected === target) setMediaCategoryManageSelected('');
  }

  function toggleMediaCategoryFilter(key) {
    const target = String(key || '').trim().toLowerCase();
    if (!target) return;
    setMediaCategoryFilters((prev) =>
      prev.includes(target) ? prev.filter((item) => item !== target) : [...prev, target]
    );
  }

  function toggleMediaCategoryFilterDraft(key) {
    const target = String(key || '').trim().toLowerCase();
    if (!target) return;
    setMediaCategoryFilterDraft((prev) =>
      prev.includes(target) ? prev.filter((item) => item !== target) : [...prev, target]
    );
  }

  function buildSavedContentTogglePayload(item) {
    const entry = item && typeof item === 'object' ? item : {};
    return {
      type: 'content',
      uri: String(entry?.uri || '').trim(),
      kind: String(entry?.kind || '').trim().toLowerCase(),
      section: String(entry?.section || '').trim(),
      name: String(entry?.name || '').trim(),
      note: String(entry?.note || '').trim(),
      price: String(entry?.price || '').trim(),
      oldPrice: String(entry?.oldPrice || '').trim(),
      time: String(entry?.time || '').trim(),
      category: String(entry?.category || '').trim(),
      profileName: String(entry?.profileName || '').trim(),
      profileId: String(entry?.profileId || '').trim(),
      profileSlug: String(entry?.profileSlug || '').trim(),
    };
  }

  function openSavedContentItem(item) {
    const entry = item && typeof item === 'object' ? item : {};
    const openToken = entry?.profileSlug || entry?.profileId || '';
    const itemShare = {
      kind: String(entry?.kind || '').trim().toLowerCase(),
      section: String(entry?.section || '').trim(),
      name: String(entry?.name || '').trim(),
      price: String(entry?.price || '').trim(),
      oldPrice: String(entry?.oldPrice || '').trim(),
      time: String(entry?.time || '').trim(),
      note: String(entry?.note || '').trim(),
      image: String(entry?.uri || '').trim(),
    };
    setSavedMediaPreview({
      type: itemShare.kind || 'content',
      sourceName: String(entry?.profileName || 'Guardado'),
      contentUri: resolveMediaUri(String(entry?.uri || '').trim()),
      openToken,
      avatar: '',
      itemShare,
    });
  }

  const activeConversation = useMemo(
    () => recommendationConversations.find((item) => item.key === recommendationConversationKey) || null,
    [recommendationConversations, recommendationConversationKey]
  );
  const activeConversationItems = useMemo(() => {
    if (!activeConversation) return [];
    const currentUserId = Number(user?.id || 0);
    const sourceItems = Array.isArray(activeConversation?.items) ? activeConversation.items : [];
    return sourceItems.filter((rec) => {
      const senderId = Number(rec?.sender_user_id || rec?.sender?.id || 0);
      const receiverId = Number(rec?.receiver_user_id || rec?.receiver?.id || 0);
      const direction = senderId > 0 && senderId === currentUserId
        ? 'sent'
        : receiverId > 0 && receiverId === currentUserId
          ? 'received'
          : 'received';
      return direction === conversationContentTab;
    });
  }, [activeConversation, conversationContentTab, user?.id]);
  const activeConversationSections = useMemo(() => {
    const buckets = {
      profile: [],
      photo: [],
      video: [],
      content: [],
    };
    (Array.isArray(activeConversationItems) ? activeConversationItems : []).forEach((rec) => {
      const parsedItem = parseSharedItemPayload(rec?.content_uri);
      if (parsedItem) {
        buckets.content.push(rec);
        return;
      }
      const type = normalizeRecommendationContentType(rec?.content_type);
      if (buckets[type]) buckets[type].push(rec);
    });
    return buckets;
  }, [activeConversationItems]);

  function recommendationKey(rec, sectionKey = '') {
    const id = String(rec?.id || '').trim();
    if (id) return `id:${id}`;
    const created = String(rec?.created_at || rec?.updated_at || rec?.sent_at || '').trim();
    const sender = String(rec?.sender_user_id || rec?.sender?.id || '').trim();
    const receiver = String(rec?.receiver_user_id || rec?.receiver?.id || '').trim();
    const type = String(rec?.content_type || '').trim();
    return `tmp:${sectionKey}:${sender}:${receiver}:${type}:${created}`;
  }

  function getRecommendationTimestamp(rec) {
    const created = Date.parse(String(rec?.created_at || ''));
    const updated = Date.parse(String(rec?.updated_at || ''));
    const sent = Date.parse(String(rec?.sent_at || ''));
    return Math.max(
      Number.isFinite(created) ? created : 0,
      Number.isFinite(updated) ? updated : 0,
      Number.isFinite(sent) ? sent : 0
    );
  }

  function sortRecommendationsByRecent(list) {
    const source = Array.isArray(list) ? list : [];
    return [...source].sort((a, b) => getRecommendationTimestamp(b) - getRecommendationTimestamp(a));
  }

  function markRecommendationsSeen(keys) {
    const items = Array.isArray(keys) ? keys.filter(Boolean) : [];
    if (!items.length) return;
    setSeenRecommendationIds((prev) => {
      const next = new Set(Array.isArray(prev) ? prev : []);
      let changed = false;
      items.forEach((k) => {
        if (!next.has(k)) {
          next.add(k);
          changed = true;
        }
      });
      return changed ? Array.from(next) : prev;
    });
  }

  function buildConversationPreviewPayload(rec, sectionKey) {
    const type = normalizeRecommendationContentType(rec?.content_type);
    const itemShare = parseSharedItemPayload(rec?.content_uri);
    const sourceName = String(rec?.source_profile_name || 'perfil');
    const openToken = rec?.profile_slug || rec?.profile_id;
    const contentUri = resolveMediaUri(rec?.content_uri || '');
    const previewAvatar = resolveMediaUri(
      rec?.sender?.avatar || rec?.receiver?.avatar || activeConversation?.user?.avatar || ''
    );
    const contentKind = String(itemShare?.kind || '').trim().toLowerCase();
    const itemImageUri = resolveMediaUri(itemShare?.image || '');
    return {
      type: sectionKey === 'profile'
        ? 'profile'
        : sectionKey === 'photo'
          ? 'photo'
          : (contentKind || 'content'),
      sourceName,
      contentUri: sectionKey === 'photo' ? contentUri : itemImageUri,
      openToken,
      avatar: previewAvatar,
      itemShare,
      sectionKey,
      recommendationKey: recommendationKey(rec, sectionKey),
    };
  }

  const previewSectionItems = useMemo(() => {
    const sectionKey = String(conversationMediaPreview?.sectionKey || '').trim();
    if (!sectionKey) return [];
    const list = activeConversationSections?.[sectionKey] || [];
    return sortRecommendationsByRecent(list);
  }, [conversationMediaPreview?.sectionKey, activeConversationSections]);

  const previewCurrentIndex = useMemo(() => {
    const key = String(conversationMediaPreview?.recommendationKey || '').trim();
    if (!key || !previewSectionItems.length) return -1;
    return previewSectionItems.findIndex((rec) => recommendationKey(rec, conversationMediaPreview?.sectionKey) === key);
  }, [conversationMediaPreview?.recommendationKey, conversationMediaPreview?.sectionKey, previewSectionItems]);

  function openPreviewByIndex(nextIndex) {
    if (!conversationMediaPreview?.sectionKey || !previewSectionItems.length) return;
    const safe = Math.max(0, Math.min(nextIndex, previewSectionItems.length - 1));
    const rec = previewSectionItems[safe];
    if (!rec) return;
    const sectionKey = String(conversationMediaPreview.sectionKey || '');
    const payload = buildConversationPreviewPayload(rec, sectionKey);
    setConversationMediaPreview(payload);
    markRecommendationsSeen([payload.recommendationKey]);
  }

  function onPreviewTouchStart(event) {
    const x = Number(event?.nativeEvent?.pageX || 0);
    previewTouchStartXRef.current = Number.isFinite(x) ? x : null;
  }

  function onPreviewTouchEnd(event) {
    if (!previewIsContent) return;
    if (previewCurrentIndex < 0 || !previewSectionItems.length) return;
    const startX = Number(previewTouchStartXRef.current);
    const endX = Number(event?.nativeEvent?.pageX || 0);
    previewTouchStartXRef.current = null;
    if (!Number.isFinite(startX) || !Number.isFinite(endX)) return;
    const dx = endX - startX;
    if (dx <= -30 && previewCurrentIndex < previewSectionItems.length - 1) {
      openPreviewByIndex(previewCurrentIndex + 1);
      return;
    }
    if (dx >= 30 && previewCurrentIndex > 0) {
      openPreviewByIndex(previewCurrentIndex - 1);
    }
  }

  useEffect(() => {
    setRecommendationConversationKey(null);
    setConversationMediaPreview(null);
  }, [tab]);

  useEffect(() => {
    setConversationContentTab('received');
    setConversationMediaPreview(null);
  }, [recommendationConversationKey]);

  async function handlePermissionAction(action, senderUserId) {
    if (!action || !senderUserId) return;
    const key = `${action}:${senderUserId}`;
    setRecommendationActionBusy((prev) => ({ ...prev, [key]: true }));
    try {
      await onRecommendationPermissionAction?.(action, senderUserId);
    } finally {
      setRecommendationActionBusy((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function openSharedProfile(token) {
    if (!token) return;
    setConversationMediaPreview(null);
    setRecommendationConversationKey(null);
    onOpenProfile?.(token);
  }
  function openSharedProfileItem(token, itemShare) {
    if (!token) return;
    setConversationMediaPreview(null);
    setRecommendationConversationKey(null);
    if (typeof onOpenProfileItem === 'function' && itemShare && typeof itemShare === 'object') {
      onOpenProfileItem(token, itemShare);
      return;
    }
    onOpenProfile?.(token);
  }
  function openExploreFromEmpty() {
    if (typeof onOpenExplore === 'function') {
      onOpenExplore();
      return;
    }
    const first = Array.isArray(profiles) ? profiles[0] : null;
    if (first?.id) onOpenProfile?.(first.id);
  }

  const previewIsContent = ['service', 'product', 'menu', 'portfolio', 'house', 'room', 'campaign', 'content']
    .includes(conversationMediaPreview?.type);
  const previewKind = String(
    conversationMediaPreview?.itemShare?.kind || conversationMediaPreview?.type || ''
  ).trim().toLowerCase();
  const previewKindLabel =
    previewKind === 'service' ? 'Serviço'
    : previewKind === 'product' ? 'Produto'
    : previewKind === 'menu' ? 'Menu'
    : previewKind === 'portfolio' ? 'Portfolio'
    : previewKind === 'house' ? 'Casa'
    : previewKind === 'room' ? 'Quarto'
    : previewKind === 'campaign' ? 'Campanha'
    : 'Itens';
  const previewItemName = String(
    conversationMediaPreview?.itemShare?.name || conversationMediaPreview?.sourceName || 'Item'
  ).trim();
  const previewItemPrice = String(conversationMediaPreview?.itemShare?.price || '').trim();
  const previewItemOldPrice = String(conversationMediaPreview?.itemShare?.oldPrice || '').trim();
  const previewItemTime = String(conversationMediaPreview?.itemShare?.time || '').trim();
  const previewItemNote = String(conversationMediaPreview?.itemShare?.note || '').trim();
  const previewHasContentImage = previewIsContent && !!conversationMediaPreview?.contentUri;
  const savedPreviewIsContent = ['service', 'product', 'menu', 'portfolio', 'house', 'room', 'campaign', 'content']
    .includes(savedMediaPreview?.type);
  const savedPreviewKind = String(
    savedMediaPreview?.itemShare?.kind || savedMediaPreview?.type || ''
  ).trim().toLowerCase();
  const savedPreviewKindLabel =
    savedPreviewKind === 'service' ? 'Serviço'
    : savedPreviewKind === 'product' ? 'Produto'
    : savedPreviewKind === 'menu' ? 'Menu'
    : savedPreviewKind === 'portfolio' ? 'Portfolio'
    : savedPreviewKind === 'house' ? 'Casa'
    : savedPreviewKind === 'room' ? 'Quarto'
    : savedPreviewKind === 'campaign' ? 'Campanha'
    : 'Itens';
  const savedPreviewName = String(
    savedMediaPreview?.itemShare?.name || savedMediaPreview?.sourceName || 'Item'
  ).trim();
  const savedPreviewPrice = String(savedMediaPreview?.itemShare?.price || '').trim();
  const savedPreviewOldPrice = String(savedMediaPreview?.itemShare?.oldPrice || '').trim();
  const savedPreviewTime = String(savedMediaPreview?.itemShare?.time || '').trim();
  const savedPreviewNote = String(savedMediaPreview?.itemShare?.note || '').trim();
  const savedPreviewHasImage = savedPreviewIsContent && !!savedMediaPreview?.contentUri;

  return (
    <View style={styles.personalRoot}>
      <View style={styles.personalHeader}>
        <View style={styles.personalAvatar}>
          <Ionicons name="person" size={26} color="#475569" />
        </View>
        <Text style={styles.personalName}>{String(user?.name || 'Conta Pessoal')}</Text>
        <Text style={styles.personalEmail}>{String(user?.email || '')}</Text>
      </View>

      <View style={styles.profileSectionTabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profileTabsScroll}>
          <Pressable
            style={[styles.profileTabBtn, tab === 'recommendations' && styles.profileTabBtnActive]}
            onPress={() => setTab('recommendations')}
          >
            <Text style={[styles.profileTabText, tab === 'recommendations' && styles.profileTabTextActive]}>
              Partilhas
            </Text>
          </Pressable>
          <Pressable
            style={[styles.profileTabBtn, tab === 'saved' && styles.profileTabBtnActive]}
            onPress={() => setTab('saved')}
          >
            <Text style={[styles.profileTabText, tab === 'saved' && styles.profileTabTextActive]}>Guardados</Text>
          </Pressable>
          <Pressable
            style={[styles.profileTabBtn, tab === 'recent' && styles.profileTabBtnActive]}
            onPress={() => setTab('recent')}
          >
            <Text style={[styles.profileTabText, tab === 'recent' && styles.profileTabTextActive]}>Recentes</Text>
          </Pressable>
          <Pressable
            style={[styles.profileTabBtn, tab === 'alerts' && styles.profileTabBtnActive]}
            onPress={() => setTab('alerts')}
          >
            <Text style={[styles.profileTabText, tab === 'alerts' && styles.profileTabTextActive]}>Sugestões</Text>
          </Pressable>
        </ScrollView>
      </View>

      {tab === 'saved' && (
        <>
          <View style={styles.personalSavedSubtabsRow}>
            <Pressable
              style={[styles.personalSavedSubtabBtn, savedSubTab === 'profiles' && styles.personalSavedSubtabBtnActive]}
              onPress={() => setSavedSubTab('profiles')}
            >
              <Text style={[styles.personalSavedSubtabText, savedSubTab === 'profiles' && styles.personalSavedSubtabTextActive]}>
                Perfis
              </Text>
            </Pressable>
            <Pressable
              style={[styles.personalSavedSubtabBtn, savedSubTab === 'media' && styles.personalSavedSubtabBtnActive]}
              onPress={() => setSavedSubTab('media')}
            >
              <Text style={[styles.personalSavedSubtabText, savedSubTab === 'media' && styles.personalSavedSubtabTextActive]}>
                Fotos e vídeos
              </Text>
            </Pressable>
            <Pressable
              style={[styles.personalSavedSubtabBtn, savedSubTab === 'content' && styles.personalSavedSubtabBtnActive]}
              onPress={() => setSavedSubTab('content')}
            >
              <Text style={[styles.personalSavedSubtabText, savedSubTab === 'content' && styles.personalSavedSubtabTextActive]}>
                Itens
              </Text>
            </Pressable>
          </View>

          {savedSubTab === 'profiles' ? (
            !savedProfiles.length ? (
              renderEmpty('Ainda não guardaste perfis.', 'Descobrir perfis', openExploreFromEmpty)
            ) : (
              <>
                <TextInput
                  value={savedProfilesSearchQuery}
                  onChangeText={setSavedProfilesSearchQuery}
                  placeholder="Pesquisar perfis guardados..."
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  style={[styles.input, styles.savedProfilesSearchInput]}
                />
                {!filteredSavedProfiles.length ? (
                  <Text style={styles.personalMediaActiveHint}>Nenhum perfil encontrado.</Text>
                ) : (
                  <>
                    <View style={styles.grid}>
                    {(() => {
                      const fillCount = visibleSavedProfiles.length % 3 === 0 ? 0 : 3 - (visibleSavedProfiles.length % 3);
                      const gridItems = fillCount ? [...visibleSavedProfiles, ...Array(fillCount).fill(null)] : visibleSavedProfiles;
                      return gridItems.map((p, idx) => {
                        if (!p) {
                          return <View key={`saved-pad-${idx}`} style={[styles.card, styles.cardGridPad]} />;
                        }
                        return (
                          <MiniCard
                            key={`saved-${p.id}`}
                            profile={p}
                            onPress={() => onOpenProfile?.(p.id)}
                            onSavePress={() => handleToggleSaveProfile(p.id)}
                            isSaved={!!isSavedProfile?.(p.id)}
                          />
                        );
                      });
                    })()}
                    </View>
                    {hasMoreSavedProfiles && (
                      <Pressable style={styles.personalLoadMoreBtn} onPress={() => setSavedProfilesLimit((v) => v + GRID_PAGE_SIZE)}>
                        <Text style={styles.personalLoadMoreBtnText}>Ver mais perfis</Text>
                      </Pressable>
                    )}
                  </>
                )}
              </>
            )
          ) : savedSubTab === 'media' ? (
            <>
              <View style={styles.personalMediaTabsRow}>
                {mediaTabDefs.map((item) => {
                  const active = mediaTab === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      style={[styles.personalMediaTabBtn, active && styles.personalMediaTabBtnActive]}
                      onPress={() => setMediaTab(item.key)}
                    >
                      <Text style={[styles.personalMediaTabText, active && styles.personalMediaTabTextActive]}>
                        {item.label} ({item.count})
                      </Text>
                    </Pressable>
                  );
                })}
                <View style={styles.personalMediaTabsActionsRight}>
                  <Pressable
                    style={styles.personalMediaTabBtn}
                    onPress={() => {
                      setMediaCategoryModalMode('manage');
                      setMediaCategoryManageSelected('');
                      setMediaCategoryManageQuery('');
                      setMediaCategoryModalOpen(true);
                    }}
                  >
                    <Text style={styles.personalMediaTabText}>+ Categoria</Text>
                  </Pressable>
                  <Pressable
                    style={styles.personalMediaTabBtn}
                    onPress={() => {
                      setMediaCategoryModalMode('filter');
                      setMediaCategoryManageQuery('');
                      setMediaCategoryFilterDraft(Array.isArray(mediaCategoryFilters) ? [...mediaCategoryFilters] : []);
                      setMediaCategoryModalOpen(true);
                    }}
                  >
                    <Ionicons name="funnel-outline" size={13} color="#64748b" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.personalMediaCategoriesRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formChipsWrap}>
                  <Pressable
                    style={[styles.formChip, !mediaCategoryFilters.length && styles.formChipActive]}
                    onPress={() => setMediaCategoryFilters([])}
                  >
                    <Text style={[styles.formChipText, !mediaCategoryFilters.length && styles.formChipTextActive]}>Ver todas</Text>
                  </Pressable>
                  {visibleMediaCategoryDefs.map((item) => {
                    const active = mediaCategoryFilters.includes(item.key);
                    return (
                      <View key={`mc-wrap-${item.key}`} style={styles.personalMediaCategoryChipPair}>
                        <Pressable
                          style={[styles.formChip, active && styles.formChipActive]}
                          onPress={() => toggleMediaCategoryFilter(item.key)}
                        >
                          <Text style={[styles.formChipText, active && styles.formChipTextActive]}>{item.label}</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
              {!!mediaCategoryFilters.length && (
                <Text style={styles.personalMediaActiveHint}>
                  Categoria: {activeMediaCategoryLabel}
                </Text>
              )}

                <Modal
                  visible={mediaCategoryModalOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => {
                    setMediaCategoryManageQuery('');
                    setMediaCategoryModalOpen(false);
                  }}
                >
                <View style={styles.storyModalBackdrop}>
                  <Pressable
                    style={styles.shareModalBackdropFill}
                    onPress={() => {
                      setMediaCategoryManageQuery('');
                      setMediaCategoryModalOpen(false);
                    }}
                  />
                  <View style={styles.shareModalPanel}>
                    <Pressable
                      style={styles.mediaCategoryModalCloseIconBtn}
                      onPress={() => {
                        setMediaCategoryManageQuery('');
                        setMediaCategoryModalOpen(false);
                      }}
                    >
                      <Ionicons name="close" size={14} color="#475569" />
                    </Pressable>
                    <Text style={styles.shareModalTitle}>
                      {mediaCategoryModalMode === 'manage' ? 'Gerir categorias' : 'Filtrar categorias'}
                    </Text>
                    <Text style={styles.formHint}>
                      {mediaCategoryModalMode === 'manage'
                        ? 'Adiciona, remove e organiza categorias.'
                        : 'Seleciona várias categorias para filtrar.'}
                    </Text>
                    {mediaCategoryModalMode === 'filter' ? (
                      <>
                        <View style={styles.exploreCategorySearchBox}>
                          <Ionicons name="search-outline" size={14} color="#64748b" />
                          <TextInput
                            value={mediaCategoryManageQuery}
                            onChangeText={setMediaCategoryManageQuery}
                            placeholder="Pesquisar categoria"
                            placeholderTextColor="#94a3b8"
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={styles.exploreCategorySearchInput}
                          />
                        </View>
                        <ScrollView
                          style={styles.shareUsersList}
                          showsVerticalScrollIndicator={false}
                          keyboardShouldPersistTaps="handled"
                        >
                          <Pressable
                            style={[styles.exploreCategoryRow, !mediaCategoryFilterDraft.length && styles.exploreCategoryRowActive]}
                            onPress={() => setMediaCategoryFilterDraft([])}
                          >
                            <Text style={[styles.exploreCategoryText, !mediaCategoryFilterDraft.length && styles.exploreCategoryTextActive]}>
                              Ver todas
                            </Text>
                            <Ionicons
                              name={!mediaCategoryFilterDraft.length ? 'checkbox' : 'square-outline'}
                              size={16}
                              color={!mediaCategoryFilterDraft.length ? '#0f172a' : '#94a3b8'}
                            />
                          </Pressable>
                          {orderedMediaCategoryDefs
                            .filter((item) => {
                              const q = String(mediaCategoryManageQuery || '').trim().toLowerCase();
                              if (!q) return true;
                              return String(item?.label || '').toLowerCase().includes(q);
                            })
                            .map((item) => {
                              const active = mediaCategoryFilterDraft.includes(item.key);
                              return (
                                <Pressable
                                  key={`media-cat-filter-${item.key}`}
                                  style={[styles.exploreCategoryRow, active && styles.exploreCategoryRowActive]}
                                  onPress={() => toggleMediaCategoryFilterDraft(item.key)}
                                >
                                  <Text style={[styles.exploreCategoryText, active && styles.exploreCategoryTextActive]}>
                                    {item.label}
                                  </Text>
                                  <Ionicons
                                    name={active ? 'checkbox' : 'square-outline'}
                                    size={16}
                                    color={active ? '#0f172a' : '#94a3b8'}
                                  />
                                </Pressable>
                              );
                            })}
                        </ScrollView>
                      </>
                    ) : (
                      <>
                        <TextInput
                          value={mediaCategoryManageQuery}
                          onChangeText={setMediaCategoryManageQuery}
                          placeholder="Filtrar categorias..."
                          placeholderTextColor="#94a3b8"
                          autoCapitalize="none"
                          style={[styles.input, styles.mediaManageSearchInput]}
                        />
                      <View style={styles.mediaManageAddRow}>
                        <TextInput
                          value={newMediaSubtabName}
                          onChangeText={setNewMediaSubtabName}
                          placeholder="Nova categoria"
                          placeholderTextColor="#94a3b8"
                          style={[styles.input, styles.mediaManageAddInput]}
                        />
                        <Pressable style={[styles.recommendationMiniBtn, styles.mediaManageAddBtn]} onPress={handleAddMediaSubtab}>
                          <Text style={styles.recommendationMiniBtnText}>Adicionar</Text>
                        </Pressable>
                      </View>
                      <View style={styles.mediaManageHeaderRow}>
                        <Text style={styles.formListTitle}>Ordem das categorias</Text>
                        <View style={styles.mediaManageHeaderActions}>
                          <Pressable
                            style={[styles.recommendationMiniBtn, styles.mediaCategorySortBtn, !mediaCategoryManageSelected && styles.formChipDisabled]}
                            onPress={() => moveSelectedManageCategory('up')}
                            disabled={!mediaCategoryManageSelected || selectedManageIdx <= 0}
                          >
                            <Ionicons name="chevron-up" size={10} color="#fff" />
                          </Pressable>
                          <Pressable
                            style={[styles.recommendationMiniBtn, styles.mediaCategorySortBtn, !mediaCategoryManageSelected && styles.formChipDisabled]}
                            onPress={() => moveSelectedManageCategory('down')}
                            disabled={
                              !mediaCategoryManageSelected ||
                              selectedManageIdx < 0 ||
                              selectedManageIdx >= visibleManageCategoryDefs.length - 1
                            }
                          >
                            <Ionicons name="chevron-down" size={10} color="#fff" />
                          </Pressable>
                        </View>
                      </View>
                      <ScrollView style={styles.shareUsersList}>
                      {visibleManageCategoryDefs
                        .map((item) => {
                        const selected = mediaCategoryManageSelected === item.key;
                        const hidden = hiddenMediaCategoryKeys.has(item.key);

                        return (
                          <Pressable
                            key={`media-cat-modal-${item.key}`}
                            style={[styles.exploreCategoryRow, selected && styles.exploreCategoryRowActive, hidden && { opacity: 0.6 }]}
                            onPress={() => setMediaCategoryManageSelected(item.key)}
                          >
                            <Text style={[styles.exploreCategoryText, selected && styles.exploreCategoryTextActive]} numberOfLines={1}>
                              {item.label}
                            </Text>
                            <View style={styles.mediaManageRowActions}>
                              <Pressable
                                style={styles.mediaManageIconBtn}
                                onPress={(event) => {
                                  event?.stopPropagation?.();
                                  toggleManageCategoryHidden(item.key);
                                }}
                              >
                                <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={14} color="#475569" />
                              </Pressable>
                              <Pressable
                                style={styles.mediaManageIconBtn}
                                onPress={(event) => {
                                  event?.stopPropagation?.();
                                  removeManageCategoryItem(item);
                                }}
                                >
                                  <Ionicons name="trash-outline" size={14} color="#b91c1c" />
                                </Pressable>
                              <Ionicons
                                name={selected ? 'checkbox' : 'square-outline'}
                                size={16}
                                color={selected ? '#0f172a' : '#94a3b8'}
                              />
                            </View>
                          </Pressable>
                        );
                      })}
                      </ScrollView>
                      </>
                    )}
                    {mediaCategoryModalMode === 'filter' && (
                      <View style={styles.shareModalActions}>
                        <Pressable
                          style={[styles.shareModalActionBtn, styles.shareModalActionBtnSecondary]}
                          onPress={() => setMediaCategoryFilterDraft([])}
                        >
                          <Text style={styles.shareModalActionTextSecondary}>Limpar</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.shareModalActionBtn, styles.shareModalActionBtnPrimary]}
                          onPress={() => {
                            setMediaCategoryFilters(Array.isArray(mediaCategoryFilterDraft) ? mediaCategoryFilterDraft : []);
                            setMediaCategoryModalOpen(false);
                            showToast('Filtros aplicados');
                          }}
                        >
                          <Text style={styles.shareModalActionTextPrimary}>Aplicar</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              </Modal>

              {!mediaTabItems.length ? (
                renderEmpty('Ainda não tens media guardada.', 'Explorar perfis', openExploreFromEmpty)
              ) : (
                <View style={styles.personalMediaGrid}>
                  {(() => {
                    const visibleItems = mediaTabItems.slice(0, 60);
                    const fillCount = visibleItems.length % 3 === 0 ? 0 : 3 - (visibleItems.length % 3);
                    const gridItems = fillCount ? [...visibleItems, ...Array(fillCount).fill(null)] : visibleItems;
                    return gridItems.map((item, idx) => {
                      if (!item) {
                        return (
                          <View
                            key={`pm-pad-${mediaTab}-${idx}`}
                            style={[styles.personalMediaPhotoTile, styles.personalMediaGridPad]}
                          />
                        );
                      }
                    const type = item?.type || (mediaTab === 'all' ? 'photos' : mediaTab);
                    const uri = item?.uri || '';
                    const resolved = resolveMediaUri(uri);

                    if (type === 'photos') {
                      const openToken = item?.profileSlug || item?.profileId || '';
                      const payload = {
                        type: 'photo',
                        sourceName: String(item?.profileName || 'Guardado'),
                        contentUri: resolved,
                        openToken,
                        avatar: resolveMediaUri(item?.profileAvatar || ''),
                      };
                      return (
                        <Pressable
                          key={`pm-${mediaTab}-${item?.key || idx}`}
                          style={styles.personalMediaPhotoTile}
                          onPress={() => setSavedMediaPreview(payload)}
                        >
                          {!!resolved && <Image source={{ uri: resolved }} style={styles.personalMediaPhotoImage} />}
                          {mediaTab === 'all' && (
                            <View style={styles.personalMediaTypeTag}>
                              <Text style={styles.personalMediaTypeTagText}>Foto</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    }
                    const openToken = item?.profileSlug || item?.profileId || '';
                    const payload = {
                      type: 'video',
                      sourceName: String(item?.profileName || 'Guardado'),
                      contentUri: resolved,
                      openToken,
                      avatar: resolveMediaUri(item?.profileAvatar || ''),
                    };
                    return (
                      <Pressable
                        key={`pm-${mediaTab}-${item?.key || idx}`}
                        style={[
                          styles.personalMediaVideoTile,
                          styles.personalMediaVideoTone,
                        ]}
                        onPress={() => setSavedMediaPreview(payload)}
                      >
                        <Ionicons name="videocam" size={18} color="#fff" />
                        <Text style={styles.personalMediaVideoText}>Video</Text>
                        {mediaTab === 'all' && (
                          <View style={styles.personalMediaTypeTagDark}>
                            <Text style={styles.personalMediaTypeTagDarkText}>Video</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                    });
                  })()}
                </View>
              )}
            </>
          ) : (
            <>
              {!savedContentItems.length ? (
                renderEmpty('Ainda não tens conteúdo guardado.', 'Descobrir perfis', openExploreFromEmpty)
              ) : (
                <>
                  <View style={styles.personalMediaTabsRow}>
                    <Pressable
                      style={styles.personalMediaTabBtn}
                      onPress={() => {
                        setContentCategoryModalMode('manage');
                        setContentCategoryManageSelected('');
                        setContentCategoryManageQuery('');
                        setContentCategoryModalOpen(true);
                      }}
                    >
                      <Text style={styles.personalMediaTabText}>+ Categoria</Text>
                    </Pressable>
                    <View style={styles.personalMediaTabsActionsRight}>
                      <Pressable
                        style={styles.personalMediaTabBtn}
                        onPress={() => {
                          setContentCategoryModalMode('filter');
                          setContentCategoryManageQuery('');
                          setContentCategoryFilterDraft(Array.isArray(contentCategoryFilters) ? [...contentCategoryFilters] : []);
                          setContentCategoryModalOpen(true);
                        }}
                      >
                        <Ionicons name="funnel-outline" size={13} color="#64748b" />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.personalMediaCategoriesRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formChipsWrap}>
                      <Pressable
                        style={[styles.formChip, !contentCategoryFilters.length && styles.formChipActive]}
                        onPress={() => setContentCategoryFilters([])}
                      >
                        <Text style={[styles.formChipText, !contentCategoryFilters.length && styles.formChipTextActive]}>Ver todas</Text>
                      </Pressable>
                      {visibleContentCategoryDefs.map((item) => {
                        const active = contentCategoryFilters.includes(item.key);
                        return (
                          <View key={`cc-wrap-${item.key}`} style={styles.personalMediaCategoryChipPair}>
                            <Pressable
                              style={[styles.formChip, active && styles.formChipActive]}
                              onPress={() => toggleContentCategoryFilter(item.key)}
                            >
                              <Text style={[styles.formChipText, active && styles.formChipTextActive]}>{item.label}</Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                  {!!contentCategoryFilters.length && (
                    <Text style={styles.personalMediaActiveHint}>
                      Categoria: {activeContentCategoryLabel}
                    </Text>
                  )}

                  <View style={styles.profileBlockHeaderRow}>
                    <Text style={styles.personalSectionTitle}>Itens guardados</Text>
                    <View style={styles.profileViewToggleRow}>
                      <Pressable
                        style={[styles.profileViewToggleBtn, savedContentView === 'list' && styles.profileViewToggleBtnActive]}
                        onPress={() => setSavedContentView('list')}
                      >
                        <Ionicons name="list-outline" size={13} color={savedContentView === 'list' ? '#0f172a' : '#64748b'} />
                      </Pressable>
                      <Pressable
                        style={[styles.profileViewToggleBtn, savedContentView === 'grid' && styles.profileViewToggleBtnActive]}
                        onPress={() => setSavedContentView('grid')}
                      >
                        <Ionicons name="grid-outline" size={13} color={savedContentView === 'grid' ? '#0f172a' : '#64748b'} />
                      </Pressable>
                    </View>
                  </View>

                  <Modal
                    visible={contentCategoryModalOpen}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                      setContentCategoryManageQuery('');
                      setContentCategoryModalOpen(false);
                    }}
                  >
                    <View style={styles.storyModalBackdrop}>
                      <Pressable
                        style={styles.shareModalBackdropFill}
                        onPress={() => {
                          setContentCategoryManageQuery('');
                          setContentCategoryModalOpen(false);
                        }}
                      />
                      <View style={styles.shareModalPanel}>
                        <Pressable
                          style={styles.mediaCategoryModalCloseIconBtn}
                          onPress={() => {
                            setContentCategoryManageQuery('');
                            setContentCategoryModalOpen(false);
                          }}
                        >
                          <Ionicons name="close" size={14} color="#475569" />
                        </Pressable>
                        <Text style={styles.shareModalTitle}>
                          {contentCategoryModalMode === 'manage' ? 'Gerir categorias' : 'Filtrar categorias'}
                        </Text>
                        <Text style={styles.formHint}>
                          {contentCategoryModalMode === 'manage'
                            ? 'Adiciona, remove e organiza categorias.'
                            : 'Seleciona várias categorias para filtrar.'}
                        </Text>
                        {contentCategoryModalMode === 'filter' ? (
                          <>
                            <View style={styles.exploreCategorySearchBox}>
                              <Ionicons name="search-outline" size={14} color="#64748b" />
                              <TextInput
                                value={contentCategoryManageQuery}
                                onChangeText={setContentCategoryManageQuery}
                                placeholder="Pesquisar categoria"
                                placeholderTextColor="#94a3b8"
                                autoCapitalize="none"
                                autoCorrect={false}
                                style={styles.exploreCategorySearchInput}
                              />
                            </View>
                            <ScrollView
                              style={styles.shareUsersList}
                              showsVerticalScrollIndicator={false}
                              keyboardShouldPersistTaps="handled"
                            >
                              <Pressable
                                style={[styles.exploreCategoryRow, !contentCategoryFilterDraft.length && styles.exploreCategoryRowActive]}
                                onPress={() => setContentCategoryFilterDraft([])}
                              >
                                <Text style={[styles.exploreCategoryText, !contentCategoryFilterDraft.length && styles.exploreCategoryTextActive]}>
                                  Ver todas
                                </Text>
                                <Ionicons
                                  name={!contentCategoryFilterDraft.length ? 'checkbox' : 'square-outline'}
                                  size={16}
                                  color={!contentCategoryFilterDraft.length ? '#0f172a' : '#94a3b8'}
                                />
                              </Pressable>
                              {orderedContentCategoryDefs
                                .filter((item) => {
                                  const q = String(contentCategoryManageQuery || '').trim().toLowerCase();
                                  if (!q) return true;
                                  return String(item?.label || '').toLowerCase().includes(q);
                                })
                                .map((item) => {
                                  const active = contentCategoryFilterDraft.includes(item.key);
                                  return (
                                    <Pressable
                                      key={`content-cat-filter-${item.key}`}
                                      style={[styles.exploreCategoryRow, active && styles.exploreCategoryRowActive]}
                                      onPress={() => toggleContentCategoryFilterDraft(item.key)}
                                    >
                                      <Text style={[styles.exploreCategoryText, active && styles.exploreCategoryTextActive]}>
                                        {item.label}
                                      </Text>
                                      <Ionicons
                                        name={active ? 'checkbox' : 'square-outline'}
                                        size={16}
                                        color={active ? '#0f172a' : '#94a3b8'}
                                      />
                                    </Pressable>
                                  );
                                })}
                            </ScrollView>
                          </>
                        ) : (
                          <>
                            <TextInput
                              value={contentCategoryManageQuery}
                              onChangeText={setContentCategoryManageQuery}
                              placeholder="Filtrar categorias..."
                              placeholderTextColor="#94a3b8"
                              autoCapitalize="none"
                              style={[styles.input, styles.mediaManageSearchInput]}
                            />
                            <View style={styles.mediaManageAddRow}>
                              <TextInput
                                value={newContentSubtabName}
                                onChangeText={setNewContentSubtabName}
                                placeholder="Nova categoria"
                                placeholderTextColor="#94a3b8"
                                style={[styles.input, styles.mediaManageAddInput]}
                              />
                              <Pressable style={[styles.recommendationMiniBtn, styles.mediaManageAddBtn]} onPress={handleAddContentSubtab}>
                                <Text style={styles.recommendationMiniBtnText}>Adicionar</Text>
                              </Pressable>
                            </View>
                            <View style={styles.mediaManageHeaderRow}>
                              <Text style={styles.formListTitle}>Ordem das categorias</Text>
                              <View style={styles.mediaManageHeaderActions}>
                                <Pressable
                                  style={[styles.recommendationMiniBtn, styles.mediaCategorySortBtn, !contentCategoryManageSelected && styles.formChipDisabled]}
                                  onPress={() => moveSelectedContentManageCategory('up')}
                                  disabled={!contentCategoryManageSelected || selectedContentManageIdx <= 0}
                                >
                                  <Ionicons name="chevron-up" size={10} color="#fff" />
                                </Pressable>
                                <Pressable
                                  style={[styles.recommendationMiniBtn, styles.mediaCategorySortBtn, !contentCategoryManageSelected && styles.formChipDisabled]}
                                  onPress={() => moveSelectedContentManageCategory('down')}
                                  disabled={
                                    !contentCategoryManageSelected ||
                                    selectedContentManageIdx < 0 ||
                                    selectedContentManageIdx >= visibleContentManageCategoryDefs.length - 1
                                  }
                                >
                                  <Ionicons name="chevron-down" size={10} color="#fff" />
                                </Pressable>
                              </View>
                            </View>
                            <ScrollView style={styles.shareUsersList}>
                              {visibleContentManageCategoryDefs.map((item) => {
                                const selected = contentCategoryManageSelected === item.key;
                                const hidden = hiddenContentCategoryKeys.has(item.key);
                                return (
                                  <Pressable
                                    key={`content-cat-modal-${item.key}`}
                                    style={[styles.exploreCategoryRow, selected && styles.exploreCategoryRowActive, hidden && { opacity: 0.6 }]}
                                    onPress={() => setContentCategoryManageSelected(item.key)}
                                  >
                                    <Text style={[styles.exploreCategoryText, selected && styles.exploreCategoryTextActive]} numberOfLines={1}>
                                      {item.label}
                                    </Text>
                                    <View style={styles.mediaManageRowActions}>
                                      <Pressable
                                        style={styles.mediaManageIconBtn}
                                        onPress={(event) => {
                                          event?.stopPropagation?.();
                                          toggleManageContentCategoryHidden(item.key);
                                        }}
                                      >
                                        <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={14} color="#475569" />
                                      </Pressable>
                                      <Pressable
                                        style={styles.mediaManageIconBtn}
                                        onPress={(event) => {
                                          event?.stopPropagation?.();
                                          removeManageContentCategoryItem(item);
                                        }}
                                      >
                                        <Ionicons name="trash-outline" size={14} color="#b91c1c" />
                                      </Pressable>
                                      <Ionicons
                                        name={selected ? 'checkbox' : 'square-outline'}
                                        size={16}
                                        color={selected ? '#0f172a' : '#94a3b8'}
                                      />
                                    </View>
                                  </Pressable>
                                );
                              })}
                            </ScrollView>
                          </>
                        )}
                        {contentCategoryModalMode === 'filter' && (
                          <View style={styles.shareModalActions}>
                            <Pressable
                              style={[styles.shareModalActionBtn, styles.shareModalActionBtnSecondary]}
                              onPress={() => setContentCategoryFilterDraft([])}
                            >
                              <Text style={styles.shareModalActionTextSecondary}>Limpar</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.shareModalActionBtn, styles.shareModalActionBtnPrimary]}
                              onPress={() => {
                                setContentCategoryFilters(Array.isArray(contentCategoryFilterDraft) ? contentCategoryFilterDraft : []);
                                setContentCategoryModalOpen(false);
                                showToast('Filtros aplicados');
                              }}
                            >
                              <Text style={styles.shareModalActionTextPrimary}>Aplicar</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  </Modal>

                  {!filteredSavedContentItems.length ? (
                    <Text style={styles.personalMediaActiveHint}>Nenhum item encontrado.</Text>
                  ) : savedContentView === 'grid' ? (
                    <View style={styles.savedContentGrid}>
                      {filteredSavedContentItems.map((item, idx) => {
                        const imageUri = resolveMediaUri(String(item?.uri || '').trim());
                        return (
                          <Pressable
                            key={`saved-content-grid-${idx}-${item?.kind || ''}-${item?.name || ''}`}
                            style={styles.savedContentGridCard}
                            onPress={() => openSavedContentItem(item)}
                          >
                            {!!imageUri ? (
                              <Image source={{ uri: imageUri }} style={styles.savedContentGridThumb} />
                            ) : (
                              <View style={styles.savedContentGridFallback}>
                                <Ionicons name={iconForSavedContentKind(item?.kind)} size={18} color="#334155" />
                              </View>
                            )}
                            <Text style={styles.savedContentGridTitle} numberOfLines={1}>
                              {String(item?.name || item?.section || item?.kind || 'Itens')}
                            </Text>
                            <Text style={styles.savedContentGridMeta} numberOfLines={1}>
                              {String(item?.section || '').trim() || String(item?.profileName || '').trim() || 'Sem secção'}
                            </Text>
                            <View style={styles.savedContentGridActions}>
                              <Pressable style={styles.formListCopyBtn} onPress={() => openSavedContentItem(item)}>
                                <Text style={styles.formListCopyText}>Ver</Text>
                              </Pressable>
                              {typeof onToggleSaveMedia === 'function' && (
                                <Pressable
                                  style={styles.formListDangerBtn}
                                  onPress={(event) => handleToggleSaveContentItem(item, event)}
                                >
                                  <Text style={styles.formListDangerText}>Remover</Text>
                                </Pressable>
                              )}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.formList}>
                      {filteredSavedContentItems.map((item, idx) => (
                        <Pressable
                          key={`saved-content-${idx}-${item?.kind || ''}-${item?.name || ''}`}
                          style={styles.formListRow}
                          onPress={() => openSavedContentItem(item)}
                        >
                          <Ionicons name={iconForSavedContentKind(item?.kind)} size={15} color="#334155" />
                          <View style={styles.editInputFlex}>
                            <Text style={styles.formListTitle} numberOfLines={1}>
                              {String(item?.name || item?.section || item?.kind || 'Itens')}
                            </Text>
                            <Text style={styles.formListValue} numberOfLines={1}>
                              {String(item?.section || '').trim() || String(item?.profileName || '').trim() || 'Sem secção'}
                            </Text>
                          </View>
                          <Pressable style={styles.formListCopyBtn} onPress={() => openSavedContentItem(item)}>
                            <Text style={styles.formListCopyText}>Ver</Text>
                          </Pressable>
                          {typeof onToggleSaveMedia === 'function' && (
                            <Pressable
                              style={styles.formListDangerBtn}
                              onPress={(event) => handleToggleSaveContentItem(item, event)}
                            >
                              <Text style={styles.formListDangerText}>Remover</Text>
                            </Pressable>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {tab === 'recent' && (
        <>
          {!recentProfiles.length ? (
            renderEmpty('Ainda não tens perfis recentes.', 'Descobrir perfis', openExploreFromEmpty)
          ) : (
            <>
              <View style={styles.grid}>
              {(() => {
                const fillCount = visibleRecentProfiles.length % 3 === 0 ? 0 : 3 - (visibleRecentProfiles.length % 3);
                const gridItems = fillCount ? [...visibleRecentProfiles, ...Array(fillCount).fill(null)] : visibleRecentProfiles;
                return gridItems.map((p, idx) => {
                  if (!p) {
                    return <View key={`recent-pad-${idx}`} style={[styles.card, styles.cardGridPad]} />;
                  }
                  return (
                    <MiniCard
                      key={`recent-${p.id}`}
                      profile={p}
                      onPress={() => onOpenProfile?.(p.id)}
                      onSavePress={() => handleToggleSaveProfile(p.id)}
                      isSaved={!!isSavedProfile?.(p.id)}
                    />
                  );
                });
              })()}
              </View>
              {hasMoreRecentProfiles && (
                <Pressable style={styles.personalLoadMoreBtn} onPress={() => setRecentProfilesLimit((v) => v + GRID_PAGE_SIZE)}>
                  <Text style={styles.personalLoadMoreBtnText}>Ver mais recentes</Text>
                </Pressable>
              )}
            </>
          )}
        </>
      )}

      {tab === 'alerts' && (
        <ScrollView
          style={styles.personalTabScroll}
          contentContainerStyle={styles.personalTabScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.personalSectionCard}>
            <Text style={styles.personalSectionTitle}>Preferências de sugestões</Text>
            <View style={styles.personalAlertsList}>
              {ALERT_OPTIONS.map((item) => {
                const active = !!alerts?.[item.key];
                return (
                  <Pressable
                    key={item.key}
                    style={styles.personalAlertRow}
                    onPress={() => onToggleAlert?.(item.key)}
                  >
                    <View style={styles.personalAlertLeft}>
                      <Ionicons name={item.icon} size={15} color="#334155" />
                      <Text style={styles.personalAlertLabel}>{item.label}</Text>
                      <Text style={styles.personalAlertHint}>{`${alertPreviewCounts[item.key] || 0} perfis`}</Text>
                    </View>
                    <View style={[styles.personalAlertToggle, active && styles.personalAlertToggleActive]}>
                      <View style={[styles.personalAlertKnob, active && styles.personalAlertKnobActive]} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {!!alerts?.newProfiles &&
            renderAlertProfilesBlock({
              title: 'Novos perfis',
              list: alertNewProfiles,
              keyPrefix: 'alert-new',
              emptyText: 'Sem perfis novos para mostrar.',
              onOpenProfile,
              count: alertNewProfiles.length,
            })}

          {!!alerts?.promos &&
            renderAlertProfilesBlock({
              title: 'Promoções',
              list: alertPromoProfiles,
              keyPrefix: 'alert-promo',
              emptyText: 'Sem promoções ativas.',
              onOpenProfile,
              count: alertPromoProfiles.length,
            })}

          {!!alerts?.nearby &&
            renderAlertProfilesBlock({
              title: 'Perto de mim',
              list: alertNearbyProfiles,
              keyPrefix: 'alert-near',
              emptyText: 'Sem perfis perto para mostrar.',
              onOpenProfile,
              count: alertNearbyProfiles.length,
            })}
        </ScrollView>
      )}

      {tab === 'recommendations' && (
        <>
          <View style={styles.personalSectionCard}>
            <Text style={styles.personalSectionTitle}>Partilha privada</Text>
            <Text style={styles.formHint}>
              O primeiro envio cria um pedido. Depois de aceitares, esse utilizador pode continuar a partilhar.
            </Text>
            {!!recommendationsError && <Text style={styles.authError}>{recommendationsError}</Text>}
          </View>

          {!!recommendationRequests.length && (
            <View style={styles.personalSectionCard}>
              <Text style={styles.personalSectionTitle}>Pedidos de permissao</Text>
              <View style={styles.formList}>
                {recommendationRequests.map((req) => {
                  const approveKey = `approve:${req.sender_user_id}`;
                  const rejectKey = `reject:${req.sender_user_id}`;
                  const isApproveBusy = !!recommendationActionBusy[approveKey];
                  const isRejectBusy = !!recommendationActionBusy[rejectKey];
                  return (
                    <View key={`req-${req.sender_user_id}-${req.created_at}`} style={styles.formListRow}>
                      <View style={styles.recommendationUserAvatarSmall}>
                        <Ionicons name="person" size={12} color="#475569" />
                      </View>
                      <View style={styles.editInputFlex}>
                        <Text style={styles.formListTitle} numberOfLines={1}>
                          {req.sender_name || req.sender_email}
                        </Text>
                        <Text style={styles.formListValue} numberOfLines={1}>
                          {req.sender_email}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.recommendationMiniBtn}
                        onPress={() => handlePermissionAction('approve', req.sender_user_id)}
                        disabled={isApproveBusy}
                      >
                        <Text style={styles.recommendationMiniBtnText}>Aceitar</Text>
                      </Pressable>
                      <Pressable
                        style={styles.formListDangerBtn}
                        onPress={() => handlePermissionAction('reject', req.sender_user_id)}
                        disabled={isRejectBusy}
                      >
                        <Text style={styles.formListDangerText}>Recusar</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {recommendationsLoading ? (
            renderEmpty('A carregar partilhas...')
          ) : !recommendationConversations.length ? (
            renderEmpty('Ainda não tens partilhas.', 'Descobrir perfis', openExploreFromEmpty)
          ) : (
            <View style={styles.formList}>
              <TextInput
                value={recommendationSearchQuery}
                onChangeText={setRecommendationSearchQuery}
                placeholder="Pesquisar conversa por nome ou e-mail"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                style={styles.input}
              />
              {!filteredRecommendationConversations.length ? (
                <Text style={styles.formHint}>Sem resultados para esta pesquisa.</Text>
              ) : filteredRecommendationConversations.map((conversation) => {
                const items = Array.isArray(conversation?.items) ? conversation.items : [];
                if (!items.length) return null;
                const userName = conversation?.user?.name || conversation?.user?.email || 'Utilizador';
                const userAvatar = resolveMediaUri(conversation?.user?.avatar || '');
                const pinned = pinnedConversationKeys.includes(conversation.key);
                const latestTs = items.reduce((maxTs, rec) => {
                  const createdTs = Date.parse(String(rec?.created_at || ''));
                  const updatedTs = Date.parse(String(rec?.updated_at || ''));
                  const sentTs = Date.parse(String(rec?.sent_at || ''));
                  const candidate = Math.max(
                    Number.isFinite(createdTs) ? createdTs : 0,
                    Number.isFinite(updatedTs) ? updatedTs : 0,
                    Number.isFinite(sentTs) ? sentTs : 0
                  );
                  return Math.max(maxTs, candidate);
                }, 0);
                const lastTime = formatConversationTime(latestTs);
                return (
                  <Pressable
                    key={`rec-conv-${conversation.key}`}
                    style={styles.recommendationCard}
                    onPress={() => setRecommendationConversationKey(conversation.key)}
                  >
                    <View style={styles.recommendationThreadRow}>
                      <View style={styles.recommendationThreadMain}>
                        {userAvatar ? (
                          <Image source={{ uri: userAvatar }} style={styles.recommendationUserAvatarSmall} />
                        ) : (
                          <View style={styles.recommendationUserAvatarSmall}>
                            <Ionicons name="person" size={12} color="#475569" />
                          </View>
                        )}
                        <Text style={styles.formListTitle} numberOfLines={1}>{userName}</Text>
                        {pinned && <Text style={styles.recommendationThreadPinnedTag}>Fixada</Text>}
                      </View>
                      <View style={styles.recommendationThreadMeta}>
                        <Pressable
                          style={styles.recommendationThreadPinBtn}
                          onPress={(event) => {
                            event?.stopPropagation?.();
                            togglePinnedConversation(conversation.key);
                          }}
                        >
                          <Ionicons
                            name={pinned ? 'star' : 'star-outline'}
                            size={12}
                            color={pinned ? '#f59e0b' : '#64748b'}
                          />
                        </Pressable>
                        {!!lastTime && <Text style={styles.recommendationThreadTime}>{lastTime}</Text>}
                        <View style={styles.recommendationThreadBadge}>
                          <Text style={styles.recommendationThreadBadgeText}>{items.length}</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}

      <Modal
        visible={!!savedMediaPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setSavedMediaPreview(null)}
      >
        <View style={styles.storyModalBackdrop}>
          <View style={savedPreviewIsContent ? styles.recommendationPreviewPanelContent : styles.galleryModalPanel}>
            <View style={[styles.storyModalHeader, styles.recommendationPreviewHeader]}>
              <View style={styles.storyModalProfile}>
                <View style={styles.storyModalMeta}>
                  <Text style={styles.storyModalName} numberOfLines={1}>
                    {savedMediaPreview?.sourceName || 'Guardado'}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.storyModalCloseBtn} onPress={() => setSavedMediaPreview(null)}>
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>

            <View
              style={
                savedPreviewIsContent
                  ? [
                      styles.recommendationPreviewContentMediaWrap,
                      !savedPreviewHasImage && styles.recommendationPreviewContentMediaWrapCompact,
                    ]
                  : styles.storyModalMediaWrap
              }
            >
              {savedMediaPreview?.type === 'photo' && !!savedMediaPreview?.contentUri ? (
                <Image source={{ uri: savedMediaPreview.contentUri }} style={styles.storyModalImage} resizeMode="contain" />
              ) : ['service', 'product', 'menu', 'portfolio', 'house', 'room', 'campaign', 'content'].includes(savedMediaPreview?.type) && !!savedMediaPreview?.contentUri ? (
                <Image source={{ uri: savedMediaPreview.contentUri }} style={styles.recommendationPreviewContentImage} resizeMode="cover" />
              ) : ['service', 'product', 'menu', 'portfolio', 'house', 'room', 'campaign', 'content'].includes(savedMediaPreview?.type) ? (
                <View style={styles.galleryModalVideoTile}>
                  <Ionicons
                    name={
                      savedMediaPreview?.type === 'service'
                        ? 'construct-outline'
                        : savedMediaPreview?.type === 'product'
                          ? 'cube-outline'
                          : savedMediaPreview?.type === 'menu'
                            ? 'restaurant-outline'
                            : savedMediaPreview?.type === 'portfolio'
                              ? 'briefcase-outline'
                              : savedMediaPreview?.type === 'house'
                                ? 'home-outline'
                                : savedMediaPreview?.type === 'room'
                                  ? 'bed-outline'
                                  : savedMediaPreview?.type === 'campaign'
                                    ? 'megaphone-outline'
                                    : 'layers-outline'
                    }
                    size={34}
                    color="#fff"
                  />
                  <Text style={styles.galleryModalVideoText}>
                    {savedMediaPreview?.itemShare?.name || 'Item'}
                  </Text>
                </View>
              ) : (
                <View style={styles.galleryModalVideoTile}>
                  <Ionicons name={savedMediaPreview?.type === 'video' ? 'videocam-outline' : 'film-outline'} size={34} color="#fff" />
                  <Text style={styles.galleryModalVideoText}>Video</Text>
                </View>
              )}
            </View>

            {savedPreviewIsContent && (
              <View style={styles.recommendationPreviewContentInfo}>
                <View style={styles.recommendationPreviewContentInfoTop}>
                  <Text style={styles.recommendationPreviewContentName} numberOfLines={2}>
                    {savedPreviewName}
                  </Text>
                  <View style={styles.recommendationPreviewContentActions}>
                    <Text style={styles.recommendationPreviewContentKind}>
                      {savedPreviewKindLabel}
                    </Text>
                    <Pressable
                      style={styles.recommendationPreviewContentOpenBtn}
                      onPress={() => {
                        const token = savedMediaPreview?.openToken;
                        const itemShare = savedMediaPreview?.itemShare;
                        if (!token || !itemShare?.kind) return;
                        setSavedMediaPreview(null);
                        onOpenProfileItem?.(token, itemShare);
                      }}
                      disabled={!savedMediaPreview?.openToken || !savedMediaPreview?.itemShare?.kind}
                    >
                      <Text style={styles.recommendationPreviewContentOpenBtnText}>Ver</Text>
                    </Pressable>
                  </View>
                </View>
                {(!!savedPreviewPrice || !!savedPreviewOldPrice || !!savedPreviewTime) && (
                  <View style={styles.recommendationPreviewContentMetaRow}>
                    {!!savedPreviewPrice && (
                      <Text style={styles.recommendationPreviewContentPrice}>{savedPreviewPrice}</Text>
                    )}
                    {!!savedPreviewOldPrice && (
                      <Text style={styles.recommendationPreviewContentOldPrice}>{savedPreviewOldPrice}</Text>
                    )}
                    {!!savedPreviewTime && (
                      <Text style={styles.recommendationPreviewContentTime}>{savedPreviewTime}</Text>
                    )}
                  </View>
                )}
                {!!savedPreviewNote && (
                  <Text style={styles.recommendationPreviewContentNote} numberOfLines={4}>
                    {savedPreviewNote}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.recommendationPreviewFooter}>
              <View style={styles.recommendationPreviewIdentity}>
                {savedMediaPreview?.avatar ? (
                  <Image source={{ uri: savedMediaPreview.avatar }} style={styles.recommendationUserAvatarSmall} />
                ) : (
                  <View style={styles.recommendationUserAvatarSmall}>
                    <Ionicons name="person" size={12} color="#475569" />
                  </View>
                )}
                <Text style={styles.recommendationPreviewName} numberOfLines={1}>
                  {savedMediaPreview?.sourceName || 'Guardado'}
                </Text>
              </View>
              <Pressable
                style={styles.recommendationMiniBtn}
                onPress={() => {
                  const token = savedMediaPreview?.openToken;
                  if (!token) return;
                  const itemShare = savedMediaPreview?.itemShare;
                  setSavedMediaPreview(null);
                  if (itemShare?.kind) {
                    onOpenProfileItem?.(token, itemShare);
                    return;
                  }
                  onOpenProfile?.(token);
                }}
                disabled={!savedMediaPreview?.openToken}
              >
                <Text style={styles.recommendationMiniBtnText}>
                  {savedMediaPreview?.itemShare?.kind ? 'Ver' : 'Ver perfil'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {!!toastMessage && (
        <View pointerEvents="none" style={styles.personalToastWrap}>
          <View style={styles.personalToastBubble}>
            <Text style={styles.personalToastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      <Modal
        visible={!!activeConversation}
        transparent
        animationType="slide"
        onRequestClose={() => setRecommendationConversationKey(null)}
      >
        <View style={styles.storyModalBackdrop}>
          <View style={styles.recommendationConversationModal}>
            <View style={styles.recommendationConversationTop}>
              <Pressable
                style={styles.recommendationConversationBackBtn}
                onPress={() => setRecommendationConversationKey(null)}
              >
                <Ionicons name="chevron-back" size={16} color="#0f172a" />
                <Text style={styles.recommendationConversationBackText}>Conversas</Text>
              </Pressable>
              <Text style={styles.formHintInline}>
                {activeConversation?.items?.length || 0} partilhas
              </Text>
            </View>

            <View style={styles.recommendationConversationTabs}>
              <Pressable
                style={[
                  styles.formChip,
                  conversationContentTab === 'received' && styles.formChipActive,
                ]}
                onPress={() => setConversationContentTab('received')}
              >
                <Text
                  style={[
                    styles.formChipText,
                    conversationContentTab === 'received' && styles.formChipTextActive,
                  ]}
                >
                  Recebidos
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.formChip,
                  conversationContentTab === 'sent' && styles.formChipActive,
                ]}
                onPress={() => setConversationContentTab('sent')}
              >
                <Text
                  style={[
                    styles.formChipText,
                    conversationContentTab === 'sent' && styles.formChipTextActive,
                  ]}
                >
                  Enviados
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.recommendationConversationBody}>
              {!activeConversationItems.length ? (
                <Text style={styles.formHint}>Sem partilhas nesta aba.</Text>
              ) : (
                <View style={styles.recommendationBlocksWrap}>
                  {[
                    { key: 'profile', label: 'Perfis' },
                    { key: 'photo', label: 'Fotos' },
                    { key: 'content', label: 'Itens' },
                  ].map((section) => {
                    const items = sortRecommendationsByRecent(activeConversationSections[section.key] || []);
                    return (
                      <View key={`section-${section.key}`} style={styles.recommendationTypeBlock}>
                        <View style={styles.recommendationTypeHeader}>
                          <Text style={styles.personalSectionTitle}>{section.label}</Text>
                          <Text style={styles.formHintInline}>{items.length}</Text>
                        </View>
                        {!items.length ? (
                          <Text style={styles.formHint}>Sem {section.label.toLowerCase()}.</Text>
                        ) : (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendationTypeScroller}>
                            {items.map((rec, idx) => {
                              const itemShare = parseSharedItemPayload(rec?.content_uri);
                              const sourceName = String(rec?.source_profile_name || 'perfil');
                              const openToken = rec?.profile_slug || rec?.profile_id;
                              const canOpen = !!openToken;
                              const previewPayload = buildConversationPreviewPayload(rec, section.key);
                              const previewAvatar = String(previewPayload?.avatar || '').trim();
                              const contentKind = String(previewPayload?.itemShare?.kind || '').trim().toLowerCase();
                              const recKey = recommendationKey(rec, section.key);
                              const isUnseen = !seenRecommendationIds.includes(recKey);
                              const sentAtText = formatConversationTime(getRecommendationTimestamp(rec));
                              if (section.key === 'profile') {
                                const miniProfile = {
                                  id: String(openToken || `shared-profile-${rec.id || idx}`),
                                  name: sourceName,
                                  category: 'Partilhado',
                                  location: 'Vore',
                                  rating: '',
                                  badge: '',
                                  data: { avatar: previewAvatar || '' },
                                };
                                return (
                                  <View key={`conv-profile-wrap-${rec.id || idx}`} style={styles.recommendationProfileMiniWrap}>
                                    {isUnseen && <View style={styles.recommendationUnseenDot} />}
                                    <MiniCard
                                      key={`conv-profile-mini-${rec.id || idx}`}
                                      profile={miniProfile}
                                      onPress={() => {
                                        markRecommendationsSeen([recKey]);
                                        canOpen && openSharedProfile(openToken);
                                      }}
                                      compact
                                      showSave={false}
                                    />
                                    {!!sentAtText && <Text style={styles.recommendationShareCardTime}>{sentAtText}</Text>}
                                  </View>
                                );
                              }
                              return (
                                <Pressable
                                  key={`conv-${section.key}-${rec.id || idx}`}
                                  style={styles.recommendationShareCard}
                                  onPress={() => {
                                    markRecommendationsSeen([recKey]);
                                    setConversationMediaPreview(previewPayload);
                                  }}
                                >
                                  {isUnseen && <View style={styles.recommendationUnseenDot} />}
                                  <View style={styles.recommendationShareCardMedia}>
                                    {section.key === 'photo' && !!previewPayload.contentUri ? (
                                      <Image source={{ uri: previewPayload.contentUri }} style={styles.recommendationShareCardImage} />
                                    ) : section.key === 'content' && !!previewPayload.contentUri ? (
                                      <Image source={{ uri: previewPayload.contentUri }} style={styles.recommendationShareCardImage} />
                                    ) : section.key === 'content' ? (
                                      <View style={styles.recommendationShareCardMediaFallback}>
                                        <Ionicons
                                          name={
                                            contentKind === 'service'
                                              ? 'construct-outline'
                                              : contentKind === 'product'
                                                ? 'cube-outline'
                                                : contentKind === 'menu'
                                                  ? 'restaurant-outline'
                                                  : contentKind === 'portfolio'
                                                    ? 'briefcase-outline'
                                                    : contentKind === 'house'
                                                      ? 'home-outline'
                                                      : contentKind === 'room'
                                                        ? 'bed-outline'
                                                        : contentKind === 'campaign'
                                                          ? 'megaphone-outline'
                                                          : 'layers-outline'
                                          }
                                          size={22}
                                          color="#fff"
                                        />
                                        <Text style={styles.recommendationShareCardMediaText}>
                                          {contentKind === 'service'
                                            ? 'Serviço'
                                            : contentKind === 'product'
                                              ? 'Produto'
                                              : contentKind === 'menu'
                                                ? 'Menu'
                                                : contentKind === 'portfolio'
                                                  ? 'Portfolio'
                                                  : contentKind === 'house'
                                                    ? 'Casa'
                                                    : contentKind === 'room'
                                                      ? 'Quarto'
                                                      : contentKind === 'campaign'
                                                        ? 'Campanha'
                                                        : 'Itens'}
                                        </Text>
                                      </View>
                                      ) : (
                                      <View style={styles.recommendationShareCardMediaFallback}>
                                        <Ionicons
                                          name={section.key === 'profile' ? 'person-circle-outline' : 'videocam-outline'}
                                          size={22}
                                          color="#fff"
                                        />
                                        <Text style={styles.recommendationShareCardMediaText}>
                                          {section.key === 'profile' ? 'Perfil' : 'Foto'}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <View style={styles.recommendationShareCardFooter}>
                                    {previewPayload.avatar ? (
                                      <Image source={{ uri: previewPayload.avatar }} style={styles.recommendationUserAvatarSmall} />
                                    ) : (
                                      <View style={styles.recommendationUserAvatarSmall}>
                                        <Ionicons name="person" size={12} color="#475569" />
                                      </View>
                                    )}
                                    <Text style={styles.recommendationShareCardName} numberOfLines={1}>
                                      {itemShare?.name || sourceName}
                                    </Text>
                                  </View>
                                  {!!sentAtText && <Text style={styles.recommendationShareCardTime}>{sentAtText}</Text>}
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {!!conversationMediaPreview && (
              <View
                style={[
                  styles.recommendationConversationPreviewOverlay,
                  previewIsContent && styles.recommendationConversationPreviewOverlayContent,
                ]}
                onTouchStart={previewIsContent ? onPreviewTouchStart : undefined}
                onTouchEnd={previewIsContent ? onPreviewTouchEnd : undefined}
              >
                <View
                  style={previewIsContent ? styles.recommendationPreviewPanelContent : styles.galleryModalPanel}
                >
                  <View style={[styles.storyModalHeader, styles.recommendationPreviewHeader]}>
                    <View style={styles.storyModalProfile}>
                      <View style={styles.storyModalMeta}>
                        <Text style={styles.storyModalName} numberOfLines={1}>
                          {conversationMediaPreview?.sourceName || 'Perfil'}
                        </Text>
                      </View>
                    </View>
                    <Pressable style={styles.storyModalCloseBtn} onPress={() => setConversationMediaPreview(null)}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </Pressable>
                  </View>

                  <View
                    style={
                      previewIsContent
                        ? [
                            styles.recommendationPreviewContentMediaWrap,
                            !previewHasContentImage && styles.recommendationPreviewContentMediaWrapCompact,
                          ]
                        : styles.storyModalMediaWrap
                    }
                  >
                    {previewSectionItems.length > 1 && previewCurrentIndex > 0 && (
                      <Pressable style={styles.galleryNavBtnLeft} onPress={() => openPreviewByIndex(previewCurrentIndex - 1)}>
                        <Ionicons name="chevron-back" size={20} color="#fff" />
                      </Pressable>
                    )}
                    {previewSectionItems.length > 1 && previewCurrentIndex >= 0 && previewCurrentIndex < previewSectionItems.length - 1 && (
                      <Pressable style={styles.galleryNavBtnRight} onPress={() => openPreviewByIndex(previewCurrentIndex + 1)}>
                        <Ionicons name="chevron-forward" size={20} color="#fff" />
                      </Pressable>
                    )}
                    {conversationMediaPreview?.type === 'photo' && !!conversationMediaPreview?.contentUri ? (
                      <Image
                        source={{ uri: conversationMediaPreview.contentUri }}
                        style={styles.storyModalImage}
                        resizeMode="contain"
                      />
                    ) : conversationMediaPreview?.type === 'profile' ? (
                      <View style={styles.galleryModalVideoTile}>
                        <Ionicons name="person-circle-outline" size={34} color="#fff" />
                        <Text style={styles.galleryModalVideoText}>Perfil</Text>
                      </View>
                    ) : ['service', 'product', 'menu', 'portfolio', 'house', 'room', 'campaign', 'content'].includes(conversationMediaPreview?.type) && !!conversationMediaPreview?.contentUri ? (
                      <Image
                        source={{ uri: conversationMediaPreview.contentUri }}
                        style={styles.recommendationPreviewContentImage}
                        resizeMode="cover"
                      />
                    ) : ['service', 'product', 'menu', 'portfolio', 'house', 'room', 'campaign', 'content'].includes(conversationMediaPreview?.type) ? (
                      <View style={styles.galleryModalVideoTile}>
                        <Ionicons
                          name={
                            conversationMediaPreview?.type === 'service'
                              ? 'construct-outline'
                              : conversationMediaPreview?.type === 'product'
                                ? 'cube-outline'
                                : conversationMediaPreview?.type === 'menu'
                                  ? 'restaurant-outline'
                                  : conversationMediaPreview?.type === 'portfolio'
                                    ? 'briefcase-outline'
                                    : conversationMediaPreview?.type === 'house'
                                      ? 'home-outline'
                                      : conversationMediaPreview?.type === 'room'
                                        ? 'bed-outline'
                                      : conversationMediaPreview?.type === 'campaign'
                                        ? 'megaphone-outline'
                                        : 'layers-outline'
                          }
                          size={34}
                          color="#fff"
                        />
                        <Text style={styles.galleryModalVideoText}>
                          {conversationMediaPreview?.itemShare?.name || conversationMediaPreview?.sourceName || 'Item'}
                        </Text>
                        {!!conversationMediaPreview?.itemShare?.price && (
                          <Text style={styles.formHintInline}>{conversationMediaPreview.itemShare.price}</Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.galleryModalVideoTile}>
                        <Ionicons
                          name="videocam-outline"
                          size={34}
                          color="#fff"
                        />
                        <Text style={styles.galleryModalVideoText}>
                          Video
                        </Text>
                      </View>
                    )}
                  </View>

                  {previewIsContent && (
                    <View style={styles.recommendationPreviewContentInfo}>
                      <View style={styles.recommendationPreviewContentInfoTop}>
                        <Text style={styles.recommendationPreviewContentName} numberOfLines={2}>
                          {previewItemName}
                        </Text>
                        <View style={styles.recommendationPreviewContentActions}>
                          <Text style={styles.recommendationPreviewContentKind}>
                            {previewKindLabel}
                          </Text>
                          <Pressable
                            style={styles.recommendationPreviewContentOpenBtn}
                            onPress={() => {
                              const token = conversationMediaPreview?.openToken;
                              const itemShare = conversationMediaPreview?.itemShare;
                              if (!token || !itemShare) return;
                              openSharedProfileItem(token, itemShare);
                            }}
                            disabled={!conversationMediaPreview?.openToken || !conversationMediaPreview?.itemShare}
                          >
                            <Text style={styles.recommendationPreviewContentOpenBtnText}>Ver</Text>
                          </Pressable>
                        </View>
                      </View>
                      {(!!previewItemPrice || !!previewItemOldPrice || !!previewItemTime) && (
                        <View style={styles.recommendationPreviewContentMetaRow}>
                          {!!previewItemPrice && (
                            <Text style={styles.recommendationPreviewContentPrice}>{previewItemPrice}</Text>
                          )}
                          {!!previewItemOldPrice && (
                            <Text style={styles.recommendationPreviewContentOldPrice}>{previewItemOldPrice}</Text>
                          )}
                          {!!previewItemTime && (
                            <Text style={styles.recommendationPreviewContentTime}>{previewItemTime}</Text>
                          )}
                        </View>
                      )}
                      {!!previewItemNote && (
                        <Text style={styles.recommendationPreviewContentNote} numberOfLines={4}>
                          {previewItemNote}
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={styles.recommendationPreviewFooter}>
                    <View style={styles.recommendationPreviewIdentity}>
                      {conversationMediaPreview?.avatar ? (
                        <Image source={{ uri: conversationMediaPreview.avatar }} style={styles.recommendationUserAvatarSmall} />
                      ) : (
                        <View style={styles.recommendationUserAvatarSmall}>
                          <Ionicons name="person" size={12} color="#475569" />
                        </View>
                      )}
                      <Text style={styles.recommendationPreviewName} numberOfLines={1}>
                        {conversationMediaPreview?.sourceName || 'Perfil'}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.recommendationMiniBtn}
                      onPress={() => {
                        const token = conversationMediaPreview?.openToken;
                        if (token) openSharedProfile(token);
                      }}
                      disabled={!conversationMediaPreview?.openToken}
                    >
                      <Text style={styles.recommendationMiniBtnText}>Ver perfil</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}




