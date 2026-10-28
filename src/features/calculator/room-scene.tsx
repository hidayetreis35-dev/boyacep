import { useMemo, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { calculateProject } from '@/engine';
import { t } from '@/i18n';
import { formatNumber, parseDecimal } from '@/lib/number';
import { Gradient } from '@/ui/brand';
import { AppText, Badge, Icon } from '@/ui/components';
import { FadeIn, Pop, useAnimatedTo } from '@/ui/motion';
import { fonts, radius, shadowOf, space, usePalette } from '@/ui/theme';

import { toRoomInput, type RoomForm } from './form';
import { boundsOf, lineOf, onQuad, pathOf, roomScene, VIEW, type Pt, type Quad, type RoomScene } from './room-geometry';
import { WALL_STATES, wallStateOf, type RoomStep, type WallState } from './wizard';

export type SceneStage = Exclude<RoomStep, 'space'>;

/**
 * Illustration colours. The walls are drawn in one sample paint colour
 * (sage); the calculator doesn't know the user's colour, and the drawing says
 * nothing about amounts.
 */
const PAINT = { lit: '#A9BFA0', shade: '#8FA686', lid: '#B9CCB0' };
const WOOD = { floor: '#D9B58C', board: '#C49C70', slabLeft: '#B98C60', slabRight: '#A57A50' };
const WALL_END = '#D8CFC0';
const WALL_TOP = '#FBF8F3';

/** The wall before painting: lit (left) and shaded (right) face. */
const RAW: Record<WallState, { lit: string; shade: string }> = {
  painted: { lit: '#F3EEE5', shade: '#E2DACB' },
  new_plaster: { lit: '#E6D5BF', shade: '#D4C0A6' },
  light_damage: { lit: '#F1EBE1', shade: '#DFD7C8' },
  heavy_damage: { lit: '#EEE6D8', shade: '#DCD1BF' },
  plasterboard: { lit: '#EEEDE8', shade: '#DCDBD5' },
  concrete: { lit: '#C4C3BD', shade: '#AEADA6' },
};

/** More coats cover the old wall better; a picture of that, not a measurement. */
const COAT_COVER: Record<number, number> = { 1: 0.45, 2: 0.8, 3: 0.93, 4: 1 };

type Blob = { u: number; v: number; r: number };

function blob(face: Quad, { u, v, r }: Blob, seed: number, aspect: number): Pt[] {
  return Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * Math.PI * 2;
    const wobble = 1 + 0.28 * Math.sin(3 * k + seed);
    return onQuad(face, u + Math.cos(a) * r * wobble, v + Math.sin(a) * r * wobble * aspect);
  });
}

const line = (face: Quad, uv: [number, number][]) => lineOf(uv.map(([u, v]) => onQuad(face, u, v)));

/**
 * Marks that show what the wall is like now: patches of new plaster, cracks,
 * peeling, board seams or concrete tie holes. `metres` is the wall's length,
 * so seams and holes keep a real spacing; `aspect` its length over height.
 */
