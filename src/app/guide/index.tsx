import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useSession } from '@/features/account/session';
import { categoryLabel, GUIDE_CATEGORIES, useGuides, type GuideListItem } from '@/features/guide/api';
import { AppText, EmptyState, ErrorState, Icon, LoadingState, Screen } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

function GuideCard({ guide }: { guide: GuideListItem }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={guide.title}
      onPress={() => router.push({ pathname: '/guide/[slug]', params: { slug: guide.slug } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: p.border,
        backgroundColor: pressed ? p.surfaceMuted : p.surface,
      })}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{guide.title}</AppText>
        {guide.summary ? (
          <AppText variant="small" tone="muted">
            {guide.summary}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="muted">
          {guide.reading_minutes} dk okuma
        </AppText>
      </View>
      <Icon name="chevron-forward" color={p.textMuted} />
    </Pressable>
  );
}

export default function GuideIndexScreen() {
  const { db } = useSession();
  const guides = useGuides();

  if (!db) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="cloud-offline" title="Rehber şu an açılamıyor" message="Rehber içerikleri sunucudan gelir; sunucu bağlantısı kurulunca burada görünecek." />
      </Screen>
    );
  }
  if (guides.isPending) return <Screen edges={['bottom']}><LoadingState label="Rehber yükleniyor…" /></Screen>;
  if (guides.isError) {
    return <Screen edges={['bottom']}><ErrorState message="Rehber yüklenemedi. İnternet bağlantını kontrol et." onRetry={() => guides.refetch()} /></Screen>;
  }
  if (guides.data.length === 0) {
    return <Screen edges={['bottom']}><EmptyState icon="book" title="Henüz yazı yok" message="Rehber yazıları yakında eklenecek." /></Screen>;
  }

  return (
    <Screen edges={['bottom']}>
      {GUIDE_CATEGORIES.map(({ value }) => {
        const items = guides.data.filter((g) => g.category === value);
        if (items.length === 0) return null;
        return (
          <View key={value} style={{ gap: space.sm }}>
            <AppText variant="heading" accessibilityRole="header">
              {categoryLabel(value)}
            </AppText>
            {items.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </View>
        );
      })}
    </Screen>
  );
}
