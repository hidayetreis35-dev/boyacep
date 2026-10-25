import { StyleSheet, View } from 'react-native';

import { COST_GROUP_LABEL, type CostGroup, type CostSummary } from '@/engine';
import { formatMoney } from '@/lib/number';
import { Disclosure, Gradient } from '@/ui/brand';
import { AppText, Badge, Icon, Notice, Row, type IconName } from '@/ui/components';
import { fonts, radius, space, useFeatureColour, usePalette } from '@/ui/theme';

const GROUP_STYLE: Record<CostGroup, { icon: IconName; colour: string }> = {
  paint: { icon: 'color-fill', colour: '#FF6B2C' },
  primer: { icon: 'water', colour: '#0EA5B7' },
  filler: { icon: 'construct', colour: '#D99A1E' },
  supplies: { icon: 'brush', colour: '#4C5FD5' },
  labor: { icon: 'person', colour: '#C2367A' },
  transport: { icon: 'car', colour: '#0E9F7E' },
  other: { icon: 'add-circle', colour: '#6B7280' },
};

/** Total in a big teal banner, then one card per cost group with a share bar. */
export function CostSummaryCard({ summary, showGroups = true }: { summary: CostSummary; showGroups?: boolean }) {
  const p = usePalette();
  const f = useFeatureColour('cost');
  const groups = summary.groups.filter((g) => g.total > 0 || g.missing > 0);
  return (
    <View style={{ gap: space.md }}>
      <View style={styles.hero} accessibilityLiveRegion="polite">
        <Gradient from={f.base} to="#1B2B4B" />
        <AppText variant="overline" style={{ color: '#FFFFFF', opacity: 0.9 }}>
          Tahmini toplam
        </AppText>
        <AppText variant="display" style={{ color: '#FFFFFF', fontSize: 40, lineHeight: 46 }} testID="cost-total">
          {formatMoney(summary.total)}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Badge label={`Kesin fiyat: ${formatMoney(summary.store)}`} tone="success" />
          <Badge label={`Tahmini: ${formatMoney(summary.estimate)}`} tone="accent" />
        </View>
        {summary.budgetLeft !== null ? (
          <AppText variant="bodyStrong" style={{ color: '#FFFFFF' }}>
            {summary.budgetLeft >= 0 ? 'Bütçede kalan' : 'Bütçe aşımı'}: {formatMoney(Math.abs(summary.budgetLeft))}
          </AppText>
        ) : null}
      </View>

      {showGroups && groups.length > 0 ? (
        <View style={styles.grid}>
          {groups.map((g) => {
            const style = GROUP_STYLE[g.group];
            const share = summary.total > 0 ? g.total / summary.total : 0;
            return (
              <View key={g.group} style={styles.cell}>
                <View style={[styles.group, { backgroundColor: p.surface, borderColor: p.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <View style={[styles.groupIcon, { backgroundColor: style.colour }]}>
                      <Icon name={style.icon} size={14} color="#FFFFFF" />
                    </View>
                    <AppText variant="small" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
                      {COST_GROUP_LABEL[g.group]}
                    </AppText>
                  </View>
                  <AppText variant="bodyStrong" style={{ fontFamily: fonts.extrabold, fontSize: 18 }}>
                    {formatMoney(g.total)}
                  </AppText>
                  <View style={[styles.bar, { backgroundColor: p.surfaceMuted }]}>
                    <View style={{ width: `${Math.round(share * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: style.colour }} />
                  </View>
                  {g.missing > 0 ? (
                    <AppText variant="caption" tone="danger">
                      {g.missing} kalem fiyatsız
                    </AppText>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {showGroups && groups.length > 0 ? (
        <Disclosure title="Detaylı döküm">
          {groups.map((g) => (
            <Row
              key={g.group}
              label={`${COST_GROUP_LABEL[g.group]}${g.missing > 0 ? ` (${g.missing} fiyatsız)` : ''}`}
              value={formatMoney(g.total)}
            />
          ))}
          <Row strong label="Toplam" value={formatMoney(summary.total)} />
        </Disclosure>
      ) : null}

      {summary.missingPrices > 0 ? (
        <Notice tone="accent">
          {summary.missingPrices} kalemin fiyatı girilmedi; toplam eksik. Fiyatları girdikçe toplam tamamlanır.
        </Notice>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.sm, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -space.xs },
  cell: { width: '50%', padding: space.xs },
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.xs },
  groupIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
});
