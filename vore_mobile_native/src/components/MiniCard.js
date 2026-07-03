import { memo, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/appStyles';
import { getApiBase } from '../api/client';

function resolveMediaUri(rawValue) {
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

function fitCardText(value, maxChars) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .trim();
  if (!text) return '';
  if (text.length <= maxChars) return text;

  const words = text.split(' ');
  let out = '';
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > maxChars) break;
    out = next;
  }
  if (out) return out;
  return text.slice(0, Math.max(0, maxChars));
}

function MiniCard({
  profile,
  onPress,
  onAvatarPress,
  onSavePress,
  compact = false,
  showSave = true,
  isSaved = false,
}) {
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const avatarUri = resolveMediaUri(profile?.data?.avatar);
  const avatarSource = useMemo(() => {
    if (!avatarUri) return null;
    return { uri: avatarUri, cache: 'force-cache' };
  }, [avatarUri]);
  useEffect(() => {
    setAvatarLoaded(false);
  }, [avatarUri]);
  const cardStyle = compact ? styles.cardCompact : styles.card;
  const avatarStyle = compact ? styles.avatarCompact : styles.avatar;
  const avatarImageStyle = compact ? styles.avatarImageCompact : styles.avatarImage;
  const nameStyle = compact ? styles.cardNameCompact : styles.cardName;
  const categoryStyle = compact ? styles.cardCategoryCompact : styles.cardCategory;
  const locationStyle = compact ? styles.cardLocationCompact : styles.cardLocation;
  const ratingTextStyle = compact ? styles.cardRatingTextCompact : styles.cardRatingText;
  const noSaveCardStyle = compact ? styles.cardCompactNoSave : styles.cardNoSave;
  const ratingIconSize = compact ? 10 : 11;
  const safeName = fitCardText(profile?.name, compact ? 12 : 15);
  const safeCategory = fitCardText(
    String(profile?.category || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, ' / ')
    .trim(),
    compact ? 28 : 34
  );
  const safeLocation = fitCardText(profile?.location, compact ? 12 : 16);
  const isVerified = profile?.badge === 'verif';

  return (
    <Pressable
      style={({ pressed }) => [
        cardStyle,
        !showSave && noSaveCardStyle,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {!!profile.badge && profile.badge !== 'verif' && (
        <Text
          style={[
            styles.badge,
            compact && styles.badgeCompact,
            profile.badge === 'promo'
              ? styles.badgePromo
              : styles.badgeNovo,
          ]}
        >
          {profile.badge}
        </Text>
      )}
      {showSave && (
        <Pressable
          style={styles.saveBtn}
          onPress={(event) => {
            event?.stopPropagation?.();
            onSavePress?.();
          }}
        >
          <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={14} color="#0f172a" />
        </Pressable>
      )}
      {typeof onAvatarPress === 'function' ? (
        <Pressable
          onPress={(event) => {
            event?.stopPropagation?.();
            onAvatarPress();
          }}
        >
          {avatarSource ? (
            <View style={styles.cardAvatarWrap}>
              {!avatarLoaded && <View style={[avatarStyle, styles.cardAvatarSkeleton]} />}
              <Image
                source={avatarSource}
                style={[avatarImageStyle, !avatarLoaded && styles.cardAvatarHidden]}
                onLoadEnd={() => setAvatarLoaded(true)}
              />
            </View>
          ) : (
            <View style={avatarStyle} />
          )}
        </Pressable>
      ) : avatarSource ? (
        <View style={styles.cardAvatarWrap}>
          {!avatarLoaded && <View style={[avatarStyle, styles.cardAvatarSkeleton]} />}
          <Image
            source={avatarSource}
            style={[avatarImageStyle, !avatarLoaded && styles.cardAvatarHidden]}
            onLoadEnd={() => setAvatarLoaded(true)}
          />
        </View>
      ) : (
        <View style={avatarStyle} />
      )}
      <View style={styles.cardNameRow}>
        <Text numberOfLines={1} style={[nameStyle, isVerified && styles.cardNameWithVerified]}>{safeName}</Text>
        {isVerified && (
          <Ionicons
            name="checkmark-circle"
            size={compact ? 11 : 12}
            color="#2563eb"
            style={styles.cardVerifiedIcon}
          />
        )}
      </View>
      <Text numberOfLines={2} ellipsizeMode="tail" style={categoryStyle}>{safeCategory}</Text>
      <View style={styles.cardMetaWrap}>
        <Text numberOfLines={1} style={locationStyle}>{safeLocation}</Text>
        <View style={styles.cardRatingRow}>
          <Ionicons name="star" size={ratingIconSize} color="#f59e0b" />
          <Text style={ratingTextStyle}>{profile.rating}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function areEqual(prev, next) {
  return (
    prev?.compact === next?.compact &&
    prev?.showSave === next?.showSave &&
    prev?.isSaved === next?.isSaved &&
    prev?.profile?.id === next?.profile?.id &&
    prev?.profile?.name === next?.profile?.name &&
    prev?.profile?.category === next?.profile?.category &&
    prev?.profile?.location === next?.profile?.location &&
    prev?.profile?.rating === next?.profile?.rating &&
    prev?.profile?.badge === next?.profile?.badge &&
    prev?.profile?.data?.avatar === next?.profile?.data?.avatar
  );
}

export default memo(MiniCard, areEqual);
