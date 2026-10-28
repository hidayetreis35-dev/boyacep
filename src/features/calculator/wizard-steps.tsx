import type { ReactNode } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { msg, t } from '@/i18n';
import { formatNumber, parseDecimal } from '@/lib/number';
import { Gradient } from '@/ui/brand';
import { AppText, Badge, Icon, type IconName } from '@/ui/components';
import { FadeIn, Pop, PressableScale, tick, useAnimatedTo } from '@/ui/motion';
import { Photo } from '@/ui/photos';
import { fonts, radius, shadowOf, space, usePalette } from '@/ui/theme';

import type { RoomForm } from './form';
import { boundsOf, pathOf, roomScene, type Quad } from './room-geometry';
import { Door, WallMarks, Window } from './room-scene';
import { SPACES, WALL_STATES, type SpaceKind, type Surfaces, type WallState } from './wizard';

const NAVY = '#121C33';
const SAGE = { lit: '#A9BFA0', shade: '#8FA686', lid: '#B9CCB0' };

/** A tick mark that springs in on the selected choice. */
function Check({ on }: { on: boolean }) {
  const p = usePalette();
  if (!on) return null;
  return (
    <Pop from={0.5}>
      <View style={[styles.check, { backgroundColor: p.cta }]}>
        <Icon name="checkmark" size={16} color={p.onCta} />
      </View>
    </Pop>
  );
}

function SpaceTile({ value, selected, onPress, index, wide }: { value: SpaceKind; selected: boolean; onPress: () => void; index: number; wide?: boolean }) {
  const p = usePalette();
  const s = SPACES.find((x) => x.value === value)!;
  const zoom = useAnimatedTo(selected ? 1.08 : 1, { duration: 520 });
  const label = s.ready ? t(s.label) : `${t(s.label)}, ${t('Yakında')}`;
  return (
    <FadeIn delay={index * 45} style={wide ? styles.cellWide : styles.cell}>
      <PressableScale
        testID={`space-${s.value}`}
        accessibilityRole="radio"
        accessibilityLabel={label}
        aria-checked={selected}
        aria-disabled={!s.ready}
        disabled={!s.ready}
        onPress={() => {
          tick();
          onPress();
        }}
        style={[
          styles.tile,
          { height: wide ? 108 : 136, borderColor: selected ? p.cta : p.surface, opacity: s.ready ? 1 : 0.6, backgroundColor: p.surfaceMuted },
          shadowOf(p, selected ? 2 : 1),
        ]}>
        {s.photo ? (
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: zoom }] }]}>
            <Photo name={s.photo} style={StyleSheet.absoluteFill} />
          </Animated.View>
        ) : null}
        <Gradient from={NAVY} to={NAVY} fromOpacity={0.05} toOpacity={0.86} vertical />
        <View style={styles.tileTop}>
          <View style={[styles.tileIcon, { backgroundColor: selected ? p.cta : 'rgba(255,255,255,0.92)' }]}>
            <Icon name={s.icon} size={16} color={selected ? p.onCta : NAVY} />
          </View>
          {s.ready ? <Check on={selected} /> : <Badge label={t('Yakında')} tone="accent" />}
        </View>
        <View style={styles.tileText}>
          <AppText variant="heading" style={{ color: '#FFFFFF', fontSize: 18, lineHeight: 22 }} numberOfLines={1}>
            {t(s.label)}
          </AppText>
          <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.86)' }} numberOfLines={2}>
            {t(s.hint)}
          </AppText>
        </View>
      </PressableScale>
    </FadeIn>
  );
}

/** "Hangi alanı boyayacaksın?": photo tiles, the whole home as a wide tile at the end. */
export function SpacePicker({ value, onChange }: { value: SpaceKind | null; onChange: (v: SpaceKind) => void }) {
  const rooms = SPACES.filter((s) => s.value !== 'home');
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {rooms.map((s, i) => (
        <SpaceTile key={s.value} value={s.value} index={i} selected={value === s.value} onPress={() => onChange(s.value)} />
      ))}
      <SpaceTile value="home" wide index={rooms.length} selected={value === 'home'} onPress={() => onChange('home')} />
    </View>
  );
}

