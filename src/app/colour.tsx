import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colourByHex } from '@/features/colour/catalogue';
import { ColourHarmonies, CompareColours, ColourExplorer, SelectedColour, toPicked, type PickedColour } from '@/features/colour/colour-explorer';
import { ColourStudio } from '@/features/colour/colour-studio';
import { useFavourites } from '@/features/colour/favourites';
import type { PickedPhoto } from '@/features/photos/picker';
import { PhotoSourceButtons } from '@/features/photos/photo-source';
import { useProjectPhoto, useSaveSurfaces } from '@/features/photos/queries';
import { msg, t } from '@/i18n';
import { Segmented, SectionTitle } from '@/ui/brand';
import { AppText, Button, ErrorState, LoadingState, Notice, Screen, useScrollToTop } from '@/ui/components';
import { RoomPhoto } from '@/ui/photos';
import { fonts, radius, space, usePalette } from '@/ui/theme';

type Tab = 'colours' | 'photo' | 'combos';

const MAX_COMPARE = 3;

const TRY_STEPS = [msg('Odanın fotoğrafını çek ya da galeriden seç.'), msg('Boyanacak duvara dokun.'), msg('Renkleri dene, önce ve sonrayı karşılaştır.')];

/** Marks the stock room photo as a sample, so nobody takes it for their own room. */
function SampleChip() {
  const p = usePalette();
  return (
    <View style={[styles.sampleChip, { backgroundColor: p.surface }]}>
      <AppText variant="caption" style={{ fontFamily: fonts.bold }}>
        {t('Örnek oda')}
      </AppText>
    </View>
  );
}

/** Try colours on a photo that never leaves the phone. */
type PhotoProps = { colour: PickedColour; quickColours: string[]; onPickColour: (c: PickedColour) => void; onBrowse: () => void };

function LocalPhoto({ colour, quickColours, onPickColour, onBrowse }: PhotoProps) {
  const p = usePalette();
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  if (!photo) {
    return (
      <>
        <View style={[styles.tryCard, { backgroundColor: p.surface, borderColor: p.border }]}>
          <View style={{ height: 170 }}>
            <RoomPhoto wall={colour.hex} style={StyleSheet.absoluteFill} />
            <SampleChip />
          </View>
          <View style={{ padding: space.lg, gap: space.sm }}>
            <AppText variant="heading">{t('Odanın fotoğrafını ekle')}</AppText>
            <AppText tone="muted">
              {t('Gün ışığında, karşıdan çekilmiş bir fotoğraf en iyi sonucu verir. Fotoğraf telefonunda kalır.')}
            </AppText>
            {TRY_STEPS.map((step, i) => (
              <View key={step} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View style={[styles.stepDot, { backgroundColor: p.roseSoft }]}>
                  <AppText variant="caption" style={{ color: p.roseInk, fontFamily: fonts.extrabold }}>
                    {String(i + 1)}
                  </AppText>
                </View>
                <AppText variant="small" style={{ flex: 1 }}>
                  {t(step)}
                </AppText>
              </View>
            ))}
          </View>
        </View>
        <PhotoSourceButtons onPicked={setPhoto} />
      </>
    );
  }
  return (
    <ColourStudio
      key={photo.uri}
      photo={photo}
      colour={colour}
      quickColours={quickColours}
      onPickColour={onPickColour}
      onBrowse={onBrowse}
      onChangePhoto={() => setPhoto(null)}
    />
  );
}

/** Same tool on a photo saved in a project; the surfaces can be saved back. */
function ProjectPhoto({ photoId, colour, quickColours, onPickColour, onBrowse }: PhotoProps & { photoId: string }) {
  const query = useProjectPhoto(photoId);
  const save = useSaveSurfaces({ id: photoId, project_id: query.data?.project_id ?? '' });
  const [saved, setSaved] = useState(false);
  if (query.isPending) return <LoadingState label={t('Fotoğraf yükleniyor…')} />;
  if (query.isError || !query.data.url) {
    return <ErrorState message={t('Fotoğraf yüklenemedi. Silinmiş olabilir ya da internet bağlantın yok.')} onRetry={() => query.refetch()} />;
  }
  const photo = query.data;
  return (
    <>
      <ColourStudio
        photo={{ uri: photo.url!, width: photo.width, height: photo.height }}
        colour={colour}
        quickColours={quickColours}
        onPickColour={onPickColour}
        onBrowse={onBrowse}
        initialSurfaces={photo.surfaces}
        onSaveSurfaces={(surfaces) => {
          setSaved(false);
          save.mutate(surfaces, { onSuccess: () => setSaved(true) });
        }}
        saving={save.isPending}
        saveError={save.isError ? save.error.message : null}
      />
      {saved ? (
        <Notice tone="success" icon="checkmark-circle">
          {t('Yüzeyler ve renkler projeye kaydedildi.')}
        </Notice>
      ) : null}
    </>
  );
}

