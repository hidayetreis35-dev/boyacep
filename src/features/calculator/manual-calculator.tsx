import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { areaEstimate, DEFAULT_CAN_SIZES, materialCost, planPackages, type AreaEstimate, type RangeEstimate } from '@/engine';
import { formatLiraRange, formatResearchDate } from '@/features/market/format';
import { MATERIAL_PRICES, sourceName } from '@/features/market/sources';
import { msg, t } from '@/i18n';
import { formatNumber, parseDecimal } from '@/lib/number';
import { StatTile, TileRow } from '@/ui/brand';
import { AppText, Button, Card, Checkbox, Notice, NumberField, SelectField, Stepper } from '@/ui/components';
import { FadeIn } from '@/ui/motion';
import { space } from '@/ui/theme';

import { packageText } from './labels';

type RoomKind = 'living' | 'bedroom' | 'kids' | 'kitchen' | 'bathroom' | 'hall';
type PaintKind = 'interior' | 'exterior';

const ROOMS: { value: RoomKind; label: string }[] = [
  { value: 'living', label: msg('Salon') },
  { value: 'bedroom', label: msg('Yatak odası') },
  { value: 'kids', label: msg('Çocuk odası') },
  { value: 'kitchen', label: msg('Mutfak') },
  { value: 'bathroom', label: msg('Banyo') },
  { value: 'hall', label: msg('Koridor') },
];

/** Which paint suits the room; general guidance, not a product claim. */
const ROOM_ADVICE: Record<RoomKind, string> = {
  living: msg('Salon için silinebilir mat ya da ipek mat iç cephe boyası uygun.'),
  bedroom: msg('Yatak odasında kokusu az, düşük uçucu maddeli (VOC) boya tercih et.'),
  kids: msg('Çocuk odasında silinebilir ve kokusu az boya seç; etiketindeki uygunluk bilgisine bak.'),
  kitchen: msg('Mutfakta yağ ve buhara karşı silinebilir, yarı parlak boya kullan.'),
  bathroom: msg('Banyoda neme ve küfe dayanıklı boya kullan; küf varsa önce temizle.'),
  hall: msg('Koridor sık dokunulan bir alan; silinebilir boya seç.'),
};

const PAINTS: { value: PaintKind; label: string }[] = [
  { value: 'interior', label: msg('İç cephe') },
  { value: 'exterior', label: msg('Dış cephe') },
];

interface Result {
  estimate: AreaEstimate;
  cost: RangeEstimate | null;
  room: RoomKind;
  paint: PaintKind;
}

/** Paint cost at shop prices. Ceiling paint is priced like interior paint, which errs on the high side. */
function shopCost(e: AreaEstimate, paint: PaintKind): RangeEstimate | null {
  return materialCost([
    { quantity: e.wallLitres, price: paint === 'exterior' ? MATERIAL_PRICES.exterior_paint : MATERIAL_PRICES.interior_paint },
    { quantity: e.ceilingLitres, price: MATERIAL_PRICES.interior_paint },
  ]);
}

