import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { chooseCity, useCity } from '@/features/market/city';
import { placeName, ProvincePicker, QualityBadge, ReferenceCard, SCOPE_LABEL } from '@/features/market/components';
import { formatLira, formatLiraRange, formatResearchDate } from '@/features/market/format';
import { DISTRICTS, PILOT_PROVINCES, PROVINCES, type ProvinceCode } from '@/features/market/provinces';
import {
  compareProvinces,
  HOME_AREAS,
  marketReference,
  provincesWithData,
  shownRange,
  type HomeSize,
  type PriceUnit,
} from '@/features/market/regional';
import { MATERIAL_PRICES, NATIONAL_QUOTE_BANDS, OFFICIAL_UNIT_PRICE, sourceName } from '@/features/market/sources';
import type { MarketScope } from '@/features/market/types';
import { msg, t } from '@/i18n';
import { formatNumber } from '@/lib/number';
import { Disclosure, Segmented, SectionTitle } from '@/ui/brand';
import { AppText, Badge, Button, Card, ChoiceChips, LoadingState, Notice, Row, Screen } from '@/ui/components';
import { HeroPanel } from '@/ui/showcase';
import { space, usePalette } from '@/ui/theme';

type Service = 'interior' | 'ceiling' | 'primer' | 'repair' | 'exterior' | 'door' | 'decorative';

/** Every kind of painting work the user may ask about. Only interior walls have enough data yet. */
const SERVICES: { value: Service; label: string }[] = [
  { value: 'interior', label: msg('İç duvar boyası') },
  { value: 'ceiling', label: msg('Tavan') },
  { value: 'primer', label: msg('Astar') },
  { value: 'repair', label: msg('Alçı, macun, zımpara') },
  { value: 'exterior', label: msg('Dış cephe') },
  { value: 'door', label: msg('Kapı ve ahşap') },
  { value: 'decorative', label: msg('Dekoratif boya') },
];

const SCOPES: { value: MarketScope; label: string }[] = [
  { value: 'labour', label: SCOPE_LABEL.labour },
  { value: 'materials', label: SCOPE_LABEL.materials },
];

type Basis = 'perM2' | 'home' | 'room';

const BASES: { value: Basis; label: string }[] = [
  { value: 'perM2', label: msg('m² başına') },
  { value: 'home', label: msg('Ev tipine göre') },
  { value: 'room', label: msg('Tek oda') },
];

const HOME_SIZES = Object.keys(HOME_AREAS).map((value) => ({ value: value as HomeSize, label: value }));

const ALL_DISTRICTS = 'all';

function CityCard({ province, district, openInitially }: { province: ProvinceCode | null; district: string | null; openInitially: boolean }) {
  const [open, setOpen] = useState(openInitially);
  const [showDistricts, setShowDistricts] = useState(false);
  const districts = province ? (DISTRICTS[province] ?? []) : [];
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="small" tone="muted">
            {t('Şehir')}
          </AppText>
          <AppText variant="heading">{province ? placeName(province) : t('Türkiye geneli')}</AppText>
        </View>
        <Button label={open ? t('Kapat') : t('Değiştir')} variant="secondary" icon={open ? 'close' : 'location'} onPress={() => setOpen(!open)} />
      </View>
      {open ? (
        <View style={{ gap: space.sm }}>
          <Button
            label={t('Türkiye geneli')}
            variant="ghost"
            icon="globe"
            onPress={() => {
              chooseCity(null);
              setOpen(false);
            }}
          />
          <ProvincePicker
            onPick={(code) => {
              chooseCity(code);
              setOpen(false);
            }}
          />
        </View>
      ) : null}
      {!open && districts.length > 0 ? (
        <Button
          label={district ? t('İlçe: {district}', { district }) : t('İlçe seç (isteğe bağlı)')}
          variant="ghost"
          icon={showDistricts ? 'chevron-up' : 'chevron-down'}
          onPress={() => setShowDistricts(!showDistricts)}
        />
      ) : null}
      {!open && showDistricts && districts.length > 0 ? (
        <>
          <ChoiceChips
            options={[{ value: ALL_DISTRICTS, label: msg('Tüm ilçeler') }, ...districts.map((d) => ({ value: d, label: d }))]}
            value={district ?? ALL_DISTRICTS}
            onChange={(d) => chooseCity(province, d === ALL_DISTRICTS ? null : d)}
          />
        </>
      ) : null}
      {!open && district ? <Notice>{t('İlçe bazında henüz yeterli veri yok; il geneli gösteriliyor.')}</Notice> : null}
    </Card>
  );
}

