import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useCity } from '@/features/market/city';
import { placeName, QualityBadge } from '@/features/market/components';
import { formatLiraRange, formatResearchDate } from '@/features/market/format';
import { marketReference, shownRange } from '@/features/market/regional';
import { sourceName } from '@/features/market/sources';
import { t } from '@/i18n';
import { AppText, Icon } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { fonts, radius, space, usePalette } from '@/ui/theme';

/**
 * Home screen: what painting labour roughly costs in the user's city, from
 * the shipped market snapshot, with its quality, source and date. Without a
 * city it asks for one instead of guessing.
 */
export function CityPriceCard() {
  const p = usePalette();
  const city = useCity();
  if (city.loading) return null;

  if (!city.province) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('Şehrini seç, fiyatları gör')}
        onPress={() => router.push({ pathname: '/prices', params: { pick: '1' } })}
        style={[styles.card, styles.row, { backgroundColor: p.surface, borderColor: p.border }]}>
        <View style={[styles.icon, { backgroundColor: p.accentSoft }]}>
          <Icon name="location" size={20} color={p.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="cardTitle">{t('Şehrini seç, fiyatları gör')}</AppText>
          <AppText variant="small" tone="muted">
            {t('Boya işçiliğinin şehrinde yaklaşık ne tuttuğunu gösterelim.')}
          </AppText>
        </View>
        <Icon name="chevron-forward" size={20} color={p.textMuted} />
      </PressableScale>
    );
  }

  const reference = marketReference(city.province, 'labour', 'perM2');
  const range = shownRange(reference);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('{place} boya işçiliği fiyatları', { place: placeName(reference.code) })}
      onPress={() => router.push('/prices')}
      testID="home-city-price"
      style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }]}>
      <View style={[styles.row, { alignItems: 'flex-start' }]}>
        <AppText variant="cardTitle" style={{ flex: 1 }}>
          {t('{place} boya işçiliği', { place: placeName(reference.code) })}
        </AppText>
        <QualityBadge reference={reference} />
      </View>
      {range ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <AppText variant="heading" style={{ fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30 }}>
            {formatLiraRange(range)}
          </AppText>
          <AppText variant="small" tone="muted">
            {t('/ m² ev alanı')}
          </AppText>
        </View>
      ) : (
        <AppText>{t('Bu iş için yeterli güncel veri bulunamadı.')}</AppText>
      )}
      <AppText variant="caption" tone="muted">
        {t('Kaynak: {sources} · {date} · yön gösterir, teklif değildir', {
          sources: reference.sources.map(sourceName).join(', '),
          date: formatResearchDate(reference.asOf),
        })}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
