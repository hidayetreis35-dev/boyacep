import { Stack, useLocalSearchParams } from 'expo-router';

import { useProjectColours } from '@/features/colour/project-colours';
import { useProjectPhotos } from '@/features/photos/queries';
import { useSharedProject, useSharedProjects } from '@/features/sharing/queries';
import { buildSurvey } from '@/features/survey/model';
import { useInspections, useShareSurvey } from '@/features/survey/queries';
import { SurveyView } from '@/features/survey/survey-view';
import { Button, EmptyState, ErrorState, LoadingState, Notice, Screen } from '@/ui/components';

/** The survey file as a painter who joined the project sees it (no budget or costs). */
export default function SharedSurveyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useSharedProjects();
  const data = useSharedProject(id);
  const colours = useProjectColours(id);
  const photos = useProjectPhotos(id);
  const inspections = useInspections(id);
  const share = useShareSurvey(id, { snapshot: false });

  if (list.isPending || data.isPending || inspections.isPending) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (list.isError || data.isError || inspections.isError) {
    return (
      <Screen edges={['bottom']}>
        <ErrorState
          message="Keşif dosyası yüklenemedi."
          onRetry={() => {
            list.refetch();
            data.refetch();
            inspections.refetch();
          }}
        />
      </Screen>
    );
  }
  const meta = list.data.find((p) => p.id === id);
  if (!meta) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="lock-closed" title="Bu projeye erişimin yok" message="Ev sahibi paylaşımı kaldırmış olabilir. Yeni bir kod isteyebilirsin." />
      </Screen>
    );
  }

  const model = buildSurvey({
    title: meta.title,
    ownerName: meta.owner_name,
    rooms: data.data.rooms,
    colours: colours.data ?? [],
    inspections: inspections.data,
    photoCount: photos.data?.length ?? 0,
  });

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Keşif dosyası' }} />
      <SurveyView model={model} />
      <Button label="PDF olarak paylaş" icon="document" variant="secondary" loading={share.isPending} onPress={() => share.mutate(model)} />
      {share.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {share.error.message}
        </Notice>
      ) : null}
    </Screen>
  );
}