/** "Manuel Giriş": the user already knows the wall area. */
export function ManualCalculator({ onMeasure }: { onMeasure: () => void }) {
  const [wall, setWall] = useState('');
  const [room, setRoom] = useState<RoomKind>('living');
  const [paint, setPaint] = useState<PaintKind>('interior');
  const [ceiling, setCeiling] = useState(false);
  const [ceilingArea, setCeilingArea] = useState('');
  const [coats, setCoats] = useState(2);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // After the first "Hesapla" the result follows the fields as they change.
  const [live, setLive] = useState(false);

  const withCeiling = ceiling && paint === 'interior';
  const outcome = useMemo(
    () => areaEstimate({ wallArea: parseDecimal(wall), ceilingArea: withCeiling ? parseDecimal(ceilingArea) : null, coats }),
    [wall, ceilingArea, withCeiling, coats],
  );
  const result: Result | null = live && outcome.ok ? { estimate: outcome.value, cost: shopCost(outcome.value, paint), room, paint } : null;

  // Errors belong to the last press; editing a field clears them.
  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setErrors({});
    };

  const calculate = () => {
    if (!outcome.ok) {
      setErrors(Object.fromEntries(outcome.issues.map((i) => [i.field, t(i.message)])));
      setLive(false);
      return;
    }
    setErrors({});
    setLive(true);
  };

  const price = paint === 'exterior' ? MATERIAL_PRICES.exterior_paint : MATERIAL_PRICES.interior_paint;

  return (
    <>
      <Card>
        <AppText variant="heading">{t('Alan bilgileri')}</AppText>
        <NumberField
          label={t('Duvar alanı')}
          unit="m²"
          value={wall}
          onChangeText={edit(setWall)}
          error={errors.wallArea}
          hint={t('Boyanacak duvarların toplamı; kapı ve pencereleri çıkar.')}
          testID="manual-wall"
        />
        {result ? null : (
          <Button label={t('Alanı bilmiyorum, odayı ölçelim')} icon="resize" variant="ghost" onPress={onMeasure} />
        )}
        {paint === 'interior' ? <SelectField label={t('Oda tipi')} options={ROOMS} value={room} onChange={edit(setRoom)} testID="manual-room" /> : null}
        <SelectField label={t('Boya türü')} options={PAINTS} value={paint} onChange={edit(setPaint)} testID="manual-paint" />
        {paint === 'interior' ? (
          <>
            <Checkbox label={t('Tavan dahil')} value={ceiling} onChange={edit(setCeiling)} />
            {ceiling ? (
              <NumberField
                label={t('Tavan alanı')}
                unit="m²"
                value={ceilingArea}
                onChangeText={edit(setCeilingArea)}
                error={errors.ceilingArea}
                hint={t('Bilmiyorsan odanın taban alanını yaz.')}
                testID="manual-ceiling"
              />
            ) : null}
          </>
        ) : null}
        <Stepper label={t('Kaç kat boya?')} value={coats} min={1} max={4} onChange={edit(setCoats)} />
        <Button label={t('Hesapla')} icon="calculator" variant="cta" size="lg" onPress={calculate} />
      </Card>

      {result ? (
        <FadeIn>
          <View style={{ gap: space.md }} testID="manual-result">
            <TileRow>
              <StatTile
                label={t('Tahmini malzeme')}
                value={formatNumber(result.estimate.totalLitres)}
                unit="L"
                icon="color-fill"
                feature="calculate"
                hint={t('Al: {cans}', { cans: packageText(planPackages(result.estimate.totalLitres, DEFAULT_CAN_SIZES)) })}
              />
              <StatTile
                label={t('Tahmini maliyet')}
                value={result.cost ? formatLiraRange(result.cost) : t('Yeterli veri yok')}
                icon="wallet"
                feature="cost"
                hint={t('Sadece boya, mağaza fiyatıyla')}
              />
            </TileRow>
            {result.paint === 'interior' ? <Notice icon="bulb">{t(ROOM_ADVICE[result.room])}</Notice> : null}
            <AppText variant="caption" tone="muted">
              {t('Tahmindir: 1 L boya tek katta yaklaşık 10 m² örter, %10 fire payı eklendi. Kesin miktar için boyanın kutusundaki sarfiyatı kullan. Fiyat kaynağı: {sources}, {date}.', {
                sources: price.sources.map(sourceName).join(', '),
                date: formatResearchDate(price.dataDate),
              })}
            </AppText>
            <Button label={t('Ustayla toplam maliyeti hesapla')} icon="calculator" variant="secondary" onPress={() => router.push('/cost')} />
            <Button label={t('Odayı ölçerek ayrıntılı hesapla')} icon="resize" variant="ghost" onPress={onMeasure} />
          </View>
        </FadeIn>
      ) : null}
    </>
  );
}
