import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useProjectColours } from '@/features/colour/project-colours';
import { useCity } from '@/features/market/city';
import { RegionalCostCard } from '@/features/market/regional-cost';
import { useProjectPhotos } from '@/features/photos/queries';
import { useProject } from '@/features/projects/queries';
import { buildSurvey, isEmptySurvey } from '@/features/survey/model';
import { useInspectionActions, useInspections, useShareSurvey, useShareSurveyText } from '@/features/survey/queries';
import { isReadyForQuote, surveyGaps, type SurveyGap } from '@/features/survey/readiness';
import { SurveyView } from '@/features/survey/survey-view';
import { msg, t } from '@/i18n';
import { AppText, Button, Card, EmptyState, ErrorState, Icon, LoadingState, Notice, Screen } from '@/ui/components';
import { space, usePalette } from '@/ui/theme';

const GAP_ACTION: Record<SurveyGap['action'], { label: string; go: (id: string) => void }> = {
  room: { label: msg('Oda ekle'), go: (id) => router.push({ pathname: '/projects/[id]/room', params: { id } }) },
  photos: { label: msg('Fotoğraf ekle'), go: (id) => router.push({ pathname: '/projects/[id]', params: { id } }) },
  colour: { label: msg('Renk seç'), go: () => router.push('/colour') },
  inspect: { label: msg('Duvarını incele'), go: () => router.push('/inspect') },
  city: { label: msg('Şehir seç'), go: () => router.push('/prices') },
};

/** "Teklif için eksik bilgi": what the painter would otherwise have to ask. */
function Readiness({ gaps, projectId }: { gaps: SurveyGap[]; projectId: string }) {
  const p = usePalette();
  const ready = isReadyForQuote(gaps);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name={ready ? 'checkmark-circle' : 'alert-circle'} color={ready ? p.success : p.accent} />
        <AppText variant="heading" style={{ flex: 1 }}>
          {ready ? t('Ustaya göndermeye hazır') : t('Teklif için eksik bilgi var')}
        </AppText>
      </View>
      {gaps.length === 0 ? <AppText tone="muted">{t('Dosyada ustanın soracağı her şey var.')}</AppText> : null}
      {gaps.map((gap) => (
        <View key={gap.id} style={{ gap: space.xs }}>
          <AppText tone={gap.level === 'missing' ? undefined : 'muted'}>
            {gap.level === 'missing' ? '• ' : '◦ '}
            {gap.text}
          </AppText>
          <Button label={t(GAP_ACTION[gap.action].label)} variant="ghost" icon="arrow-forward" onPress={() => GAP_ACTION[gap.action].go(projectId)} />
        </View>
      ))}
    </Card>
  );
}

/** The homeowner's survey file: rooms, quantities, colours and wall inspections in one place. */
export default function SurveyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const colours = useProjectColours(id);
  const photos = useProjectPhotos(id);
  const inspections = useInspections(id);
  const { remove } = useInspectionActions();
  const share = useShareSurvey(id, { snapshot: true });
  const shareText = useShareSurveyText(id);
  const city = useCity();

  if (project.isPending || inspections.isPending) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (project.isError || inspections.isError) {
    return (
      <Screen edges={['bottom']}>
        <ErrorState
          message={t('Keşif dosyası yüklenemedi.')}
          onRetry={() => {
            project.refetch();
            inspections.refetch();
          }}
        />
      </Screen>
    );
  }

  const model = buildSurvey({
    title: project.data.project.title,
    rooms: project.data.rooms,
    colours: colours.data ?? [],
    inspections: inspections.data,
    photoCount: photos.data?.length ?? 0,
  });
  const addInspection = <Button label={t('Duvar incelemesi ekle')} icon="search" variant="secondary" onPress={() => router.push('/inspect')} />;

  if (isEmptySurvey(model)) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="document-text"
          title={t('Keşif dosyan henüz boş')}
          message={t('Oda ekle, duvarını incele ve renk seç; dosya kendiliğinden dolar. Ustalar bu dosyayla yerinde ölçü almadan teklif hazırlayabilir.')}
        />
        <Button label={t('Oda ekle')} icon="add" onPress={() => router.push({ pathname: '/projects/[id]/room', params: { id } })} />
        {addInspection}
      </Screen>
    );
  }

  const gaps = surveyGaps(model, { hasCity: !city.loading && city.province !== null });
  const floorArea = model.rooms.reduce((sum, r) => sum + r.ceilingArea, 0);
  const litres = model.rooms.reduce((sum, r) => sum + r.litres, 0);

  return (
    <Screen edges={['bottom']}>
      <Readiness gaps={gaps} projectId={id} />
      <SurveyView model={model} onRemoveFinding={(fid) => remove.mutate({ id: fid, projectId: id })} removingId={remove.isPending ? remove.variables?.id : null} />
      {colours.isError ? (
        <Notice tone="accent" icon="warning">
          {t('Renkler yüklenemedi; dosyada renkler eksik görünüyor.')}
        </Notice>
      ) : null}
      {remove.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {remove.error.message}
        </Notice>
      ) : null}
      {model.totals && floorArea > 0 ? (
        <RegionalCostCard kind={model.rooms.length === 1 && floorArea <= 30 ? 'room' : 'home'} floorArea={floorArea} litres={litres} />
      ) : null}
      <Button label={t('PDF olarak paylaş')} icon="document" variant="cta" size="lg" loading={share.isPending} onPress={() => share.mutate(model)} />
      <Button label={t('WhatsApp’ta özet gönder')} icon="logo-whatsapp" variant="secondary" loading={shareText.isPending} onPress={() => shareText.mutate(model)} />
      {shareText.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {shareText.error.message}
        </Notice>
      ) : null}
      {share.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {share.error.message}
        </Notice>
      ) : null}
      <Button label={t('Ustayla paylaş')} icon="share-social" variant="secondary" onPress={() => router.push({ pathname: '/projects/[id]/share', params: { id } })} />
      {addInspection}
    </Screen>
  );
}