export function WallMarks({ state, face, metres, aspect }: { state: WallState; face: Quad; metres: number; aspect: number }) {
  if (state === 'new_plaster') {
    const blobs: Blob[] = [
      { u: 0.18, v: 0.3, r: 0.08 },
      { u: 0.52, v: 0.66, r: 0.1 },
      { u: 0.82, v: 0.32, r: 0.07 },
      { u: 0.34, v: 0.86, r: 0.06 },
      { u: 0.72, v: 0.9, r: 0.05 },
    ];
    return (
      <G>
        {blobs.map((b, i) => (
          <Path key={i} d={`${lineOf(blob(face, b, i, aspect))} Z`} fill="#C9B394" opacity={0.5} />
        ))}
      </G>
    );
  }
  if (state === 'light_damage') {
    return (
      <G>
        <Path d={line(face, [[0.3, 1], [0.33, 0.86], [0.29, 0.74], [0.34, 0.6]])} stroke="#8F8270" strokeWidth={0.9} fill="none" />
        <Path d={line(face, [[0.72, 0.56], [0.75, 0.46], [0.72, 0.38]])} stroke="#8F8270" strokeWidth={0.9} fill="none" />
        {[
          [0.55, 0.25],
          [0.6, 0.72],
          [0.15, 0.55],
        ].map(([u, v], i) => {
          const c = onQuad(face, u, v);
          return <Circle key={i} cx={c.x} cy={c.y} r={1.5} fill="#9C8F7C" />;
        })}
      </G>
    );
  }
  if (state === 'heavy_damage') {
    const peel: Blob[] = [
      { u: 0.48, v: 0.68, r: 0.11 },
      { u: 0.84, v: 0.26, r: 0.08 },
    ];
    return (
      <G>
        {peel.map((b, i) => (
          <Path key={i} d={`${lineOf(blob(face, b, i + 2, aspect))} Z`} fill="#D6CAB4" stroke="#B3A58D" strokeWidth={0.8} />
        ))}
        <Path d={line(face, [[0.22, 1], [0.26, 0.82], [0.2, 0.66], [0.27, 0.5], [0.23, 0.34]])} stroke="#6F6353" strokeWidth={1.6} fill="none" />
        <Path d={line(face, [[0.26, 0.82], [0.36, 0.76]])} stroke="#6F6353" strokeWidth={1.1} fill="none" />
        <Path d={line(face, [[0.66, 0], [0.62, 0.18], [0.69, 0.3], [0.64, 0.44]])} stroke="#6F6353" strokeWidth={1.4} fill="none" />
      </G>
    );
  }
  if (state === 'plasterboard') {
    const seams: number[] = [];
    for (let m = 1.2; m < metres - 0.1; m += 1.2) seams.push(m / metres);
    return (
      <G>
        {seams.map((u) => (
          <G key={u}>
            <Path d={line(face, [[u, 0], [u, 1]])} stroke="#C2C0B8" strokeWidth={0.9} fill="none" />
            {[0.12, 0.37, 0.62, 0.87].map((v) => {
              const c = onQuad(face, u, v);
              return <Circle key={v} cx={c.x} cy={c.y} r={0.8} fill="#A9A79F" />;
            })}
          </G>
        ))}
      </G>
    );
  }
  if (state === 'concrete') {
    const cols: number[] = [];
    for (let m = 0.3; m < metres - 0.15; m += 0.6) cols.push(m / metres);
    const joints: number[] = [];
    for (let m = 1.2; m < metres - 0.1; m += 1.2) joints.push(m / metres);
    return (
      <G>
        <Path d={line(face, [[0, 0.5], [1, 0.5]])} stroke="#A09F98" strokeWidth={0.8} fill="none" />
        {joints.map((u) => (
          <Path key={u} d={line(face, [[u, 0], [u, 1]])} stroke="#A09F98" strokeWidth={0.8} fill="none" />
        ))}
        {cols.flatMap((u) =>
          [0.25, 0.75].map((v) => {
            const c = onQuad(face, u, v);
            return <Circle key={`${u}-${v}`} cx={c.x} cy={c.y} r={1.5} fill="#8A8983" />;
          }),
        )}
      </G>
    );
  }
  return null;
}

function Layer({ children }: { children: ReactNode }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}>
        {children}
      </Svg>
    </View>
  );
}

export function Door({ q }: { q: Quad }) {
  const knob = onQuad(q, 0.8, 0.47);
  return (
    <G>
      <Path d={pathOf(q)} fill="#9A6B45" stroke="#FBF8F3" strokeWidth={2.2} strokeLinejoin="round" />
      <Path d={pathOf([onQuad(q, 0.18, 0.55), onQuad(q, 0.82, 0.55), onQuad(q, 0.82, 0.9), onQuad(q, 0.18, 0.9)])} fill="none" stroke="#83593A" strokeWidth={0.8} />
      <Path d={pathOf([onQuad(q, 0.18, 0.1), onQuad(q, 0.82, 0.1), onQuad(q, 0.82, 0.45), onQuad(q, 0.18, 0.45)])} fill="none" stroke="#83593A" strokeWidth={0.8} />
      <Circle cx={knob.x} cy={knob.y} r={1.6} fill="#E8C77A" />
    </G>
  );
}

