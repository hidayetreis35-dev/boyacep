import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { calculateProject } from '@/engine';
import { useSession } from '@/features/account/session';
import { useProjectPhotos } from '@/features/photos/queries';
import { roomToInput, STATUS_LABEL } from '@/features/projects/mapping';
import { useCreateQuote } from '@/features/quotes/queries';
import { removeMember } from '@/features/sharing/api';
import { useSharedProject, useSharedProjects } from '@/features/sharing/queries';
import { formatNumber } from '@/lib/number';
import { AppText, Badge, Button, Card, EmptyState, ErrorState, LoadingState, Notice, Row, Screen } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

function Photos({ projectId }: { projectId: string }) {
  const p = usePalette();
  const photos = useProjectPhotos(projectId);
  if (photos.isPending || photos.isError || photos.data.length === 0) return null;
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="heading">Fotoğraflar</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md }}>
        {photos.data.map((photo) => (
          <View key={photo.id} style={{ width: '48%', aspectRatio: 4 / 3, borderRadius: radius.md, overflow: 'hidden', backgroundColor: p.surfaceMuted }}>
            {photo.url ? (
              <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Proje fotoğrafı" />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function SharedProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, session } = useSession();
  const list = useSharedProjects();
  const data = useSharedProject(id);
  const createQuote = useCreateQuote();
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const meta = list.data?.find((p) => p.id === id);
  if (list.isPending || data.isPending) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (list.isError || data.isError) {
    return <Screen edges={['bottom']}><ErrorState message="Proje yüklenemedi." onRetry={() => { list.refetch(); data.refetch(); }} /></Screen>;
  }
  if (!meta) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="lock-closed" title="Bu projeye erişimin yok" message="Ev sahibi paylaşımı kaldırmış olabilir. Yeni bir kod isteyebilirsin." />
      </Screen>
    );
  }

  const { rooms, materials } = data.data;
  const calc = rooms.length > 0 ? calculateProject(rooms.map(roomToInput)) : null;
  const paintable = calc?.ok ? calc.value.totals.totalPaintable : null;

  const leave = async () => {
    if (!db || !session) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      await removeMember(db, id, session.user.id);
      await list.refetch();
      router.back();
    } catch (e) {
      setLeaveError(e instanceof Error ? e.message : 'Ayrılamadın.');
      setLeaving(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: meta.title }} />
      <Card>
        <AppText variant="heading">{meta.title}</AppText>
        <AppText tone="muted">{meta.owner_name}</AppText>
        <View style={{ flexDirection: 'row' }}>
          <Badge label={STATUS_LABEL[meta.status]} />
        </View>
      </Card>

      <View style={{ gap: space.sm }}>
        <AppText variant="heading">Odalar</AppText>
        {rooms.length === 0 ? (
          <AppText tone="muted">Ev sahibi henüz oda eklememiş.</AppText>
        ) : (
          rooms.map((room) => (
            <Card key={room.id}>
              <AppText variant="bodyStrong">{room.name}</AppText>
              <AppText variant="small" tone="muted">
                {formatNumber(Number(room.length_m), 2)} × {formatNumber(Number(room.width_m), 2)} m, tavan {formatNumber(Number(room.height_m), 2)} m ·{' '}
                {room.openings.reduce((n, o) => n + o.count, 0)} kapı/pencere
              </AppText>
            </Card>
          ))
        )}
        {paintable !== null ? (
          <Card>
            <Row label="Boyanacak toplam alan" value={`${formatNumber(paintable, 2)} m²`} strong />
            <Badge label="Ev sahibinin girdiği ölçülerden hesaplandı" tone="accent" />
          </Card>
        ) : null}
      </View>

      <View style={{ gap: space.sm }}>
        <AppText variant="heading">Malzeme listesi</AppText>
        {materials.length === 0 ? (
          <AppText tone="muted">Malzeme listesi yok.</AppText>
        ) : (
          <Card>
            {materials.map((m) => (
              <Row key={m.id} label={m.name} value={`${formatNumber(Number(m.quantity), 2)} ${m.unit}`} />
            ))}
          </Card>
        )}
      </View>

      <Photos projectId={id} />

      <Button
        label="Bu proje için teklif hazırla"
        icon="document-text"
        loading={createQuote.isPending}
        onPress={() =>
          createQuote.mutate(
            { title: `${meta.title} teklifi`.slice(0, 120), projectId: id },
            { onSuccess: (q) => router.push({ pathname: '/quotes/[id]', params: { id: q.id } }) },
          )
        }
      />
      {createQuote.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {createQuote.error.message}
        </Notice>
      ) : null}
      <Button label="Projeden ayrıl" icon="exit" variant="ghost" loading={leaving} onPress={leave} />
      {leaveError ? (
        <Notice tone="danger" icon="alert-circle">
          {leaveError}
        </Notice>
      ) : null}
    </Screen>
  );
}
