import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { categoryLabel, useGuide } from '@/features/guide/api';
import { ArticleBody } from '@/features/guide/article-body';
import { t } from '@/i18n';
import { AppText, Badge, ErrorState, LoadingState, Notice, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

export default function GuideArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const guide = useGuide(slug);

  if (guide.isPending) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (guide.isError) {
    return <Screen edges={['bottom']}><ErrorState message={t('Bu yazı bulunamadı ya da yüklenemedi.')} onRetry={() => guide.refetch()} /></Screen>;
  }

  const g = guide.data;
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: g.title }} />
      <View style={{ gap: space.sm }}>
        <Badge label={categoryLabel(g.category)} tone="primary" />
        <AppText variant="title">{g.title}</AppText>
        {g.status === 'draft' ? <Badge label={t('Taslak: sadece yöneticiler görür')} tone="accent" /> : null}
      </View>
      <ArticleBody body={g.body} />
      <Notice icon="information-circle">
        {t('Bu rehber genel bilgi verir. Ürünün teknik föyündeki talimatlar her zaman önceliklidir. Nem, büyük çatlak ya da yüksekte çalışma gibi durumlarda bir uzmana danış.')}
      </Notice>
    </Screen>
  );
}
