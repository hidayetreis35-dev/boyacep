import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/features/account/session';
import { categoryLabel, GUIDE_CATEGORIES, useGuides, type GuideListItem } from '@/features/guide/api';
import { getLocale, t } from '@/i18n';
import type { GuideCategory } from '@/lib/database.types';
import { FeatureHeader, IconBubble, SectionTitle } from '@/ui/brand';
import { AppText, EmptyState, ErrorState, Icon, LoadingState, Notice, Screen, type IconName } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { radius, shadowOf, space, usePalette } from '@/ui/theme';

const CATEGORY_ICON: Record<GuideCategory, IconName> = {
  preparation: 'clipboard',
  primer: 'water',
  filler_sanding: 'construct',
  ceiling: 'arrow-up-circle',
  walls: 'square',
  tools: 'brush',
  mistakes: 'alert-circle',
  exterior: 'business',
  materials: 'cube',
};

function GuideCard({ guide }: { guide: GuideListItem }) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={guide.title}
      onPress={() => router.push({ pathname: '/guide/[slug]', params: { slug: guide.slug } })}
      style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
      <IconBubble icon={CATEGORY_ICON[guide.category] ?? 'book'} feature="guide" size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{guide.title}</AppText>
        {guide.summary ? (
          <AppText variant="small" tone="muted" numberOfLines={2}>
            {guide.summary}
          </AppText>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Icon name="time-outline" size={14} color={p.textMuted} />
          <AppText variant="caption" tone="muted">
            {t('{reading_minutes} dk okuma', { reading_minutes: guide.reading_minutes })}
          </AppText>
        </View>
      </View>
      <Icon name="chevron-forward" color={p.textMuted} />
    </PressableScale>
  );
}

export default function GuideIndexScreen() {
  const { db } = useSession();
  const guides = useGuides();

  if (!db) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="cloud-offline" title={t('Rehber şu an açılamıyor')} message={t('Rehber içerikleri sunucudan gelir; sunucu bağlantısı kurulunca burada görünecek.')} />
      </Screen>
    );
  }
  if (guides.isPending) return <Screen edges={['bottom']}><LoadingState label={t('Rehber yükleniyor…')} /></Screen>;
  if (guides.isError) {
    return <Screen edges={['bottom']}><ErrorState message={t('Rehber yüklenemedi. İnternet bağlantını kontrol et.')} onRetry={() => guides.refetch()} /></Screen>;
  }
  if (guides.data.length === 0) {
    return <Screen edges={['bottom']}><EmptyState icon="book" title={t('Henüz yazı yok')} message={t('Rehber yazıları yakında eklenecek.')} /></Screen>;
  }

  return (
    <Screen edges={['bottom']}>
      <FeatureHeader feature="guide" icon="book" title={t('Boya Rehberi')} subtitle={t('Ustaların bildiklerini adım adım öğren.')} />
      {getLocale() === 'tr' ? null : <Notice icon="language">{t('Rehber yazıları şimdilik yalnızca Türkçe.')}</Notice>}
      {GUIDE_CATEGORIES.map(({ value }) => {
        const items = guides.data.filter((g) => g.category === value);
        if (items.length === 0) return null;
        return (
          <View key={value} style={{ gap: space.sm }}>
            <SectionTitle title={categoryLabel(value)} />
            {items.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
});
