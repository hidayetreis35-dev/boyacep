import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';

import { useSession } from '@/features/account/session';
import { useIsAdmin } from '@/features/admin/api';
import { listProProfiles, setVerification } from '@/features/pros/api';
import { specialtyLabel, VERIFICATION_LABEL } from '@/features/pros/form';
import type { ProProfileRow, VerificationStatus } from '@/lib/database.types';
import { AppText, Badge, Button, Card, EmptyState, ErrorState, LoadingState, Notice, Row, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

const ORDER: Record<VerificationStatus, number> = { pending: 0, unverified: 1, rejected: 2, verified: 3 };

function ProCard({ pro }: { pro: ProProfileRow }) {
  const { db } = useSession();
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: (status: VerificationStatus) => setVerification(db!, pro.user_id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
  return (
    <Card>
      <AppText variant="bodyStrong">{pro.full_name}</AppText>
      {pro.business_name ? <AppText tone="muted">{pro.business_name}</AppText> : null}
      <View style={{ flexDirection: 'row' }}>
        <Badge label={VERIFICATION_LABEL[pro.verification_status]} tone={pro.verification_status === 'pending' ? 'accent' : pro.verification_status === 'verified' ? 'success' : 'muted'} />
      </View>
      <Row label="Bölge" value={[pro.city, pro.districts].filter(Boolean).join(', ')} />
      <Row label="Uzmanlık" value={pro.specialties.map(specialtyLabel).join(', ')} />
      {pro.phone ? <Row label="Telefon" value={pro.phone} /> : null}
      {pro.years_experience !== null ? <Row label="Deneyim" value={`${pro.years_experience} yıl`} /> : null}
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        {pro.verification_status !== 'verified' ? (
          <Button label="Doğrula" icon="shield-checkmark" loading={update.isPending && update.variables === 'verified'} onPress={() => update.mutate('verified')} />
        ) : null}
        {pro.verification_status === 'pending' ? (
          <Button label="Reddet" variant="ghost" disabled={update.isPending} onPress={() => update.mutate('rejected')} />
        ) : null}
        {pro.verification_status === 'verified' ? (
          <Button label="Doğrulamayı kaldır" variant="ghost" loading={update.isPending} onPress={() => update.mutate('unverified')} />
        ) : null}
      </View>
      {update.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {update.error.message}
        </Notice>
      ) : null}
    </Card>
  );
}

export default function AdminProsScreen() {
  const { db, session, loading } = useSession();
  const admin = useIsAdmin();
  const pros = useQuery({ queryKey: ['admin', 'pros'], enabled: !!db && admin.isAdmin, queryFn: () => listProProfiles(db!) });

  if (loading || (session && admin.isPending)) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (!db || !session || !admin.isAdmin) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="lock-closed" title="Yetkin yok" message="Bu sayfayı yalnızca BoyaCep yöneticileri açabilir." />
      </Screen>
    );
  }
  return (
    <Screen edges={['bottom']}>
      <Notice icon="information-circle">
        Doğrulamadan önce ustayla telefonda görüş; kimliğini ve yaptığı işlerden örnekleri kontrol et.
      </Notice>
      {pros.isPending ? (
        <LoadingState />
      ) : pros.isError ? (
        <ErrorState message="Ustalar yüklenemedi." onRetry={() => pros.refetch()} />
      ) : pros.data.length === 0 ? (
        <EmptyState icon="construct" title="Henüz usta profili yok" message="Ustalar profil oluşturdukça burada görünecek." />
      ) : (
        [...pros.data].sort((a, b) => ORDER[a.verification_status] - ORDER[b.verification_status]).map((p) => <ProCard key={p.user_id} pro={p} />)
      )}
    </Screen>
  );
}