/** A small pill that fills in a common value. */
function PresetChip({ label, accessibilityLabel, selected, onPress }: { label: string; accessibilityLabel?: string; selected: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      aria-checked={selected}
      onPress={() => {
        if (!selected) tick();
        onPress();
      }}
      style={[styles.chip, { backgroundColor: selected ? p.primary : p.surface, borderColor: selected ? p.primary : p.border }]}>
      <AppText variant="small" style={{ color: selected ? p.onPrimary : p.text, fontFamily: fonts.bold }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

function ChipRow({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={14} color={p.accent} />
        <AppText variant="caption" tone="muted">
          {title}
        </AppText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }} accessibilityRole="radiogroup">
        {children}
      </ScrollView>
    </View>
  );
}

/** Width × length of rooms people measure most; tapping one fills both fields. */
const ROOM_PRESETS: [number, number][] = [
  [3, 3],
  [3, 4],
  [3.5, 4],
  [4, 4.5],
  [4, 5],
  [5, 6],
];
const HEIGHT_PRESETS = [2.5, 2.6, 2.7, 2.8, 3];

export function SizePresets({ form, onSize }: { form: RoomForm; onSize: (p: Partial<RoomForm>) => void }) {
  const width = parseDecimal(form.width);
  const length = parseDecimal(form.length);
  return (
    <ChipRow title={t('Sık kullanılan oda ölçüleri (en × boy)')} icon="flash">
      {ROOM_PRESETS.map(([w, l]) => (
        <PresetChip
          key={`${w}x${l}`}
          label={`${formatNumber(w)} × ${formatNumber(l)} m`}
          accessibilityLabel={t('{width} m en, {length} m boy', { width: formatNumber(w), length: formatNumber(l) })}
          selected={width === w && length === l}
          onPress={() => onSize({ width: formatNumber(w), length: formatNumber(l) })}
        />
      ))}
    </ChipRow>
  );
}

export function HeightPresets({ form, onHeight }: { form: RoomForm; onHeight: (h: string) => void }) {
  const height = parseDecimal(form.height);
  return (
    <ChipRow title={t('Hazır tavan yükseklikleri')} icon="arrow-up">
      {HEIGHT_PRESETS.map((h) => (
        <PresetChip
          key={h}
          label={`${formatNumber(h, 2)} m`}
          accessibilityLabel={t('Tavan {height} m', { height: formatNumber(h, 2) })}
          selected={height === h}
          onPress={() => onHeight(formatNumber(h, 2))}
        />
      ))}
    </ChipRow>
  );
}

const MINI = roomScene({
  length: 3.4,
  width: 3.4,
  height: 2.6,
  doors: { count: 0, width: 0, height: 0 },
  windows: { count: 0, width: 0, height: 0 },
});

const MINI_BOX = boundsOf([MINI.slabLeft, MINI.slabRight, MINI.leftTop, MINI.rightTop, MINI.ceiling, MINI.ceilingEdge].flat(), 6);

/** A small room with the chosen surfaces in paint colour. */
function MiniRoom({ walls, ceiling }: { walls: boolean; ceiling: boolean }) {
  const s = MINI;
  return (
    <Svg width="100%" height="100%" viewBox={`${MINI_BOX.x} ${MINI_BOX.y} ${MINI_BOX.width} ${MINI_BOX.height}`}>
      <Path d={pathOf(s.slabLeft)} fill="#B98C60" />
      <Path d={pathOf(s.slabRight)} fill="#A57A50" />
      <Path d={pathOf(s.floor)} fill="#D9B58C" />
      <Path d={pathOf(s.leftWall)} fill={walls ? SAGE.lit : '#F3EEE5'} />
      <Path d={pathOf(s.rightWall)} fill={walls ? SAGE.shade : '#E2DACB'} />
      <Path d={pathOf(s.leftEnd)} fill="#D8CFC0" />
      <Path d={pathOf(s.rightEnd)} fill="#D8CFC0" />
      <Path d={pathOf(s.leftTop)} fill="#FBF8F3" />
      <Path d={pathOf(s.rightTop)} fill="#FBF8F3" />
      <Path d={pathOf(s.ceilingSide)} fill="#D8CFC0" />
      <Path d={pathOf(s.ceilingEdge)} fill="#E6DFD2" />
      <Path
        d={pathOf(s.ceiling)}
        fill={ceiling ? SAGE.lid : '#FFFFFF'}
        stroke={ceiling ? undefined : '#CDBFA8'}
        strokeWidth={3}
        strokeDasharray={ceiling ? undefined : '8 6'}
      />
    </Svg>
  );
}

/** A card-shaped choice with a picture on top, used for surfaces and wall states. */
function PictureChoice({
  title,
  subtitle,
  selected,
  onPress,
  picture,
  testID,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  picture: ReactNode;
  testID?: string;
}) {
  const p = usePalette();
  const lift = useAnimatedTo(selected ? -3 : 0, { duration: 220 });
  return (
    <Animated.View style={{ flex: 1, transform: [{ translateY: lift }] }}>
      <PressableScale
        testID={testID}
        accessibilityRole="radio"
        accessibilityLabel={title}
        aria-checked={selected}
        onPress={() => {
          tick();
          onPress();
        }}
        style={[
          styles.picture,
          { backgroundColor: selected ? p.accentSoft : p.surface, borderColor: selected ? p.cta : p.border },
          shadowOf(p, selected ? 2 : 1),
        ]}>
        <View style={[styles.pictureArt, { backgroundColor: p.surfaceMuted }]}>
          {picture}
          <View style={styles.pictureCheck}>
            <Check on={selected} />
          </View>
        </View>
        <View style={{ gap: 2, paddingHorizontal: space.sm, paddingBottom: space.sm }}>
          <AppText variant="small" style={{ fontFamily: fonts.bold }} numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" tone="muted" numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const SURFACE_CHOICES: { value: Surfaces; label: string; hint?: string }[] = [
  { value: 'both', label: msg('Duvarlar ve tavan'), hint: msg('En sık yapılan seçim') },
  { value: 'walls', label: msg('Sadece duvarlar') },
  { value: 'ceiling', label: msg('Sadece tavan') },
];

/** `only` limits the choices: a whole home (`home`) always has its walls painted. */
export function SurfacePicker({ value, onChange, only, home }: { value: Surfaces; onChange: (v: Surfaces) => void; only?: Surfaces[]; home?: boolean }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {SURFACE_CHOICES.filter((c) => !only || only.includes(c.value)).map((c) => (
        <PictureChoice
          key={c.value}
          title={home && c.value === 'both' ? t('Duvarlar ve tavanlar') : t(c.label)}
          subtitle={c.hint ? t(c.hint) : undefined}
          selected={value === c.value}
          onPress={() => onChange(c.value)}
          picture={<MiniRoom walls={c.value !== 'ceiling'} ceiling={c.value !== 'walls'} />}
        />
      ))}
    </View>
  );
}

/** A flat piece of wall showing its state, for the wall-state choices. */
function WallSwatch({ state }: { state: WallState }) {
  const face: Quad = [
    { x: 0, y: 60 },
    { x: 140, y: 60 },
    { x: 140, y: 0 },
    { x: 0, y: 0 },
  ];
  const raw = { painted: '#F3EEE5', new_plaster: '#E6D5BF', light_damage: '#F1EBE1', heavy_damage: '#EEE6D8', plasterboard: '#EEEDE8', concrete: '#C4C3BD' }[state];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 140 60" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={140} height={60} fill={raw} />
      <WallMarks state={state} face={face} metres={2.4} aspect={140 / 60} />
    </Svg>
  );
}

