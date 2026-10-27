import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SERVICE_CATEGORIES, type ServiceCategory } from '@/features/home/actions';
import { msg, t, toLower } from '@/i18n';
import { SectionTitle } from '@/ui/brand';
import { AppText, Badge, Button, Card, Icon, Screen, TextField, type IconName } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { QuickAction } from '@/ui/showcase';
import { fonts, radius, shadowOf, space, useFeatureColour, usePalette, type FeatureKey } from '@/ui/theme';

/** Keşfet gathers the places to look things up: colours, guides, prices and questions. */
const EXPLORE: { title: string; hint: string; icon: IconName; feature: FeatureKey; href: Href }[] = [
  { title: msg('Renk Stüdyosu'), hint: msg('Renkleri keşfet, odanda dene'), icon: 'color-palette', feature: 'color', href: '/colour' },
  { title: msg('Boya Rehberi'), hint: msg('Ustadan adım adım'), icon: 'book', feature: 'guide', href: '/guide' },
  { title: msg('Boya Fiyatları'), hint: msg('Şehrinde ne kadar tutar?'), icon: 'stats-chart', feature: 'cost', href: '/prices' },
  { title: msg('Ustaya Sor'), hint: msg('Aklına takılanı sor'), icon: 'chatbubbles', feature: 'ask', href: '/ask' },
];

function CategoryTile({ category, onPress }: { category: ServiceCategory | null; onPress: () => void }) {
  const p = usePalette();
  const f = useFeatureColour('calculate');
  const title = category ? t(category.title) : t('Tümü');
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={category && !category.open ? t('{title}, yakında', { title }) : title}
      onPress={onPress}
      style={[styles.tile, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
      <View style={[styles.tileIcon, { backgroundColor: category?.open === false ? p.surfaceMuted : f.soft }]}>
        <Icon name={category?.icon ?? 'apps'} size={22} color={category?.open === false ? p.textMuted : f.base} />
      </View>
      <AppText variant="caption" numberOfLines={1} style={{ fontFamily: fonts.semibold, textAlign: 'center' }}>
        {title}
      </AppText>
      {category && !category.open ? (
        <AppText variant="caption" tone="muted" style={{ fontSize: 10, lineHeight: 12 }}>
          {t('Yakında')}
        </AppText>
      ) : null}
    </PressableScale>
  );
}

/** What works today for finding a painter, step by step. */
function PainterSteps() {
  const p = usePalette();
  const steps = [
    { icon: 'resize' as const, text: t('Projeni oluştur, odalarını ölç.') },
    { icon: 'document-text' as const, text: t('Keşif dosyasını ustana WhatsApp’tan gönder; herkes aynı ölçüye teklif versin.') },
    { icon: 'git-compare' as const, text: t('Gelen teklifleri şehrindeki fiyat aralığıyla karşılaştır.') },
  ];
  return (
    <Card>
      <AppText variant="heading">{t('Boya ustası bulmanın en kolay yolu')}</AppText>
      {steps.map((s, i) => (
        <View key={s.icon} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <View style={[styles.stepNo, { backgroundColor: p.primary }]}>
            <AppText variant="caption" style={{ color: p.onPrimary, fontFamily: fonts.bold }}>
              {String(i + 1)}
            </AppText>
          </View>
          <AppText style={{ flex: 1 }}>{s.text}</AppText>
        </View>
      ))}
      <Button label={t('Keşif dosyası hazırla')} icon="document-text" variant="cta" onPress={() => router.push('/projects')} />
      <Button label={t('Şehrindeki usta fiyatları')} icon="stats-chart" variant="secondary" onPress={() => router.push('/prices')} />
      <Button label={t('Ustaya Sor')} icon="chatbubbles" variant="ghost" onPress={() => router.push('/ask')} />
    </Card>
  );
}

export default function ServicesScreen() {
  const p = usePalette();
  const [query, setQuery] = useState('');
  const q = toLower(query.trim());
  const shown = q ? SERVICE_CATEGORIES.filter((c) => toLower(t(c.title)).includes(q)) : SERVICE_CATEGORIES;

  const open = (c: ServiceCategory) =>
    c.open ? undefined : router.push({ pathname: '/soon/[feature]', params: { feature: c.key } });

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <AppText variant="title" accessibilityRole="header">
          {t('Keşfet')}
        </AppText>
        <AppText tone="muted">{t('Renk, rehber, fiyat ve usta: hepsi burada.')}</AppText>
      </View>
      <View style={styles.exploreGrid}>
        {EXPLORE.map((e) => (
          <View key={e.title} style={styles.exploreCell}>
            <QuickAction title={t(e.title)} hint={t(e.hint)} icon={e.icon} feature={e.feature} onPress={() => router.push(e.href)} />
          </View>
        ))}
      </View>
      <SectionTitle title={t('Usta Bul')} />
      <TextField label={t('Ara')} placeholder={t('Hangi hizmeti arıyorsun?')} value={query} onChangeText={setQuery} testID="service-search" />
      <View style={styles.grid}>
        {shown.map((c) => (
          <View key={c.key} style={styles.cell}>
            <CategoryTile category={c} onPress={() => open(c)} />
          </View>
        ))}
        {q ? (
          <View style={styles.cell}>
            <CategoryTile category={null} onPress={() => setQuery('')} />
          </View>
        ) : null}
      </View>
      {shown.length === 0 ? <AppText tone="muted">{t('Bu adla bir hizmet bulamadık.')}</AppText> : null}

      <PainterSteps />

      <SectionTitle title={t('Yakındaki Ustalar')} />
      <Card>
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Icon name="people" size={26} color={p.textMuted} />
          <AppText tone="muted" style={{ flex: 1 }}>
            {t('Usta listesi henüz açılmadı. Doğrulanmış boya ustaları katıldıkça burada puanları ve yorumlarıyla görünecek.')}
          </AppText>
        </View>
        <Badge label={t('Yakında')} />
      </Card>

      <Card>
        <AppText variant="heading">{t('Usta mısın?')}</AppText>
        <AppText tone="muted">{t('Profilini oluştur, ev sahiplerinin paylaştığı projeleri gör ve PDF teklif hazırla.')}</AppText>
        <Button label={t('Usta Paneli')} icon="construct" variant="secondary" onPress={() => router.push('/usta')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  exploreGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -space.xs - 1 },
  exploreCell: { width: '50%', padding: space.xs + 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -space.xs },
  cell: { width: '25%', padding: space.xs },
  tile: { alignItems: 'center', gap: 4, paddingVertical: space.md, paddingHorizontal: 2, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, minHeight: 96 },
  tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNo: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
