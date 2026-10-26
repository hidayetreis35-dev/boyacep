import { router } from 'expo-router';
import { View } from 'react-native';

import { t } from '@/i18n';
import type { ProjectRow } from '@/lib/database.types';
import { AppText, Badge, Button, Card } from '@/ui/components';
import { space } from '@/ui/theme';

import { STATUS_LABEL } from './mapping';
import { NEXT, StepBar, goToStep, useProjectProgress } from './project-steps';
import { activeProject } from './progress';
import { useProject } from './queries';

function Progress({ project, rooms }: { project: ProjectRow; rooms: number }) {
  const { states, next } = useProjectProgress(project.id, rooms, project.budget);
  const open = () => router.push({ pathname: '/projects/[id]', params: { id: project.id } });
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="overline" tone="muted">
            {t('Devam eden projen')}
          </AppText>
          <AppText variant="heading" numberOfLines={1}>
            {project.title}
          </AppText>
        </View>
        <Badge label={t(STATUS_LABEL[project.status])} tone="primary" />
      </View>
      <StepBar states={states} />
      {next ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="bodyStrong">{t('Sıradaki adım: {step}', { step: t(NEXT[next].title) })}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <Button label={t(NEXT[next].action)} icon={NEXT[next].icon} variant="cta" onPress={() => goToStep(next, project.id)} />
            <Button label={t('Projeyi aç')} variant="ghost" onPress={open} />
          </View>
        </View>
      ) : (
        <Button label={t('Projeyi aç')} icon="arrow-forward" variant="secondary" onPress={open} />
      )}
    </Card>
  );
}

/** The project the user was working on, with its next step. Nothing while loading or when there is none. */
export function ContinueProject({ projects }: { projects: ProjectRow[] }) {
  const project = activeProject(projects);
  const detail = useProject(project?.id ?? '');
  if (!project || !detail.isSuccess) return null;
  return <Progress project={project} rooms={detail.data.rooms.length} />;
}