export function Window({ q }: { q: Quad }) {
  return (
    <G>
      <Path d={pathOf(q)} fill="#CFE4F2" stroke="#FFFFFF" strokeWidth={2.4} strokeLinejoin="round" />
      <Path d={pathOf([onQuad(q, 0.12, 0.5), onQuad(q, 0.3, 0.5), onQuad(q, 0.46, 0.94), onQuad(q, 0.28, 0.94)])} fill="#FFFFFF" opacity={0.55} />
      <Path d={line(q, [[0.5, 0], [0.5, 1]])} stroke="#FFFFFF" strokeWidth={1.4} />
      <Path d={line(q, [[0, 0.5], [1, 0.5]])} stroke="#FFFFFF" strokeWidth={1.4} />
      <Path d={line(q, [[-0.06, -0.05], [1.06, -0.05]])} stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" />
    </G>
  );
}

/** A door or window that springs in on its own when the count goes up. */
function Opening({ q, kind }: { q: Quad; kind: 'door' | 'window' }) {
  const box = boundsOf(q, 4);
  return (
    <Pop
      from={0.7}
      style={{
        position: 'absolute',
        left: `${(box.x / VIEW.width) * 100}%`,
        top: `${(box.y / VIEW.height) * 100}%`,
        width: `${(box.width / VIEW.width) * 100}%`,
        height: `${(box.height / VIEW.height) * 100}%`,
      }}>
      <Svg width="100%" height="100%" viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}>
        {kind === 'door' ? <Door q={q} /> : <Window q={q} />}
      </Svg>
    </Pop>
  );
}

