import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, PanResponder, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getApiBase } from '../api/client';
import { styles } from '../styles/appStyles';

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
        list = JSON.parse(maybeJson);
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

function uniqueList(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach((item) => {
    const value = String(item || '').trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out;
}

export function getProfileStoryUrls(profile) {
  const profileData = profile?.data && typeof profile.data === 'object' ? profile.data : {};
  const gallery = profileData?.gallery && typeof profileData.gallery === 'object' ? profileData.gallery : {};

  const stories = uniqueList(normalizeMediaList(profileData?.stories).map(resolveMediaUri).filter(Boolean));
  if (stories.length) return stories.slice(0, 20);

  const photos = uniqueList(
    [
      ...normalizeMediaList(gallery?.photos),
      ...normalizeMediaList(gallery?.fotos),
      ...normalizeMediaList(gallery?.images),
      ...normalizeMediaList(profileData?.photos),
      ...normalizeMediaList(profileData?.fotos),
      ...normalizeMediaList(profileData?.images),
    ]
      .map(resolveMediaUri)
      .filter(Boolean)
  );
  return photos.slice(0, 20);
}

export default function StoryViewerModal({ visible, profile, onClose, sessionKey = 0 }) {
  const [storyIndex, setStoryIndex] = useState(0);
  const closeInProgressRef = useRef(false);
  const dragYRef = useRef(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const closeY = useRef(new Animated.Value(0)).current;
  const closeScale = useRef(new Animated.Value(1)).current;
  const closeOpacity = useRef(new Animated.Value(1)).current;
  const storyUrls = useMemo(() => getProfileStoryUrls(profile), [profile]);
  const profileData = profile?.data && typeof profile.data === 'object' ? profile.data : {};
  const avatarUri = resolveMediaUri(profileData?.avatar);
  const safeName = String(profile?.name || 'Perfil');
  const totalStories = storyUrls.length;
  const safeStoryIndex = totalStories ? Math.max(0, Math.min(storyIndex, totalStories - 1)) : 0;

  useEffect(() => {
    setStoryIndex(0);
  }, [sessionKey]);

  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      dragYRef.current = value;
    });
    return () => {
      translateY.removeListener(id);
    };
  }, [translateY]);

  useEffect(() => {
    if (!visible) {
      closeInProgressRef.current = false;
      dragYRef.current = 0;
      translateY.setValue(0);
      closeY.setValue(0);
      closeScale.setValue(1);
      closeOpacity.setValue(1);
    }
  }, [visible, closeOpacity, closeScale, closeY, translateY]);

  const closeStoryModal = useCallback(() => {
    if (closeInProgressRef.current) return;
    closeInProgressRef.current = true;
    const dropDistance = 440;
    Animated.parallel([
      Animated.timing(closeY, {
        toValue: dropDistance - dragYRef.current,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.timing(closeScale, {
        toValue: 0.94,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.timing(closeOpacity, {
        toValue: 0,
        duration: 210,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (typeof onClose === 'function') onClose();
    });
  }, [closeOpacity, closeScale, closeY, onClose, translateY]);

  const storyPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dy) > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onMoveShouldSetPanResponderCapture: (_evt, gestureState) =>
          Math.abs(gestureState.dy) > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_evt, gestureState) => {
          const y = Math.max(0, gestureState.dy);
          translateY.setValue(y);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_evt, gestureState) => {
          const y = Math.max(0, gestureState.dy);
          if (y > 80 || gestureState.vy > 1.1) {
            closeStoryModal();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              tension: 130,
              friction: 11,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            tension: 130,
            friction: 11,
            useNativeDriver: true,
          }).start();
        },
      }),
    [closeStoryModal, translateY]
  );

  function nextStory() {
    if (!totalStories) return;
    setStoryIndex((prev) => (prev + 1) % totalStories);
  }

  function prevStory() {
    if (!totalStories) return;
    setStoryIndex((prev) => (prev - 1 + totalStories) % totalStories);
  }

  return (
    <Modal visible={!!visible} transparent animationType="none" onRequestClose={closeStoryModal}>
      <Pressable style={styles.storyModalBackdrop} onPress={closeStoryModal}>
        <Pressable style={styles.storyModalPanelWrap} onPress={(event) => event.stopPropagation()}>
          <Animated.View
            style={[
              styles.storyModalPanel,
              {
                opacity: closeOpacity,
                transform: [
                  { translateY: Animated.add(translateY, closeY) },
                  { scale: closeScale },
                ],
              },
            ]}
            {...storyPanResponder.panHandlers}
          >
            <View style={styles.storyProgressRow}>
              {(totalStories ? storyUrls : ['placeholder']).map((_, idx) => (
                <View
                  key={`story-progress-${idx}`}
                  style={[styles.storyProgressBar, idx <= safeStoryIndex ? styles.storyProgressBarActive : null]}
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
                  <Text style={styles.storyModalName} numberOfLines={1}>{safeName}</Text>
                </View>
              </View>
              <Pressable onPress={closeStoryModal} style={styles.storyModalCloseBtn}>
                <Ionicons name="close" size={18} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.storyModalMediaWrap}>
              {!!storyUrls[safeStoryIndex] ? (
                <Image source={{ uri: storyUrls[safeStoryIndex] }} style={styles.storyModalImage} resizeMode="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="image-outline" size={38} color="#cbd5e1" />
                  <Text style={{ marginTop: 8, color: '#e2e8f0', fontSize: 12 }}>Sem story</Text>
                </View>
              )}
              {totalStories > 1 && (
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
  );
}
