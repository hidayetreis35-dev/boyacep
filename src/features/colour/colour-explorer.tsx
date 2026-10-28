import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';

import { useSession } from '@/features/account/session';
import { useProjects } from '@/features/projects/queries';
import { t } from '@/i18n';
import { SectionTitle } from '@/ui/brand';
import { AppText, Button, Icon, Notice, TextField } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { fonts, radius, shadowOf, space, usePalette } from '@/ui/theme';

import { CLASSICS, colourByHex, COLOURS, familyLabel, FAMILIES, searchColours, TRENDS, type CatalogColour, type FamilyKey } from './catalogue';
import { colourFacts, TEMPERATURE_LABEL } from './colour-data';
import { harmonies, lrv, nearest } from './harmony';
import { isLight, normaliseHex } from './palette';
import { useProjectColourActions } from './project-colours';

/** The colour the user is looking at: a catalogue colour or a custom code. */
export type PickedColour = { hex: string; name: string };

export function toPicked(hex: string): PickedColour {
  const c = colourByHex(hex);
  return { hex, name: c?.name ?? hex };
}

const ink = (hex: string) => (isLight(hex) ? '#141B2D' : '#FFFFFF');

/** A large swatch card with the colour's name under it. */
export function SwatchCard({
  colour,
  selected,
  favourite,
  onPress,
  width,
}: {
  colour: { hex: string; name: string };
  selected?: boolean;
  favourite?: boolean;
  onPress: () => void;
  width?: number;
}) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="radio"
      aria-checked={!!selected}
      accessibilityLabel={t(colour.name)}
      onPress={onPress}
      style={[
        styles.swatch,
        width ? { width } : null,
        { backgroundColor: p.surface, borderColor: selected ? p.text : p.border, borderWidth: selected ? 2 : StyleSheet.hairlineWidth },
        shadowOf(p),
      ]}>
      <View style={[styles.swatchColour, { backgroundColor: colour.hex }]}>
        {favourite ? <Icon name="heart" size={16} color={ink(colour.hex)} /> : null}
        {selected ? (
          <View style={[styles.swatchCheck, { backgroundColor: p.surface }]}>
            <Icon name="checkmark" size={14} color={p.text} />
          </View>
        ) : null}
      </View>
      <View style={styles.swatchText}>
        <AppText variant="caption" numberOfLines={1} style={{ fontFamily: fonts.bold, color: p.text }}>
          {t(colour.name)}
        </AppText>
        <AppText variant="caption" tone="muted" style={{ fontSize: 11 }}>
          {colour.hex}
        </AppText>
      </View>
    </PressableScale>
  );
}

function SwatchGrid({ colours, selected, favourites, onSelect }: { colours: CatalogColour[]; selected: string; favourites: string[]; onSelect: (c: PickedColour) => void }) {
  const [width, setWidth] = useState(0);
  const cols = width >= 520 ? 5 : width >= 380 ? 4 : 3;
  const gap = space.sm;
  // Before the first layout pass, use a phone-sized guess so the grid never flashes empty.
  const cell = width > 0 ? (width - gap * (cols - 1)) / cols : 104;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }} accessibilityRole="radiogroup">
      {colours.map((c) => (
        <SwatchCard key={c.id} colour={c} width={cell} selected={selected === c.hex} favourite={favourites.includes(c.hex)} onPress={() => onSelect(c)} />
      ))}
    </View>
  );
}

function SwatchRow({ colours, selected, favourites, onSelect }: { colours: CatalogColour[]; selected: string; favourites: string[]; onSelect: (c: PickedColour) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 4, paddingRight: space.sm }}>
      {colours.map((c) => (
        <SwatchCard key={c.id} colour={c} width={112} selected={selected === c.hex} favourite={favourites.includes(c.hex)} onPress={() => onSelect(c)} />
      ))}
    </ScrollView>
  );
}

type Shelf = 'featured' | FamilyKey;

