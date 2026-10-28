import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { t } from '@/i18n';

import { Gradient } from './brand';
import { AppText, Icon, type IconName } from './components';
import { PressableScale, useReducedMotion } from './motion';
import { Photo, type PhotoName } from './photos';
import { duration, fonts, radius, shadowOf, space, useFeatureColour, usePalette, type FeatureKey } from './theme';

/** The four brand colours as a thin paint-card stripe. Decoration only. */
export function PaintStripe({ style }: { style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return (
    <View pointerEvents="none" style={[styles.stripe, style]}>
      {[p.cta, p.rose, p.sage, p.primary].map((c) => (
        <View key={c} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </View>
  );
}

/**
 * The deep result banner: navy gradient, white text and the paint stripe along
 * the bottom. `from` and `to` may swap in other deep shades, never theme
 * tokens that turn light in dark mode, because the text on it stays white.
 */
export function HeroPanel({
  children,
  from,
  to,
  liveRegion,
  testID,
}: {
  children: ReactNode;
  from?: string;
  to?: string;
  liveRegion?: boolean;
  testID?: string;
}) {
  const p = usePalette();
  return (
    <View
      accessibilityLiveRegion={liveRegion ? 'polite' : undefined}
      style={[styles.panel, { backgroundColor: from ?? p.heroFrom }, shadowOf(p, 2)]}
      testID={testID}>
      <Gradient from={from ?? p.heroFrom} to={to ?? p.heroTo} />
      {children}
      <PaintStripe style={styles.heroStripe} />
    </View>
  );
}

/**
 * A full-width photo with a dark fade at the bottom, a big headline, one line
 * of text and one orange button. Used once per screen, at the top.
 */
export function PhotoHero({
  photo,
  title,
  body,
  action,
  onAction,
  minHeight = 300,
  testID,
}: {
  photo: PhotoName;
  title: string;
  body?: string;
  action: string;
  onAction: () => void;
  minHeight?: number;
  testID?: string;
}) {
  const p = usePalette();
  return (
    <View style={[styles.hero, { minHeight, backgroundColor: p.heroFrom }, shadowOf(p, 2)]} testID={testID}>
      <Photo name={photo} style={StyleSheet.absoluteFill} />
      {/* Two fades: a long soft one, and a stronger one behind the text so it stays readable on bright photos. */}
      <Gradient vertical from={p.heroFrom} to={p.heroFrom} fromOpacity={0.05} toOpacity={0.9} />
      <Gradient vertical from={p.heroFrom} to={p.heroFrom} fromOpacity={0} toOpacity={0.6} style={{ top: '30%' }} />
      <View style={styles.heroText}>
        <AppText variant="display" accessibilityRole="header" style={[styles.heroTitle, { color: p.onHero }]}>
          {title}
        </AppText>
        {body ? <AppText style={{ color: p.onHeroMuted, fontSize: 15, lineHeight: 21 }}>{body}</AppText> : null}
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={action}
          onPress={onAction}
          style={({ pressed }) => [styles.heroButton, { backgroundColor: pressed ? p.ctaPressed : p.cta }]}>
          <AppText variant="bodyStrong" style={{ color: p.onCta, fontFamily: fonts.extrabold }}>
            {action}
          </AppText>
          <Icon name="arrow-forward" size={18} color={p.onCta} />
        </PressableScale>
      </View>
      <PaintStripe style={styles.heroStripe} />
    </View>
  );
}

/** A square tile with a tinted icon, a short title and a hint, for the main things to do. */
export function QuickAction({
  title,
  hint,
  icon,
  feature,
  onPress,
}: {
  title: string;
  hint?: string;
  icon: IconName;
  feature: FeatureKey;
  onPress: () => void;
}) {
  const p = usePalette();
  const f = useFeatureColour(feature);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={hint}
      onPress={onPress}
      style={[styles.quick, { backgroundColor: p.surface, borderColor: p.border }]}>
      <View style={[styles.quickIcon, { backgroundColor: f.soft }]}>
        <Icon name={icon} size={22} color={f.ink} />
      </View>
      <View style={{ gap: 2 }}>
        <AppText variant="cardTitle" numberOfLines={2}>
          {title}
        </AppText>
        {hint ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {hint}
          </AppText>
        ) : null}
      </View>
    </PressableScale>
  );
}

export type RoomItem = { key: string; title: string; photo?: PhotoName; icon?: IconName; onPress: () => void };

/** A tall photo card with the room's name on it. Without a photo it shows a calm tinted card with an icon. */
export function RoomCard({ item, width, landscape }: { item: RoomItem; width?: DimensionValue; landscape?: boolean }) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={item.onPress}
      style={[styles.room, landscape && styles.roomLandscape, { width, backgroundColor: item.photo ? p.heroFrom : p.sageSoft }]}>
      {item.photo ? (
        <>
          <Photo name={item.photo} style={StyleSheet.absoluteFill} />
          <Gradient vertical from={p.heroFrom} to={p.heroFrom} fromOpacity={0} toOpacity={0.8} style={{ top: '45%' }} />
        </>
      ) : (
        <View style={styles.roomIcon}>
          <Icon name={item.icon ?? 'home'} size={34} color={p.sageInk} />
        </View>
      )}
      <AppText variant="cardTitle" numberOfLines={2} style={[styles.roomTitle, { color: item.photo ? p.onHero : p.sageInk }]}>
        {item.title}
      </AppText>
    </PressableScale>
  );
}

