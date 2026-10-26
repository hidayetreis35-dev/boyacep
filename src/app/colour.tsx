import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ColourHarmonies, CompareColours, ColourExplorer, SelectedColour, SwatchCard, toPicked, type PickedColour } from '@/features/colour/colour-explorer';
import { ColourStudio } from '@/features/colour/colour-studio';
import { useFavourites } from '@/features/colour/favourites';
import type { PickedPhoto } from '@/features/photos/picker';
import { PhotoSourceButtons } from '@/features/photos/photo-source';
import { useProjectPhoto, useSaveSurfaces } from '@/features/photos/queries';
import { t } from '@/i18n';
import { RoomArt } from '@/ui/art';
import { Segmented, SectionTitle, SwatchFan } from '@/ui/brand';
import { AppText, Button, Card, ErrorState, LoadingState, Notice, Screen, useScrollToTop } from '@/ui/components';
import { radius, space } from '@/ui/theme';

type Tab = 'colours' | 'photo' | 'combos';

const MAX_COMPARE = 3;

/** Try colours on a photo that never leaves the phone. */
type PhotoProps = { colour: PickedColour; quickColours: string[]; onPickColour: (c: PickedColour) => void; onBrowse: () => void };

function LocalPhoto({ colour, quickColours, onPickColour, onBrowse }: PhotoProps) {
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  if (!photo) {
    return (
      <>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1, gap: space.xs }}>
              <AppText variant="heading">{t('Odanın fotoğrafını ekle')}</AppText>
              <AppText tone="muted">
                {t('Duvarı gün ışığında, karşıdan çek. Sonra duvar, tavan ya da dolap gibi yüzeyleri çizip her birine ayrı renk dene. Fotoğraf telefonunda kalır.')}
              </AppText>
            </View>
            <SwatchFan colours={[colour.hex, '#F1EDE4', '#2F5D6B', '#C08A6B']} size={64} />
          </View>
        </Card>
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
  const { photoId } = useLocalSearchParams<{ photoId?: string }>();
  const scrollToTop = useScrollToTop();
  const [tab, setTab] = useState<Tab>(photoId ? 'photo' : 'colours');
  const [colour, setColour] = useState<PickedColour>(() => toPicked('#A3B49A'));
  const [recent, setRecent] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const favourites = useFavourites();

  const pick = (c: PickedColour) => {
    setColour({ hex: c.hex, name: c.name });
    setRecent((r) => [c.hex, ...r.filter((h) => h !== c.hex)].slice(0, 8));
  };
  const toggleCompare = (hex: string) =>
    setCompare((list) => (list.includes(hex) ? list.filter((h) => h !== hex) : [...list, hex].slice(-MAX_COMPARE)));
  const quickColours = [...favourites.list, ...recent];

  const selected = (
    <SelectedColour
      colour={colour}
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
          { value: 'colours', label: t('Renkler'), icon: 'color-palette' },
          { value: 'photo', label: t('Odayı Dene'), icon: 'camera' },
          { value: 'combos', label: t('Kombinasyonlar'), icon: 'color-filter' },
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
          {/* An illustrated room shows the colour on a wall before any photo. */}
          <View style={{ borderRadius: radius.lg, overflow: 'hidden' }} testID="room-preview">
            <RoomArt wall={colour.hex} width="100%" height={200} />
          </View>
          {selected}
          {favourites.list.length > 0 ? (
            <View style={{ gap: space.sm }}>
              <SectionTitle title={t('Favorilerin ({count})', { count: favourites.list.length })} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {favourites.list.map((hex) => (
                  <SwatchCard key={hex} colour={toPicked(hex)} width={100} favourite selected={colour.hex === hex} onPress={() => pick(toPicked(hex))} />
                ))}
              </View>
            </View>
          ) : null}
          <SectionTitle
            title={t('Uyumlu Renk Kombinasyonları')}
            action={<Button label={t('Tümü')} variant="ghost" onPress={() => setTab('combos')} />}
          />
          <ColourHarmonies hex={colour.hex} onSelect={pick} limit={1} />
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
          <ColourHarmonies hex={colour.hex} onSelect={pick} withRoom />
        </>
      ) : null}
    </Screen>
  );
}
