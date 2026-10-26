import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useProjectColours } from '@/features/colour/project-colours';
import { useCosts, useMaterials } from '@/features/materials/queries';
import { useProjectSharing } from '@/features/sharing/queries';
import { useLatestSnapshot } from '@/features/survey/queries';
import { msg, t } from '@/i18n';
import { AppText, Button, Card, Icon, type IconName } from '@/ui/components';
import { fonts, radius, space, useFeatureColour, usePalette } from '@/ui/theme';

import { isReadyProject, nextStep, PROJECT_STEPS, STEP_LABEL, stepStates, type ProjectStep, type StepState } from './progress';

const NEXT: Record<ProjectStep, { title: string; action: string; icon: IconName }> = {
  measure: { title: msg('Odalarını ölç'), action: msg('Oda ekle'), icon: 'add-circle' },
  materials: { title: msg('Malzeme listeni çıkar'), action: msg('Malzeme listesi'), icon: 'list' },
  colour: { title: msg('Rengini seç'), action: msg('Renk Stüdyosu'), icon: 'color-palette' },
  budget: { title: msg('Bütçeni yaz'), action: msg('Akıllı Bütçe'), icon: 'wallet' },
  file: { title: msg('Keşif dosyasını ustaya gönder'), action: msg('Keşif dosyası'), icon: 'document-text' },
};

function go(step: ProjectStep, id: string) {
  if (step === 'measure') router.push({ pathname: '/projects/[id]/room', params: { id } });
  else if (step === 'materials') router.push({ pathname: '/projects/[id]/cost', params: { id } });
  else if (step === 'budget') router.push({ pathname: '/projects/[id]/budget', params: { id } });
  else if (step === 'colour') router.push('/colour');
  else router.push({ pathname: '/projects/[id]/survey', params: { id } });
}

function count(query: { data?: unknown[]; isSuccess: boolean }): number | null {
  return query.isSuccess ? (query.data?.length ?? 0) : null;
}

function StepDot({ state, label, index }: { state: StepState; label: string; index: number }) {
  const p = usePalette();
  const f = useFeatureColour('projects');
  const done = state === 'done';
  return (
    <View style={styles.step} accessibilityLabel={done ? t('{step}: tamam', { step: label }) : t('{step}: yapılacak', { step: label })}>
      <View style={[styles.dot, { backgroundColor: done ? f.base : p.surface, borderColor: done ? f.base : p.border }]}>
        {done ? (
          <Icon name="checkmark" size={16} color="#FFFFFF" />
        ) : (
          <AppText variant="caption" tone="muted" style={{ fontFamily: fonts.bold }}>
            {String(index + 1)}
          </AppText>
        )}
      </View>
      <AppText variant="caption" tone={done ? undefined : 'muted'} style={{ fontFamily: done ? fonts.bold : fonts.medium }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

/** Ölç → Malzeme → Renk → Bütçe → Dosya, with the next thing to do. */
export function ProjectSteps({ projectId, rooms, budget }: { projectId: string; rooms: number; budget: number | null }) {
  const materials = useMaterials(projectId);
  const costs = useCosts(projectId);
  const colours = useProjectColours(projectId);
  const sharing = useProjectSharing(projectId);
  const snapshot = useLatestSnapshot(projectId);

  const invited = sharing.isSuccess ? sharing.data.invites.length + sharing.data.members.length > 0 : null;
  const shared = snapshot.isSuccess && snapshot.data ? true : invited === true ? true : snapshot.isSuccess && invited === false ? false : null;
  const states = stepStates({ rooms, materials: count(materials), colours: count(colours), budget, costs: count(costs), shared });
  const next = nextStep(states);
  const ready = isReadyProject(states);
  const done = PROJECT_STEPS.filter((s) => states[s] === 'done').length;

  return (
    <Card>
      <View style={styles.bar} testID="project-steps">
        {PROJECT_STEPS.map((step, i) => (
          <StepDot key={step} state={states[step]} label={t(STEP_LABEL[step])} index={i} />
        ))}
      </View>
      {next ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="bodyStrong">{t('Sıradaki adım: {step}', { step: t(NEXT[next].title) })}</AppText>
          <Button label={t(NEXT[next].action)} icon={NEXT[next].icon} variant="secondary" onPress={() => go(next, projectId)} />
        </View>
      ) : ready ? (
        <AppText tone="muted">
          {done === PROJECT_STEPS.length
            ? t('Projen hazır. Gelen teklifleri aşağıda karşılaştırabilirsin.')
            : t('Projen ustaya hazır. İstersen renk de ekleyebilirsin.')}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-between', gap: space.xs },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 30, height: 30, borderRadius: radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
