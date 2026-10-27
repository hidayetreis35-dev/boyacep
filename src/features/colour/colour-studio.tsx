import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { msg, t } from '@/i18n';
import type { PhotoSurface, WallOutline } from '@/lib/database.types';
import { Segmented } from '@/ui/brand';
import { AppText, Button, ChoiceChips, Icon, Notice } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { fonts, radius, space, usePalette } from '@/ui/theme';

import { CLASSICS, TRENDS } from './catalogue';
import { toPicked, type PickedColour } from './colour-explorer';
import { closestColours, matchLabel, rgbToHex } from './harmony';
import { isUsableOutline, MAX_OUTLINE_POINTS, MAX_SURFACES } from './outline';
import { PhotoStage } from './photo-stage';
import type { SelectMode } from './photo-stage-types';
import { DEFAULT_TOLERANCE, labToRgb, MAX_SEEDS, TOLERANCES, toleranceKeyOf, type Lab, type ToleranceKey } from './recolour';

const STRENGTHS = [
  { value: 'light', label: msg('Hafif'), amount: 0.55 },
  { value: 'medium', label: msg('Orta'), amount: 0.8 },
  { value: 'strong', label: msg('Tam'), amount: 1 },
] as const;
type Strength = (typeof STRENGTHS)[number]['value'];

/** New surfaces are named in the current language ("Duvar 2", "Wall 2"); the name is saved with the photo. */
const SURFACE_KINDS = [msg('Duvar'), msg('Tavan'), msg('Dolap'), msg('Kapı'), msg('Diğer')] as const;

/** A tap while picking: a corner, a spot to include, or (tap mode) a spot to keep out. */
type Tap = { point: [number, number]; remove: boolean };

function nextLabel(kind: string, surfaces: PhotoSurface[]): string {
  const same = surfaces.filter((s) => s.label.startsWith(kind)).length;
  return same === 0 ? kind : `${kind} ${same + 1}`;
}

/**
 * "Renk yakala": the colour under the user's tap and the five closest catalogue
 * colours. Light and shade shift what a photo shows, so the matches are offered
 * as suggestions to try, never as the paint's exact code.
 */