export default function ColourScreen() {
  const { photoId, hex } = useLocalSearchParams<{ photoId?: string; hex?: string }>();
  const scrollToTop = useScrollToTop();
  const [tab, setTab] = useState<Tab>(photoId ? 'photo' : 'colours');
  // A colour picked in search arrives as ?hex=; anything that is not a catalogue colour is ignored.
  const [colour, setColour] = useState<PickedColour>(() => toPicked(hex && colourByHex(hex) ? hex : '#A3B49A'));
  const [recent, setRecent] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const favourites = useFavourites();

  const pick = (c: PickedColour) => {
    setColour({ hex: c.hex, name: c.name });
    setRecent((r) => [c.hex, ...r.filter((h) => h !== c.hex)].slice(0, 8));
  };
  const toggleCompare = (hex: string) =>
    setCompare((list) => (list.includes(hex) ? list.filter((h) => h !== hex) : [...list, hex].slice(-MAX_COMPARE)));
  const quickColours = [...new Set([...favourites.list, ...recent])];
  const room = (wall: string) => <RoomPhoto wall={wall} style={StyleSheet.absoluteFill} />;

  const selected = (
    <SelectedColour
      colour={colour}
      quickColours={quickColours}
      onSelect={pick}
      favourite={favourites.isFavourite(colour.hex)}
      comparing={compare.includes(colour.hex)}
      onToggleFavourite={() => favourites.toggle(colour.hex)}
      onToggleCompare={() => toggleCompare(colour.hex)}
      onTryOnWall={() => {
        setTab('photo');
        scrollToTop();
      }}
    />
  );

  return (
    <Screen edges={['bottom']}>
      <Segmented
        options={[
          { value: 'colours', label: t('Renkler') },
          { value: 'photo', label: t('Odayı Dene') },
          { value: 'combos', label: t('Kombinasyonlar') },
        ]}
        value={tab}
        onChange={(next) => {
          setTab(next);
          scrollToTop();
        }}
      />

      {compare.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionTitle title={t('Karşılaştır ({count}/{max})', { count: compare.length, max: MAX_COMPARE })} />
          <CompareColours hexes={compare} onRemove={toggleCompare} onSelect={pick} />
        </View>
      ) : null}

      {tab === 'colours' ? (
        <>
          {/* A sample room photo shows the colour on a real wall before the user adds their own. */}
          <View style={{ borderRadius: radius.lg, overflow: 'hidden' }} testID="room-preview">
            <RoomPhoto wall={colour.hex} style={{ height: 210 }} />
            <SampleChip />
          </View>
          {selected}
          <SectionTitle
            title={t('Uyumlu Renk Kombinasyonları')}
            action={<Button label={t('Tümü')} variant="ghost" onPress={() => setTab('combos')} />}
          />
          <ColourHarmonies hex={colour.hex} onSelect={pick} limit={1} room={room} />
          <SectionTitle title={t('Renk kataloğu')} />
          <ColourExplorer selected={colour.hex} favourites={favourites.list} onSelect={pick} />
        </>
      ) : null}

      {/* Kept mounted while other tabs are open, so the photo and its surfaces survive a trip to the catalogue. */}
      <View style={{ display: tab === 'photo' ? 'flex' : 'none', gap: space.lg }}>
        {photoId ? (
          <ProjectPhoto photoId={photoId} colour={colour} quickColours={quickColours} onPickColour={pick} onBrowse={() => setTab('colours')} />
        ) : (
          <LocalPhoto colour={colour} quickColours={quickColours} onPickColour={pick} onBrowse={() => setTab('colours')} />
        )}
      </View>

      {tab === 'combos' ? (
        <>
          <AppText tone="muted">{t('“{name}” ile uyumlu renkler. Bir renge dokun, seçili renk olsun.', { name: t(colour.name) })}</AppText>
          <ColourHarmonies hex={colour.hex} onSelect={pick} room={room} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tryCard: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sampleChip: { position: 'absolute', top: space.sm, left: space.sm, borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 3 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