/** Rooms in a row: scrolls sideways on phones; on wide screens, a grid of up to seven per row. */
export function RoomStrip({ items, wide }: { items: RoomItem[]; wide?: boolean }) {
  if (wide) {
    const rows = Math.ceil(items.length / 7);
    const columns = Math.ceil(items.length / rows);
    return (
      <View style={styles.roomGrid}>
        {items.map((item) => (
          <View key={item.key} style={{ width: `${100 / columns}%`, padding: (space.md - 2) / 2 }}>
            <RoomCard item={item} width="100%" landscape={rows > 1} />
          </View>
        ))}
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomScroll} style={styles.roomScrollOuter}>
      {items.map((item) => (
        <RoomCard key={item.key} item={item} width={118} />
      ))}
    </ScrollView>
  );
}

/** A section heading with an optional text link on the right ("Tümü"). */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const p = usePalette();
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </AppText>
      {action && onAction ? (
        <PressableScale accessibilityRole="link" accessibilityLabel={action} onPress={onAction} hitSlop={8} style={styles.sectionLink}>
          <AppText variant="small" style={{ color: p.primary, fontFamily: fonts.bold }}>
            {action}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** A round icon with a label under it, for the smaller services. `soon` adds an honest "Yakında" tag. */
export function IconLink({
  title,
  icon,
  feature,
  onPress,
  soon,
}: {
  title: string;
  icon: IconName;
  feature: FeatureKey;
  onPress: () => void;
  soon?: boolean;
}) {
  const p = usePalette();
  const f = useFeatureColour(feature);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={soon ? t('{title}, yakında', { title }) : title}
      onPress={onPress}
      style={styles.iconLink}>
      <View style={[styles.iconLinkCircle, { backgroundColor: p.surface, borderColor: p.border }]}>
        <Icon name={icon} size={24} color={f.base} />
        {soon ? (
          <View style={[styles.soonTag, { backgroundColor: p.rose }]}>
            <AppText variant="caption" style={{ color: '#FFFFFF', fontSize: 10, lineHeight: 13, fontFamily: fonts.extrabold }}>
              {t('Yakında')}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="caption" numberOfLines={2} style={{ textAlign: 'center', fontFamily: fonts.bold, color: p.text }}>
        {title}
      </AppText>
    </PressableScale>
  );
}

/** The "Örnek" tag on previews, so a sample is never mistaken for the user's own data. */
export function SampleTag() {
  const p = usePalette();
  return (
    <View style={[styles.sampleTag, { backgroundColor: p.surfaceMuted }]} accessibilityLabel={t('Örnek')}>
      <AppText variant="overline" tone="muted" style={{ fontSize: 11, lineHeight: 14 }}>
        {t('Örnek')}
      </AppText>
    </View>
  );
}

/**
 * A faded preview of what a screen will hold once the user saves something,
 * with an "Örnek" tag. Screen readers hear it as a sample.
 */
export function SamplePreview({ children, testID }: { children: ReactNode; testID?: string }) {
  const p = usePalette();
  return (
    <View testID={testID} style={[styles.sample, { backgroundColor: p.surface, borderColor: p.border }]}>
      <SampleTag />
      <View style={{ opacity: 0.72, gap: space.md }} accessibilityHint={t('Bu bir örnektir, senin verin değil.')}>
        {children}
      </View>
    </View>
  );
}

/** A grey placeholder block that gently pulses while content loads. Still when the system asks for less motion. */
export function Skeleton({ width = '100%', height = 16, rounded = radius.sm }: { width?: DimensionValue; height?: number; rounded?: number }) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.55, duration: duration.long * 2, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 1, duration: duration.long * 2, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);
  return <Animated.View style={{ width, height, borderRadius: rounded, backgroundColor: p.surfaceMuted, opacity: reduced ? 1 : pulse }} />;
}

/** A card-shaped loading placeholder: a picture block and two lines. */
export function SkeletonCard({ lines = 2, testID = 'skeleton' }: { lines?: number; testID?: string }) {
  const p = usePalette();
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('Yükleniyor')}
      style={[styles.skeletonCard, { backgroundColor: p.surface, borderColor: p.border }]}>
      <Skeleton width={56} height={56} rounded={radius.md} />
      <View style={{ flex: 1, gap: space.sm }}>
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} width={i === 0 ? '70%' : '45%'} height={i === 0 ? 16 : 12} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stripe: { flexDirection: 'row', height: 5 },
  panel: { borderRadius: radius.xl, padding: space.xl, paddingBottom: space.xl + 5, gap: space.sm, overflow: 'hidden' },
  hero: { borderRadius: radius.xl, overflow: 'hidden', justifyContent: 'flex-end' },
  heroText: { padding: space.xl - 4, paddingBottom: space.xl, gap: space.sm },
  heroTitle: { fontSize: 28, lineHeight: 32, textShadowColor: 'rgba(0, 0, 0, 0.35)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } },
  heroButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: space.lg + 2,
    marginTop: space.xs,
  },
  heroStripe: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  quick: { flexGrow: 1, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.md + 2, gap: space.md, minHeight: 118 },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  room: { aspectRatio: 3 / 4, borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end' },
  roomIcon: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: space.xl },
  roomTitle: { padding: space.md - 2 },
  roomLandscape: { aspectRatio: 4 / 3 },
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -(space.md - 2) / 2 },
  roomScrollOuter: { marginHorizontal: -space.lg },
  roomScroll: { gap: space.md - 2, paddingHorizontal: space.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  sectionLink: { minHeight: 32, justifyContent: 'center' },
  iconLink: { flex: 1, alignItems: 'center', gap: 6, minWidth: 64 },
  iconLinkCircle: { width: 56, height: 56, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  soonTag: { position: 'absolute', top: -7, right: -12, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  sampleTag: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  sample: { borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', padding: space.lg, gap: space.md },
  skeletonCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.md },
});
