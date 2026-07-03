import { FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import MiniCard from '../components/MiniCard';
import StoryViewerModal, { getProfileStoryUrls } from '../components/StoryViewerModal';
import { FILTERS } from '../data/profileModel';
import { styles } from '../styles/appStyles';
import { getApiBase } from '../api/client';
import { t } from '../i18n';

function resolveAvatarUri(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  if (/^data:image\//i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!raw.startsWith('/')) return '';
  const base = String(getApiBase() || '').trim();
  if (!base) return '';
  const origin = base.replace(/\/api\/?$/i, '');
  return `${origin}${raw}`;
}

export default function HomeScreen({
  currentLanguage = 'pt',
  feedFilter,
  onFilterChange,
  suggested,
  profiles,
  loading = false,
  onOpenProfile,
  onToggleSaveProfile,
  isSavedProfile,
  isGuest,
  isProfessional,
  onLoginPress,
  onRegisterPress,
}) {
  const L = currentLanguage || 'pt';
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyProfile, setStoryProfile] = useState(null);
  const [storySession, setStorySession] = useState(0);
  const rawList = Array.isArray(profiles) ? profiles : [];
  const rawSuggested = Array.isArray(suggested) ? suggested : [];
  const filterLabelById = useMemo(
    () => ({
      destaques: t(L, 'home_filter_featured'),
      novidades: t(L, 'home_filter_news'),
      promocoes: t(L, 'home_filter_promotions'),
      perto: t(L, 'home_filter_near'),
    }),
    [L]
  );
  const activeFilterLabel = filterLabelById[feedFilter] || t(L, 'home_filter_featured');
  const canSaveProfiles = !isGuest && isProfessional === false;
  const scoreLocal = (p) => {
    const filter = String(p?.filter || '').toLowerCase();
    const location = String(p?.location || '').toLowerCase();
    let score = 0;
    if (filter === 'perto') score += 3;
    if (location.includes('portugal')) score += 1;
    return score;
  };
  const list = useMemo(() => [...rawList].sort((a, b) => scoreLocal(b) - scoreLocal(a)), [rawList]);
  const sortedSuggested = useMemo(
    () => [...rawSuggested].sort((a, b) => scoreLocal(b) - scoreLocal(a)),
    [rawSuggested]
  );
  const homeGridData = useMemo(() => {
    const visibleItems = list;
    if (!visibleItems.length) return [];
    const fillCount = visibleItems.length % 3 === 0 ? 0 : 3 - (visibleItems.length % 3);
    return fillCount ? [...visibleItems, ...Array(fillCount).fill(null)] : visibleItems;
  }, [list]);
  useEffect(() => {
    const candidates = [...sortedSuggested, ...list]
      .slice(0, 36)
      .map((item) => resolveAvatarUri(item?.data?.avatar))
      .filter(Boolean);
    const unique = [...new Set(candidates)];
    unique.forEach((uri) => {
      if (/^https?:\/\//i.test(uri)) Image.prefetch(uri);
    });
  }, [sortedSuggested, list]);

  const handleAvatarPress = useCallback((profile) => {
    const target = profile && typeof profile === 'object' ? profile : null;
    if (!target) return;
    if (!getProfileStoryUrls(target).length) return;
    setStoryProfile(target);
    setStorySession((prev) => prev + 1);
    setStoryModalOpen(true);
  }, []);
  const homeKeyExtractor = useCallback((item, idx) => {
    if (!item) return `h-pad-${idx}`;
    const safeId = String(item.id || item.remoteId || `row-${idx}`);
    return `h-${safeId}`;
  }, []);
  const renderHomeItem = useCallback(({ item }) => {
    if (!item) return <View style={[styles.card, styles.cardGridPad]} />;
    const profileId = item.id || item.remoteId || '';
    return (
      <MiniCard
        profile={item}
        onPress={() => {
          if (!profileId) return;
          onOpenProfile(profileId);
        }}
        onAvatarPress={() => handleAvatarPress(item)}
        showSave={canSaveProfiles}
        onSavePress={() => {
          if (!profileId) return;
          onToggleSaveProfile?.(profileId);
        }}
        isSaved={!!isSavedProfile?.(profileId)}
      />
    );
  }, [canSaveProfiles, handleAvatarPress, isSavedProfile, onOpenProfile, onToggleSaveProfile]);

  if (loading) {
    return (
      <>
        <View style={styles.homeHero}>
          <Text style={styles.homeHeroTitle}>{t(L, 'home_discover')}</Text>
        </View>
        <View style={styles.skeletonChipsRow}>
          <View style={styles.skeletonChip} />
          <View style={styles.skeletonChip} />
          <View style={styles.skeletonChip} />
          <View style={styles.skeletonChip} />
        </View>
        <Text style={styles.section}>{t(L, 'home_suggestions')}</Text>
        <View style={styles.suggestedBox}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedScroller}>
            <View style={[styles.cardCompact, styles.skeletonCardCompact]} />
            <View style={[styles.cardCompact, styles.skeletonCardCompact]} />
            <View style={[styles.cardCompact, styles.skeletonCardCompact]} />
          </ScrollView>
        </View>
        <Text style={[styles.section, { marginTop: 14 }]}>{t(L, 'home_profiles')}</Text>
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <View key={`home-skeleton-${idx}`} style={[styles.card, styles.skeletonCard]} />
          ))}
        </View>
      </>
    );
  }

  const listHeader = (
    <>
      {!!isGuest && (
        <View style={styles.guestAuthInlineBar}>
          <Text style={styles.guestAuthInlineText}>{t(L, 'settings_mode_guest')}</Text>
          <View style={styles.guestAuthInlineActions}>
            <Pressable style={[styles.guestAuthInlineBtn, styles.guestAuthInlineBtnPrimary]} onPress={onLoginPress}>
              <Text style={[styles.guestAuthInlineBtnText, styles.guestAuthInlineBtnTextPrimary]}>{t(L, 'settings_login')}</Text>
            </Pressable>
            <Pressable style={[styles.guestAuthInlineBtn, styles.guestAuthInlineBtnSecondary]} onPress={onRegisterPress}>
              <Text style={styles.guestAuthInlineBtnText}>{t(L, 'auth_register')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.homeHero}>
        <Text style={styles.homeHeroTitle}>{t(L, 'home_discover')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsWrap}>
        {FILTERS.map((f) => (
          <Pressable key={f.id} onPress={() => onFilterChange(f.id)} style={[styles.chip, feedFilter === f.id && styles.chipActive]}>
            <Text style={[styles.chipText, feedFilter === f.id && styles.chipTextActive]}>
              {filterLabelById[f.id] || f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.section}>{t(L, 'home_suggestions')}</Text>
      <View style={styles.suggestedBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedScroller}>
          {sortedSuggested.map((p, idx) => (
            <MiniCard
              key={`s-${p?.id || p?.remoteId || idx}`}
              profile={p}
              onPress={() => {
                const profileId = p?.id || p?.remoteId || '';
                if (!profileId) return;
                onOpenProfile(profileId);
              }}
              onAvatarPress={() => handleAvatarPress(p)}
              compact
              showSave={false}
            />
          ))}
        </ScrollView>
      </View>

      <Text style={[styles.section, { marginTop: 14 }]}>{t(L, 'home_profiles_with_filter')}: {activeFilterLabel}</Text>
    </>
  );
  return (
    <>
      <FlatList
        data={homeGridData}
        keyExtractor={homeKeyExtractor}
        renderItem={renderHomeItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.panel}>
            <Text style={styles.placeholder}>{t(L, 'home_empty_filter')}</Text>
          </View>
        }
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.screenListContent}
        initialNumToRender={9}
        maxToRenderPerBatch={9}
        windowSize={7}
        removeClippedSubviews
      />
      <StoryViewerModal
        visible={storyModalOpen}
        profile={storyProfile}
        sessionKey={storySession}
        onClose={() => setStoryModalOpen(false)}
      />
    </>
  );
}