export function WallStatePicker({ value, onChange }: { value: WallState; onChange: (v: WallState) => void }) {
  const rows: (typeof WALL_STATES)[] = [];
  for (let i = 0; i < WALL_STATES.length; i += 2) rows.push(WALL_STATES.slice(i, i + 2));
  return (
    <View style={{ gap: space.md }} accessibilityRole="radiogroup">
      {rows.map((row) => (
        <View key={row[0].value} style={styles.row}>
          {row.map((w) => (
            <PictureChoice
              key={w.value}
              title={t(w.label)}
              subtitle={t(w.hint)}
              selected={value === w.value}
              onPress={() => onChange(w.value)}
              picture={<WallSwatch state={w.value} />}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const DOOR_ICON: Quad = [
  { x: 14, y: 54 },
  { x: 34, y: 54 },
  { x: 34, y: 8 },
  { x: 14, y: 8 },
];
const WINDOW_ICON: Quad = [
  { x: 6, y: 40 },
  { x: 42, y: 40 },
  { x: 42, y: 12 },
  { x: 6, y: 12 },
];

function RoundButton({ icon, label, disabled, onPress }: { icon: IconName; label: string; disabled: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={() => {
        tick();
        onPress();
      }}
      style={[styles.round, { backgroundColor: p.primarySoft, opacity: disabled ? 0.35 : 1 }]}>
      <Icon name={icon} size={20} color={p.primary} />
    </PressableScale>
  );
}

/** "Kapı 1": a big count with the opening drawn beside it. */
export function OpeningCounter({ kind, label, value, max, onChange }: { kind: 'door' | 'window'; label: string; value: number; max: number; onChange: (v: number) => void }) {
  const p = usePalette();
  return (
    <View style={[styles.counter, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={[styles.counterArt, { backgroundColor: kind === 'door' ? '#F3EEE5' : '#E2DACB' }]}>
          <Svg width={48} height={60} viewBox="0 0 48 60">
            {kind === 'door' ? <Door q={DOOR_ICON} /> : <Window q={WINDOW_ICON} />}
          </Svg>
        </View>
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {label}
        </AppText>
      </View>
      <View style={styles.counterRow}>
        <RoundButton icon="remove" label={t('{label} azalt', { label })} disabled={value <= 0} onPress={() => onChange(value - 1)} />
        <FadeIn key={value}>
          <AppText variant="display" style={{ minWidth: 40, textAlign: 'center', fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite">
            {value}
          </AppText>
        </FadeIn>
        <RoundButton icon="add" label={t('{label} artır', { label })} disabled={value >= max} onPress={() => onChange(value + 1)} />
      </View>
    </View>
  );
}

const COATS: { value: number; label: string; hint: string }[] = [
  { value: 1, label: msg('1 kat'), hint: msg('Aynı rengi tazelemek') },
  { value: 2, label: msg('2 kat'), hint: msg('Önerilen, çoğu iş için') },
  { value: 3, label: msg('3 kat'), hint: msg('Koyu renk ya da renk değişimi') },
  { value: 4, label: msg('4 kat'), hint: msg('Çok koyu renkten açığa') },
];

/** A cut through the wall: the old surface and the coats of paint on it. */
function CoatLayers({ count, active }: { count: number; active: boolean }) {
  return (
    <Svg width="100%" height={52} viewBox="0 0 60 52" preserveAspectRatio="none">
      <Rect x={0} y={40} width={60} height={12} fill={active ? '#C9B394' : '#D8CFC0'} />
      {Array.from({ length: count }, (_, i) => (
        <Rect key={i} x={0} y={40 - (i + 1) * 9} width={60} height={8} rx={2} fill={SAGE.shade} opacity={0.45 + i * 0.18} />
      ))}
    </Svg>
  );
}

function CoatColumn({ c, selected, onPress }: { c: (typeof COATS)[number]; selected: boolean; onPress: () => void }) {
  const p = usePalette();
  const lift = useAnimatedTo(selected ? -6 : 0, { duration: 240 });
  return (
    <Animated.View style={{ flex: 1, transform: [{ translateY: lift }] }}>
      <PressableScale
        accessibilityRole="radio"
        accessibilityLabel={t(c.label)}
        aria-checked={selected}
        onPress={() => {
          if (!selected) tick();
          onPress();
        }}
        style={[
          styles.coat,
          { backgroundColor: selected ? p.accentSoft : p.surface, borderColor: selected ? p.cta : p.border },
          shadowOf(p, selected ? 2 : 1),
        ]}>
        <CoatLayers count={c.value} active={selected} />
        <AppText variant="heading" style={{ fontFamily: fonts.display, color: selected ? p.accent : p.text }} numberOfLines={1}>
          {t(c.label)}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}

/** "Kaç kat?": four columns showing the coats stacked on the wall, and what the chosen count is for. */
export function CoatsDial({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const p = usePalette();
  const chosen = COATS.find((c) => c.value === value) ?? COATS[1];
  return (
    <View style={{ gap: space.md }}>
      <View style={[styles.row, { paddingTop: 8 }]} accessibilityRole="radiogroup">
        {COATS.map((c) => (
          <CoatColumn key={c.value} c={c} selected={c.value === value} onPress={() => onChange(c.value)} />
        ))}
      </View>
      <FadeIn key={chosen.value} style={[styles.coatHint, { backgroundColor: p.surfaceMuted }]}>
        <Icon name={chosen.value === 2 ? 'star' : 'information-circle'} size={18} color={p.accent} />
        <AppText variant="small" style={{ flex: 1 }}>
          {`${t(chosen.label)}: ${t(chosen.hint)}`}
        </AppText>
      </FadeIn>
    </View>
  );
}

/** The whole-home path's running total over a photo, shown above its questions. */
export function HomeLiveCard({ litres, wallArea, estimate }: { litres: number | null; wallArea: number | null; estimate: boolean }) {
  const p = usePalette();
  return (
    <FadeIn style={[styles.home, shadowOf(p, 2)]}>
      <Photo name="wholeHome" style={StyleSheet.absoluteFill} />
      <Gradient from={NAVY} to={NAVY} fromOpacity={0.35} toOpacity={0.9} vertical />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name="home" size={16} color="#FFFFFF" />
        <AppText variant="overline" style={{ color: 'rgba(255,255,255,0.86)', flex: 1 }}>
          {t('Tüm ev')}
        </AppText>
        {estimate && litres !== null ? <Badge label={t('Tahmini')} tone="accent" /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.lg }} accessibilityLiveRegion="polite">
        <View style={{ gap: 2 }}>
          <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {t('Gereken boya')}
          </AppText>
          <FadeIn key={String(litres)}>
            <AppText variant="display" style={{ color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>
              {litres === null ? '—' : `${formatNumber(litres)} L`}
            </AppText>
          </FadeIn>
        </View>
        <View style={{ gap: 2, paddingBottom: 6 }}>
          <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {t('Duvar alanı')}
          </AppText>
          <AppText variant="bodyStrong" style={{ color: '#FFFFFF' }}>
            {wallArea === null ? '—' : `≈ ${formatNumber(wallArea)} m²`}
          </AppText>
        </View>
      </View>
      {litres === null ? (
        <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {t('Metrekareyi yazınca hesaplanır')}
        </AppText>
      ) : null}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -5 },
  cell: { width: '50%', padding: 5 },
  cellWide: { width: '100%', padding: 5 },
  tile: { borderRadius: radius.lg, borderWidth: 3, overflow: 'hidden', justifyContent: 'space-between' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: space.sm },
  tileIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tileText: { paddingHorizontal: space.md, paddingBottom: space.sm + 2, gap: 2 },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: radius.pill, borderWidth: 1.5, paddingHorizontal: space.md + 2, paddingVertical: space.sm, minHeight: 40, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'stretch' },
  picture: { flex: 1, borderRadius: radius.lg, borderWidth: 1.5, overflow: 'hidden', gap: space.sm },
  pictureArt: { height: 74, overflow: 'hidden' },
  pictureCheck: { position: 'absolute', top: 6, right: 6 },
  counter: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: space.md, gap: space.sm },
  counterArt: { width: 48, height: 60, borderRadius: radius.sm, overflow: 'hidden' },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  coat: { borderRadius: radius.lg, borderWidth: 1.5, alignItems: 'center', paddingBottom: space.sm, overflow: 'hidden' },
  coatHint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, padding: space.md },
  home: { borderRadius: radius.xl, overflow: 'hidden', padding: space.lg, gap: space.sm, minHeight: 150, justifyContent: 'space-between' },
});
