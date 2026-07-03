import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MiniCard from '../components/MiniCard';
import StoryViewerModal, { getProfileStoryUrls } from '../components/StoryViewerModal';
import { CATEGORY_TAXONOMY, findTaxonomyKeysByQuery, inferProfileCategoryKeys, normalizeTaxonomyQuery } from '../data/taxonomy';
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

export default function ExploreScreen({
  currentLanguage = 'pt',
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
  const [search, setSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [discoveryFilter, setDiscoveryFilter] = useState('all');
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyProfile, setStoryProfile] = useState(null);
  const [storySession, setStorySession] = useState(0);

  const canSaveProfiles = !isGuest && isProfessional === false;
  const deferredSearch = useDeferredValue(search);
  const searchText = normalizeTaxonomyQuery(deferredSearch);

  const handleAvatarPress = useCallback((profile) => {
    const target = profile && typeof profile === 'object' ? profile : null;
    if (!target) return;
    if (!getProfileStoryUrls(target).length) return;
    setStoryProfile(target);
    setStorySession((prev) => prev + 1);
    setStoryModalOpen(true);
  }, []);

  const discoveryOptions = [
    { key: 'all', label: t(L, 'explore_all') },
    { key: 'perto', label: t(L, 'explore_near') },
    { key: 'promocoes', label: t(L, 'explore_promotions') },
    { key: 'novidades', label: t(L, 'explore_news') },
    { key: 'verif', label: t(L, 'explore_verified') },
  ];
  const sortOptions = [
    { key: 'relevance', label: t(L, 'explore_sort_relevance') },
    { key: 'recent', label: t(L, 'explore_sort_recent') },
    { key: 'rating', label: t(L, 'explore_sort_rating') },
    { key: 'near', label: t(L, 'explore_sort_near') },
  ];

  const categoryOptions = useMemo(
    () => CATEGORY_TAXONOMY.map((item) => ({ key: item.key, label: item.label })),
    []
  );
  const taxonomyKeysFromSearch = useMemo(() => findTaxonomyKeysByQuery(searchText), [searchText]);

  const filteredProfiles = useMemo(() => {
    const list = Array.isArray(profiles) ? profiles : [];
    const filtered = list.filter((p) => {
      const name = normalizeTaxonomyQuery(p?.name || '');
      const category = normalizeTaxonomyQuery(p?.category || '');
      const location = normalizeTaxonomyQuery(p?.location || '');
      const about = normalizeTaxonomyQuery(p?.about || p?.data?.about || '');
      const contentCategories = Array.isArray(p?.data?.contentCategories)
        ? p.data.contentCategories.map((item) => normalizeTaxonomyQuery(item || ''))
        : [];
      const categoryHaystack = `${name} ${category} ${about} ${contentCategories.join(' ')}`.trim();
      const filter = String(p?.filter || '').toLowerCase();
      const badge = String(p?.badge || '').toLowerCase();
      const profileTaxonomyKeys = inferProfileCategoryKeys(p);

      const searchMatch =
        !searchText ||
        name.includes(searchText) ||
        category.includes(searchText) ||
        location.includes(searchText) ||
        (taxonomyKeysFromSearch.length > 0 && profileTaxonomyKeys.some((key) => taxonomyKeysFromSearch.includes(key)));

      const discoveryMatch =
        discoveryFilter === 'all' ||
        (discoveryFilter === 'perto' && filter === 'perto') ||
        (discoveryFilter === 'promocoes' && (filter === 'promocoes' || badge === 'promo')) ||
        (discoveryFilter === 'novidades' && (filter === 'novidades' || badge === 'novo')) ||
        (discoveryFilter === 'verif' && badge === 'verif');

      const categoryMatch =
        !categoryFilters.length ||
        categoryFilters.some((selected) => profileTaxonomyKeys.includes(selected) || categoryHaystack.includes(selected));

      return searchMatch && discoveryMatch && categoryMatch;
    });

    const boostLocal = (profile) => {
      const filter = String(profile?.filter || '').toLowerCase();
      const location = normalizeTaxonomyQuery(profile?.location || '');
      let score = 0;
      if (filter === 'perto') score += 3;
      if (location.includes('portugal')) score += 1;
      if (searchText && location.includes(searchText)) score += 2;
      return score;
    };
    const parseRating = (profile) => {
      const n = Number(String(profile?.rating || '').replace(',', '.'));
      return Number.isFinite(n) ? n : 0;
    };
    const parseRecent = (profile) => {
      const source = profile?.updated_at || profile?.created_at || profile?.data?.updatedAt || profile?.data?.createdAt || '';
      const ts = Date.parse(String(source || ''));
      return Number.isFinite(ts) ? ts : 0;
    };

    const ranked = [...filtered];
    ranked.sort((a, b) => {
      if (sortBy === 'rating') return parseRating(b) - parseRating(a);
      if (sortBy === 'recent') return parseRecent(b) - parseRecent(a);
      if (sortBy === 'near') {
        const nearDiff = boostLocal(b) - boostLocal(a);
        if (nearDiff !== 0) return nearDiff;
        return parseRating(b) - parseRating(a);
      }
      const relevanceA = (searchText ? 0 : 1) + boostLocal(a);
      const relevanceB = (searchText ? 0 : 1) + boostLocal(b);
      const diff = relevanceB - relevanceA;
      if (diff !== 0) return diff;
      return parseRating(b) - parseRating(a);
    });
    return ranked;
  }, [profiles, searchText, discoveryFilter, categoryFilters, taxonomyKeysFromSearch, sortBy]);

  const filteredGridData = useMemo(() => {
    if (!filteredProfiles.length) return [];
    const fillCount = filteredProfiles.length % 3 === 0 ? 0 : 3 - (filteredProfiles.length % 3);
    return fillCount ? [...filteredProfiles, ...Array(fillCount).fill(null)] : filteredProfiles;
  }, [filteredProfiles]);

  const hasActiveAdvanced = discoveryFilter !== 'all' || categoryFilters.length > 0 || sortBy !== 'relevance';
  const categorySearchText = normalizeTaxonomyQuery(categorySearch);
  const visibleCategoryOptions = useMemo(() => {
    const list = categoryOptions.filter((item) => item.key !== 'all');
    return !categorySearchText
      ? list
      : list.filter((item) => String(item.label || '').toLowerCase().includes(categorySearchText));
  }, [categoryOptions, categorySearchText]);

  useEffect(() => {
    const candidates = filteredProfiles
      .slice(0, 42)
      .map((item) => resolveAvatarUri(item?.data?.avatar))
      .filter(Boolean);
    const unique = [...new Set(candidates)];
    unique.forEach((uri) => {
      if (/^https?:\/\//i.test(uri)) Image.prefetch(uri);
    });
  }, [filteredProfiles]);

  useEffect(() => {
    if (!showAdvanced) setCategorySearch('');
  }, [showAdvanced]);

  const clearAdvancedFilters = useCallback(() => {
    setDiscoveryFilter('all');
    setCategoryFilters([]);
    setSortBy('relevance');
  }, []);

  const exploreKeyExtractor = useCallback((item, idx) => {
    if (!item) return `e-pad-${idx}`;
    const safeId = String(item.id || item.remoteId || `row-${idx}`);
    return `e-${safeId}`;
  }, []);
  const renderExploreItem = useCallback(({ item }) => {
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
        <View style={styles.exploreHero}>
          <Text style={styles.exploreHeroTitle}>{t(L, 'explore_title')}</Text>
        </View>
        <View style={styles.skeletonSearchWrap}>
          <View style={styles.skeletonSearchBar} />
        </View>
        <View style={styles.skeletonChipsRow}>
          <View style={styles.skeletonChip} />
          <View style={styles.skeletonChip} />
          <View style={styles.skeletonChip} />
        </View>
        <View style={styles.exploreMetaRow}>
          <View style={styles.skeletonMetaLine} />
        </View>
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <View key={`explore-skeleton-${idx}`} style={[styles.card, styles.skeletonCard]} />
          ))}
        </View>
      </>
    );
  }

  return (
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

      <View style={styles.exploreHero}>
        <Text style={styles.exploreHeroTitle}>{t(L, 'explore_title')}</Text>
      </View>

      <View style={styles.exploreSearchRow}>
        <View style={styles.exploreSearchBox}>
          <Ionicons name="search-outline" size={16} color="#64748b" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t(L, 'explore_search_profiles')}
            placeholderTextColor="#94a3b8"
            style={styles.exploreSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={styles.exploreSearchFilterBtn} onPress={() => setShowAdvanced((prev) => !prev)}>
            <Ionicons
              name={showAdvanced ? 'options' : 'options-outline'}
              size={16}
              color={showAdvanced ? '#111827' : '#0f172a'}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exploreSortRow}>
        {sortOptions.map((item) => {
          const active = sortBy === item.key;
          return (
            <Pressable
              key={`sort-${item.key}`}
              style={[styles.exploreSortChip, active && styles.exploreSortChipActive]}
              onPress={() => setSortBy(item.key)}
            >
              <Text style={[styles.exploreSortChipText, active && styles.exploreSortChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.exploreMetaRow}>
        <Text style={styles.exploreMetaText}>
          {filteredProfiles.length} {filteredProfiles.length === 1 ? t(L, 'explore_result') : t(L, 'explore_results')}
        </Text>
      </View>

      {hasActiveAdvanced && (
        <View style={styles.exploreActiveFiltersRow}>
          {discoveryFilter !== 'all' && (
            <Pressable style={styles.exploreActiveFilterChip} onPress={() => setDiscoveryFilter('all')}>
              <Text style={styles.exploreActiveFilterText}>
                {discoveryOptions.find((item) => item.key === discoveryFilter)?.label || t(L, 'explore_discovery')}
              </Text>
              <Ionicons name="close" size={12} color="#334155" />
            </Pressable>
          )}
          {sortBy !== 'relevance' && (
            <Pressable style={styles.exploreActiveFilterChip} onPress={() => setSortBy('relevance')}>
              <Text style={styles.exploreActiveFilterText}>
                {sortOptions.find((item) => item.key === sortBy)?.label || t(L, 'explore_sort')}
              </Text>
              <Ionicons name="close" size={12} color="#334155" />
            </Pressable>
          )}
          {categoryFilters.map((key) => {
            const label = categoryOptions.find((item) => item.key === key)?.label || key;
            return (
              <Pressable
                key={`active-cat-${key}`}
                style={styles.exploreActiveFilterChip}
                onPress={() => setCategoryFilters((prev) => prev.filter((item) => item !== key))}
              >
                <Text style={styles.exploreActiveFilterText}>{label}</Text>
                <Ionicons name="close" size={12} color="#334155" />
              </Pressable>
            );
          })}
        </View>
      )}

      <FlatList
        data={filteredGridData}
        keyExtractor={exploreKeyExtractor}
        renderItem={renderExploreItem}
        ListEmptyComponent={
          <View style={styles.panel}>
            <Text style={styles.placeholder}>{t(L, 'explore_empty')}</Text>
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

      <Modal visible={showAdvanced} transparent animationType="fade" onRequestClose={() => setShowAdvanced(false)}>
        <View style={styles.exploreAdvancedBackdrop}>
          <Pressable style={styles.exploreAdvancedBackdropFill} onPress={() => setShowAdvanced(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            <View style={styles.exploreAdvancedSheet}>
              <View style={styles.exploreAdvancedHandle} />
              <View style={styles.exploreAdvancedHeader}>
                <Text style={styles.exploreAdvancedTitle}>{t(L, 'explore_advanced_filters')}</Text>
                <View style={styles.exploreAdvancedHeaderActions}>
                  <Pressable style={styles.exploreAdvancedClearBtn} onPress={clearAdvancedFilters}>
                    <Text style={styles.exploreAdvancedClearBtnText}>{t(L, 'explore_clear')}</Text>
                  </Pressable>
                  <Pressable style={styles.exploreAdvancedCloseBtn} onPress={() => setShowAdvanced(false)}>
                    <Ionicons name="close" size={16} color="#334155" />
                  </Pressable>
                </View>
              </View>
              <ScrollView
                style={styles.exploreAdvancedScroll}
                contentContainerStyle={styles.exploreAdvancedScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.exploreAdvancedLabel}>{t(L, 'explore_discovery')}</Text>
                <View style={styles.exploreAdvancedChips}>
                  {discoveryOptions.map((item) => {
                    const active = discoveryFilter === item.key;
                    return (
                      <Pressable
                        key={`fd-${item.key}`}
                        style={[styles.exploreAdvancedChip, active && styles.exploreAdvancedChipActive]}
                        onPress={() => setDiscoveryFilter(item.key)}
                      >
                        <Text style={[styles.exploreAdvancedChipText, active && styles.exploreAdvancedChipTextActive]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.exploreAdvancedLabel}>{t(L, 'explore_sort_by')}</Text>
                <View style={styles.exploreAdvancedChips}>
                  {sortOptions.map((item) => {
                    const active = sortBy === item.key;
                    return (
                      <Pressable
                        key={`fs-${item.key}`}
                        style={[styles.exploreAdvancedChip, active && styles.exploreAdvancedChipActive]}
                        onPress={() => setSortBy(item.key)}
                      >
                        <Text style={[styles.exploreAdvancedChipText, active && styles.exploreAdvancedChipTextActive]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.exploreAdvancedLabel}>{t(L, 'explore_category')}</Text>
                <View style={styles.exploreCategorySearchBox}>
                  <Ionicons name="search-outline" size={14} color="#64748b" />
                  <TextInput
                    value={categorySearch}
                    onChangeText={setCategorySearch}
                    placeholder={t(L, 'explore_search_category')}
                    placeholderTextColor="#94a3b8"
                    style={styles.exploreCategorySearchInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.exploreCategoryList}>
                  {visibleCategoryOptions.map((item) => {
                    const active = categoryFilters.includes(item.key);
                    return (
                      <Pressable
                        key={`fc-${item.key}`}
                        style={[styles.exploreCategoryRow, active && styles.exploreCategoryRowActive]}
                        onPress={() => {
                          setCategoryFilters((prev) => {
                            const has = prev.includes(item.key);
                            if (has) return prev.filter((key) => key !== item.key);
                            return [...prev, item.key];
                          });
                        }}
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
                  {!visibleCategoryOptions.length && (
                    <View style={styles.exploreCategoryEmptyRow}>
                      <Text style={styles.exploreCategoryEmptyText}>{t(L, 'explore_empty_categories')}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
              <Pressable style={styles.exploreAdvancedDoneBtn} onPress={() => setShowAdvanced(false)}>
                <Text style={styles.exploreAdvancedDoneBtnText}>Aplicar</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <StoryViewerModal
        visible={storyModalOpen}
        profile={storyProfile}
        sessionKey={storySession}
        onClose={() => setStoryModalOpen(false)}
      />
    </>
  );
}
