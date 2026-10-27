import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { AppText, Icon, type IconName } from './components';
import { PressableScale } from './motion';
import { Photo, type PhotoName } from './photos';
import { fonts, radius, shadowOf, space, useFeatureColour, usePalette, type FeatureKey } from './theme';

import { t } from '@/i18n';

/** Diagonal gradient that fills its parent. Put it first inside a View with overflow hidden. */
export function Gradient({
  from,
  to,
  style,
  vertical,
  fromOpacity = 1,
  toOpacity = 1,
}: {
  from: string;
  to: string;
  style?: StyleProp<ViewStyle>;
  /** Top to bottom instead of corner to corner. */
  vertical?: boolean;
  fromOpacity?: number;
  toOpacity?: number;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2="1">
            <Stop offset="0" stopColor={from} stopOpacity={fromOpacity} />
            <Stop offset="1" stopColor={to} stopOpacity={toOpacity} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Soft paint drops in a corner of a hero or card. Decoration only. */
export function PaintDrops({ colours, style }: { colours: string[]; style?: StyleProp<ViewStyle> }) {
  const [a, b, c] = colours;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', right: -24, top: -24 }, style]}>
      <Svg width={170} height={170} viewBox="0 0 170 170">
        <Circle cx="110" cy="60" r="56" fill={a} opacity={0.9} />
        <Circle cx="58" cy="104" r="34" fill={b} opacity={0.85} />
        <Circle cx="134" cy="128" r="22" fill={c ?? a} opacity={0.8} />
      </Svg>
    </View>
  );
}

/** A fan of paint swatch cards, used on the colour feature. */
export function SwatchFan({ colours, size = 84 }: { colours: string[]; size?: number }) {
  const w = size * 0.42;
  const h = size;
  return (
    <View pointerEvents="none" style={{ width: size * 1.25, height: size + 8 }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${size * 1.25} ${size + 8}`}>
        {colours.slice(0, 4).map((c, i) => (
          <Rect
            key={c + i}
            x={size * 0.4}
            y={4}
            width={w}
            height={h - 8}
            rx={8}
            fill={c}
            stroke="#FFFFFF"
            strokeWidth={2}
            transform={`rotate(${-30 + i * 18} ${size * 0.62} ${h - 6})`}
          />
        ))}
      </Svg>
    </View>
  );
}

/** A simple paint roller mark. */
export function RollerMark({ colour, size = 64 }: { colour: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" pointerEvents="none">
      <Rect x="6" y="8" width="40" height="16" rx="8" fill={colour} />
      <Path d="M46 16h8v14H32v10" stroke={colour} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <Rect x="28" y="40" width="8" height="18" rx="4" fill={colour} opacity={0.85} />
    </Svg>
  );
}

export function IconBubble({ icon, feature, size = 48 }: { icon: IconName; feature: FeatureKey; size?: number }) {
  const f = useFeatureColour(feature);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: f.soft, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={size * 0.5} color={f.ink} />
    </View>
  );
}

/** Coloured header at the top of a feature screen. */
export function FeatureHeader({
  feature,
  icon,
  title,
  subtitle,
  children,
}: {
  feature: FeatureKey;
  icon: IconName;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const f = useFeatureColour(feature);
  return (
    <View style={[styles.featureHeader, { backgroundColor: f.soft }]}>
      <View style={styles.featureHeaderRow}>
        <View style={[styles.featureIcon, { backgroundColor: f.ink }]}>
          <Icon name={icon} size={24} color={f.soft} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="title" style={{ color: f.ink }}>
            {title}
          </AppText>
          {subtitle ? <AppText style={{ color: f.ink, opacity: 0.85 }}>{subtitle}</AppText> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="heading" style={{ flex: 1 }}>
        {title}
      </AppText>
      {action}
    </View>
  );
}

const OptionLayout = createContext<'row' | 'tile'>('row');

/** Big tappable choice tile with an icon, used in wizards. */
export function OptionCard({
  title,
  subtitle,
  icon,
  selected,
  onPress,
  feature = 'calculate',
  badge,
  disabled,
  swatch,
  photo,
  multiple,
  testID,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
  feature?: FeatureKey;
  badge?: string;
  disabled?: boolean;
  /** Shows a colour chip instead of an icon. */
  swatch?: string;
  /** Shows a real photo of the space instead of an icon. */
  photo?: PhotoName;
  /** Part of a pick-several list: shows a checkbox instead of a radio. */
  multiple?: boolean;
  testID?: string;
}) {
  const p = usePalette();
  const f = useFeatureColour(feature);
  const layout = useContext(OptionLayout);
  const tile = layout === 'tile';
  const checkIcon = multiple ? (selected ? 'checkbox' : 'square-outline') : selected ? 'checkmark-circle' : 'ellipse-outline';
  const check = <Icon name={checkIcon} size={24} color={selected ? f.base : p.border} />;
  const visual = photo ? (
    <Photo name={photo} style={tile ? styles.optionPhotoTile : styles.optionPhoto} />
  ) : swatch ? (
    <View style={[styles.optionSwatch, { backgroundColor: swatch, borderColor: p.border }]} />
  ) : icon ? (
    <View style={[styles.optionIcon, { backgroundColor: selected ? f.ink : f.soft }]}>
      <Icon name={icon} size={22} color={selected ? f.soft : f.ink} />
    </View>
  ) : null;
  return (
    <PressableScale
      testID={testID}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityLabel={badge ? `${title}, ${badge}` : title}
      accessibilityState={multiple ? { checked: selected, disabled: !!disabled } : { selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        tile ? styles.optionTile : styles.option,
        {
          backgroundColor: selected ? f.soft : p.surface,
          borderColor: selected ? f.base : p.border,
          opacity: disabled ? 0.55 : 1,
        },
        !selected && shadowOf(p),
      ]}>
      {tile && photo ? (
        <View>
          {visual}
          <View style={[styles.optionPhotoCheck, { backgroundColor: p.surface }]}>{check}</View>
        </View>
      ) : tile ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {visual}
          {check}
        </View>
      ) : (
        visual
      )}
      <View style={{ flex: tile ? undefined : 1, gap: 2 }}>
        <AppText variant="bodyStrong" style={{ fontFamily: fonts.bold }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
        {badge ? (
          <View style={[styles.optionBadge, { backgroundColor: p.surfaceMuted }]}>
            <AppText variant="caption" tone="muted">
              {badge}
            </AppText>
          </View>
        ) : null}
      </View>
      {tile ? null : check}
    </PressableScale>
  );
}

/** Lays children out in two columns on wide screens, one on phones narrower than ~360pt. */
export function OptionGrid({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 }) {
  const [width, setWidth] = useState(0);
  const cols = columns === 2 && width >= 340 ? 2 : 1;
  const items = Array.isArray(children) ? children.flat() : [children];
  return (
    <OptionLayout.Provider value={cols === 2 ? 'tile' : 'row'}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.grid} accessibilityRole="radiogroup">
        {items.map((child, i) =>
          child ? (
            <View key={i} style={{ width: cols === 2 ? '50%' : '100%', padding: space.xs }}>
              {child}
            </View>
          ) : null,
        )}
      </View>
    </OptionLayout.Provider>
  );
}

/** "Adım 2 / 6" with a segmented bar. */
export function StepProgress({ step, total, label, feature = 'calculate' }: { step: number; total: number; label: string; feature?: FeatureKey }) {
  const p = usePalette();
  const f = useFeatureColour(feature);
  return (
    <View style={{ gap: space.sm }} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: step }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <AppText variant="overline" style={{ color: f.ink }}>
          {t('Adım {step} / {total}', { step, total })}
        </AppText>
        <AppText variant="small" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
          {label}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < step ? f.base : p.surfaceMuted }} />
        ))}
      </View>
    </View>
  );
}

/** A big number with a label, for result screens. */
export function StatTile({
  label,
  value,
  unit,
  icon,
  feature = 'projects',
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: IconName;
  feature?: FeatureKey;
  hint?: string;
}) {
  const p = usePalette();
  const f = useFeatureColour(feature);
  return (
    <View style={[styles.stat, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        {icon ? (
          <View style={[styles.statIcon, { backgroundColor: f.soft }]}>
            <Icon name={icon} size={16} color={f.ink} />
          </View>
        ) : null}
        <AppText variant="small" tone="muted" style={{ flex: 1 }}>
          {label}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
        <AppText variant="heading" style={{ fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30 }}>
          {value}
        </AppText>
        {unit ? (
          <AppText variant="bodyStrong" tone="muted">
            {unit}
          </AppText>
        ) : null}
      </View>
      {hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

/** Two tiles side by side that wrap on narrow screens. */
export function TileRow({ children }: { children: ReactNode }) {
  return <View style={styles.tileRow}>{children}</View>;
}

/** Collapsed details: "Detayları göster". */
export function Disclosure({ title, children, initiallyOpen = false }: { title: string; children: ReactNode; initiallyOpen?: boolean }) {
  const p = usePalette();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={[styles.disclosure, { backgroundColor: p.surface, borderColor: p.border }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={styles.disclosureHead}>
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {title}
        </AppText>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} color={p.textMuted} />
      </PressableScale>
      {open ? <View style={{ gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.lg }}>{children}</View> : null}
    </View>
  );
}

/** Segmented tabs inside a screen. Labels go through t(), so constant lists can pass msg() text. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const p = usePalette();
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(o.label)}
            onPress={() => onChange(o.value)}
            style={[styles.segment, { backgroundColor: active ? p.primary : p.surfaceMuted }]}>
            {o.icon ? <Icon name={o.icon} size={16} color={active ? p.onPrimary : p.textMuted} /> : null}
            <AppText variant="small" numberOfLines={1} style={{ color: active ? p.onPrimary : p.textMuted, fontFamily: active ? fonts.bold : fonts.medium }}>
              {t(o.label)}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** Bottom bar for wizards: back and next. */
export function WizardNav({
  onBack,
  onNext,
  nextLabel = t('Devam'),
  nextIcon = 'arrow-forward',
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextIcon?: IconName;
  nextDisabled?: boolean;
}) {
  const p = usePalette();
  return (
    <View style={styles.wizardNav}>
      {onBack ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('Geri')}
          onPress={onBack}
          style={[styles.backBtn, { backgroundColor: p.surfaceMuted }]}>
          <Icon name="arrow-back" color={p.text} />
        </PressableScale>
      ) : null}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
        accessibilityState={{ disabled: !!nextDisabled }}
        disabled={nextDisabled}
        onPress={onNext}
        style={({ pressed }) => [
          styles.nextBtn,
          { backgroundColor: pressed ? p.ctaPressed : p.cta, opacity: nextDisabled ? 0.45 : 1 },
          shadowOf(p),
        ]}>
        <AppText variant="bodyStrong" style={{ color: p.onCta, fontFamily: fonts.bold }}>
          {nextLabel}
        </AppText>
        <Icon name={nextIcon} size={20} color={p.onCta} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  featureHeader: { borderRadius: radius.xl, padding: space.lg + 2, gap: space.md, overflow: 'hidden' },
  featureHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  featureIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md + 2,
    borderRadius: radius.lg,
    borderWidth: 2,
    minHeight: 72,
  },
  // flexGrow (not height: '100%') evens out tiles in a row: phones resolve the
  // percentage against the screen and stretch every tile to full height.
  optionTile: { flexGrow: 1, gap: space.sm, padding: space.md + 2, borderRadius: radius.lg, borderWidth: 2, minHeight: 120 },
  optionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionPhoto: { width: 56, height: 56, borderRadius: 14 },
  optionPhotoTile: { width: '100%', height: 88, borderRadius: radius.md },
  optionPhotoCheck: { position: 'absolute', top: 6, right: 6, borderRadius: 14 },
  optionSwatch: { width: 44, height: 44, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  optionBadge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -space.xs },
  stat: { flex: 1, minWidth: 140, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.xs },
  statIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  disclosure: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  disclosureHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg, minHeight: 56 },
  segmented: { flexDirection: 'row', gap: space.sm },
  segment: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', minHeight: 44, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: space.sm },
  wizardNav: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  backBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  nextBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
});
