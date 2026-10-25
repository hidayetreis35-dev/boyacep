import { View } from 'react-native';

import { COST_GROUP_LABEL, type CostSummary } from '@/engine';
import { formatMoney } from '@/lib/number';
import { AppText, Badge, Card, Notice, Row } from '@/ui/components';
import { space } from '@/ui/theme';

export function CostSummaryCard({ summary, showGroups = true }: { summary: CostSummary; showGroups?: boolean }) {
  return (
    <Card>
      <AppText variant="small" tone="muted">
        Toplam maliyet
      </AppText>
      <AppText variant="number" tone="primary" testID="cost-total">
        {formatMoney(summary.total)}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Badge label={`Kesin fiyat: ${formatMoney(summary.store)}`} tone="success" />
        <Badge label={`Tahmini: ${formatMoney(summary.estimate)}`} tone="accent" />
      </View>
      {showGroups
        ? summary.groups
            .filter((g) => g.total > 0 || g.missing > 0)
            .map((g) => (
              <Row
                key={g.group}
                label={`${COST_GROUP_LABEL[g.group]}${g.missing > 0 ? ` (${g.missing} fiyatsız)` : ''}`}
                value={formatMoney(g.total)}
              />
            ))
        : null}
      {summary.budgetLeft !== null ? (
        <Row
          strong
          label={summary.budgetLeft >= 0 ? 'Bütçede kalan' : 'Bütçe aşımı'}
          value={formatMoney(Math.abs(summary.budgetLeft))}
        />
      ) : null}
      {summary.missingPrices > 0 ? (
        <Notice>
          {summary.missingPrices} kalemin fiyatı girilmedi; toplam eksik. Fiyatları girdikçe toplam tamamlanır.
        </Notice>
      ) : null}
    </Card>
  );
}