/** Manisa and İzmir side by side, with a difference claimed only when the data supports it. */
function PilotComparison({ scope }: { scope: MarketScope }) {
  const [a, b] = PILOT_PROVINCES;
  const result = compareProvinces(a, b, scope);
  const names = (difference: number) => ({ a: placeName(a), b: placeName(b), pct: Math.round(difference * 100) });
  const verdict =
    result.verdict === 'unknown'
      ? t('Kesin bir fark söylemek için yeterli veri yok. Aralıklar yalnızca yön gösterir.')
      : result.verdict === 'similar'
        ? t('İki ilin fiyat aralıkları birbirine yakın.')
        : result.verdict === 'higher'
          ? t('{a}, {b}’e göre yaklaşık %{pct} daha pahalı görünüyor.', names(result.difference))
          : t('{a}, {b}’e göre yaklaşık %{pct} daha uygun görünüyor.', names(result.difference));
  return (
    <Card>
      <SectionTitle title={t('Manisa ve İzmir')} />
      {[a, b].map((code) => {
        const ref = marketReference(code, scope);
        const range = ref.fallback ? null : shownRange(ref);
        return (
          <View key={code} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              {placeName(code)}
            </AppText>
            <AppText variant="bodyStrong">{range ? `${formatLiraRange(range)} / m²` : t('Yeterli veri yok')}</AppText>
            {range ? <QualityBadge reference={ref} /> : null}
          </View>
        );
      })}
      <AppText variant="small" tone="muted">
        {verdict}
      </AppText>
    </Card>
  );
}

function CityComparison({ scope }: { scope: MarketScope }) {
  const codes = provincesWithData(scope).sort((x, y) => placeName(x).localeCompare(placeName(y), 'tr'));
  const national = marketReference(null, scope);
  const nationalRange = shownRange(national);
  return (
    <Card>
      <SectionTitle title={t('Şehirleri karşılaştır')} />
      <AppText variant="small" tone="muted">
        {t('81 ilden {count} ilde bu kapsam için kullanılabilir veri var. Diğer illerde araştırma sürüyor.', {
          count: codes.length,
        })}
      </AppText>
      {codes.map((code) => {
        const ref = marketReference(code, scope);
        const range = shownRange(ref);
        return (
          <View key={code} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32 }}>
            <AppText style={{ flex: 1 }}>{placeName(code)}</AppText>
            <AppText variant="bodyStrong">{range ? `${formatLiraRange(range)} / m²` : '–'}</AppText>
            <QualityBadge reference={ref} />
          </View>
        );
      })}
      {nationalRange ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32 }}>
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {t('Türkiye geneli')}
          </AppText>
          <AppText variant="bodyStrong">{`${formatLiraRange(nationalRange)} / m²`}</AppText>
          <QualityBadge reference={national} />
        </View>
      ) : null}
    </Card>
  );
}

function NationalIndicators() {
  const bands = NATIONAL_QUOTE_BANDS;
  return (
    <Card>
      <SectionTitle title={t('Türkiye geneli başka göstergeler')} />
      <AppText variant="bodyStrong">{t('Teklif istatistiği ({source})', { source: sourceName(bands.sourceId) })}</AppText>
      <AppText variant="small" tone="muted">
        {t('{period}, {count} teklif. Tüm ev boyası işleri; malzemenin dahil olup olmadığı belirtilmemiş.', {
          period: t(bands.period),
          count: formatNumber(bands.quotes, 0),
        })}
      </AppText>
      {bands.bands.map((band) => (
        <Row
          key={band.label}
          label={t(band.label)}
          value={t('{range}, ortanca {median}', { range: formatLiraRange(band), median: formatLira(band.median) })}
        />
      ))}
      <AppText variant="caption" tone="muted">
        {t('Anlaşılan {jobs} işte ödenen ortalama tutar: {mean} (son {months} ay).', {
          jobs: bands.agreed.jobs,
          mean: formatLira(bands.agreed.mean),
          months: bands.agreed.months,
        })}
      </AppText>
      <View style={{ height: space.sm }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {t('Resmi birim fiyat (poz {code})', { code: OFFICIAL_UNIT_PRICE.code })}
        </AppText>
        <Badge label={t('Doğrulanmadı')} />
      </View>
      <AppText variant="small" tone="muted">
        {t('{price} / m² duvar, {period}. Bakanlığın ihale fiyatıdır: malzeme, işçilik ve yüklenici kârı dahil. İkincil kaynaktan okundu.', {
          price: formatLira(Math.round(OFFICIAL_UNIT_PRICE.perWallM2)),
          period: formatResearchDate(OFFICIAL_UNIT_PRICE.period),
        })}
      </AppText>
    </Card>
  );
}

function MaterialPrices() {
  return (
    <Card>
      <SectionTitle title={t('Malzeme fiyatları')} />
      {Object.values(MATERIAL_PRICES).map((m) => (
        <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32 }}>
          <AppText style={{ flex: 1 }}>{t(m.label)}</AppText>
          <AppText variant="bodyStrong">
            {m.quality === 'insufficient' ? t('Yeterli veri yok') : `${formatLiraRange(m)} / ${m.unit}`}
          </AppText>
        </View>
      ))}
      <AppText variant="caption" tone="muted">
        {t('Mağaza fiyatları markaya ve kampanyaya göre değişir. Kaynak: {sources}.', {
          sources: [...new Set(Object.values(MATERIAL_PRICES).flatMap((m) => m.sources))].map(sourceName).join(', '),
        })}
      </AppText>
    </Card>
  );
}