/** Search, categories, editorial picks and the full catalogue. */
export function ColourExplorer({ selected, favourites, onSelect }: { selected: string; favourites: string[]; onSelect: (c: PickedColour) => void }) {
  const p = usePalette();
  const [query, setQuery] = useState('');
  const [shelf, setShelf] = useState<Shelf>('featured');
  const typedHex = normaliseHex(query);
  const results = query.trim() ? searchColours(query) : [];

  return (
    <View style={{ gap: space.lg }}>
      <TextField
        label={t('Renk ara')}
        value={query}
        onChangeText={setQuery}
        placeholder={t('Adaçayı, lacivert ya da #8FB3CF')}
        autoCapitalize="none"
        autoCorrect={false}
        hint={t('{count} hazır renk. Boya kataloğundaki herhangi bir HEX kodunu da yazabilirsin.', { count: COLOURS.length })}
        testID="colour-search"
      />

      {query.trim() ? (
        <View style={{ gap: space.md }}>
          {typedHex && !colourByHex(typedHex) ? (
            <View style={[styles.custom, { backgroundColor: p.surface, borderColor: p.border }]}>
              <View style={[styles.customSwatch, { backgroundColor: typedHex }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyStrong">{typedHex}</AppText>
                <AppText variant="caption" tone="muted">
                  {t('En yakın hazır renk: {name}', { name: t(nearest(typedHex).name) })}
                </AppText>
              </View>
              <Button label={t('Kullan')} variant="secondary" onPress={() => onSelect({ hex: typedHex, name: typedHex })} />
            </View>
          ) : null}
          {results.length > 0 ? (
            <SwatchGrid colours={results} selected={selected} favourites={favourites} onSelect={onSelect} />
          ) : !typedHex ? (
            <AppText tone="muted">{t('“{query}” ile eşleşen renk yok. Başka bir ad ya da renk kodu dene.', { query: query.trim() })}</AppText>
          ) : null}
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} accessibilityRole="tablist">
            {[{ key: 'featured' as Shelf, label: t('Öne çıkanlar'), sample: '' }, ...FAMILIES].map((f) => {
              const active = shelf === f.key;
              return (
                <PressableScale
                  key={f.key}
                  accessibilityRole="tab"
                  aria-selected={active}
                  accessibilityLabel={t(f.label)}
                  onPress={() => setShelf(f.key)}
                  style={[styles.familyChip, { backgroundColor: active ? p.primary : p.surface, borderColor: active ? p.primary : p.border }]}>
                  {f.sample ? <View style={[styles.familyDot, { backgroundColor: f.sample, borderColor: p.border }]} /> : <Icon name="sparkles" size={14} color={active ? p.onPrimary : p.cta} />}
                  <AppText variant="small" style={{ color: active ? p.onPrimary : p.text, fontFamily: fonts.semibold }}>
                    {t(f.label)}
                  </AppText>
                </PressableScale>
              );
            })}
          </ScrollView>

          {shelf === 'featured' ? (
            <View style={{ gap: space.lg }}>
              <View style={{ gap: space.sm }}>
                <SectionTitle title={t('Zamansız klasikler')} />
                <SwatchRow colours={CLASSICS} selected={selected} favourites={favourites} onSelect={onSelect} />
              </View>
              <View style={{ gap: space.sm }}>
                <SectionTitle title={t('2026 trend tonları')} />
                <AppText variant="caption" tone="muted">
                  {t('Sıcak toprak tonları, doğadan yeşiller ve derin maviler. Editör seçimidir; satış verisi değildir.')}
                </AppText>
                <SwatchRow colours={TRENDS} selected={selected} favourites={favourites} onSelect={onSelect} />
              </View>
            </View>
          ) : (
            <View style={{ gap: space.sm }}>
              <SectionTitle title={familyLabel(shelf)} />
              <SwatchGrid colours={COLOURS.filter((c) => c.family === shelf)} selected={selected} favourites={favourites} onSelect={onSelect} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

/** The selected colour: swatch, name and code, quick colours and actions. */
export function SelectedColour({
  colour,
  quickColours,
  favourite,
  comparing,
  onSelect,
  onToggleFavourite,
  onToggleCompare,
  onTryOnWall,
}: {
  colour: PickedColour;
  /** Favourites and recent picks first; classics fill the row. */
  quickColours: string[];
  favourite: boolean;
  comparing: boolean;
  onSelect: (c: PickedColour) => void;
  onToggleFavourite: () => void;
  onToggleCompare: () => void;
  onTryOnWall: () => void;
}) {
  const p = usePalette();
  const facts = colourFacts(colour.hex);
  const row = [...new Set([colour.hex, ...quickColours, ...CLASSICS.map((c) => c.hex)])].slice(0, 12);
  const share = () =>
    Share.share({ message: t('BoyaCep renk önerisi: {name} ({hex})', { name: t(colour.name), hex: colour.hex }) }).catch(() => undefined);
  return (
    <View style={[styles.selected, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]} testID="selected-colour">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={[styles.bigDot, { backgroundColor: colour.hex, borderColor: p.border }]} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" numberOfLines={1}>
            {t(colour.name)}
          </AppText>
          <AppText variant="small" tone="muted">
            {colour.hex}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {t('Işık yansıtma ≈ %{reflect}', { reflect: lrv(colour.hex) })} · {t(TEMPERATURE_LABEL[facts.temperature])}
          </AppText>
        </View>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('Paylaş')} onPress={share} style={[styles.round, { backgroundColor: p.surfaceMuted }]}>
          <Icon name="share-social-outline" size={20} />
        </PressableScale>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 2 }}>
        {row.map((hex) => {
          const on = hex === colour.hex;
          const c = toPicked(hex);
          return (
            <PressableScale
              key={hex}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t('{name} rengini seç', { name: t(c.name) })}
              onPress={() => onSelect(c)}
              style={[styles.dotRing, { borderColor: on ? p.primary : 'transparent' }]}>
              <View style={[styles.dot, { backgroundColor: hex, borderColor: p.border }]} />
            </PressableScale>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={favourite ? t('Favorilerden çıkar') : t('Favorilere ekle')}
          onPress={onToggleFavourite}
          style={[styles.pill, { backgroundColor: favourite ? p.roseSoft : p.surfaceMuted }]}>
          <Icon name={favourite ? 'heart' : 'heart-outline'} size={18} color={favourite ? p.rose : p.text} />
          <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
            {favourite ? t('Favorilerde') : t('Favorilere ekle')}
          </AppText>
        </PressableScale>
        <PressableScale accessibilityRole="button" onPress={onToggleCompare} style={[styles.pill, { backgroundColor: comparing ? p.primarySoft : p.surfaceMuted }]}>
          <Icon name={comparing ? 'checkmark' : 'git-compare'} size={18} />
          <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
            {comparing ? t('Karşılaştırmada') : t('Karşılaştır')}
          </AppText>
        </PressableScale>
        <PressableScale accessibilityRole="button" onPress={onTryOnWall} style={[styles.pill, { backgroundColor: p.cta }]}>
          <Icon name="camera" size={18} color={p.onCta} />
          <AppText variant="small" style={{ color: p.onCta, fontFamily: fonts.bold }}>
            {t('Odamda dene')}
          </AppText>
        </PressableScale>
      </View>

      <SaveToProject colour={colour} />
    </View>
  );
}

/**
 * Colour schemes for the selected colour; `limit` shows only the first few.
 * `room` draws the preview for a scheme's main colour.
 */
export function ColourHarmonies({
  hex,
  onSelect,
  limit,
  room,
}: {
  hex: string;
  onSelect: (c: PickedColour) => void;
  limit?: number;
  room: (wall: string) => ReactNode;
}) {
  const p = usePalette();
  return (
    <>
      {harmonies(hex)
        .slice(0, limit)
        .map((h) => (
          <View key={h.key} style={[styles.harmony, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
            <View style={styles.harmonyThumb}>{room(h.colours[h.colours.length > 2 ? 0 : 1].hex)}</View>
            <View style={{ flex: 1, padding: space.md, gap: 4, justifyContent: 'center' }}>
              <AppText variant="bodyStrong" style={{ fontFamily: fonts.bold }}>
                {h.title}
              </AppText>
              <AppText variant="caption" tone="muted" numberOfLines={2}>
                {h.colours.map((c) => t(c.name)).join(' + ')}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                {h.colours.map((c) => (
                  <PressableScale
                    key={c.hex}
                    accessibilityRole="button"
                    accessibilityLabel={`${h.title}: ${t(c.name)}`}
                    onPress={() => onSelect(c)}
                    style={[styles.harmonyDot, { backgroundColor: c.hex, borderColor: p.border }]}
                  />
                ))}
              </View>
              <AppText variant="caption" tone="muted" numberOfLines={2}>
                {h.hint}
              </AppText>
            </View>
          </View>
        ))}
    </>
  );
}

/** Save the colour to one of the user's projects. */
function SaveToProject({ colour }: { colour: PickedColour }) {
  const p = usePalette();
  const { db, session } = useSession();
  const projects = useProjects();
  const { add } = useProjectColourActions();
  const [open, setOpen] = useState(false);
  const [surface, setSurface] = useState('');
  const [savedTo, setSavedTo] = useState<string | null>(null);

  if (!db) return null;
  if (!session) {
    return <Button label={t('Projeye kaydetmek için giriş yap')} icon="log-in" variant="ghost" onPress={() => router.push('/sign-in')} />;
  }
  if (!open) {
    return (
      <Button
        label={t('Projeye kaydet')}
        icon="bookmark"
        variant="ghost"
        onPress={() => {
          setOpen(true);
          setSavedTo(null);
          add.reset();
        }}
      />
    );
  }
  const list = projects.data ?? [];
  return (
    <View style={[styles.save, { backgroundColor: p.surface, borderColor: p.border }]}>
      <AppText variant="bodyStrong">{t('“{name}” hangi projeye?', { name: t(colour.name) })}</AppText>
      <TextField label={t('Nereye? (isteğe bağlı)')} value={surface} onChangeText={setSurface} placeholder={t('Salon duvarı, tavan…')} maxLength={60} />
      {projects.isPending ? <AppText tone="muted">{t('Projeler yükleniyor…')}</AppText> : null}
      {list.length === 0 && !projects.isPending ? (
        <AppText tone="muted">{t('Henüz projen yok. Önce Projelerim’den bir proje oluştur.')}</AppText>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {list.map((project) => (
          <Button
            key={project.id}
            label={project.title}
            variant="secondary"
            loading={add.isPending && add.variables?.project_id === project.id}
            onPress={() =>
              add.mutate(
                { project_id: project.id, hex: colour.hex, name: colour.name, surface: surface.trim() || null },
                { onSuccess: () => setSavedTo(project.title) },
              )
            }
          />
        ))}
      </View>
      {savedTo ? (
        <Notice tone="success" icon="checkmark-circle">
          {t('“{name}” {savedTo} projesine kaydedildi.', { name: t(colour.name), savedTo })}
        </Notice>
      ) : null}
      {add.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {add.error.message}
        </Notice>
      ) : null}
      <Button label={t('Kapat')} variant="ghost" onPress={() => setOpen(false)} />
    </View>
  );
}

/** Side-by-side comparison of up to three colours. */
export function CompareColours({ hexes, onRemove, onSelect }: { hexes: string[]; onRemove: (hex: string) => void; onSelect: (c: PickedColour) => void }) {
  const p = usePalette();
  return (
    <View style={[styles.compare, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]} testID="compare">
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {hexes.map((hex) => {
          const c = toPicked(hex);
          return (
            <View key={hex} style={{ flex: 1, gap: space.xs }}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t('{name} seç', { name: t(c.name) })}
                onPress={() => onSelect(c)}
                style={[styles.compareSwatch, { backgroundColor: hex, borderColor: p.border }]}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={t('{name} karşılaştırmadan çıkar', { name: t(c.name) })}
                  onPress={() => onRemove(hex)}
                  style={[styles.round, { width: 30, height: 30, backgroundColor: 'rgba(255,255,255,0.85)', alignSelf: 'flex-end' }]}>
                  <Icon name="close" size={16} color="#141B2D" />
                </PressableScale>
              </PressableScale>
              <AppText variant="small" numberOfLines={1} style={{ fontFamily: fonts.bold }}>
                {t(c.name)}
              </AppText>
              <AppText variant="caption" tone="muted">
                {hex} · ≈%{lrv(hex)}
              </AppText>
            </View>
          );
        })}
      </View>
      <AppText variant="caption" tone="muted">
        {t('Yüzde, rengin ışığı ne kadar yansıttığını gösterir (yaklaşık). Yüksek değerler odayı daha aydınlık gösterir.')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  swatch: { borderRadius: radius.md, overflow: 'hidden' },
  swatchColour: { height: 84, padding: space.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  swatchCheck: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  swatchText: { paddingHorizontal: space.sm, paddingVertical: 6 },
  familyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    minHeight: 40,
  },
  familyDot: { width: 16, height: 16, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  custom: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.md },
  customSwatch: { width: 48, height: 48, borderRadius: 14 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  harmony: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  harmonyThumb: { width: 128, minHeight: 120 },
  harmonyDot: { width: 30, height: 30, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth },
  selected: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  bigDot: { width: 60, height: 60, borderRadius: 30, borderWidth: StyleSheet.hairlineWidth },
  dotRing: { padding: 3, borderRadius: 24, borderWidth: 2 },
  dot: { width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: space.md, minHeight: 40 },
  save: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  compare: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.sm },
  compareSwatch: { height: 150, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.xs },
});
