
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  authLogin,
  authRegister,
  authMe,
  authLogout,
  getApiBase,
  profileCreate,
  profileMe,
  profilesFeed,
  profileUpdate,
  recommendationsMe,
  recommendationsPermissionAction,
  recommendationsReact,
  recommendationsSend,
} from './src/api/client';
import {
  FALLBACK_PROFILES,
  mapProfileRow,
  sanitizeProfilePayload,
  slugifyName,
} from './src/data/profileModel';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import ProfileTypeOnboardingScreen from './src/screens/ProfileTypeOnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { styles } from './src/styles/appStyles';

const TYPE_CATEGORY_MAP = {
  service_pro: 'Serviços',
  food: 'Restaurante',
  shop: 'Loja',
  lodging: 'Alojamento',
  creator: 'Criador',
};

const DEFAULT_PERSONAL_INTERESTS = ['restaurantes', 'alojamento', 'bem-estar'];
const DEFAULT_PERSONAL_ALERTS = {
  newProfiles: true,
  promos: true,
  nearby: false,
};

const DEFAULT_PROFESSIONAL_SETTINGS = {
  accountName: '',
  accountEmail: '',
  profileType: 'service_pro',
  category: '',
  location: '',
  instagram: '',
  website: '',
  whatsapp: '',
  manageTabsEnabled: true,
  manageOrderEnabled: true,
  manageVisibilityEnabled: true,
  promoEnabled: false,
  promoDuration: '7 dias',
  notifVisits: true,
  notifShares: true,
  notifPromos: true,
  appLanguage: 'pt',
  appTheme: 'claro',
};

function normalizeDraftSeed(seed) {
  const raw = seed && typeof seed === 'object' ? seed : {};
  const type = String(raw.type || 'service_pro').toLowerCase();
  const category = String(raw.category || TYPE_CATEGORY_MAP[type] || TYPE_CATEGORY_MAP.service_pro).trim();
  return {
    type,
    category: category || TYPE_CATEGORY_MAP.service_pro,
  };
}

function isProfessionalUser(user) {
  return String(user?.account_type || 'professional').toLowerCase() !== 'common';
}

