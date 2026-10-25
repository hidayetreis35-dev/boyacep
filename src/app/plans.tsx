import { View } from 'react-native';

import { useSession } from '@/features/account/session';
import { PLAN_FEATURES } from '@/features/plans/api';
import { useMyPlan } from '@/features/plans/queries';
import { AppText, Badge, Card, ErrorState, Icon, LoadingState, Notice, Row, Screen } from '@/ui/components';
import { space, usePalette } from '@/ui/theme';

function PlanCard({ plan, active }: { plan: (typeof PLAN_FEATURES)[keyof typeof PLAN_FEATURES]; active: boolean }) {
  const p = usePalette();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <AppText variant="heading" style={{ flex: 1 }}>
          {plan.title}
        </AppText>
        {active ? <Badge label="Aktif" tone="success" /> : null}
      </View>
      <AppText tone="muted">{plan.price}</AppText>
      {plan.features.map((f) => (
        <View key={f} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Icon name="checkmark-circle" size={20} color={p.primary} />
          <AppText style={{ flex: 1 }}>{f}</AppText>
        </View>
      ))}
    </Card>
  );
}

export default function PlansScreen() {
  const { session } = useSession();
  const plan = useMyPlan();
  return (
    <Screen edges={['bottom']}>
      <AppText variant="title">Planlar</AppText>
      {session ? (
        plan.isPending ? (
          <LoadingState />
        ) : plan.isError ? (
          <ErrorState message="Plan bilgin yüklenemedi." onRetry={() => plan.refetch()} />
        ) : plan.data ? (
          <Card>
            <Row label="Planın" value={plan.data.pro ? 'Pro' : 'Ücretsiz'} strong />
            <Row label="Projeler" value={`${plan.data.projects_used} / ${plan.data.project_limit}`} />
          </Card>
        ) : null
      ) : null}
      <PlanCard plan={PLAN_FEATURES.pro} active={!!plan.data?.pro} />
      <PlanCard plan={PLAN_FEATURES.usta_pro} active={!!plan.data?.usta_pro} />
      <Notice icon="time">
        Satın alma henüz açık değil. Kapalı beta süresince Boya Hesapla, rehberler ve teklifler ücretsiz. Fiyatlar beta sonunda belli olacak.
      </Notice>
    </Screen>
  );
}
