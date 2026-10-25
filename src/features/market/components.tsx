import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { msg, t } from '@/i18n';
import { AppText, Badge, Button, Icon, Notice, Row, TextField } from '@/ui/components';
import { fonts, radius, space, usePalette } from '@/ui/theme';

import { chooseCity, skipCity, useCity } from './city';
import { formatLiraRange, formatResearchDate, QUALITY_HELP, QUALITY_TONE, qualityLabel } from './format';
import { PILOT_PROVINCES, provinceByCode, searchProvinces, type ProvinceCode } from './provinces';
import { hasProvinceData, homeTotal, shownRange, snapshotAge, SNAPSHOT_FRESH_DAYS, type MarketReference } from './regional';
import { sourceName } from './sources';
import type { MarketScope } from './types';

export const SCOPE_LABEL: Record<MarketScope, string> = {
  labour: msg('Sadece işçilik'),
  materials: msg('Malzeme dahil'),
};

/** Turkish case endings differ by name, so each pilot city has its own label. */
const PICK_LABEL: Record<ProvinceCode, string> = {
  '45': msg('Manisa’yı seç'),
  '35': msg('İzmir’i seç'),
};

export function placeName(code: ProvinceCode | 'TR'): string {
  return code === 'TR' ? t('Türkiye geneli') : (provinceByCode(code)?.name ?? code);
}

export function QualityBadge({ reference }: { reference: MarketReference }) {
  return <Badge label={qualityLabel(reference.summary.quality)} tone={QUALITY_TONE[reference.summary.quality]} />;
}

/** Shown when the price data in the app is older than SNAPSHOT_FRESH_DAYS. */
export function StaleNotice({ asOf }: { asOf: string }) {
  if (snapshotAge() <= SNAPSHOT_FRESH_DAYS) return null;
  return (
    <Notice tone="danger" icon="time">
      {t('Bu fiyatlar {date} tarihinde toplandı ve güncel olmayabilir.', { date: formatResearchDate(asOf) })}
    </Notice>
  );
}

/** "Bu şehir için yeterli güncel veri bulunamadı." and similar, or nothing when the province's own data is shown. */
export function FallbackNotice({ reference, chosen }: { reference: MarketReference; chosen: ProvinceCode | null }) {
  if (!reference.fallback) return null;
  const name = chosen ? provinceByCode(chosen)?.name : undefined;
  return (
    <Notice tone="accent" icon="information-circle">
      {reference.fallback === 'no_city'
        ? t('Şehir seçmediğin için Türkiye geneli gösteriliyor.')
        : t('{city} için yeterli güncel veri bulunamadı. Türkiye geneli gösteriliyor.', { city: name ?? '' })}
    </Notice>
  );
}

/**
 * A market reference: visibly different from a quote (solid card) and from
 * BoyaCep's own estimate, with a dashed border, its quality, sample size,
 * sources and date.
 */
export function ReferenceCard({
  reference,
  chosen,
  floorArea,
  areaLabel,
}: {
  reference: MarketReference;
  chosen: ProvinceCode | null;
  floorArea?: number;
  areaLabel?: string;
}) {
  const p = usePalette();
  const { summary } = reference;
  const range = shownRange(reference);
  const total = floorArea ? homeTotal(reference, floorArea) : null;
  const perM2 = reference.unit === 'perM2';
  return (
    <View style={[styles.reference, { borderColor: p.border, backgroundColor: p.surface }]} testID="market-reference">
      <View style={styles.headerRow}>
        <Icon name="stats-chart" size={18} color={p.teal} />
        <AppText variant="overline" style={{ color: p.teal, flex: 1 }}>
          {t('Piyasa referansı')}
        </AppText>
        <QualityBadge reference={reference} />
      </View>
      <AppText variant="small" tone="muted">
        {`${placeName(reference.code)} · ${t(SCOPE_LABEL[reference.scope])}`}
      </AppText>
      <FallbackNotice reference={reference} chosen={chosen} />
      <StaleNotice asOf={reference.asOf} />

      {range ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <AppText variant="heading" style={{ fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32 }}>
              {formatLiraRange(range)}
            </AppText>
            <AppText variant="bodyStrong" tone="muted">
              {perM2 ? t('/ m² ev alanı') : t('/ oda')}
            </AppText>
          </View>
          {total ? (
            <AppText variant="bodyStrong">
              {t('≈ {range} toplam ({area})', { range: formatLiraRange(total), area: areaLabel ?? '' })}
            </AppText>
          ) : null}
          <View style={{ gap: 2 }}>
            {summary.median !== null ? <Row label={t('Ortanca (medyan)')} value={formatLiraRange({ low: Math.round(summary.median), high: Math.round(summary.median) })} /> : null}
            {summary.mean !== null ? <Row label={t('Ortalama')} value={formatLiraRange({ low: Math.round(summary.mean), high: Math.round(summary.mean) })} /> : null}
            <Row label={t('Aralık')} value={summary.middleHalf ? t('Kayıtların ortadaki yarısı') : t('En düşük – en yüksek')} />
            <Row label={t('Kayıt sayısı')} value={String(summary.observations)} />
            <Row label={t('Bağımsız kaynak')} value={String(summary.sources)} />
            {summary.newest ? <Row label={t('En yeni veri')} value={formatResearchDate(summary.newest)} /> : null}
            {summary.outliers > 0 ? <Row label={t('Ayrı tutulan uç değer')} value={String(summary.outliers)} /> : null}
          </View>
        </>
      ) : (
        <AppText>{t('Bu iş için yeterli güncel veri bulunamadı.')}</AppText>
      )}

      <AppText variant="caption" tone="muted">
        {t('Kaynak: {sources}. Veri tarihi: {date}.', {
          sources: reference.sources.map(sourceName).join(', '),
          date: formatResearchDate(reference.asOf),
        })}
      </AppText>
      <AppText variant="caption" tone="muted">
        {`${t(QUALITY_HELP[summary.quality])} ${t('Bu bir teklif değildir; gerçek fiyat ustaya, duvarın durumuna ve işin kapsamına göre değişir.')}`}
      </AppText>
    </View>
  );
}

