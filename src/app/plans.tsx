import { StyleSheet, View } from 'react-native';

import { useSession } from '@/features/account/session';
import { PLAN_FEATURES } from '@/features/plans/api';
import { useMyPlan } from '@/features/plans/queries';
import { t } from '@/i18n';
import { FeatureHeader, IconBubble } from '@/ui/brand';
import { AppText, Badge, Card, ErrorState, Icon, LoadingState, Notice, Row, Screen, type IconName } from '@/ui/components';
import { radius, shadowOf, space, useFeatureColour, usePalette, type FeatureKey } from '@/ui/theme';

function PlanCard({
  plan,
  active,
  feature,
  icon,
}: {
  plan: (typeof PLAN_FEATURES)[keyof typeof PLAN_FEATURES];
  active: boolean;
  feature: FeatureKey;
  icon: IconName;
}) {
  const p = usePalette();
  const f = useFeatureColour(feature);
  return (
    <View style={[styles.card, { backgroundColor: p.surface, borderColor: active ? f.base : p.border, borderWidth: active ? 2 : StyleSheet.hairlineWidth }, shadowOf(p)]}>
      <View style={[styles.head, { backgroundColor: f.soft }]}>
        <IconBubble icon={icon} feature={feature} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" style={{ color: f.ink }}>
            {t(plan.title)}
          </AppText>
          <AppText variant="small" style={{ color: f.ink, opacity: 0.85 }}>
            {t(plan.price)}
          </AppText>
        </View>
        {active ? <Badge label={t('Aktif')} tone="success" /> : null}
      </View>
      <View style={{ gap: space.sm, padding: space.lg }}>
        {plan.features.map((item) => (
          <View key={item} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <Icon name="checkmark-circle" size={20} color={f.base} />
            <AppText style={{ flex: 1 }}>{t(item)}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PlansScreen() {
  const { session } = useSession();
  const plan = useMyPlan();
  return (
    <Screen edges={['bottom']}>
      <FeatureHeader feature="projects" icon="star" title={t('Planlar')} subtitle={t('Ücretsiz başla, ihtiyacın olunca yükselt.')} />
      {session ? (
        plan.isPending ? (
          <LoadingState />
        ) : plan.isError ? (
          <ErrorState message={t('Plan bilgin yüklenemedi.')} onRetry={() => plan.refetch()} />
        ) : plan.data ? (
          <Card>
            <Row label={t('Planın')} value={plan.data.pro ? 'Pro' : t('Ücretsiz')} strong />
            <Row label={t('Projeler')} value={`${plan.data.projects_used} / ${plan.data.project_limit}`} />
          </Card>
        ) : null
      ) : null}
      <PlanCard plan={PLAN_FEATURES.pro} active={!!plan.data?.pro} feature="color" icon="home" />
      <PlanCard plan={PLAN_FEATURES.usta_pro} active={!!plan.data?.usta_pro} feature="cost" icon="construct" />
      <Notice icon="time">
        {t('Satın alma henüz açık değil. Kapalı beta süresince boya hesabı, rehberler ve teklifler ücretsiz. Fiyatlar beta sonunda belli olacak.')}
      </Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
});
