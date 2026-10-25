import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

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
      accessibilityState={{ selected: !!selected }}
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
                  accessibilityState={{ selected: active }}
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

/** Big preview of the selected colour with its actions and matching schemes. */
export function SelectedColour({
  colour,
  favourite,
  comparing,
  onToggleFavourite,
  onToggleCompare,
  onTryOnWall,
  onSelect,
}: {
  colour: PickedColour;
  favourite: boolean;
  comparing: boolean;
  onToggleFavourite: () => void;
  onToggleCompare: () => void;
  onTryOnWall: () => void;
  onSelect: (c: PickedColour) => void;
}) {
  const p = usePalette();
  const fg = ink(colour.hex);
  const reflect = lrv(colour.hex);
  const facts = colourFacts(colour.hex);
  return (
    <View style={{ gap: space.md }}>
      <View style={[styles.hero, { backgroundColor: colour.hex, borderColor: p.border }]} testID="selected-colour">
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="overline" style={{ color: fg, opacity: 0.8 }}>
              {t('Seçili renk')}
            </AppText>
            <AppText variant="title" style={{ color: fg }}>
              {t(colour.name)}
            </AppText>
            <AppText variant="caption" style={{ color: fg, opacity: 0.8 }}>
              {facts.caption}
            </AppText>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={favourite ? t('Favorilerden çıkar') : t('Favorilere ekle')}
            onPress={onToggleFavourite}
            style={[styles.round, { backgroundColor: 'rgba(255,255,255,0.85)' }]}>
            <Icon name={favourite ? 'heart' : 'heart-outline'} size={22} color={favourite ? '#C2367A' : '#141B2D'} />
          </PressableScale>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <View style={styles.tag}>
            <AppText variant="caption" style={{ color: '#141B2D' }}>
              {colour.hex}
            </AppText>
          </View>
          <View style={styles.tag}>
            <AppText variant="caption" style={{ color: '#141B2D' }}>
              {t('Işık yansıtma ≈ %{reflect}', { reflect })}
            </AppText>
          </View>
          <View style={styles.tag}>
            <AppText variant="caption" style={{ color: '#141B2D' }}>
              {t(TEMPERATURE_LABEL[facts.temperature])}
            </AppText>
          </View>
          <View style={styles.tag}>
            <AppText variant="caption" style={{ color: '#141B2D' }}>
              {reflect >= 60 ? t('Ferah, ışığı açar') : reflect >= 30 ? t('Dengeli') : t('Derin, sıcak etki')}
            </AppText>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button label={t('Duvarda dene')} icon="camera" variant="cta" onPress={onTryOnWall} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={comparing ? t('Karşılaştırmada') : t('Karşılaştır')} icon={comparing ? 'checkmark' : 'git-compare'} variant="secondary" onPress={onToggleCompare} />
        </View>
      </View>

      <SaveToProject colour={colour} />

      <SectionTitle title={t('Uyumlu kombinasyonlar')} />
      {harmonies(colour.hex).map((h) => (
        <View key={h.key} style={[styles.harmony, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
          <View style={styles.harmonyStrip}>
            {h.colours.map((c) => (
              <PressableScale
                key={c.hex}
                accessibilityRole="button"
                accessibilityLabel={`${h.title}: ${t(c.name)}`}
                onPress={() => onSelect(c)}
                style={[styles.harmonyBlock, { backgroundColor: c.hex }]}>
                <AppText variant="caption" numberOfLines={1} style={{ color: ink(c.hex), fontFamily: fonts.bold }}>
                  {t(c.name)}
                </AppText>
              </PressableScale>
            ))}
          </View>
          <View style={{ padding: space.md, gap: 2 }}>
            <AppText variant="bodyStrong" style={{ fontFamily: fonts.bold }}>
              {h.title}
            </AppText>
            <AppText variant="small" tone="muted">
              {h.hint}
            </AppText>
          </View>
        </View>
      ))}
    </View>
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
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.lg, minHeight: 190, justifyContent: 'space-between', borderWidth: StyleSheet.hairlineWidth },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tag: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 4 },
  harmony: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  harmonyStrip: { flexDirection: 'row', height: 76 },
  harmonyBlock: { flex: 1, justifyContent: 'flex-end', padding: space.sm },
  save: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  compare: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.sm },
  compareSwatch: { height: 150, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.xs },
});
