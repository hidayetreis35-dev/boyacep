import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { addRanges, type RangeEstimate } from '@/engine';
import { t } from '@/i18n';
import { AppText, Button, Icon, Row } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

import { useCity } from './city';
import { FallbackNotice, placeName, QualityBadge, StaleNotice } from './components';
import { formatLiraRange, formatResearchDate } from './format';
import { homeTotal, marketReference, paintCost, shownRange } from './regional';
import { MATERIAL_PRICES, sourceName } from './sources';

/**
 * Calculator results: what painting this home or room roughly costs in the
 * user's city. Labour comes from the market reference, paint from shop
 * prices; both are labelled as references, never as a quote.
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
      <AppText variant="heading">{t('Ustayla yaklaşık maliyet · {place}', { place: placeName(reference.code) })}</AppText>
      <FallbackNotice reference={reference} chosen={city.province} />
      <StaleNotice asOf={reference.asOf} />
      <Row label={t('Usta işçiliği')} value={labour ? formatLiraRange(labour) : t('Yeterli veri yok')} />
      <Row label={t('Boya (mağaza fiyatıyla)')} value={paint ? formatLiraRange(paint) : t('Yeterli veri yok')} />
      {total ? <Row label={t('Toplam (yaklaşık)')} value={formatLiraRange(total)} strong /> : null}
      <AppText variant="caption" tone="muted">
        {t('Astar, macun ve yardımcı malzemeler dahil değil. Kaynak: {sources}. Veri tarihi: {date}.', {
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
});
