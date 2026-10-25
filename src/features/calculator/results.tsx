import { useRef } from 'react';
import { View, type HostInstance } from 'react-native';

import type { Assumption, MaterialItem, PackagePlan, ProjectCalculation } from '@/engine';
import { formatNumber } from '@/lib/number';
import { AppText, Badge, Card, Notice, Row, useScrollToView } from '@/ui/components';
import { space } from '@/ui/theme';

import { SOURCE_LABEL } from './labels';

export function packageText(plan: PackagePlan): string {
  return plan.lines.map((l) => `${l.count} × ${formatNumber(l.size)} L`).join(' + ');
}

function MaterialRow({ item }: { item: MaterialItem }) {
  const source = SOURCE_LABEL[item.source];
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {item.name}
        </AppText>
        <AppText variant="bodyStrong">
          {formatNumber(item.quantity)} {item.unit}
        </AppText>
      </View>
      {item.packages && item.packages.lines.length > 0 ? (
        <AppText variant="small" tone="muted">
          Al: {packageText(item.packages)}
          {item.packages.leftover > 0 ? ` (≈${formatNumber(item.packages.leftover)} L artar)` : ''}
        </AppText>
      ) : null}
      <Badge label={source.label} tone={source.tone} />
    </View>
  );
}

export function AssumptionList({ assumptions }: { assumptions: Assumption[] }) {
  return (
    <Card>
      <AppText variant="heading">Hesapta kullanılan değerler</AppText>
      {assumptions.map((a) => {
        const s = SOURCE_LABEL[a.source];
        return (
          <View key={`${a.key}-${a.label}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <AppText variant="small" style={{ flex: 1 }}>
              {a.label}
            </AppText>
            <Badge label={s.label} tone={s.tone} />
          </View>
        );
      })}
    </Card>
  );
}

export function RoomResults({ result }: { result: ProjectCalculation }) {
  const room = result.rooms[0];
  const { totals } = result;
  const finish = totals.wallLitres + totals.ceilingLitres;
  const ref = useRef<HostInstance>(null);
  const scrollToView = useScrollToView();

  return (
    <View
      ref={ref}
      onLayout={() => scrollToView(ref.current)}
      style={{ gap: space.lg }}
      accessibilityLiveRegion="polite"
      testID="room-results">
      <Card>
        <AppText variant="small" tone="muted">
          Toplam boya (astar hariç)
        </AppText>
        <AppText variant="number" tone="primary">
          {formatNumber(finish)} L
        </AppText>
        <AppText variant="small" tone="muted">
          Boyanacak net alan: {formatNumber(totals.totalPaintable, 2)} m²
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">Alanlar</AppText>
        <Row label="Toplam duvar alanı" value={`${formatNumber(room.areas.grossWall, 2)} m²`} />
        <Row label="Kapı düşümü" value={`− ${formatNumber(room.areas.doorDeduction, 2)} m²`} />
        <Row label="Pencere düşümü" value={`− ${formatNumber(room.areas.windowDeduction, 2)} m²`} />
        <Row label="Boyanacak duvar" value={`${formatNumber(room.areas.netWall, 2)} m²`} strong />
        <Row label="Tavan alanı" value={`${formatNumber(room.areas.ceiling, 2)} m²`} strong />
      </Card>

      <Card>
        <AppText variant="heading">Malzeme listesi</AppText>
        {result.materials.map((m) => (
          <MaterialRow key={m.category} item={m} />
        ))}
      </Card>

      <AssumptionList assumptions={result.assumptions} />

      <Notice>
        Sonuçlar tahminidir. Kesin miktar için boyanın teknik föyündeki sarfiyatı girin; duvarın emiciliği ve
        uygulama şekli sonucu değiştirebilir.
      </Notice>
    </View>
  );
}
