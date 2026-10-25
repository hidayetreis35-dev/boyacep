import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ColourStudio } from '@/features/colour/colour-studio';
import type { ProjectPhoto } from '@/features/photos/api';
import type { PickedPhoto } from '@/features/photos/picker';
import { PhotoSourceButtons } from '@/features/photos/photo-source';
import { useProjectPhoto, useSaveOutline } from '@/features/photos/queries';
import { AppText, Card, ErrorState, LoadingState, Notice, Screen } from '@/ui/components';

/** Try colours on a photo that never leaves the phone. */
function LocalColour() {
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);

  if (!photo) {
    return (
      <>
        <Card>
          <AppText variant="heading">Duvarının fotoğrafını ekle</AppText>
          <AppText tone="muted">
            Boyamak istediğin duvarı gün ışığında, karşıdan çek. Fotoğraf telefonunda kalır; hiçbir yere yüklenmez.
          </AppText>
        </Card>
        <PhotoSourceButtons onPicked={setPhoto} />
      </>
    );
  }
  return <ColourStudio key={photo.uri} photo={photo} onChangePhoto={() => setPhoto(null)} />;
}

/** Same tool on a photo saved in a project; the outline can be saved back. */
function ProjectPhotoColour({ photoId }: { photoId: string }) {
  const query = useProjectPhoto(photoId);
  if (query.isPending) return <LoadingState label="Fotoğraf yükleniyor…" />;
  if (query.isError || !query.data.url) {
    return <ErrorState message="Fotoğraf yüklenemedi. Silinmiş olabilir ya da internet bağlantın yok." onRetry={() => query.refetch()} />;
  }
  return <SavedPhotoStudio photo={query.data} />;
}

function SavedPhotoStudio({ photo }: { photo: ProjectPhoto }) {
  const save = useSaveOutline(photo);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <ColourStudio
        photo={{ uri: photo.url!, width: photo.width, height: photo.height }}
        initialOutline={photo.wall_outline}
        onSaveOutline={(outline) => {
          setSaved(false);
          save.mutate(outline, { onSuccess: () => setSaved(true) });
        }}
        saving={save.isPending}
        saveError={save.isError ? save.error.message : null}
      />
      {saved ? <Notice icon="checkmark-circle">Çizim projeye kaydedildi.</Notice> : null}
    </>
  );
}

export default function ColourScreen() {
  const { photoId } = useLocalSearchParams<{ photoId?: string }>();
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Rengini Dene' }} />
      {photoId ? <ProjectPhotoColour photoId={photoId} /> : <LocalColour />}
    </Screen>
  );
}
