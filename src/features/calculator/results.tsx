import { View } from 'react-native';

import type { Assumption } from '@/engine';
import { AppText, Badge, Card } from '@/ui/components';
import { space } from '@/ui/theme';

import { SOURCE_LABEL } from './labels';

export { packageText } from './labels';

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
