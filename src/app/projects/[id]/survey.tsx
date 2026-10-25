import { router, useLocalSearchParams } from 'expo-router';

import { useProjectColours } from '@/features/colour/project-colours';
import { useProjectPhotos } from '@/features/photos/queries';
import { useProject } from '@/features/projects/queries';
import { buildSurvey, isEmptySurvey } from '@/features/survey/model';
import { useInspectionActions, useInspections, useShareSurvey } from '@/features/survey/queries';
import { SurveyView } from '@/features/survey/survey-view';
import { Button, EmptyState, ErrorState, LoadingState, Notice, Screen } from '@/ui/components';

/** The homeowner's survey file: rooms, quantities, colours and wall inspections in one place. */
export default function SurveyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const colours = useProjectColours(id);
  const photos = useProjectPhotos(id);
  const inspections = useInspections(id);
  const { remove } = useInspectionActions();
  const share = useShareSurvey(id, { snapshot: true });

  if (project.isPending || inspections.isPending) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (project.isError || inspections.isError) {
    return (
      <Screen edges={['bottom']}>
        <ErrorState
          message="Keşif dosyası yüklenemedi."
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
  const addInspection = <Button label="Duvar incelemesi ekle" icon="search" variant="secondary" onPress={() => router.push('/inspect')} />;

  if (isEmptySurvey(model)) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="document-text"
          title="Keşif dosyan henüz boş"
          message="Oda ekle, duvarını incele ve renk seç; dosya kendiliğinden dolar. Ustalar bu dosyayla yerinde ölçü almadan teklif hazırlayabilir."
        />
        <Button label="Oda ekle" icon="add" onPress={() => router.push({ pathname: '/projects/[id]/room', params: { id } })} />
        {addInspection}
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <SurveyView model={model} onRemoveFinding={(fid) => remove.mutate({ id: fid, projectId: id })} removingId={remove.isPending ? remove.variables?.id : null} />
      {colours.isError ? (
        <Notice tone="accent" icon="warning">
          Renkler yüklenemedi; dosyada renkler eksik görünüyor.
        </Notice>
      ) : null}
      {remove.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {remove.error.message}
        </Notice>
      ) : null}
      <Button label="PDF olarak paylaş" icon="document" variant="cta" size="lg" loading={share.isPending} onPress={() => share.mutate(model)} />
      {share.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {share.error.message}
        </Notice>
      ) : null}
      <Button label="Ustayla paylaş" icon="share-social" variant="secondary" onPress={() => router.push({ pathname: '/projects/[id]/share', params: { id } })} />
      {addInspection}
    </Screen>
  );
}