/**
 * The answer first: what interior wall painting labour costs per m² in the
 * user's city (or Türkiye-wide), with its data quality. Details follow below.
 */
function PriceHeadline({ province }: { province: ProvinceCode | null }) {
  const p = usePalette();
  const reference = marketReference(province, 'labour', 'perM2');
  const range = shownRange(reference);
  return (
    <HeroPanel testID="price-headline">
      <AppText variant="title" accessibilityRole="header" style={{ color: p.onHero }}>
        {t('Türkiye Boya Fiyatları')}
      </AppText>
      <AppText style={{ color: p.onHeroMuted }}>
        {t('{place} · iç duvar işçiliği', { place: placeName(reference.code) })}
      </AppText>
      {range ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <AppText variant="display" style={{ color: p.onHero, fontSize: 34, lineHeight: 40 }}>
            {formatLiraRange(range)}
          </AppText>
          <AppText variant="bodyStrong" style={{ color: p.onHeroMuted }}>
            {t('/ m² ev alanı')}
          </AppText>
        </View>
      ) : (
        <AppText variant="bodyStrong" style={{ color: p.onHero }}>
          {t('Bu iş için yeterli güncel veri bulunamadı.')}
        </AppText>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <QualityBadge reference={reference} />
        <AppText variant="caption" style={{ color: p.onHeroMuted, flexShrink: 1 }}>
          {t('Yön gösterir, teklif değildir.')}
        </AppText>
      </View>
    </HeroPanel>
  );
}

export default function PricesScreen() {
  const params = useLocalSearchParams<{ pick?: string }>();
  const city = useCity();
  const [service, setService] = useState<Service>('interior');
  const [scope, setScope] = useState<MarketScope>('labour');
  const [basis, setBasis] = useState<Basis>('perM2');
  const [home, setHome] = useState<HomeSize>('2+1');

  if (city.loading) {
    return (
      <Screen edges={['bottom']}>
        <LoadingState />
      </Screen>
    );
  }

  const unit: PriceUnit = basis === 'room' ? 'room' : 'perM2';
  const reference = marketReference(city.province, scope, unit);
  const area = basis === 'home' ? HOME_AREAS[home] : undefined;

  return (
    <Screen edges={['bottom']}>
      <PriceHeadline province={city.province} />

      <CityCard province={city.province} district={city.district} openInitially={params.pick === '1'} />

      <SectionTitle title={t('Ayrıntılı fiyatlar')} />
      <ChoiceChips label={t('Hangi iş?')} options={SERVICES} value={service} onChange={setService} />

      {service === 'interior' ? (
        <>
          <Segmented options={SCOPES} value={scope} onChange={setScope} />
          <Segmented options={BASES} value={basis} onChange={setBasis} />
          {basis === 'home' ? <ChoiceChips label={t('Ev tipi')} options={HOME_SIZES} value={home} onChange={setHome} /> : null}

          <ReferenceCard
            reference={reference}
            chosen={city.province}
            floorArea={area}
            areaLabel={area ? t('{type}, yaklaşık {area} m²', { type: home, area }) : undefined}
          />

          {PILOT_PROVINCES.includes(city.province ?? '') || !city.province ? <PilotComparison scope={scope} /> : null}
          <CityComparison scope={scope} />
        </>
      ) : (
        <Notice tone="accent" icon="hourglass">
          {t('Bu iş için yeterli güncel veri bulunamadı. Araştırma sürüyor; o zamana kadar ustadan teklif almanı öneririz.')}
        </Notice>
      )}

      <NationalIndicators />
      <MaterialPrices />

      <Disclosure title={t('Bu rakamlar nasıl hesaplanıyor?')}>
        <AppText variant="small">
          {t('Herkese açık kaynaklardaki tarihli boya işlerini topluyoruz. Her işin fiyatını ev alanına bölüp m² fiyatı buluyoruz. Aynı kaynağın kayıtları tek kaynak sayılır, uç değerler ayrı tutulur, iki yıldan eski kayıtlar kullanılmaz.')}
        </AppText>
        <AppText variant="small">
          {t('10 kayıttan azsa en düşük ve en yüksek fiyatı, daha fazlaysa kayıtların ortadaki yarısını gösteriyoruz. Ortanca en az orta düzey, ortalama yalnızca güçlü veride gösterilir.')}
        </AppText>
        <AppText variant="small">
          {t('Bir ilin fiyatı başka ile asla kopyalanmaz. Yeterli veri yoksa bunu açıkça yazar ve Türkiye genelini gösteririz.')}
        </AppText>
      </Disclosure>

      <Notice>
        {t('Bunlar piyasa referansıdır, teklif değildir. Kesin fiyat için ustadan keşif ve yazılı teklif iste.')}
      </Notice>
      <AppText variant="caption" tone="muted">
        {t('{count} il listede. Veriler {date} tarihinde güncellendi.', {
          count: PROVINCES.length,
          date: formatResearchDate(reference.asOf),
        })}
      </AppText>
    </Screen>
  );
}
