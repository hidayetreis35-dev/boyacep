import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { calculateProject, round } from '@/engine';
import { quantityText } from '@/features/calculator/labels';
import { AssumptionList, packageText } from '@/features/calculator/results';
import { useProjectColours } from '@/features/colour/project-colours';
import { ProjectPhotos } from '@/features/photos/project-photos';
import { ReceivedQuotes } from '@/features/quotes/received-quotes';
import { ProjectSteps } from '@/features/projects/project-steps';
import { roomToInput, STATUS_LABEL, STATUS_ORDER, type RoomWithOpenings } from '@/features/projects/mapping';
import { useDeleteProject, useProject, useSetProjectStatus } from '@/features/projects/queries';
import { t } from '@/i18n';
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
      accessibilityLabel={t('{name} odasını düzenle', { name: room.name })}
      onPress={() => router.push({ pathname: '/projects/[id]/room', params: { id: projectId, roomId: room.id } })}
      style={[styles.row, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
      <IconBubble icon="cube" feature="calculate" size={42} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{room.name}</AppText>
        <AppText variant="small" tone="muted">
          {t('{length} × {width} m, tavan {height} m', {
            length: formatNumber(Number(room.length_m), 2),
            width: formatNumber(Number(room.width_m), 2),
            height: formatNumber(Number(room.height_m), 2),
          })}
        </AppText>
      </View>
      {litres !== null ? (
        <View style={[styles.pill, { backgroundColor: f.soft }]}>
          <AppText variant="small" style={{ color: f.ink, fontFamily: fonts.bold }}>
            {`${formatNumber(litres)} L`}
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
        title={t('Proje renkleri')}
        action={<Button label={list.length ? t('Renk ekle') : t('Renk seç')} icon="color-palette" variant="ghost" onPress={() => router.push('/colour')} />}
      />
      {colours.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {t('Renkler yüklenemedi.')}
        </Notice>
      ) : list.length === 0 ? (
        <AppText tone="muted">{t('Renk Stüdyosu’nda beğendiğin renkleri bu projeye kaydet; ustanla da paylaşılır.')}</AppText>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {list.map((c) => (
            <View key={c.id} style={[styles.colour, { backgroundColor: p.surface, borderColor: p.border }]} accessibilityLabel={c.surface ? `${t(c.name)}, ${t(c.surface)}` : t(c.name)}>
              <View style={{ height: 56, backgroundColor: c.hex }} />
              <View style={{ padding: space.sm, gap: 2 }}>
                <AppText variant="caption" style={{ fontFamily: fonts.bold }} numberOfLines={1}>
                  {t(c.name)}
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 11 }}>
                  {c.surface ? t(c.surface) : c.hex}
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
  if (!confirming) return <Button label={t('Projeyi sil')} icon="trash" variant="ghost" onPress={() => setConfirming(true)} />;
  return (
    <Card>
      <AppText variant="bodyStrong">{t('Proje; odaları, malzeme listesi ve fotoğraflarıyla birlikte kalıcı olarak silinsin mi?')}</AppText>
      {remove.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {t('Silinemedi: {message}', { message: remove.error.message })}
        </Notice>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button label={t('Vazgeç')} variant="secondary" onPress={() => setConfirming(false)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={t('Evet, sil')}
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
        <ErrorState message={t('Proje yüklenemedi. Silinmiş olabilir ya da internet bağlantın yok.')} onRetry={() => query.refetch()} />
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
          {t(STATUS_LABEL[project.status])}
        </AppText>
        <AppText variant="title" style={{ color: p.onHero }}>
          {project.title}
        </AppText>
        <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap', marginTop: space.xs }}>
          <HeroStat label={t('Oda')} value={String(rooms.length)} />
          {calc?.ok ? <HeroStat label={t('Boyanacak alan')} value={`${formatNumber(calc.value.totals.totalPaintable, 1)} m²`} /> : null}
          {totalLitres !== null ? <HeroStat label={t('Toplam boya')} value={`${formatNumber(totalLitres)} L`} /> : null}
          {project.budget ? <HeroStat label={t('Bütçe')} value={formatMoney(project.budget)} /> : null}
        </View>
      </View>

      <ProjectSteps projectId={project.id} rooms={rooms.length} budget={project.budget} />

      <View style={styles.quickRow}>
        <QuickAction icon="add-circle" label={t('Oda ekle')} feature="calculate" onPress={() => router.push({ pathname: '/projects/[id]/room', params: { id: project.id } })} />
        <QuickAction icon="wallet" label={t('Maliyet')} feature="cost" onPress={() => router.push({ pathname: '/projects/[id]/cost', params: { id: project.id } })} />
        <QuickAction icon="color-palette" label={t('Renkler')} feature="color" onPress={() => router.push('/colour')} />
        <QuickAction icon="share-social" label={t('Ustayla paylaş')} feature="ask" onPress={() => router.push({ pathname: '/projects/[id]/share', params: { id: project.id } })} />
      </View>

      <View style={styles.quickRow}>
        <View style={{ flex: 1 }}>
          <Button
            label={t('Akıllı Bütçe')}
            icon="pie-chart"
            variant="secondary"
            onPress={() => router.push({ pathname: '/projects/[id]/budget', params: { id: project.id } })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={t('Keşif dosyası')}
            icon="document-text"
            variant="secondary"
            onPress={() => router.push({ pathname: '/projects/[id]/survey', params: { id: project.id } })}
          />
        </View>
      </View>

      <ChoiceChips
        label={t('Projenin durumu')}
        options={STATUS_ORDER.map((s) => ({ value: s, label: t(STATUS_LABEL[s]) }))}
        value={project.status}
        onChange={(s) => setStatus.mutate(s)}
      />
      {setStatus.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {t('Durum kaydedilemedi.')}
        </Notice>
      ) : null}

      <View style={{ gap: space.sm }}>
        <SectionTitle title={t('Odalar')} />
        {rooms.length === 0 ? (
          <EmptyState icon="cube" title={t('Henüz oda yok')} message={t('Oda ekle; ölçülerini gir, boya ihtiyacı burada toplansın.')} />
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
          label={t('Oda ekle')}
          icon="add"
          variant="secondary"
          onPress={() => router.push({ pathname: '/projects/[id]/room', params: { id: project.id } })}
        />
      </View>

      {calc && !calc.ok ? (
        <Notice tone="danger" icon="alert-circle">
          {t('Bir odanın ölçüleri hatalı: {message}', { message: calc.issues[0] ? t(calc.issues[0].message) : '' })}
        </Notice>
      ) : null}

      {calc?.ok ? (
        <View style={{ gap: space.sm }}>
          <SectionTitle title={t('Proje toplamı')} />
          <Card>
            {calc.value.materials.map((m) => (
              <View key={m.category} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                <AppText style={{ flex: 1 }}>{t(m.name)}</AppText>
                <AppText variant="bodyStrong">
                  {m.packages ? packageText(m.packages) : quantityText(m.quantity, m.unit)}
                </AppText>
              </View>
            ))}
            <Badge label={t('Tahmini değerler içerir')} tone="accent" />
          </Card>
          <Button
            label={t('Malzeme listesi ve maliyet')}
            icon="wallet"
            variant="cta"
            onPress={() => router.push({ pathname: '/projects/[id]/cost', params: { id: project.id } })}
          />
          <Disclosure title={t('Hesapta kullanılan değerler')}>
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