function mergeProfiles(feedList, mineProfile) {
  const output = [];
  const seen = new Set();

  const pushUnique = (profile) => {
    if (!profile) return;
    const key = `${profile.remoteId || ''}|${profile.id || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push(profile);
  };

  pushUnique(mineProfile);
  (feedList || []).forEach(pushUnique);
  return output;
}

function normalizeMediaList(input) {
  return (Array.isArray(input) ? input : [])
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') return String(item.url || item.src || '').trim();
      return '';
    })
    .filter(Boolean);
}

function normalizeSavedMediaType(rawType) {
  const t = String(rawType || '').trim().toLowerCase();
  if (['photo', 'photos', 'foto', 'fotos', 'image', 'images'].includes(t)) return 'photos';
  if (['video', 'videos'].includes(t)) return 'videos';
  if (['reel', 'reels'].includes(t)) return 'reels';
  if (['content', 'conteudo', 'conteúdo', 'item'].includes(t)) return 'content';
  return '';
}

function normalizeSavedMediaEntry(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const type = normalizeSavedMediaType(raw.type);
  const uri = String(raw.uri || '').trim();
  const name = String(raw.name || '').trim();
  if (!type) return null;
  if (type !== 'content' && !uri) return null;
  if (type === 'content' && !uri && !name) return null;
  return {
    type,
    uri,
    category: String(raw.category || '').trim(),
    profileName: String(raw.profileName || '').trim(),
    profileId: String(raw.profileId || '').trim(),
    profileSlug: String(raw.profileSlug || '').trim(),
    kind: String(raw.kind || '').trim().toLowerCase(),
    section: String(raw.section || '').trim(),
    name,
    note: String(raw.note || '').trim(),
    price: String(raw.price || '').trim(),
    oldPrice: String(raw.oldPrice || '').trim(),
    time: String(raw.time || '').trim(),
    savedAt: String(raw.savedAt || raw.createdAt || '').trim(),
  };
}

function savedMediaEntryKey(entry) {
  const e = normalizeSavedMediaEntry(entry);
  if (!e) return '';
  if (e.type === 'content') {
    return `${e.type}|${e.uri || ''}|${e.kind || ''}|${e.name || ''}|${e.profileId || ''}|${e.profileSlug || ''}`;
  }
  return `${e.type}|${e.uri}|${e.profileId || ''}|${e.profileSlug || ''}`;
}

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [guestMode, setGuestMode] = useState(false);
  const [entryStep, setEntryStep] = useState('welcome');
  const [authError, setAuthError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [showTypeOnboarding, setShowTypeOnboarding] = useState(false);
  const [draftProfileSeed, setDraftProfileSeed] = useState(normalizeDraftSeed({}));

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [profiles, setProfiles] = useState(FALLBACK_PROFILES);
  const [ownerProfileId, setOwnerProfileId] = useState(null);
  const [selectedId, setSelectedId] = useState(FALLBACK_PROFILES[0]?.id || null);
  const [feedFilter, setFeedFilter] = useState('destaques');
  const [savedProfileIds, setSavedProfileIds] = useState([]);
  const [savedMediaEntries, setSavedMediaEntries] = useState([]);
  const [recentProfileIds, setRecentProfileIds] = useState([]);
  const [personalInterests, setPersonalInterests] = useState(DEFAULT_PERSONAL_INTERESTS);
  const [personalAlerts, setPersonalAlerts] = useState(DEFAULT_PERSONAL_ALERTS);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsSent, setRecommendationsSent] = useState([]);
  const [recommendationRequests, setRecommendationRequests] = useState([]);
  const [profileOpenIntent, setProfileOpenIntent] = useState(null);

  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [appLanguage, setAppLanguage] = useState('pt');
  const [settingsSaveBusy, setSettingsSaveBusy] = useState(false);
  const [settingsSaveError, setSettingsSaveError] = useState('');
  const [professionalSettings, setProfessionalSettings] = useState(DEFAULT_PROFESSIONAL_SETTINGS);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedId) || null,
    [profiles, selectedId]
  );
  const ownerProfile = useMemo(
    () => profiles.find((p) => p.id === ownerProfileId) || null,
    [profiles, ownerProfileId]
  );
  const homeProfiles = useMemo(
    () => profiles.filter((p) => (feedFilter === 'destaques' ? true : p.filter === feedFilter)),
    [profiles, feedFilter]
  );
  const suggestedProfiles = useMemo(() => [...profiles].slice(0, 6), [profiles]);
  const savedProfiles = useMemo(
    () => savedProfileIds.map((id) => profiles.find((p) => p.id === id)).filter(Boolean),
    [profiles, savedProfileIds]
  );
  const recentShareUsers = useMemo(() => {
    const out = [];
    const seen = new Set();
    const currentUserId = Number(authUser?.id || 0);

    const pushUser = (raw) => {
      const u = raw && typeof raw === 'object' ? raw : null;
      if (!u) return;
      const id = Number(u.id || 0);
      const email = String(u.email || '').trim().toLowerCase();
      if (id > 0 && currentUserId > 0 && id === currentUserId) return;
      const key = id > 0 ? `id:${id}` : `email:${email}`;
      if (!key || key === 'email:' || seen.has(key)) return;
      seen.add(key);
      out.push({
        id,
        name: String(u.name || '').trim(),
        email: String(u.email || '').trim(),
      });
    };

    (Array.isArray(recommendationsSent) ? recommendationsSent : []).forEach((rec) => pushUser(rec?.receiver));
    (Array.isArray(recommendations) ? recommendations : []).forEach((rec) => pushUser(rec?.sender));
    return out.slice(0, 20);
  }, [recommendationsSent, recommendations, authUser?.id]);
  const recentProfiles = useMemo(
    () => recentProfileIds.map((id) => profiles.find((p) => p.id === id)).filter(Boolean),
    [profiles, recentProfileIds]
  );
  const savedMediaEntryKeySet = useMemo(() => {
    const out = new Set();
    (Array.isArray(savedMediaEntries) ? savedMediaEntries : []).forEach((entry) => {
      const key = savedMediaEntryKey(entry);
      if (key) out.add(key);
    });
    return out;
  }, [savedMediaEntries]);
  const savedMedia = useMemo(() => {
    const output = { photos: [], videos: [], reels: [], items: [], categories: [], contentItems: [] };
    const seen = {
      photos: new Set(),
      videos: new Set(),
      reels: new Set(),
      content: new Set(),
    };
    const seenItem = new Set();
    const seenCategory = new Set();
    savedProfiles.forEach((profile) => {
      const gallery = profile?.data?.gallery || {};
      const photos = normalizeMediaList(gallery.photos || gallery.fotos || gallery.images);
      const videos = normalizeMediaList(gallery.videos);
      const reels = normalizeMediaList(gallery.reels);
      const profileCategory = String(profile?.category || profile?.type || 'geral').trim();
      const profileName = String(profile?.name || '').trim();
      const categoryKey = profileCategory.toLowerCase();

      if (profileCategory && !seenCategory.has(categoryKey)) {
        seenCategory.add(categoryKey);
        output.categories.push(profileCategory);
      }

      photos.forEach((uri) => {
        if (seen.photos.has(uri)) return;
        seen.photos.add(uri);
        output.photos.push(uri);

        const mediaKey = `photos|${uri}`;
        if (!seenItem.has(mediaKey)) {
          seenItem.add(mediaKey);
          output.items.push({
            type: 'photos',
            uri,
            category: profileCategory,
            profileName,
            profileId: profile?.id || '',
          });
        }
      });
      videos.forEach((uri) => {
        if (seen.videos.has(uri)) return;
        seen.videos.add(uri);
        output.videos.push(uri);

        const mediaKey = `videos|${uri}`;
        if (!seenItem.has(mediaKey)) {
          seenItem.add(mediaKey);
          output.items.push({
            type: 'videos',
            uri,
            category: profileCategory,
            profileName,
            profileId: profile?.id || '',
          });
        }
      });
      reels.forEach((uri) => {
        if (seen.reels.has(uri)) return;
        seen.reels.add(uri);
        output.reels.push(uri);

        const mediaKey = `reels|${uri}`;
        if (!seenItem.has(mediaKey)) {
          seenItem.add(mediaKey);
          output.items.push({
            type: 'reels',
            uri,
            category: profileCategory,
            profileName,
            profileId: profile?.id || '',
          });
        }
      });
    });
    (Array.isArray(savedMediaEntries) ? savedMediaEntries : []).forEach((entry) => {
      const normalized = normalizeSavedMediaEntry(entry);
      if (!normalized) return;
      const type = normalized.type;
      const uri = normalized.uri;
      const profileCategory = normalized.category;
      const profileName = normalized.profileName;
      const profileId = normalized.profileId;
      const categoryKey = profileCategory.toLowerCase();

      if (profileCategory && !seenCategory.has(categoryKey)) {
        seenCategory.add(categoryKey);
        output.categories.push(profileCategory);
      }

      if (type === 'content') {
        const contentKey = savedMediaEntryKey(normalized);
        if (!seen.content.has(contentKey)) {
          seen.content.add(contentKey);
          output.contentItems.push({
            type: 'content',
            kind: normalized.kind,
            section: normalized.section,
            name: normalized.name,
            note: normalized.note,
            price: normalized.price,
            oldPrice: normalized.oldPrice,
            time: normalized.time,
            uri,
            category: profileCategory,
            profileName,
            profileId,
            profileSlug: normalized.profileSlug,
            savedAt: normalized.savedAt,
          });
        }
        return;
      }

      if (!seen[type].has(uri)) {
        seen[type].add(uri);
        output[type].push(uri);
      }

      const mediaKey = `${type}|${uri}`;
      if (!seenItem.has(mediaKey)) {
        seenItem.add(mediaKey);
        output.items.push({
          type,
          uri,
          category: profileCategory,
          profileName,
          profileId,
        });
      }
    });
    return output;
  }, [savedProfiles, savedMediaEntries]);

  useEffect(() => {
    const idSet = new Set(profiles.map((p) => p.id));
    setSavedProfileIds((prev) => prev.filter((id) => idSet.has(id)));
    setRecentProfileIds((prev) => prev.filter((id) => idSet.has(id)));
  }, [profiles]);

  useEffect(() => {
    const baseData = ownerProfile?.data && typeof ownerProfile.data === 'object' ? ownerProfile.data : {};
    const social = baseData?.social && typeof baseData.social === 'object' ? baseData.social : {};
    const profSettings = baseData?.settings?.professional && typeof baseData.settings.professional === 'object'
      ? baseData.settings.professional
      : {};
    setProfessionalSettings((prev) => ({
      ...prev,
      accountName: String(ownerProfile?.name || authUser?.name || prev.accountName || '').trim(),
      accountEmail: String(authUser?.email || prev.accountEmail || '').trim(),
      profileType: String(ownerProfile?.type || prev.profileType || 'service_pro').toLowerCase(),
      category: String(ownerProfile?.category || baseData?.role || prev.category || '').trim(),
      location: String(ownerProfile?.location || baseData?.location || prev.location || '').trim(),
      instagram: String(social?.instagram || social?.insta || prev.instagram || '').trim(),
      website: String(baseData?.website || social?.website || prev.website || '').trim(),
      whatsapp: String(social?.whatsapp || prev.whatsapp || '').trim(),
      manageTabsEnabled: typeof profSettings?.manageTabsEnabled === 'boolean' ? profSettings.manageTabsEnabled : prev.manageTabsEnabled,
      manageOrderEnabled: typeof profSettings?.manageOrderEnabled === 'boolean' ? profSettings.manageOrderEnabled : prev.manageOrderEnabled,
      manageVisibilityEnabled: typeof profSettings?.manageVisibilityEnabled === 'boolean' ? profSettings.manageVisibilityEnabled : prev.manageVisibilityEnabled,
      promoEnabled: typeof profSettings?.promoEnabled === 'boolean' ? profSettings.promoEnabled : prev.promoEnabled,
      promoDuration: String(profSettings?.promoDuration || prev.promoDuration || '7 dias').trim(),
      notifVisits: typeof profSettings?.notifVisits === 'boolean' ? profSettings.notifVisits : prev.notifVisits,
      notifShares: typeof profSettings?.notifShares === 'boolean' ? profSettings.notifShares : prev.notifShares,
      notifPromos: typeof profSettings?.notifPromos === 'boolean' ? profSettings.notifPromos : prev.notifPromos,
      appLanguage: String(profSettings?.appLanguage || prev.appLanguage || 'pt').trim(),
      appTheme: String(profSettings?.appTheme || prev.appTheme || 'claro').trim(),
    }));
    const lang = String(profSettings?.appLanguage || '').trim().toLowerCase();
    if (['pt', 'en', 'es'].includes(lang)) {
      setAppLanguage(lang);
    }
  }, [ownerProfile?.id, ownerProfile?.name, ownerProfile?.type, ownerProfile?.category, ownerProfile?.location, authUser?.name, authUser?.email]);

  function handleOpenProfile(id, options = null) {
    if (!id) return;
    const raw = String(id).trim();
    if (!raw) return;

    let targetId = raw;
    const byId = profiles.find((p) => String(p.id) === raw);
    if (byId) {
      targetId = byId.id;
    } else {
      const asNumber = Number(raw);
      if (Number.isFinite(asNumber) && asNumber > 0) {
        const byRemote = profiles.find((p) => Number(p.remoteId || 0) === asNumber);
        if (byRemote) targetId = byRemote.id;
      } else {
        const bySlug = profiles.find((p) => String(p.slug || '') === raw);
        if (bySlug) targetId = bySlug.id;
      }
    }

    setSelectedId(targetId);
    setRecentProfileIds((prev) => [targetId, ...prev.filter((item) => item !== targetId)].slice(0, 40));
    const itemShare = options && typeof options === 'object' ? options.itemShare : null;
    if (itemShare && typeof itemShare === 'object') {
      setProfileOpenIntent({
        profileId: targetId,
        itemShare: {
          kind: String(itemShare.kind || '').trim().toLowerCase(),
          section: String(itemShare.section || '').trim(),
          name: String(itemShare.name || '').trim(),
          price: String(itemShare.price || '').trim(),
          oldPrice: String(itemShare.oldPrice || '').trim(),
          time: String(itemShare.time || '').trim(),
          note: String(itemShare.note || '').trim(),
          image: String(itemShare.image || '').trim(),
        },
        nonce: Date.now(),
      });
    } else {
      setProfileOpenIntent(null);
    }
  }

  function handleConsumeProfileOpenIntent() {
    setProfileOpenIntent(null);
  }

  function handleToggleSaveProfile(id) {
    if (!id) return;
    setSavedProfileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [id, ...prev].slice(0, 120)
    );
  }

  function isSavedProfile(id) {
    return savedProfileIds.includes(id);
  }

  function handleToggleSaveMedia(payload) {
    const entry = normalizeSavedMediaEntry(payload);
    if (!entry) return;
    const key = savedMediaEntryKey(entry);
    setSavedMediaEntries((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const exists = list.some((item) => savedMediaEntryKey(item) === key);
      if (exists) return list.filter((item) => savedMediaEntryKey(item) !== key);
      return [entry, ...list].slice(0, 500);
    });
  }

  function isSavedMedia(payload) {
    const key = savedMediaEntryKey(payload);
    if (!key) return false;
    return savedMediaEntryKeySet.has(key);
  }

  function handleToggleInterest(key) {
    const k = String(key || '').trim();
    if (!k) return;
    setPersonalInterests((prev) => {
      if (prev.includes(k)) return prev.filter((item) => item !== k);
      return [...prev, k].slice(0, 24);
    });
  }

  function handleToggleAlert(key) {
    const k = String(key || '').trim();
    if (!k) return;
    setPersonalAlerts((prev) => ({
      ...prev,
      [k]: !prev[k],
    }));
  }

  async function refreshProfiles() {
    setDataLoading(true);
    setDataError('');
    try {
      const [feedResp, mineResp] = await Promise.all([
        profilesFeed(120),
        profileMe().catch(() => ({ ok: true, profile: null })),
      ]);

      const feedList = Array.isArray(feedResp?.profiles)
        ? feedResp.profiles.map((row, idx) => mapProfileRow(row, idx))
        : [];
      const mineMapped = mineResp?.profile ? mapProfileRow(mineResp.profile, 0) : null;
      const nextList = mergeProfiles(feedList, mineMapped);

      setProfiles(nextList.length ? nextList : FALLBACK_PROFILES);
      setOwnerProfileId(mineMapped ? mineMapped.id : null);
      setSelectedId((prev) => {
        if (mineMapped) return mineMapped.id;
        if (prev && nextList.find((p) => p.id === prev)) return prev;
        return nextList[0]?.id || FALLBACK_PROFILES[0]?.id || null;
      });
      return { hasOwner: !!mineMapped };
    } catch (e) {
      setDataError(e?.message || 'Não foi possível carregar perfis.');
      return { hasOwner: false };
    } finally {
      setDataLoading(false);
    }
  }

  function resetRecommendationsState() {
    setRecommendations([]);
    setRecommendationsSent([]);
    setRecommendationRequests([]);
    setRecommendationsError('');
    setRecommendationsLoading(false);
  }

  async function refreshRecommendations(currentUser = authUser) {
    if (!currentUser || isProfessionalUser(currentUser) || guestMode) {
      resetRecommendationsState();
      return;
    }
    setRecommendationsLoading(true);
    setRecommendationsError('');
    try {
      const resp = await recommendationsMe();
      const inbox = Array.isArray(resp?.inbox) ? resp.inbox : [];
      const sent = Array.isArray(resp?.sent) ? resp.sent : [];
      const pending = Array.isArray(resp?.pending_permissions) ? resp.pending_permissions : [];
      setRecommendations(inbox);
      setRecommendationsSent(sent);
      setRecommendationRequests(pending);
    } catch (e) {
      setRecommendationsError(e?.message || 'Não foi possível carregar partilhas.');
    } finally {
      setRecommendationsLoading(false);
    }
  }

  async function handleSendRecommendation(payload) {
    if (!authUser || guestMode || isProfessionalUser(authUser)) {
      return { ok: false, error: 'Disponivel apenas para conta pessoal.' };
    }
    try {
      await recommendationsSend(payload);
      await refreshRecommendations(authUser);
      return { ok: true };
    } catch (e) {
      await refreshRecommendations(authUser);
      return {
        ok: false,
        error: e?.message || 'Não foi possível enviar.',
        status: e?.status,
        payload: e?.payload || null,
      };
    }
  }

  async function handleReactRecommendation(recommendationId, reaction) {
    if (!authUser || guestMode || isProfessionalUser(authUser)) return false;
    try {
      await recommendationsReact(recommendationId, reaction);
      await refreshRecommendations(authUser);
      return true;
    } catch (_e) {
      return false;
    }
  }

  async function handleRecommendationPermissionAction(action, senderUserId) {
    if (!authUser || guestMode || isProfessionalUser(authUser)) return false;
    try {
      await recommendationsPermissionAction({
        action,
        sender_user_id: senderUserId,
      });
      await refreshRecommendations(authUser);
      return true;
    } catch (_e) {
      return false;
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await authMe();
        if (!active) return;
        if (me?.authenticated && me?.user) {
          setAuthUser(me.user);
          setGuestMode(false);
          setEntryStep('welcome');
          setDraftProfileSeed(normalizeDraftSeed({}));
          const result = await refreshProfiles();
          setShowTypeOnboarding(!result?.hasOwner && isProfessionalUser(me.user));
          await refreshRecommendations(me.user);
        } else {
          setAuthUser(null);
          setGuestMode(false);
          setEntryStep('welcome');
          await refreshProfiles();
          setShowTypeOnboarding(false);
          resetRecommendationsState();
        }
      } catch (_e) {
        if (active) {
          setAuthUser(null);
          setGuestMode(false);
          setEntryStep('welcome');
          setShowTypeOnboarding(false);
          resetRecommendationsState();
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(email, password) {
    if (!email || !password) {
      setAuthError('Preenche email e palavra-passe.');
      return;
    }
    setLoginBusy(true);
    setAuthError('');
    try {
      const resp = await authLogin(email, password);
      setAuthUser(resp?.user || { email });
      setGuestMode(false);
      setEntryStep('welcome');
      setDraftProfileSeed(normalizeDraftSeed({}));
      const result = await refreshProfiles();
      setShowTypeOnboarding(!result?.hasOwner && isProfessionalUser(resp?.user));
      await refreshRecommendations(resp?.user);
    } catch (e) {
      setAuthError(e?.message || 'Não foi possível entrar.');
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    if (guestMode) {
      setGuestMode(false);
      setEntryStep('welcome');
      setAuthError('');
      setOwnerProfileId(null);
      setShowTypeOnboarding(false);
      resetRecommendationsState();
      return;
    }
    try {
      await authLogout();
    } catch (_e) {}
    setAuthUser(null);
    setGuestMode(false);
    setEntryStep('welcome');
    setAuthError('');
    setProfiles(FALLBACK_PROFILES);
    setOwnerProfileId(null);
    setSelectedId(FALLBACK_PROFILES[0]?.id || null);
    setSavedProfileIds([]);
    setSavedMediaEntries([]);
    setRecentProfileIds([]);
    setPersonalInterests(DEFAULT_PERSONAL_INTERESTS);
    setPersonalAlerts(DEFAULT_PERSONAL_ALERTS);
    setDraftProfileSeed(normalizeDraftSeed({}));
    setShowTypeOnboarding(false);
    resetRecommendationsState();
  }

  async function handleContinueAsGuest() {
    setGuestMode(true);
    setEntryStep('welcome');
    setAuthError('');
    setShowTypeOnboarding(false);
    resetRecommendationsState();
    try {
      await refreshProfiles();
    } catch (_e) {}
  }

  function handleStartLogin() {
    setGuestMode(false);
    setEntryStep('login');
    setAuthError('');
  }

  function handleStartRegister() {
    setGuestMode(false);
    setEntryStep('register');
    setAuthError('');
  }

  async function handleRegister(name, email, password, accountType = 'professional') {
    if (!name || !email || !password) {
      setAuthError('Preenche nome, email e palavra-passe.');
      return;
    }
    setLoginBusy(true);
    setAuthError('');
    try {
      const resp = await authRegister(name, email, password, accountType);
      setAuthUser(resp?.user || { email, name });
      setGuestMode(false);
      setEntryStep('welcome');
      setDraftProfileSeed(normalizeDraftSeed({}));
      const result = await refreshProfiles();
      setShowTypeOnboarding(!result?.hasOwner && isProfessionalUser(resp?.user));
      await refreshRecommendations(resp?.user);
    } catch (e) {
      setAuthError(e?.message || 'Não foi possível registar.');
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleSaveProfile(payload) {
    const clean = sanitizeProfilePayload(payload);
    const source = ownerProfile || selectedProfile;
    const patchData =
      clean?.dataPatch && typeof clean.dataPatch === 'object' ? clean.dataPatch : {};
    const targetType = String(clean?.type || source?.type || 'service_pro').toLowerCase();
    setSaveBusy(true);
    setSaveError('');
    try {
      if (ownerProfileId && source) {
        const baseData = source.data && typeof source.data === 'object' ? source.data : {};
        const patchSocial = patchData?.social && typeof patchData.social === 'object' ? patchData.social : {};
        const patchGallery = patchData?.gallery && typeof patchData.gallery === 'object' ? patchData.gallery : {};
        const nextData = {
          ...baseData,
          ...patchData,
          name: clean.name || source.name,
          role: clean.category || source.category,
          location: clean.location || source.location,
          about: clean.about || '',
          social: {
            ...(baseData.social || {}),
            ...patchSocial,
          },
          gallery: {
            ...(baseData.gallery || {}),
            ...patchGallery,
          },
        };
        await profileUpdate({
          name: clean.name || source.name,
          type: targetType,
          data: nextData,
          is_published: true,
        });
      } else {
        const baseName = clean.name || 'Novo Perfil';
        const patchSocial = patchData?.social && typeof patchData.social === 'object' ? patchData.social : {};
        const patchGallery = patchData?.gallery && typeof patchData.gallery === 'object' ? patchData.gallery : {};
        const nextData = {
          ...patchData,
          name: baseName,
          role: clean.category || 'Perfil',
          location: clean.location || 'Portugal',
          about: clean.about || '',
          social: {
            ...patchSocial,
          },
          gallery: {
            ...patchGallery,
          },
        };
        await profileCreate({
          slug: slugifyName(baseName),
          name: baseName,
          type: targetType,
          data: nextData,
          is_published: true,
        });
      }
      const result = await refreshProfiles();
      if (result?.hasOwner) setShowTypeOnboarding(false);
      return true;
    } catch (e) {
      setSaveError(e?.message || 'Não foi possível guardar.');
      return false;
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleSaveProfessionalSettings(payload) {
    const next = payload && typeof payload === 'object' ? payload : {};
    const merged = {
      ...professionalSettings,
      ...next,
    };
    setProfessionalSettings(merged);
    setSettingsSaveBusy(true);
    setSettingsSaveError('');
    try {
      const source = ownerProfile;
      if (!source) {
        setSettingsSaveError('Não foi possível encontrar o perfil profissional.');
        return false;
      }
      const baseData = source.data && typeof source.data === 'object' ? source.data : {};
      const baseSocial = baseData.social && typeof baseData.social === 'object' ? baseData.social : {};
      const nextData = {
        ...baseData,
        role: String(merged.category || source.category || baseData.role || '').trim(),
        location: String(merged.location || source.location || baseData.location || '').trim(),
        website: String(merged.website || baseData.website || '').trim(),
        social: {
          ...baseSocial,
          instagram: String(merged.instagram || '').trim(),
          website: String(merged.website || '').trim(),
          whatsapp: String(merged.whatsapp || '').trim(),
        },
        settings: {
          ...(baseData.settings && typeof baseData.settings === 'object' ? baseData.settings : {}),
          professional: {
            manageTabsEnabled: !!merged.manageTabsEnabled,
            manageOrderEnabled: !!merged.manageOrderEnabled,
            manageVisibilityEnabled: !!merged.manageVisibilityEnabled,
            promoEnabled: !!merged.promoEnabled,
            promoDuration: String(merged.promoDuration || '').trim(),
            notifVisits: !!merged.notifVisits,
            notifShares: !!merged.notifShares,
            notifPromos: !!merged.notifPromos,
            appLanguage: String(merged.appLanguage || 'pt').trim(),
            appTheme: String(merged.appTheme || 'claro').trim(),
          },
        },
      };
      await profileUpdate({
        name: String(merged.accountName || source.name || '').trim() || source.name || 'Perfil',
        type: String(merged.profileType || source.type || 'service_pro').toLowerCase(),
        data: nextData,
        is_published: true,
      });
      setAuthUser((prev) => {
        if (!prev || typeof prev !== 'object') return prev;
        return {
          ...prev,
          name: String(merged.accountName || prev.name || '').trim() || prev.name,
          email: String(merged.accountEmail || prev.email || '').trim() || prev.email,
        };
      });
      await refreshProfiles();
      return true;
    } catch (e) {
      setSettingsSaveError(e?.message || 'Não foi possível guardar definições.');
      return false;
    } finally {
      setSettingsSaveBusy(false);
    }
  }

  async function handleUpdateAccount(payload) {
    const email = String(payload?.email || '').trim();
    const currentPassword = String(payload?.currentPassword || '').trim();
    const password = String(payload?.password || '').trim();
    if (!email && !password && !currentPassword) return false;
    if (email) {
      setAuthUser((prev) => {
        if (!prev || typeof prev !== 'object') return prev;
        return { ...prev, email };
      });
      setProfessionalSettings((prev) => ({
        ...prev,
        accountEmail: email,
      }));
    }
    // Password edit UI is enabled; backend endpoint for changing password is not wired yet.
    void currentPassword;
    void password;
    return true;
  }

  function handleSetAppLanguage(lang) {
    const key = String(lang || '').trim().toLowerCase();
    if (!key) return;
    if (!['pt', 'en', 'es'].includes(key)) return;
    setAppLanguage(key);
    setProfessionalSettings((prev) => ({
      ...prev,
      appLanguage: key,
    }));
  }

  async function handleAddStory(storyUrl) {
    const source = ownerProfile;
    const story = String(storyUrl || '').trim();
    if (!source || !ownerProfileId || !story) return false;
    setSaveBusy(true);
    setSaveError('');
    try {
      const currentData = source.data && typeof source.data === 'object' ? source.data : {};
      const currentStoriesRaw = Array.isArray(currentData.stories) ? currentData.stories : [];
      const currentStories = currentStoriesRaw
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') return item.url || item.src || '';
          return '';
        })
        .filter(Boolean);

      const nextStories = [story, ...currentStories.filter((url) => url !== story)].slice(0, 20);
      const nextData = {
        ...currentData,
        stories: nextStories,
      };

      await profileUpdate({
        name: source.name || currentData.name || 'Perfil',
        type: source.type || 'service_pro',
        data: nextData,
        is_published: true,
      });
      await refreshProfiles();
      return true;
    } catch (e) {
      setSaveError(e?.message || 'Não foi possível adicionar story.');
      return false;
    } finally {
      setSaveBusy(false);
    }
  }

  if (authLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.root}>
          <View style={styles.centerWrap}>
            <Text style={styles.centerText}>A iniciar app...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!authUser && !guestMode) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.root}>
          <StatusBar style="dark" />
          <View style={styles.phone}>
            {entryStep === 'login' ? (
              <LoginScreen
                loading={loginBusy}
                error={authError}
                onSubmit={handleLogin}
                onRegisterPress={handleStartRegister}
                onBack={() => setEntryStep('welcome')}
              />
            ) : entryStep === 'register' ? (
              <RegisterScreen
                loading={loginBusy}
                error={authError}
                onSubmit={handleRegister}
                onLoginPress={handleStartLogin}
                onBack={() => setEntryStep('welcome')}
              />
            ) : (
              <WelcomeScreen
                onLoginPress={handleStartLogin}
                onRegisterPress={handleStartRegister}
                onGuestPress={handleContinueAsGuest}
              />
            )}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!guestMode && authUser && showTypeOnboarding && !ownerProfile && isProfessionalUser(authUser)) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.root}>
          <StatusBar style="dark" />
          <View style={styles.phone}>
            <ProfileTypeOnboardingScreen
              initialSeed={draftProfileSeed}
              displayName={authUser?.name || ''}
              onApply={(seed) => {
                setDraftProfileSeed(normalizeDraftSeed(seed));
                setShowTypeOnboarding(false);
              }}
              onSkip={() => setShowTypeOnboarding(false)}
            />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const runtimeUser = guestMode ? { email: 'Convidado', guest: true } : authUser;

  return (
    <SafeAreaProvider>
      <AppNavigator
        app={{
          apiBase: getApiBase(),
          authUser: runtimeUser,
          isGuest: guestMode,
          isProfessional: isProfessionalUser(runtimeUser),
          dataLoading,
          dataError,
          profiles,
          ownerProfileId,
          ownerProfile,
          selectedProfile,
          feedFilter,
          homeProfiles,
          suggestedProfiles,
          saveBusy,
          saveError,
          onFilterChange: setFeedFilter,
          onSelectProfile: setSelectedId,
          onOpenProfile: handleOpenProfile,
          profileOpenIntent,
          onConsumeProfileOpenIntent: handleConsumeProfileOpenIntent,
          onToggleSaveProfile: handleToggleSaveProfile,
          isSavedProfile,
          onToggleSaveMedia: handleToggleSaveMedia,
          isSavedMedia,
          savedProfiles,
          recentProfiles,
          savedMedia,
          personalInterests,
          personalAlerts,
          onToggleInterest: handleToggleInterest,
          onToggleAlert: handleToggleAlert,
          recommendationsLoading,
          recommendationsError,
          recommendations,
          recommendationsSent,
          recentShareUsers,
          recommendationRequests,
          onRefreshRecommendations: refreshRecommendations,
          onSendRecommendation: handleSendRecommendation,
          onReactRecommendation: handleReactRecommendation,
          onRecommendationPermissionAction: handleRecommendationPermissionAction,
          onSaveProfile: handleSaveProfile,
          onAddStory: handleAddStory,
          onLogout: handleLogout,
          onStartLogin: handleStartLogin,
          onStartRegister: handleStartRegister,
          draftProfileSeed,
          professionalSettings,
          settingsSaveBusy,
          settingsSaveError,
          onSaveProfessionalSettings: handleSaveProfessionalSettings,
          onUpdateAccount: handleUpdateAccount,
          appLanguage,
          onSetAppLanguage: handleSetAppLanguage,
        }}
      />
    </SafeAreaProvider>
  );
}



