import { router } from 'expo-router';

import { useSession } from '@/features/account/session';
import { useIsAdmin } from '@/features/admin/api';
import { topicLabel } from '@/features/ask/api';
import { useOpenQuestions } from '@/features/ask/queries';
import { formatDate } from '@/features/quotes/pdf';
import { t } from '@/i18n';
import { EmptyState, ErrorState, ListItem, LoadingState, Screen } from '@/ui/components';

export default function AdminQuestionsScreen() {
  const { db, session, loading } = useSession();
  const admin = useIsAdmin();
  const questions = useOpenQuestions(admin.isAdmin);

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
      {questions.isPending ? (
        <LoadingState />
      ) : questions.isError ? (
        <ErrorState message={t('Sorular yüklenemedi.')} onRetry={() => questions.refetch()} />
      ) : questions.data.length === 0 ? (
        <EmptyState icon="checkmark-done" title={t('Bekleyen soru yok')} message={t('Yeni sorular burada görünecek.')} />
      ) : (
        questions.data.map((q) => (
          <ListItem
            key={q.id}
            title={q.subject}
            subtitle={`${topicLabel(q.topic)} · ${formatDate(q.updated_at)}`}
            onPress={() => router.push({ pathname: '/ask/[id]', params: { id: q.id } })}
          />
        ))
      )}
    </Screen>
  );
}
