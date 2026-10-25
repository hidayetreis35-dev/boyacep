import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { calculateProject, round } from '@/engine';
import { AssumptionList, packageText } from '@/features/calculator/results';
import { useProjectColours } from '@/features/colour/project-colours';
import { ProjectPhotos } from '@/features/photos/project-photos';
import { ReceivedQuotes } from '@/features/quotes/received-quotes';
import { roomToInput, STATUS_LABEL, STATUS_ORDER, type RoomWithOpenings } from '@/features/projects/mapping';
import { useDeleteProject, useProject, useSetProjectStatus } from '@/features/projects/queries';
import { formatMoney, formatNumber } from '@/lib/number';
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
  type IconName,
} from '@/ui/components';
import { Disclosure, Gradient, IconBubble, SectionTitle } from '@/ui/brand';
import { PressableScale } from '@/ui/motion';
import { fonts, radius, shadowOf, space, useFeatureColour, usePalette, type FeatureKey } from '@/ui/theme';

function RoomCard({ projectId, room, litres }: { projectId: string; room: RoomWithOpenings; litres: number | null }) {
  const p = usePalette();
  const f = useFeatureColour('calculate');
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${room.name} odasını düzenle`}
      onPress={() => router.push({ pathname: '/projects/[id]/room', params: { id: projectId, roomId: room.id } })}
      style={[styles.row, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
      <IconBubble icon="cube" feature="calculate" size={42} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{room.name}</AppText>
        <AppText variant="small" tone="muted">
          {formatNumber(Number(room.length_m), 2)} × {formatNumber(Number(room.width_m), 2)} m, tavan{' '}
          {formatNumber(Number(room.height_m), 2)} m
        </AppText>
      </View>
      {litres !== null ? (
        <View style={[styles.pill, { backgroundColor: f.soft }]}>
          <AppText variant="small" style={{ color: f.ink, fontFamily: fonts.bold }}>
            {formatNumber(litres)} L
          </AppText>
        </View>
      ) : null}
      <Icon name="chevron-forward" color={p.textMuted} />
    </PressableScale>
  );
}

function QuickAction({ icon, label, feature, onPress }: { icon: IconName; label: string; feature: FeatureKey; onPress: () => void }) {
  const p = usePalette();
  const f = useFeatureColour(feature);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.quick, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
      <View style={[styles.quickIcon, { backgroundColor: f.soft }]}>
        <Icon name={icon} size={20} color={f.ink} />
      </View>
      <AppText variant="small" style={{ fontFamily: fonts.semibold, textAlign: 'center' }} numberOfLines={2}>
        {label}
      </AppText>
    </PressableScale>
  );
}

function ProjectColours({ projectId }: { projectId: string }) {
  const p = usePalette();
  const colours = useProjectColours(projectId);
  const list = colours.data ?? [];
  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle
        title="Proje renkleri"
        action={<Button label={list.length ? 'Renk ekle' : 'Renk seç'} icon="color-palette" variant="ghost" onPress={() => router.push('/colour')} />}
      />
      {colours.isError ? (
        <Notice tone="danger" icon="alert-circle">
          Renkler yüklenemedi.
        </Notice>
      ) : list.length === 0 ? (
        <AppText tone="muted">Renk Stüdyosu’nda beğendiğin renkleri bu projeye kaydet; ustanla da paylaşılır.</AppText>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {list.map((c) => (
            <View key={c.id} style={[styles.colour, { backgroundColor: p.surface, borderColor: p.border }]} accessibilityLabel={`${c.name}${c.surface ? `, ${c.surface}` : ''}`}>
              <View style={{ height: 56, backgroundColor: c.hex }} />
              <View style={{ padding: space.sm, gap: 2 }}>
                <AppText variant="caption" style={{ fontFamily: fonts.bold }} numberOfLines={1}>
                  {c.name}
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 11 }}>
                  {c.surface ?? c.hex}
                </AppText>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
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

function HeroStat({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="heading" style={{ color: p.onHero, fontFamily: fonts.extrabold }}>
        {value}
      </AppText>
      <AppText variant="caption" style={{ color: p.onHeroMuted }}>
        {label}
      </AppText>
    </View>
  );
}

export default function ProjectScreen() {
  const p = usePalette();
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

  const totalLitres = calc?.ok ? calc.value.totals.wallLitres + calc.value.totals.ceilingLitres : null;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: project.title }} />

      <View style={[styles.hero, shadowOf(p, 2)]}>
        <Gradient from={p.heroFrom} to={p.heroTo} />
        <AppText variant="overline" style={{ color: p.onHeroMuted }}>
          {STATUS_LABEL[project.status]}
        </AppText>
        <AppText variant="title" style={{ color: p.onHero }}>
          {project.title}
        </AppText>
        <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap', marginTop: space.xs }}>
          <HeroStat label="Oda" value={String(rooms.length)} />
          {calc?.ok ? <HeroStat label="Boyanacak alan" value={`${formatNumber(calc.value.totals.totalPaintable, 1)} m²`} /> : null}
          {totalLitres !== null ? <HeroStat label="Toplam boya" value={`${formatNumber(totalLitres)} L`} /> : null}
          {project.budget ? <HeroStat label="Bütçe" value={formatMoney(project.budget)} /> : null}
        </View>
      </View>

      <View style={styles.quickRow}>
        <QuickAction icon="add-circle" label="Oda ekle" feature="calculate" onPress={() => router.push({ pathname: '/projects/[id]/room', params: { id: project.id } })} />
        <QuickAction icon="wallet" label="Maliyet" feature="cost" onPress={() => router.push({ pathname: '/projects/[id]/cost', params: { id: project.id } })} />
        <QuickAction icon="color-palette" label="Renkler" feature="color" onPress={() => router.push('/colour')} />
        <QuickAction icon="share-social" label="Ustayla paylaş" feature="ask" onPress={() => router.push({ pathname: '/projects/[id]/share', params: { id: project.id } })} />
      </View>

      <ChoiceChips
        label="Projenin durumu"
        options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
        value={project.status}
        onChange={(s) => setStatus.mutate(s)}
      />
      {setStatus.isError ? (
        <Notice tone="danger" icon="alert-circle">
          Durum kaydedilemedi.
        </Notice>
      ) : null}

      <View style={{ gap: space.sm }}>
        <SectionTitle title="Odalar" />
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
        <View style={{ gap: space.sm }}>
          <SectionTitle title="Proje toplamı" />
          <Card>
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
          <Button
            label="Malzeme listesi ve maliyet"
            icon="wallet"
            variant="cta"
            onPress={() => router.push({ pathname: '/projects/[id]/cost', params: { id: project.id } })}
          />
          <Disclosure title="Hesapta kullanılan değerler">
            <AssumptionList assumptions={calc.value.assumptions} />
          </Disclosure>
        </View>
      ) : null}

      <ProjectColours projectId={project.id} />

      <ProjectPhotos projectId={project.id} />

      <ReceivedQuotes projectId={project.id} />

      <DeleteProject id={project.id} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.xs, overflow: 'hidden' },
  quickRow: { flexDirection: 'row', gap: space.sm },
  quick: { flex: 1, alignItems: 'center', gap: space.xs, paddingVertical: space.md, paddingHorizontal: space.xs, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  quickIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  pill: { borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 4 },
  colour: { width: 104, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
