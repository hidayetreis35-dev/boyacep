import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useSession } from '@/features/account/session';
import { useAdminGuides, useAdminStats, useIsAdmin, type AdminGuideItem } from '@/features/admin/api';
import { categoryLabel } from '@/features/guide/api';
import { AppText, Badge, Button, Card, EmptyState, ErrorState, Icon, LoadingState, Screen } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: 140, gap: 2 }}>
      <AppText variant="title">{value ?? '–'}</AppText>
      <AppText variant="small" tone="muted">
        {label}
      </AppText>
    </Card>
  );
}

function GuideRow({ guide }: { guide: AdminGuideItem }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${guide.title} düzenle`}
      onPress={() => router.push({ pathname: '/admin/guide/[id]', params: { id: guide.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: p.border,
        backgroundColor: pressed ? p.surfaceMuted : p.surface,
      })}>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="bodyStrong">{guide.title}</AppText>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Badge label={guide.status === 'published' ? 'Yayında' : 'Taslak'} tone={guide.status === 'published' ? 'success' : 'accent'} />
          <Badge label={categoryLabel(guide.category)} />
        </View>
      </View>
      <Icon name="create-outline" color={p.textMuted} />
    </Pressable>
  );
}

function AdminDashboard() {
  const stats = useAdminStats(true);
  const guides = useAdminGuides(true);

  return (
    <>
      <AppText variant="heading" accessibilityRole="header">
        Genel durum
      </AppText>
      {stats.isError ? (
        <ErrorState message="Sayılar yüklenemedi." onRetry={() => stats.refetch()} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Stat label="Kullanıcı" value={stats.data?.users} />
          <Stat label="Usta" value={stats.data?.pros} />
          <Stat label="Proje" value={stats.data?.projects} />
          <Stat label="Oda" value={stats.data?.rooms} />
          <Stat label="Yayındaki yazı" value={stats.data?.published_guides} />
          <Stat label="Gönderilen teklif" value={stats.data?.quotes} />
          <Stat label="Doğrulama bekleyen usta" value={stats.data?.pending_pros} />
        </View>
      )}
      <Button label="Usta doğrulama" icon="shield-checkmark" variant="secondary" onPress={() => router.push('/admin/pros')} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
        <AppText variant="heading" accessibilityRole="header">
          Rehber yazıları
        </AppText>
      </View>
      <Button label="Yeni yazı" icon="add" onPress={() => router.push({ pathname: '/admin/guide/[id]', params: { id: 'new' } })} />
      {guides.isPending ? (
        <LoadingState />
      ) : guides.isError ? (
        <ErrorState message="Yazılar yüklenemedi." onRetry={() => guides.refetch()} />
      ) : guides.data.length === 0 ? (
        <EmptyState icon="document-text" title="Henüz yazı yok" message="İlk rehber yazısını eklemek için Yeni yazı'ya bas." />
      ) : (
        guides.data.map((g) => <GuideRow key={g.id} guide={g} />)
      )}
    </>
  );
}

export default function AdminScreen() {
  const { db, session, loading } = useSession();
  const admin = useIsAdmin();

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
      <AdminDashboard />
    </Screen>
  );
}
