import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { AppText, Badge, Button, Card, EmptyState, ErrorState, Icon, LoadingState, Notice } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

import type { ProjectPhoto } from './api';
import { PhotoSourceButtons } from './photo-source';
import { useDeletePhoto, useProjectPhotos, useUploadPhoto } from './queries';

function PhotoTile({ photo, onDelete, deleting }: { photo: ProjectPhoto; onDelete: () => void; deleting: boolean }) {
  const p = usePalette();
  const [confirming, setConfirming] = useState(false);
  return (
    <View style={{ width: '48%', gap: space.xs }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fotoğrafta rengi dene"
        onPress={() => router.push({ pathname: '/colour', params: { photoId: photo.id } })}
        style={{ borderRadius: radius.md, overflow: 'hidden', backgroundColor: p.surfaceMuted, aspectRatio: 4 / 3 }}>
        {photo.url ? (
          <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="image" color={p.textMuted} />
          </View>
        )}
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <View style={{ flex: 1 }}>{photo.surfaces.length > 0 ? <Badge label={`${photo.surfaces.length} yüzey çizili`} tone="primary" /> : null}</View>
        {confirming ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel="Silmekten vazgeç" onPress={() => setConfirming(false)} style={{ padding: space.sm }}>
              <AppText variant="small" tone="muted">Vazgeç</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Fotoğrafı kalıcı olarak sil" disabled={deleting} onPress={onDelete} style={{ padding: space.sm }}>
              <AppText variant="small" tone="danger">{deleting ? 'Siliniyor…' : 'Sil'}</AppText>
            </Pressable>
          </>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Fotoğrafı sil" onPress={() => setConfirming(true)} style={{ padding: space.sm }}>
            <Icon name="trash-outline" size={20} color={p.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Wall photos of a project. Files are private; only the owner gets (short-lived) links. */
export function ProjectPhotos({ projectId }: { projectId: string }) {
  const photos = useProjectPhotos(projectId);
  const upload = useUploadPhoto(projectId);
  const remove = useDeletePhoto(projectId);
  const [adding, setAdding] = useState(false);

  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="heading">Fotoğraflar</AppText>
      {photos.isPending ? (
        <LoadingState label="Fotoğraflar yükleniyor…" />
      ) : photos.isError ? (
        <ErrorState message="Fotoğraflar yüklenemedi." onRetry={() => photos.refetch()} />
      ) : photos.data.length === 0 ? (
        <EmptyState icon="images" title="Henüz fotoğraf yok" message="Duvarların fotoğrafını ekle; Renk Stüdyosu ile üzerinde renk dene." />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md }}>
          {photos.data.map((photo) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              deleting={remove.isPending && remove.variables?.id === photo.id}
              onDelete={() => remove.mutate(photo)}
            />
          ))}
        </View>
      )}
      {remove.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {remove.error.message}
        </Notice>
      ) : null}

      {adding ? (
        <Card>
          <AppText tone="muted">Fotoğraf küçültülüp gizli olarak saklanır. Sadece sen görebilirsin.</AppText>
          <PhotoSourceButtons
            busy={upload.isPending}
            onPicked={(photo) => upload.mutate(photo, { onSuccess: () => setAdding(false) })}
          />
          <Button label="Vazgeç" variant="ghost" disabled={upload.isPending} onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <Button label="Fotoğraf ekle" icon="camera" variant="secondary" onPress={() => { upload.reset(); setAdding(true); }} />
      )}
      {upload.isPending ? <LoadingState label="Fotoğraf yükleniyor…" /> : null}
      {upload.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {upload.error.message}
        </Notice>
      ) : null}
    </View>
  );
}