function PickPanel({ picked, onUse, onDone }: { picked: Lab | null; onUse: (hex: string) => void; onDone: () => void }) {
  const p = usePalette();
  const matches = useMemo(() => (picked ? closestColours(picked) : []), [picked]);
  return (
    <View style={{ gap: space.md }}>
      {picked ? (
        <View style={{ gap: space.sm }} testID="picked-colours">
          <View style={styles.pickedRow}>
            <View style={[styles.pickedSwatch, { backgroundColor: rgbToHex(labToRgb(picked)), borderColor: p.border }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
                {t('Fotoğraftaki renk')}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t('Işık ve gölge, fotoğraftaki rengi değiştirir. Karar vermeden önce renk kartına bak.')}
              </AppText>
            </View>
          </View>
          <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
            {t('En yakın {count} renk', { count: matches.length })}
          </AppText>
          {matches.map(({ colour, distance }) => (
            <PressableScale
              key={colour.hex}
              accessibilityRole="button"
              accessibilityLabel={t('{name} rengini dene', { name: t(colour.name) })}
              onPress={() => onUse(colour.hex)}
              style={[styles.match, { backgroundColor: p.surface, borderColor: p.border }]}>
              <View style={[styles.matchSwatch, { backgroundColor: colour.hex, borderColor: p.border }]} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" style={{ fontFamily: fonts.semibold }}>
                  {t(colour.name)}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {matchLabel(distance)}
                </AppText>
              </View>
              <AppText variant="small" style={{ color: p.accent, fontFamily: fonts.semibold }}>
                {t('Dene')}
              </AppText>
            </PressableScale>
          ))}
        </View>
      ) : null}
      <Button label={t('Bitti')} icon="checkmark" variant="secondary" onPress={onDone} />
    </View>
  );
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
  const [drawing, setDrawing] = useState<string | null>(initialSurfaces?.length ? null : t('Duvar'));
  const [taps, setTaps] = useState<Tap[]>([]);
  const [mode, setMode] = useState<SelectMode>('tap');
  const [removing, setRemoving] = useState(false);
  const [toleranceKey, setToleranceKey] = useState<ToleranceKey>('medium');
  const tolerance = TOLERANCES.find((option) => option.value === toleranceKey)?.tolerance ?? DEFAULT_TOLERANCE;
  const [strength, setStrength] = useState<Strength>('strong');
  const [view, setView] = useState<'after' | 'before'>('after');
  const [choosingKind, setChoosingKind] = useState(false);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<{ lab: Lab; point: [number, number] } | null>(null);
  const draft: WallOutline = taps.filter((value) => !value.remove).map((value) => value.point);
  const excludes: WallOutline = taps.filter((value) => value.remove).map((value) => value.point);
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
    setTaps((list) => (list.filter((value) => value.remove === remove).length >= limit ? list : [...list, { point, remove }]));
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

  const startPicking = () => {
    setPicked(null);
    setPicking(true);
  };

  const stopPicking = () => {
    setPicking(false);
    setPicked(null);
  };

  // While a surface is being selected the colour waits for "Yüzeyi boya"; otherwise it goes on the active surface.
  const takePicked = (hex: string) => {
    if (drawing) onPickColour(toPicked(hex));
    else applyColour(toPicked(hex));
    stopPicking();
  };

  const removeActive = () => {
    setSurfaces((list) => list.filter((_, i) => i !== active));
    setActive(0);
  };

  // The picked colour, favourites and recent ones first, then editorial picks so the strip is never empty.
  const strip = Array.from(new Set([colour.hex, ...quickColours, ...CLASSICS.map((c) => c.hex), ...TRENDS.map((c) => c.hex)])).slice(0, 18);

  return (
    <View style={{ gap: space.lg }}>
      {picking ? (
        <Notice icon="eyedrop">
          {t('Fotoğrafta beğendiğin bir rengin üzerine dokun: bir yastık, bir dolap ya da başka bir duvar. Boya renkleri arasından en yakınlarını gösteririz.')}
        </Notice>
      ) : drawing ? (
        <>
          <Segmented
            options={[
              { value: 'tap', label: t('Dokun-seç'), icon: 'finger-print' },
              { value: 'corners', label: t('Köşeleri çiz'), icon: 'git-commit' },
            ]}
            value={mode}
            onChange={switchMode}
          />
          <Notice icon="hand-left">
            {mode === 'tap'
              ? t('“{surface}” üzerine dokun. Seçim köşelerde ve eşyaların kenarında durur. Eksik kalan yere tekrar dokun; tavan ya da bir eşya da seçildiyse “Çıkar”a geç ve oraya dokun.', { surface: t(drawing) })
              : t('“{surface}” için köşelere sırayla dokun. En az 3 nokta gerekir. Kapı, pencere ve eşyaların dışından geç.', { surface: t(drawing) })}
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
        picking={picking}
        pickedAt={picked?.point ?? null}
        onPick={(lab, point) => setPicked({ lab, point })}
      />

      {drawing && !picking && mode === 'tap' ? (
        <Segmented
          options={[
            { value: 'add', label: t('Ekle'), icon: 'add-circle' },
            { value: 'remove', label: t('Çıkar'), icon: 'remove-circle' },
          ]}
          value={removing ? 'remove' : 'add'}
          onChange={(v) => setRemoving(v === 'remove')}
        />
      ) : null}

      {drawing && !picking && mode === 'tap' ? (
        <ChoiceChips
          label={t('Seçim genişliği')}
          options={TOLERANCES.map(({ value, label }) => ({ value, label }))}
          value={toleranceKey}
          onChange={setToleranceKey}
        />
      ) : null}

      {picking ? (
        <PickPanel picked={picked?.lab ?? null} onUse={takePicked} onDone={stopPicking} />
      ) : drawing ? (
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button label={t('Geri al')} icon="arrow-undo" variant="secondary" disabled={taps.length === 0} onPress={() => setTaps((value) => value.slice(0, -1))} />
          <Button
            label={t('Temizle')}
            icon="close"
            variant="ghost"
            disabled={taps.length === 0}
            onPress={() => {
              setTaps([]);
              setRemoving(false);
            }}
          />
          <Button label={t('Yüzeyi boya')} icon="color-fill" variant="cta" disabled={!usable} onPress={finishDrawing} />
          {surfaces.length > 0 ? <Button
              label={t('Vazgeç')}
              variant="ghost"
              onPress={() => {
                setDrawing(null);
                setTaps([]);
                setRemoving(false);
                setActive((a) => Math.min(a, surfaces.length - 1));
              }}
            /> : null}
          <Button label={t('Renk yakala')} icon="eyedrop" variant="ghost" onPress={startPicking} />
        </View>
      ) : (
        <>
          <Segmented
            options={[
              { value: 'after', label: t('Sonra'), icon: 'color-fill' },
              { value: 'before', label: t('Önce'), icon: 'image' },
            ]}
            value={view}
            onChange={setView}
          />

          <View style={{ gap: space.sm }}>
            <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
              {t('Yüzeyler')}
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {surfaces.map((s, i) => (
                <PressableScale
                  key={`${s.label}-${i}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: i === active }}
                  accessibilityLabel={t(s.label)}
                  onPress={() => setActive(i)}
                  style={[styles.surfaceChip, { backgroundColor: i === active ? p.primary : p.surface, borderColor: i === active ? p.primary : p.border }]}>
                  <View style={[styles.dot, { backgroundColor: s.hex ?? 'transparent', borderColor: p.border }]} />
                  <AppText variant="small" style={{ color: i === active ? p.onPrimary : p.text, fontFamily: fonts.semibold }}>
                    {t(s.label)}
                  </AppText>
                </PressableScale>
              ))}
              {surfaces.length < MAX_SURFACES ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={t('Yüzey ekle')}
                  onPress={() => setChoosingKind((v) => !v)}
                  style={[styles.surfaceChip, { backgroundColor: p.accentSoft, borderColor: 'transparent' }]}>
                  <Icon name="add" size={18} color={p.accent} />
                  <AppText variant="small" style={{ color: p.accent, fontFamily: fonts.semibold }}>
                    {t('Yüzey ekle')}
                  </AppText>
                </PressableScale>
              ) : null}
            </ScrollView>
            {choosingKind ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {SURFACE_KINDS.map((k) => (
                  <Button key={k} label={t(k)} variant="secondary" onPress={() => startDrawing(nextLabel(t(k), surfaces), surfaces.length)} />
                ))}
              </View>
            ) : null}
          </View>

          {surfaces[active] ? (
            <View style={{ gap: space.sm }}>
              <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
                {t('“{surface}” için renk: {colour}', {
                  surface: t(surfaces[active].label),
                  colour: surfaces[active].hex ? t(toPicked(surfaces[active].hex!).name) : t('yok'),
                })}
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
                      accessibilityLabel={t(c.name)}
                      onPress={() => applyColour(c)}
                      style={[styles.quick, { backgroundColor: hex, borderColor: selected ? p.text : p.border, borderWidth: selected ? 3 : StyleSheet.hairlineWidth }]}
                    />
                  );
                })}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                <Button label={t('Renk yakala')} icon="eyedrop" variant="secondary" onPress={startPicking} />
                {onBrowse ? <Button label={t('Tüm renklere göz at')} icon="color-palette" variant="ghost" onPress={onBrowse} /> : null}
              </View>
            </View>
          ) : null}

          <ChoiceChips label={t('Renk yoğunluğu')} options={STRENGTHS.map(({ value, label }) => ({ value, label }))} value={strength} onChange={setStrength} />

          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            {surfaces[active] ? (
              <>
                <Button label={t('Seçimi düzenle')} icon="create" variant="secondary" onPress={() => startDrawing(surfaces[active].label, active)} />
                <Button label={t('Yüzeyi sil')} icon="trash" variant="ghost" onPress={removeActive} />
              </>
            ) : null}
            {onChangePhoto ? <Button label={t('Başka fotoğraf')} icon="images" variant="ghost" onPress={onChangePhoto} /> : null}
          </View>
        </>
      )}

      {onSaveSurfaces ? (
        <>
          <Button label={t('Projeye kaydet')} icon="save" loading={saving} disabled={!!drawing} onPress={() => onSaveSurfaces(surfaces)} />
          {saveError ? (
            <Notice tone="danger" icon="alert-circle">
              {saveError}
            </Notice>
          ) : null}
        </>
      ) : null}

      <Notice icon="information-circle">
        {t('Bu bir önizlemedir: renk, fotoğraftaki ışık, gölge ve doku korunarak uygulanır. Yine de gerçek renk odanın ışığına, ekran ayarına ve boyanın parlaklığına göre farklı görünebilir. Karar vermeden önce renk kartına bak ya da küçük bir alana deneme yap.')}
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
  pickedRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pickedSwatch: { width: 56, height: 56, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.sm,
    minHeight: 56,
  },
  matchSwatch: { width: 40, height: 40, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth },
});
