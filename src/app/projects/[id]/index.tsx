import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { calculateProject, round } from '@/engine';
import { AssumptionList, packageText } from '@/features/calculator/results';
import { ProjectPhotos } from '@/features/photos/project-photos';
import { ReceivedQuotes } from '@/features/quotes/received-quotes';
import { roomToInput, STATUS_LABEL, STATUS_ORDER, type RoomWithOpenings } from '@/features/projects/mapping';
import { useDeleteProject, useProject, useSetProjectStatus } from '@/features/projects/queries';
import { formatNumber } from '@/lib/number';
import {
  AppText,
  Badge,
  Button,
  Card,
  ChoiceChips,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Notice,
  Screen,
} from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

function RoomCard({ projectId, room, litres }: { projectId: string; room: RoomWithOpenings; litres: number | null }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${room.name} odasını düzenle`}
      onPress={() => router.push({ pathname: '/projects/[id]/room', params: { id: projectId, roomId: room.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: p.border,
        backgroundColor: pressed ? p.surfaceMuted : p.surface,
      })}>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{room.name}</AppText>
        <AppText variant="small" tone="muted">
          {formatNumber(Number(room.length_m), 2)} × {formatNumber(Number(room.width_m), 2)} m, tavan{' '}
          {formatNumber(Number(room.height_m), 2)} m
        </AppText>
      </View>
      {litres !== null ? <AppText variant="bodyStrong">{formatNumber(litres)} L</AppText> : null}
      <Icon name="chevron-forward" color={p.textMuted} />
    </Pressable>
  );
}

function DeleteProject({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteProject();
  if (!confirming) return <Button label="Projeyi sil" icon="trash" variant="ghost" onPress={() => setConfirming(true)} />;
  return (
    <Card>
      <AppText variant="bodyStrong">Proje; odaları, malzeme listesi ve fotoğraflarıyla birlikte kalıcı olarak silinsin mi?</AppText>
      {remove.isError ? (
        <Notice tone="danger" icon="alert-circle">
          Silinemedi: {remove.error.message}
        </Notice>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button label="Vazgeç" variant="secondary" onPress={() => setConfirming(false)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Evet, sil"
            icon="trash"
            loading={remove.isPending}
            onPress={() => remove.mutate(id, { onSuccess: () => router.replace('/projects') })}
          />
        </View>
      </View>
    </Card>
  );
}

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useProject(id);
  const setStatus = useSetProjectStatus(id);

  if (query.isPending) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (query.isError) {
    return (
      <Screen edges={['bottom']}>
        <ErrorState message="Proje yüklenemedi. Silinmiş olabilir ya da internet bağlantın yok." onRetry={() => query.refetch()} />
      </Screen>
    );
  }

  const { project, rooms } = query.data;
  const calc = rooms.length > 0 ? calculateProject(rooms.map(roomToInput)) : null;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: project.title }} />

      <Card>
        <AppText variant="heading">{project.title}</AppText>
        <ChoiceChips
          label="Durum"
          options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          value={project.status}
          onChange={(s) => setStatus.mutate(s)}
        />
        {setStatus.isError ? (
          <Notice tone="danger" icon="alert-circle">
            Durum kaydedilemedi.
          </Notice>
        ) : null}
      </Card>

      <View style={{ gap: space.sm }}>
        <AppText variant="heading">Odalar</AppText>
        {rooms.length === 0 ? (
          <EmptyState icon="cube" title="Henüz oda yok" message="Oda ekle; ölçülerini gir, boya ihtiyacı burada toplansın." />
        ) : (
          rooms.map((room, i) => (
            <RoomCard
              key={room.id}
              projectId={project.id}
              room={room}
              litres={
                calc?.ok
                  ? round(calc.value.rooms[i].paint.wallLitres + calc.value.rooms[i].paint.ceilingLitres, 1)
                  : null
              }
            />
          ))
        )}
        <Button
          label="Oda ekle"
          icon="add"
          variant="secondary"
          onPress={() => router.push({ pathname: '/projects/[id]/room', params: { id: project.id } })}
        />
      </View>

      {calc && !calc.ok ? (
        <Notice tone="danger" icon="alert-circle">
          Bir odanın ölçüleri hatalı: {calc.issues[0]?.message}
        </Notice>
      ) : null}

      {calc?.ok ? (
        <>
          <Card>
            <AppText variant="heading">Proje toplamı</AppText>
            <AppText variant="number" tone="primary">
              {formatNumber(calc.value.totals.wallLitres + calc.value.totals.ceilingLitres)} L
            </AppText>
            <AppText variant="small" tone="muted">
              Boyanacak alan: {formatNumber(calc.value.totals.totalPaintable, 2)} m²
            </AppText>
            {calc.value.materials.map((m) => (
              <View key={m.category} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                <AppText style={{ flex: 1 }}>{m.name}</AppText>
                <AppText variant="bodyStrong">
                  {m.packages ? packageText(m.packages) : `${formatNumber(m.quantity)} ${m.unit}`}
                </AppText>
              </View>
            ))}
            <Badge label="Tahmini değerler içerir" tone="accent" />
          </Card>
          <AssumptionList assumptions={calc.value.assumptions} />
        </>
      ) : null}

      <Button
        label="Malzeme listesi ve maliyet"
        icon="wallet"
        onPress={() => router.push({ pathname: '/projects/[id]/cost', params: { id: project.id } })}
      />

      <ProjectPhotos projectId={project.id} />

      <ReceivedQuotes projectId={project.id} />
      <Button
        label="Ustayla paylaş"
        icon="share-social"
        variant="secondary"
        onPress={() => router.push({ pathname: '/projects/[id]/share', params: { id: project.id } })}
      />

      <DeleteProject id={project.id} />
    </Screen>
  );
}