/** Searchable list of the 81 provinces. Provinces with price data carry a badge. */
export function ProvincePicker({ onPick, scope = 'labour' }: { onPick: (code: ProvinceCode) => void; scope?: MarketScope }) {
  const p = usePalette();
  const [query, setQuery] = useState('');
  const list = searchProvinces(query);
  return (
    <View style={{ gap: space.sm }}>
      <TextField label={t('İl ara')} value={query} onChangeText={setQuery} placeholder={t('Örnek: Manisa')} testID="province-search" />
      {list.length === 0 ? <AppText tone="muted">{t('Bu adla bir il bulunamadı.')}</AppText> : null}
      <View style={{ gap: 2 }}>
        {list.map((province) => {
          const data = hasProvinceData(province.code, 'labour') || hasProvinceData(province.code, 'materials');
          return (
            <Pressable
              key={province.code}
              accessibilityRole="button"
              accessibilityLabel={province.name}
              onPress={() => onPick(province.code)}
              style={({ pressed }) => [styles.provinceRow, { backgroundColor: pressed ? p.surfaceMuted : 'transparent' }]}>
              <AppText variant="caption" tone="muted" style={{ width: 24 }}>
                {province.code}
              </AppText>
              <AppText variant="bodyStrong" style={{ flex: 1 }}>
                {province.name}
              </AppText>
              {data ? <Badge label={t('Veri var')} tone={scope === 'labour' ? 'success' : 'primary'} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Asks once, on the home screen, whether the user wants prices for their
 * city. Never required: "Şehir seçmeden devam et" hides it for good.
 */
export function CityPrompt() {
  const p = usePalette();
  const city = useCity();
  if (city.loading) return null;

  if (city.answered) {
    const name = city.province ? provinceByCode(city.province)?.name : undefined;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Türkiye Boya Fiyatları')}
        onPress={() => router.push('/prices')}
        style={[styles.prompt, { backgroundColor: p.tealSoft }]}>
        <View style={styles.headerRow}>
          <Icon name="stats-chart" color={p.teal} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyStrong" style={{ fontFamily: fonts.bold }}>
              {t('Türkiye Boya Fiyatları')}
            </AppText>
            <AppText variant="small" tone="muted">
              {name ? t('{city} usta fiyatları, kaynağı ve tarihiyle', { city: name }) : t('Usta fiyatları şehre göre, kaynağı ve tarihiyle')}
            </AppText>
          </View>
          <Icon name="chevron-forward" color={p.textMuted} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.prompt, { backgroundColor: p.tealSoft }]} testID="city-prompt">
      <View style={styles.headerRow}>
        <Icon name="location" color={p.teal} />
        <AppText variant="bodyStrong" style={{ flex: 1, fontFamily: fonts.bold }}>
          {t('Fiyatları şehrine göre görmek ister misin?')}
        </AppText>
      </View>
      <AppText variant="small" tone="muted">
        {t('Konum izni istemiyoruz. Şehrini sen seç; istediğin zaman Profil’den değiştirebilirsin.')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {PILOT_PROVINCES.map((code) => (
          <Button
            key={code}
            label={t(PICK_LABEL[code])}
            variant="secondary"
            onPress={() => chooseCity(code)}
          />
        ))}
        <Button label={t('Başka il seç')} variant="ghost" icon="search" onPress={() => router.push({ pathname: '/prices', params: { pick: '1' } })} />
      </View>
      <Button label={t('Şehir seçmeden devam et')} variant="ghost" onPress={() => skipCity()} />
    </View>
  );
}

/** The city setting on the profile screen. */
export function CitySetting() {
  const city = useCity();
  if (city.loading) return null;
  const name = city.province ? provinceByCode(city.province)?.name : undefined;
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
        {t('Şehir')}
      </AppText>
      <AppText variant="small" tone="muted">
        {name
          ? [name, city.district].filter(Boolean).join(' · ')
          : t('Seçilmedi. Fiyatlarda Türkiye geneli gösteriliyor.')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Button
          label={name ? t('Şehri değiştir') : t('Şehir seç')}
          variant="secondary"
          icon="location"
          onPress={() => router.push({ pathname: '/prices', params: { pick: '1' } })}
        />
        {name ? <Button label={t('Şehri kaldır')} variant="ghost" onPress={() => chooseCity(null)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reference: { borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', padding: space.lg, gap: space.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  provinceRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44, paddingHorizontal: space.sm, borderRadius: radius.sm },
  prompt: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
});
