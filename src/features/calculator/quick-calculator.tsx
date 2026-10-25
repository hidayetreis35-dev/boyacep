import { useState } from 'react';
import { View } from 'react-native';

import { DEFAULT_CAN_SIZES, HOUSE_TYPES, planPackages, quickEstimate, type HouseType } from '@/engine';
import { formatNumber, parseDecimal } from '@/lib/number';
import { AppText, Badge, Card, ChoiceChips, Notice, NumberField, Row, Stepper, Toggle } from '@/ui/components';
import { space } from '@/ui/theme';

import { packageText } from './results';

export function QuickCalculator() {
  const [houseType, setHouseType] = useState<HouseType>('3+1');
  const [area, setArea] = useState('');
  const [ceilings, setCeilings] = useState(true);
  const [coats, setCoats] = useState(2);

  const touched = area.trim() !== '';
  const result = touched
    ? quickEstimate({ houseType, floorArea: parseDecimal(area), includeCeilings: ceilings, coats })
    : null;
  const areaError = result && !result.ok ? result.issues[0]?.message : undefined;

  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <AppText variant="heading">Evin bilgileri</AppText>
        <ChoiceChips
          label="Ev tipi"
          options={HOUSE_TYPES.map((h) => ({ value: h, label: h }))}
          value={houseType}
          onChange={setHouseType}
        />
        <NumberField label="Net kullanım alanı" unit="m²" value={area} onChangeText={setArea} error={areaError} testID="floor-area" />
        <Toggle label="Tavanlar da boyanacak" value={ceilings} onChange={setCeilings} />
        <Stepper label="Kat sayısı" value={coats} min={1} max={4} onChange={setCoats} />
      </Card>

      {result?.ok ? (
        <View style={{ gap: space.lg }} accessibilityLiveRegion="polite" testID="quick-results">
          <Card>
            <AppText variant="small" tone="muted">
              Yaklaşık toplam boya
            </AppText>
            <AppText variant="number" tone="primary">
              {formatNumber(result.value.totalLitres)} L
            </AppText>
            <AppText variant="small" tone="muted">
              Al: {packageText(planPackages(result.value.totalLitres, DEFAULT_CAN_SIZES))}
            </AppText>
            <Badge label="Tahmini" tone="accent" />
          </Card>
          <Card>
            <Row label="Tahmini duvar alanı" value={`${formatNumber(result.value.wallArea)} m²`} />
            <Row label="Duvar boyası" value={`${formatNumber(result.value.wallLitres)} L`} strong />
            {ceilings && <Row label="Tahmini tavan alanı" value={`${formatNumber(result.value.ceilingArea)} m²`} />}
            {ceilings && <Row label="Tavan boyası" value={`${formatNumber(result.value.ceilingLitres)} L`} strong />}
          </Card>
          <Notice>
            Hızlı hesap, ev tipine göre ortalama duvar alanı kullanır (taslak katsayılar, usta kontrolü bekliyor). Daha
            doğru sonuç için “Oda oda” sekmesini kullan.
          </Notice>
        </View>
      ) : !touched ? (
        <Notice icon="home">Ev tipini seç ve net metrekareyi yaz; sonuç hemen çıkar.</Notice>
      ) : null}
    </View>
  );
}
