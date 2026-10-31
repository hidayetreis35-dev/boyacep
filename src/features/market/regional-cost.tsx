import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { addRanges, type RangeEstimate } from '@/engine';
import { t } from '@/i18n';
import { AppText, Button, Icon, Row, type IconName } from '@/ui/components';
import { fonts, radius, space, usePalette } from '@/ui/theme';

import { useCity } from './city';
import { FallbackNotice, placeName, QualityBadge, StaleNotice } from './components';
import { formatLiraRange, formatResearchDate } from './format';
import { homeTotal, marketReference, paintCost, shownRange } from './regional';
import { MATERIAL_PRICES, sourceName } from './sources';

/** One side of the comparison: who paints, roughly what it costs, and what that covers. */
function Side({ icon, title, amount, note, tint, ink, testID }: { icon: IconName; title: string; amount: RangeEstimate | null; note: string; tint: string; ink: string; testID: string }) {
  return (
    <View style={[styles.side, { backgroundColor: tint }]} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <Icon name={icon} size={16} color={ink} />
        <AppText variant="caption" style={{ color: ink, fontFamily: fonts.bold }}>
          {title}
        </AppText>
      </View>
      <AppText variant="cardTitle" style={{ fontFamily: fonts.extrabold, fontSize: 18, lineHeight: 24 }}>
        {amount ? formatLiraRange(amount) : t('Yeterli veri yok')}
      </AppText>
      <AppText variant="caption" tone="muted">
        {note}
      </AppText>
    </View>
  );
}

/**
 * Calculator results: painting it yourself (paint at shop prices) next to
 * hiring a painter (labour from the city's market reference plus paint).
 * Both are references, never a quote; the difference is the labour.
 */
export function RegionalCostCard({ floorArea, litres, kind }: { floorArea: number; litres: number; kind: 'home' | 'room' }) {
  const p = usePalette();
  const city = useCity();
  if (city.loading) return null;

  const reference = marketReference(city.province, 'labour', kind === 'home' ? 'perM2' : 'room');
  const labour: RangeEstimate | null = kind === 'home' ? homeTotal(reference, floorArea) : shownRange(reference);
  const paint = paintCost(litres);
  const total = addRanges(labour, paint);
  const sources = [...new Set([...reference.sources, ...MATERIAL_PRICES.interior_paint.sources])].map(sourceName);

  return (
    <View style={[styles.card, { borderColor: p.border, backgroundColor: p.surface }]} testID="regional-cost">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name="stats-chart" size={18} color={p.teal} />
        <AppText variant="overline" style={{ color: p.teal, flex: 1 }}>
          {t('Piyasa referansı')}
        </AppText>
        <QualityBadge reference={reference} />
      </View>
      <AppText variant="heading">{t('Kendin yap mı, usta mı?')}</AppText>
      <AppText variant="small" tone="muted">
        {t('{place} fiyatlarıyla', { place: placeName(reference.code) })}
      </AppText>
      <FallbackNotice reference={reference} chosen={city.province} />
      <StaleNotice asOf={reference.asOf} />
      <View style={styles.sides}>
        <Side
          icon="brush"
          title={t('Kendin yaparsan')}
          amount={paint}
          note={t('Boya, mağaza fiyatıyla. Emek senden.')}
          tint={p.sageSoft}
          ink={p.sageInk}
          testID="diy-cost"
        />
        <Side
          icon="person"
          title={t('Ustayla')}
          amount={total}
          note={t('İşçilik ve boya birlikte.')}
          tint={p.primarySoft}
          ink={p.primary}
          testID="pro-cost"
        />
      </View>
      <Row label={t('Aradaki fark: usta işçiliği')} value={labour ? formatLiraRange(labour) : t('Yeterli veri yok')} />
      <AppText variant="caption" tone="muted">
        {t('Astar, macun ve yardımcı malzemeler dahil değil. Kaynak: {sources}. Araştırma tarihi: {date}.', {
          sources: sources.join(', '),
          date: formatResearchDate(reference.asOf),
        })}
      </AppText>
      <Button label={t('Şehrindeki fiyatları gör')} variant="ghost" icon="arrow-forward" onPress={() => router.push('/prices')} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', padding: space.lg, gap: space.sm },
  sides: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  side: { flexGrow: 1, flexBasis: 140, borderRadius: radius.md, padding: space.md, gap: 4 },
});