function Label({ at, text }: { at: Pt; text: string }) {
  const p = usePalette();
  return (
    <View
      pointerEvents="none"
      style={[styles.label, { left: `${(at.x / VIEW.width) * 100}%`, top: `${(at.y / VIEW.height) * 100}%` }]}>
      <View style={[styles.labelPill, { backgroundColor: p.surface, borderColor: p.border }]}>
        <AppText variant="caption" style={{ fontFamily: fonts.bold }} numberOfLines={1}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

/** The parts of the room that don't change while painting: floor, wall ends and tops. */
function Shell({ scene, state }: { scene: RoomScene; state: WallState }) {
  const raw = RAW[state];
  const shadow = (q: Quad) => pathOf(q.map((pt) => ({ x: pt.x, y: pt.y + 7 })));
  return (
    <Layer>
      <Path d={shadow(scene.slabLeft)} fill="#1B2B4B" opacity={0.08} />
      <Path d={shadow(scene.slabRight)} fill="#1B2B4B" opacity={0.08} />
      <Path d={pathOf(scene.slabLeft)} fill={WOOD.slabLeft} />
      <Path d={pathOf(scene.slabRight)} fill={WOOD.slabRight} />
      <Path d={pathOf(scene.floor)} fill={WOOD.floor} />
      {scene.boards.map(([a, b], i) => (
        <Path key={i} d={lineOf([a, b])} stroke={WOOD.board} strokeWidth={0.7} />
      ))}
      <Path d={pathOf(scene.leftWall)} fill={raw.lit} stroke={raw.shade} strokeWidth={0.8} strokeLinejoin="round" />
      <Path d={pathOf(scene.rightWall)} fill={raw.shade} stroke={raw.shade} strokeWidth={0.8} strokeLinejoin="round" />
      <Path d={pathOf(scene.leftEnd)} fill={WALL_END} />
      <Path d={pathOf(scene.rightEnd)} fill={WALL_END} />
      <Path d={pathOf(scene.leftTop)} fill={WALL_TOP} stroke={raw.shade} strokeWidth={0.6} />
      <Path d={pathOf(scene.rightTop)} fill={WALL_TOP} stroke={raw.shade} strokeWidth={0.6} />
    </Layer>
  );
}

function Marks({ scene, state }: { scene: RoomScene; state: WallState }) {
  const { length, width, height } = scene.room;
  return (
    <Layer>
      <WallMarks state={state} face={scene.leftWall} metres={width} aspect={width / height} />
      <WallMarks state={state} face={scene.rightWall} metres={length} aspect={length / height} />
    </Layer>
  );
}

function stageCaption(stage: SceneStage, form: RoomForm, scene: RoomScene): string {
  if (stage === 'size') {
    return scene.measured
      ? t('{width} × {length} m oda, tavan {height} m', {
          length: formatNumber(scene.room.length, 2),
          width: formatNumber(scene.room.width, 2),
          height: formatNumber(scene.room.height, 2),
        })
      : t('Örnek oda. Ölçüleri yazınca şekillenir.');
  }
  if (stage === 'surfaces') return t('Yeşille gösterilen yüzeyler boyanacak.');
  if (stage === 'openings') {
    return scene.hidden.doors + scene.hidden.windows > 0
      ? t('Çizime sığmayanlar da hesaptan düşülür.')
      : t('Kapı ve pencereler boyanmaz, hesaptan düşülür.');
  }
  if (stage === 'condition') {
    const state = WALL_STATES.find((w) => w.value === wallStateOf(form))!;
    return t('Duvarın şu anki hali: {state}', { state: t(state.label) });
  }
  return t('{count} kat boyanınca', { count: form.coats });
}

function useRoomScene(form: RoomForm): RoomScene {
  return useMemo(
    () =>
      roomScene({
        length: parseDecimal(form.length),
        width: parseDecimal(form.width),
        height: parseDecimal(form.height),
        doors: { count: form.doorCount, width: parseDecimal(form.doorWidth), height: parseDecimal(form.doorHeight) },
        windows: { count: form.windowCount, width: parseDecimal(form.windowWidth), height: parseDecimal(form.windowHeight) },
      }),
    [form.length, form.width, form.height, form.doorCount, form.doorWidth, form.doorHeight, form.windowCount, form.windowWidth, form.windowHeight],
  );
}

/**
 * "Canlı oda": the room the user is describing, drawn as they answer. It
 * grows with the measurements, shows the doors and windows, the wall's
 * current state, and the surfaces that get painted, deeper with more coats.
 */
export function RoomSceneView({ scene, form, stage }: { scene: RoomScene; form: RoomForm; stage: SceneStage }) {
  const [height, setHeight] = useState(0);
  const state = wallStateOf(form);

  const painting = stage === 'surfaces' || stage === 'openings' || stage === 'coats';
  const walls = useAnimatedTo(painting && form.paintWalls ? 1 : 0, { duration: 560 });
  const ceiling = useAnimatedTo(painting && form.paintCeiling ? 1 : 0, { duration: 420 });
  const cover = useAnimatedTo(stage === 'coats' ? (COAT_COVER[form.coats] ?? 1) : 0.88, { duration: 360 });
  const ghost = useAnimatedTo(scene.measured ? 1 : 0.6, { duration: 240 });

  const summary = scene.measured
    ? t('Oda çizimi: {width} × {length} m, tavan {height} m', {
        length: formatNumber(scene.room.length, 2),
        width: formatNumber(scene.room.width, 2),
        height: formatNumber(scene.room.height, 2),
      })
    : t('Örnek oda çizimi');

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={styles.stage}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: ghost }]}>
        <Shell scene={scene} state={state} />
        <FadeIn key={state} style={StyleSheet.absoluteFill}>
          <Marks scene={scene} state={state} />
        </FadeIn>
        {/* Paint rolls down the walls: the outer box slides down and clips, the inner one holds the drawing still. */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { overflow: 'hidden', transform: [{ translateY: walls.interpolate({ inputRange: [0, 1], outputRange: [-height, 0] }) }] },
          ]}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: cover, transform: [{ translateY: walls.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] },
            ]}>
            <Layer>
              <Path d={pathOf(scene.leftWall)} fill={PAINT.lit} />
              <Path d={pathOf(scene.rightWall)} fill={PAINT.shade} />
            </Layer>
          </Animated.View>
        </Animated.View>
        {scene.doors.map((q, i) => (
          <Opening key={`door-${i}`} q={q} kind="door" />
        ))}
        {scene.windows.map((q, i) => (
          <Opening key={`window-${i}`} q={q} kind="window" />
        ))}
        <Layer>
          <Path d={pathOf(scene.ceilingSide)} fill="#D8CFC0" />
          <Path d={pathOf(scene.ceilingEdge)} fill="#E6DFD2" />
          <Path d={pathOf(scene.ceiling)} fill="#FFFFFF" opacity={0.85} stroke="#CDBFA8" strokeWidth={1} strokeDasharray="4 3" />
        </Layer>
        {/* Painting the ceiling: the colour drops onto the open lid. */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: ceiling, transform: [{ translateY: ceiling.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }]}>
          <Layer>
            <Path d={pathOf(scene.ceiling)} fill={PAINT.lid} />
          </Layer>
        </Animated.View>
      </Animated.View>
      {stage === 'size' && scene.measured ? (
        <FadeIn style={StyleSheet.absoluteFill}>
          <Label at={scene.labels.length} text={`${formatNumber(scene.room.length, 2)} m`} />
          <Label at={scene.labels.width} text={`${formatNumber(scene.room.width, 2)} m`} />
          <Label at={scene.labels.height} text={`${formatNumber(scene.room.height, 2)} m`} />
        </FadeIn>
      ) : null}
    </View>
  );
}

