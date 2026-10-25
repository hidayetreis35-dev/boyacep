import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { PhotoSurface, WallOutline } from '@/lib/database.types';
import { Segmented } from '@/ui/brand';
import { AppText, Button, ChoiceChips, Icon, Notice } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { fonts, radius, space, usePalette } from '@/ui/theme';

import { CLASSICS, TRENDS } from './catalogue';
import { toPicked, type PickedColour } from './colour-explorer';
import { isUsableOutline, MAX_OUTLINE_POINTS, MAX_SURFACES } from './outline';
import { PhotoStage } from './photo-stage';
import type { SelectMode } from './photo-stage-types';
import { DEFAULT_TOLERANCE, MAX_SEEDS, TOLERANCES, toleranceKeyOf, type ToleranceKey } from './recolour';

const STRENGTHS = [
  { value: 'light', label: 'Hafif', amount: 0.55 },
  { value: 'medium', label: 'Orta', amount: 0.8 },
  { value: 'strong', label: 'Tam', amount: 1 },
] as const;
type Strength = (typeof STRENGTHS)[number]['value'];

const SURFACE_KINDS = ['Duvar', 'Tavan', 'Dolap', 'Kapı', 'Diğer'] as const;

/** A tap while picking: a corner, a spot to include, or (tap mode) a spot to keep out. */
type Tap = { point: [number, number]; remove: boolean };

function nextLabel(kind: string, surfaces: PhotoSurface[]): string {
  const same = surfaces.filter((s) => s.label.startsWith(kind)).length;
  return same === 0 ? kind : `${kind} ${same + 1}`;
}

/**
 * Outline one or more surfaces on a room photo and try colours on each.
 * Works fully on the device; saving is optional and handled by the caller.
 */
