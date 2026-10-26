import { View } from 'react-native';

import { RECOMMENDATION_KIND_LABEL, RECOMMENDATION_LEVEL_LABEL, recommendMaterials, type RecommendInput, type RoomUse } from '@/engine';
import { t } from '@/i18n';
import { Disclosure } from '@/ui/brand';
import { AppText, Badge } from '@/ui/components';
import { space } from '@/ui/theme';

import type { SpaceKind } from './wizard';

export function roomUse(kind: SpaceKind): RoomUse {
  return kind === 'kitchen' ? 'kitchen' : kind === 'bathroom' ? 'bathroom' : 'dry';
}

const LEVEL_TONE = { required: 'accent', recommended: 'primary', optional: 'muted' } as const;

/** Which product types to buy for this wall, with the reason for each. */
export function ProductAdvice({ input }: { input: RecommendInput }) {
  const recs = recommendMaterials(input);
  return (
    <Disclosure title={t('Hangi ürünü almalıyım?')}>
      {recs.map((r) => (
        <View key={r.product} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <AppText variant="bodyStrong" style={{ flexShrink: 1 }}>
              {t(r.product)}
            </AppText>
            <Badge label={t(RECOMMENDATION_LEVEL_LABEL[r.level])} tone={LEVEL_TONE[r.level]} />
          </View>
          <AppText variant="caption" tone="muted">
            {`${t(RECOMMENDATION_KIND_LABEL[r.kind])} · ${t(r.reason)}`}
          </AppText>
        </View>
      ))}
      <AppText variant="caption" tone="muted">
        {t('Genel öneridir, marka önermez. Ürünü seçerken kutudaki teknik bilgiyi oku; emin değilsen ustana ya da boya bayine danış.')}
      </AppText>
    </Disclosure>
  );
}
