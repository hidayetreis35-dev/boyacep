import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useSession } from '@/features/account/session';
import { useAdminGuides, useAdminStats, useIsAdmin, useRecentErrors, type AdminGuideItem } from '@/features/admin/api';
import { categoryLabel } from '@/features/guide/api';
import { formatDate } from '@/features/quotes/pdf';
import { t } from '@/i18n';
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
      accessibilityLabel={t('{title} düzenle', { title: guide.title })}
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
          <Badge label={guide.status === 'published' ? t('Yayında') : t('Taslak')} tone={guide.status === 'published' ? 'success' : 'accent'} />
          <Badge label={categoryLabel(guide.category)} />
        </View>
      </View>
      <Icon name="create-outline" color={p.textMuted} />
    </Pressable>
  );
}

function RecentErrors() {
  const errors = useRecentErrors(true);
  return (
    <>
      <AppText variant="heading" accessibilityRole="header">
        {t('Son hata kayıtları')}
      </AppText>
      {errors.isPending ? (
        <LoadingState />
      ) : errors.isError ? (
        <ErrorState message={t('Hata kayıtları yüklenemedi.')} onRetry={() => errors.refetch()} />
      ) : errors.data.length === 0 ? (
        <AppText tone="muted">{t('Kayıtlı hata yok.')}</AppText>
      ) : (
        errors.data.map((e) => (
          <Card key={e.id}>
            <AppText variant="bodyStrong">{e.message}</AppText>
            <AppText variant="caption" tone="muted">
              {[formatDate(e.created_at), e.platform, e.screen, e.app_version].filter(Boolean).join(' · ')}
            </AppText>
          </Card>
        ))
      )}
    </>
  );
}

function AdminDashboard() {
  const stats = useAdminStats(true);
  const guides = useAdminGuides(true);

  return (
    <>
      <AppText variant="heading" accessibilityRole="header">
        {t('Genel durum')}
      </AppText>
      {stats.isError ? (
        <ErrorState message={t('Sayılar yüklenemedi.')} onRetry={() => stats.refetch()} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Stat label={t('Kullanıcı')} value={stats.data?.users} />
          <Stat label={t('Usta')} value={stats.data?.pros} />
          <Stat label={t('Proje')} value={stats.data?.projects} />
          <Stat label={t('Oda')} value={stats.data?.rooms} />
          <Stat label={t('Yayındaki yazı')} value={stats.data?.published_guides} />
          <Stat label={t('Gönderilen teklif')} value={stats.data?.quotes} />
          <Stat label={t('Doğrulama bekleyen usta')} value={stats.data?.pending_pros} />
          <Stat label={t('Yanıt bekleyen soru')} value={stats.data?.open_questions} />
        </View>
      )}
      <Button label={t('Usta doğrulama')} icon="shield-checkmark" variant="secondary" onPress={() => router.push('/admin/pros')} />
      <Button label={t('Ustaya Sor: bekleyen sorular')} icon="chatbubbles" variant="secondary" onPress={() => router.push('/admin/questions')} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
        <AppText variant="heading" accessibilityRole="header">
          {t('Rehber yazıları')}
        </AppText>
      </View>
      <Button label={t('Yeni yazı')} icon="add" onPress={() => router.push({ pathname: '/admin/guide/[id]', params: { id: 'new' } })} />
      {guides.isPending ? (
        <LoadingState />
      ) : guides.isError ? (
        <ErrorState message={t('Yazılar yüklenemedi.')} onRetry={() => guides.refetch()} />
      ) : guides.data.length === 0 ? (
        <EmptyState icon="document-text" title={t('Henüz yazı yok')} message={t('İlk rehber yazısını eklemek için Yeni yazı\'ya bas.')} />
      ) : (
        guides.data.map((g) => <GuideRow key={g.id} guide={g} />)
      )}
      <RecentErrors />
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
        <EmptyState icon="lock-closed" title={t('Yetkin yok')} message={t('Bu sayfayı yalnızca BoyaCep yöneticileri açabilir.')} />
      </Screen>
    );
  }
  return (
    <Screen edges={['bottom']}>
      <AdminDashboard />
    </Screen>
  );
}
