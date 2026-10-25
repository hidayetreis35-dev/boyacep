import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { COST_GROUP_LABEL, COST_GROUP_ORDER, summarizeCost, type CostGroup, type MaterialCategory, type PriceSource } from '@/engine';
import { useSession } from '@/features/account/session';
import { CostSummaryCard } from '@/features/materials/cost-summary';
import { parseDecimal } from '@/lib/number';
import { AppText, Button, Card, ChoiceChips, Notice, NumberField, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

/** One representative category per material group, so the shared cost engine can sum them. */
const GROUP_CATEGORY: Partial<Record<CostGroup, MaterialCategory>> = {
  paint: 'interior_paint',
  primer: 'primer',
  filler: 'filler',
  supplies: 'roller',
};

type Line = { amount: string; source: PriceSource };

/** Quick cost estimate without an account: one amount per cost group. */
export default function QuickCostScreen() {
  const { session } = useSession();
  const [lines, setLines] = useState<Record<CostGroup, Line>>(
    Object.fromEntries(COST_GROUP_ORDER.map((g) => [g, { amount: '', source: 'estimate' }])) as Record<CostGroup, Line>,
  );
  const [budget, setBudget] = useState('');

  const value = (g: CostGroup) => parseDecimal(lines[g].amount);
  const invalid = COST_GROUP_ORDER.filter((g) => lines[g].amount.trim() !== '' && !Number.isFinite(value(g)));
  const budgetValue = budget.trim() === '' ? null : parseDecimal(budget);

  const summary = summarizeCost(
    COST_GROUP_ORDER.filter((g) => GROUP_CATEGORY[g] && Number.isFinite(value(g))).map((g) => ({
      category: GROUP_CATEGORY[g]!,
      quantity: 1,
      unitPrice: value(g),
      priceSource: lines[g].source,
    })),
    (['labor', 'transport', 'other'] as const)
      .filter((g) => Number.isFinite(value(g)))
      .map((g) => ({ kind: g, amount: value(g), priceSource: lines[g].source })),
    budgetValue !== null && Number.isFinite(budgetValue) ? budgetValue : null,
  );

  const set = (g: CostGroup, patch: Partial<Line>) => setLines((l) => ({ ...l, [g]: { ...l[g], ...patch } }));

  return (
    <Screen edges={['bottom']}>
      <AppText tone="muted">
        Her kalem için toplam tutarı yaz. Mağazadan veya ustadan aldığın kesin fiyatları “Kesin” olarak işaretle.
      </AppText>
      {COST_GROUP_ORDER.map((g) => (
        <Card key={g}>
          <NumberField
            label={COST_GROUP_LABEL[g]}
            unit="₺"
            value={lines[g].amount}
            onChangeText={(t) => set(g, { amount: t })}
            error={invalid.includes(g) ? 'Tutarı sayı olarak yazın.' : undefined}
            testID={`cost-${g}`}
          />
          <ChoiceChips
            options={[
              { value: 'estimate' as const, label: 'Tahmini' },
              { value: 'store' as const, label: 'Kesin' },
            ]}
            value={lines[g].source}
            onChange={(v) => set(g, { source: v })}
          />
        </Card>
      ))}
      <Card>
        <NumberField label="Bütçen (isteğe bağlı)" unit="₺" value={budget} onChangeText={setBudget} testID="quick-budget" />
      </Card>
      <CostSummaryCard summary={summary} />
      <View style={{ gap: space.sm }}>
        <Notice icon="information-circle">
          Malzeme miktarını bilmiyorsan önce Boya Hesapla ile litreyi bul. Projelerim’de malzeme listesi fiyatlarla birlikte otomatik hesaplanır.
        </Notice>
        <Button
          label={session ? 'Projelerime git' : 'Boya Hesapla'}
          variant="secondary"
          icon={session ? 'folder-open' : 'calculator'}
          onPress={() => router.push(session ? '/projects' : '/calculate')}
        />
      </View>
    </Screen>
  );
}