/** A number that slides in again whenever it changes. */
function Flip({ value, unit }: { value: string; unit?: string }) {
  return (
    <FadeIn key={value} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
      <AppText variant="heading" style={{ fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30, fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
      {unit ? (
        <AppText variant="small" tone="muted" style={{ fontFamily: fonts.bold }}>
          {unit}
        </AppText>
      ) : null}
    </FadeIn>
  );
}

/** The running totals under the drawing: paintable area and paint, from the same engine as the result. */
export function LiveTotals({ area, litres, estimate, note }: { area: number | null; litres: number | null; estimate: boolean; note: string }) {
  const p = usePalette();
  return (
    <View style={styles.totals} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
          {note}
        </AppText>
        {estimate && litres !== null ? <Badge label={t('Tahmini')} tone="accent" /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="small" tone="muted">
            {t('Boyanacak alan')}
          </AppText>
          <Flip value={area === null ? '—' : formatNumber(area, 1)} unit={area === null ? undefined : 'm²'} />
        </View>
        <View style={[styles.totalsDivider, { backgroundColor: p.border }]} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="small" tone="muted">
            {t('Gereken boya')}
          </AppText>
          <Flip value={litres === null ? '—' : formatNumber(litres)} unit={litres === null ? undefined : 'L'} />
        </View>
      </View>
    </View>
  );
}

/** What the engine makes of the room so far; nothing while the measurements are incomplete. */
export function roomTotals(form: RoomForm): { area: number | null; litres: number | null; estimate: boolean } {
  const parsed = toRoomInput(form);
  if (!parsed.ok) return { area: null, litres: null, estimate: true };
  const calc = calculateProject([parsed.input]);
  if (!calc.ok) return { area: null, litres: null, estimate: true };
  const { totals } = calc.value;
  const paints = calc.value.materials.filter((m) => m.category === 'interior_paint' || m.category === 'ceiling_paint');
  return { area: totals.totalPaintable, litres: totals.wallLitres + totals.ceilingLitres, estimate: paints.some((m) => m.source === 'estimate') };
}

/** The drawing and the running totals in one card, shown above every room question. */
export function RoomSceneCard({ form, stage }: { form: RoomForm; stage: SceneStage }) {
  const p = usePalette();
  const scene = useRoomScene(form);
  const totals = roomTotals(form);
  const state = wallStateOf(form);
  return (
    <FadeIn style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p, 2)]}>
      <View style={styles.backdrop}>
        <Gradient from={p.primarySoft} to={p.surface} vertical />
        <RoomSceneView scene={scene} form={form} stage={stage} />
        <View style={styles.caption}>
          <Icon name={stage === 'condition' ? 'eye' : stage === 'size' ? 'resize' : 'color-fill'} size={14} color={p.accent} />
          <FadeIn key={`${stage}-${state}-${scene.measured}`} style={{ flex: 1 }}>
            <AppText variant="caption" tone="muted">
              {stageCaption(stage, form, scene)}
            </AppText>
          </FadeIn>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: p.border }} />
      <LiveTotals
        area={totals.area}
        litres={totals.litres}
        estimate={totals.estimate}
        note={totals.area === null ? t('Ölçüleri yazınca hesaplanır') : t('Şu ana kadarki cevaplarla')}
      />
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  backdrop: { paddingTop: space.sm, paddingHorizontal: space.sm, paddingBottom: space.xs },
  stage: { width: '100%', maxWidth: 460, alignSelf: 'center', aspectRatio: VIEW.width / VIEW.height },
  label: { position: 'absolute', width: 72, marginLeft: -36, height: 22, marginTop: -11, alignItems: 'center', justifyContent: 'center' },
  labelPill: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 1 },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.sm, paddingBottom: space.xs },
  totals: { gap: space.xs, paddingHorizontal: space.lg, paddingVertical: space.md },
  totalsDivider: { width: 1, alignSelf: 'stretch' },
});