export function ColourStudio({
  photo,
  colour,
  quickColours,
  onPickColour,
  initialSurfaces,
  onBrowse,
  onChangePhoto,
  onSaveSurfaces,
  saving,
  saveError,
}: {
  photo: { uri: string; width: number; height: number };
  /** The colour picked in the studio; applied to the active surface. */
  colour: PickedColour;
  /** Favourites and recent colours for one-tap switching. */
  quickColours: string[];
  onPickColour: (c: PickedColour) => void;
  initialSurfaces?: PhotoSurface[];
  /** Opens the full colour catalogue. */
  onBrowse?: () => void;
  onChangePhoto?: () => void;
  onSaveSurfaces?: (surfaces: PhotoSurface[]) => void;
  saving?: boolean;
  saveError?: string | null;
}) {
  const p = usePalette();
  const [surfaces, setSurfaces] = useState<PhotoSurface[]>(initialSurfaces ?? []);
  const [active, setActive] = useState(0);
  const [drawing, setDrawing] = useState<string | null>(initialSurfaces?.length ? null : 'Duvar');
  const [taps, setTaps] = useState<Tap[]>([]);
  const [mode, setMode] = useState<SelectMode>('tap');
  const [removing, setRemoving] = useState(false);
  const [toleranceKey, setToleranceKey] = useState<ToleranceKey>('medium');
  const tolerance = TOLERANCES.find((t) => t.value === toleranceKey)?.tolerance ?? DEFAULT_TOLERANCE;
  const [strength, setStrength] = useState<Strength>('strong');
  const [view, setView] = useState<'after' | 'before'>('after');
  const [choosingKind, setChoosingKind] = useState(false);
  const draft: WallOutline = taps.filter((t) => !t.remove).map((t) => t.point);
  const excludes: WallOutline = taps.filter((t) => t.remove).map((t) => t.point);
  const usable = mode === 'tap' ? draft.length > 0 : isUsableOutline(draft);
  const editingExisting = drawing !== null && active < surfaces.length && surfaces[active].label === drawing;

  const startDrawing = (label: string, index: number) => {
    const existing = index < surfaces.length ? surfaces[index] : undefined;
    setActive(index);
    if (existing?.seeds?.length) {
      setMode('tap');
      setTaps([...existing.seeds.map((point) => ({ point, remove: false })), ...(existing.excludes ?? []).map((point) => ({ point, remove: true }))]);
      setToleranceKey(toleranceKeyOf(existing.tolerance ?? DEFAULT_TOLERANCE));
    } else if (existing) {
      setMode('corners');
      setTaps(existing.points.map((point) => ({ point, remove: false })));
    } else {
      setMode('tap');
      setTaps([]);
    }
    setRemoving(false);
    setDrawing(label);
    setChoosingKind(false);
  };

  const switchMode = (next: SelectMode) => {
    setMode(next);
    setTaps([]);
    setRemoving(false);
  };

  const addPoint = (point: [number, number]) => {
    const remove = mode === 'tap' && removing;
    const limit = mode === 'tap' ? MAX_SEEDS : MAX_OUTLINE_POINTS;
    setTaps((list) => (list.filter((t) => t.remove === remove).length >= limit ? list : [...list, { point, remove }]));
  };

  const finishDrawing = () => {
    if (!drawing || !usable) return;
    const hex = editingExisting ? surfaces[active].hex ?? colour.hex : colour.hex;
    const surface: PhotoSurface =
      mode === 'tap'
        ? { label: drawing, points: [], seeds: draft, tolerance, hex, ...(excludes.length ? { excludes } : {}) }
        : { label: drawing, points: draft, hex };
    setSurfaces((list) => (editingExisting ? list.map((s, i) => (i === active ? surface : s)) : [...list, surface]));
    if (!editingExisting) setActive(surfaces.length);
    setTaps([]);
    setRemoving(false);
    setDrawing(null);
    setView('after');
  };

  const applyColour = (c: PickedColour) => {
    onPickColour(c);
    setSurfaces((list) => list.map((s, i) => (i === active ? { ...s, hex: c.hex } : s)));
  };

  const removeActive = () => {
    setSurfaces((list) => list.filter((_, i) => i !== active));
    setActive(0);
  };

  // The picked colour, favourites and recent ones first, then editorial picks so the strip is never empty.
  const strip = Array.from(new Set([colour.hex, ...quickColours, ...CLASSICS.map((c) => c.hex), ...TRENDS.map((c) => c.hex)])).slice(0, 18);

  return (
    <View style={{ gap: space.lg }}>
      {drawing ? (
        <>
          <Segmented
            options={[
              { value: 'tap', label: 'Dokun-seç', icon: 'finger-print' },
              { value: 'corners', label: 'Köşeleri çiz', icon: 'git-commit' },
            ]}
            value={mode}
            onChange={switchMode}
          />
          <Notice icon="hand-left">
            {mode === 'tap'
              ? `“${drawing}” üzerine dokun. Seçim köşelerde ve eşyaların kenarında durur. Eksik kalan yere tekrar dokun; tavan ya da bir eşya da seçildiyse “Çıkar”a geç ve oraya dokun.`
              : `“${drawing}” için köşelere sırayla dokun. En az 3 nokta gerekir. Kapı, pencere ve eşyaların dışından geç.`}
          </Notice>
        </>
      ) : null}

      <PhotoStage
        uri={photo.uri}
        aspect={photo.width / photo.height}
        surfaces={surfaces}
        active={active}
        draft={{ mode, points: draft, excludes, tolerance }}
        drawing={!!drawing}
        showColour={view === 'after'}
        amount={STRENGTHS.find((s) => s.value === strength)!.amount}
        onTap={addPoint}
      />

      {drawing && mode === 'tap' ? (
        <Segmented
          options={[
            { value: 'add', label: 'Ekle', icon: 'add-circle' },
            { value: 'remove', label: 'Çıkar', icon: 'remove-circle' },
          ]}
          value={removing ? 'remove' : 'add'}
          onChange={(v) => setRemoving(v === 'remove')}
        />
      ) : null}

      {drawing && mode === 'tap' ? (
        <ChoiceChips
          label="Seçim genişliği"
          options={TOLERANCES.map(({ value, label }) => ({ value, label }))}
          value={toleranceKey}
          onChange={setToleranceKey}
        />
      ) : null}

      {drawing ? (
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button label="Geri al" icon="arrow-undo" variant="secondary" disabled={taps.length === 0} onPress={() => setTaps((t) => t.slice(0, -1))} />
          <Button
            label="Temizle"
            icon="close"
            variant="ghost"
            disabled={taps.length === 0}
            onPress={() => {
              setTaps([]);
              setRemoving(false);
            }}
          />
          <Button label="Yüzeyi boya" icon="color-fill" variant="cta" disabled={!usable} onPress={finishDrawing} />
          {surfaces.length > 0 ? <Button
              label="Vazgeç"
              variant="ghost"
              onPress={() => {
                setDrawing(null);
                setTaps([]);
                setRemoving(false);
                setActive((a) => Math.min(a, surfaces.length - 1));
              }}
            /> : null}
        </View>
      ) : (
        <>
          <Segmented
            options={[
              { value: 'after', label: 'Sonra', icon: 'color-fill' },
              { value: 'before', label: 'Önce', icon: 'image' },
            ]}
            value={view}
            onChange={setView}
          />

          <View style={{ gap: space.sm }}>
            <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
              Yüzeyler
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {surfaces.map((s, i) => (
                <PressableScale
                  key={`${s.label}-${i}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: i === active }}
                  accessibilityLabel={s.label}
                  onPress={() => setActive(i)}
                  style={[styles.surfaceChip, { backgroundColor: i === active ? p.primary : p.surface, borderColor: i === active ? p.primary : p.border }]}>
                  <View style={[styles.dot, { backgroundColor: s.hex ?? 'transparent', borderColor: p.border }]} />
                  <AppText variant="small" style={{ color: i === active ? p.onPrimary : p.text, fontFamily: fonts.semibold }}>
                    {s.label}
                  </AppText>
                </PressableScale>
              ))}
              {surfaces.length < MAX_SURFACES ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Yüzey ekle"
                  onPress={() => setChoosingKind((v) => !v)}
                  style={[styles.surfaceChip, { backgroundColor: p.accentSoft, borderColor: 'transparent' }]}>
                  <Icon name="add" size={18} color={p.accent} />
                  <AppText variant="small" style={{ color: p.accent, fontFamily: fonts.semibold }}>
                    Yüzey ekle
                  </AppText>
                </PressableScale>
              ) : null}
            </ScrollView>
            {choosingKind ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {SURFACE_KINDS.map((k) => (
                  <Button key={k} label={k} variant="secondary" onPress={() => startDrawing(nextLabel(k, surfaces), surfaces.length)} />
                ))}
              </View>
            ) : null}
          </View>

          {surfaces[active] ? (
            <View style={{ gap: space.sm }}>
              <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
                “{surfaces[active].label}” için renk: {surfaces[active].hex ? toPicked(surfaces[active].hex!).name : 'yok'}
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} accessibilityRole="radiogroup">
                {strip.map((hex) => {
                  const c = toPicked(hex);
                  const selected = surfaces[active].hex === hex;
                  return (
                    <PressableScale
                      key={hex}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={c.name}
                      onPress={() => applyColour(c)}
                      style={[styles.quick, { backgroundColor: hex, borderColor: selected ? p.text : p.border, borderWidth: selected ? 3 : StyleSheet.hairlineWidth }]}
                    />
                  );
                })}
              </ScrollView>
              {onBrowse ? <Button label="Tüm renklere göz at" icon="color-palette" variant="ghost" onPress={onBrowse} /> : null}
            </View>
          ) : null}

          <ChoiceChips label="Renk yoğunluğu" options={STRENGTHS.map(({ value, label }) => ({ value, label }))} value={strength} onChange={setStrength} />

          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            {surfaces[active] ? (
              <>
                <Button label="Seçimi düzenle" icon="create" variant="secondary" onPress={() => startDrawing(surfaces[active].label, active)} />
                <Button label="Yüzeyi sil" icon="trash" variant="ghost" onPress={removeActive} />
              </>
            ) : null}
            {onChangePhoto ? <Button label="Başka fotoğraf" icon="images" variant="ghost" onPress={onChangePhoto} /> : null}
          </View>
        </>
      )}

      {onSaveSurfaces ? (
        <>
          <Button label="Projeye kaydet" icon="save" loading={saving} disabled={!!drawing} onPress={() => onSaveSurfaces(surfaces)} />
          {saveError ? (
            <Notice tone="danger" icon="alert-circle">
              {saveError}
            </Notice>
          ) : null}
        </>
      ) : null}

      <Notice icon="information-circle">
        Bu bir önizlemedir: renk, fotoğraftaki ışık, gölge ve doku korunarak uygulanır. Yine de gerçek renk odanın ışığına, ekran ayarına ve boyanın parlaklığına göre farklı görünebilir. Karar vermeden önce renk kartına bak ya da küçük bir alana deneme yap.
      </Notice>
    </View>
  );
}

const styles = StyleSheet.create({
  surfaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    minHeight: 40,
  },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  quick: { width: 48, height: 48, borderRadius: 16 },
});
