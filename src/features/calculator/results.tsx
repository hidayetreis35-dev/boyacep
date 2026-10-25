import { View } from 'react-native';

import type { Assumption, PackagePlan } from '@/engine';
import { formatNumber } from '@/lib/number';
import { AppText, Badge, Card } from '@/ui/components';
import { space } from '@/ui/theme';

import { SOURCE_LABEL } from './labels';

export function packageText(plan: PackagePlan): string {
  return plan.lines.map((l) => `${l.count} × ${formatNumber(l.size)} L`).join(' + ');
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
