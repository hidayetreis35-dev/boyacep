import { router } from 'expo-router';

import { useProjectColours } from '@/features/colour/project-colours';
import { t } from '@/i18n';
import { AppText, Button, Card, Notice } from '@/ui/components';

import { draftsFromProject } from './form';
import { useHomeLogActions } from './queries';

/** Shown on a finished project: keep its colours in Ev Hafızası. */
export function SaveToHomeLog({ project }: { project: { id: string; title: string } }) {
  const colours = useProjectColours(project.id);
  const { add } = useHomeLogActions();
  const list = colours.data ?? [];

  const save = () => {
    if (list.length === 0) {
      router.push({ pathname: '/home-log', params: { projectId: project.id, place: project.title } });
      return;
    }
    add.mutate(draftsFromProject(project, list), { onSuccess: () => router.push('/home-log') });
  };

  return (
    <Card>
      <AppText variant="heading">{t('Proje bitti. Renkleri sakla')}</AppText>
      <AppText tone="muted">{t('Ev Hafızası’na eklersen yıllar sonra rötuş yaparken aynı rengi ve ürünü bulursun.')}</AppText>
      <Button
        label={list.length > 0 ? t('{count} rengi Ev Hafızası’na ekle', { count: list.length }) : t('Ev Hafızası’na ekle')}
        icon="bookmark"
        variant="cta"
        loading={add.isPending}
        onPress={save}
      />
      {add.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {add.error.message}
        </Notice>
      ) : null}
    </Card>
  );
}
