import { StyleSheet, useColorScheme, View } from 'react-native';

import { EXPENSE_CATEGORY_LABEL, EXPENSE_CATEGORY_ORDER, type ExpenseCategory, type HomeBudgetSummary } from '@/engine';
import { formatLira } from '@/features/market/format';
import { msg, t } from '@/i18n';
import { formatNumber } from '@/lib/number';
import { AppText } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { fonts, palettes, space, useFeatureColour, usePalette } from '@/ui/theme';

/**
 * One fixed colour per category, in the bar's fixed order, so a category keeps
 * its colour whatever the amounts. Checked as a categorical palette (lightness
 * band, colour-blind separation of neighbours) against the card surface in
 * each mode. Two light-mode colours sit under 3:1 on white, so every segment
 * is also named with its amount in the legend below the bar.
 */
export const CATEGORY_COLOURS: Record<'light' | 'dark', Record<ExpenseCategory, string>> = {
  light: { paint: '#EB6834', material: '#2A78D6', labor: '#1BAF7A', other: '#EDA100' },
  dark: { paint: '#D95926', material: '#3987E5', labor: '#199E70', other: '#C98500' },
};

export function useCategoryColours(): Record<ExpenseCategory, string> {
  return CATEGORY_COLOURS[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/** The budget meter on the navy panel, in both modes: the dark palette's sage and red stay light. */
export const METER_ON_TRACK = palettes.dark.sage;
export const METER_OVER = palettes.dark.danger;

const percent = (share: number) => `%${formatNumber(Math.round(share * 100), 0)}`;

/** Where the money went: one stacked bar and a legend that doubles as the table. */
export function CategoryBreakdown({ s }: { s: HomeBudgetSummary }) {
  const p = usePalette();
  const colours = useCategoryColours();
  const rows = EXPENSE_CATEGORY_ORDER.flatMap((category) => s.categories.filter((c) => c.category === category));
  const summary = rows.map((c) => `${t(EXPENSE_CATEGORY_LABEL[c.category])} ${percent(c.share)}`).join(', ');
  return (
    <View style={{ gap: space.md }}>
      <View style={styles.stack} accessibilityRole="image" accessibilityLabel={summary} testID="category-bar">
        {rows.map((c) => (
          <View key={c.category} style={{ flex: c.amount, backgroundColor: colours[c.category] }} />
        ))}
      </View>
      <View>
        {rows.map((c, i) => (
          <View key={c.category} style={[styles.legendRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }]}>
            <View style={[styles.key, { backgroundColor: colours[c.category] }]} />
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              {t(EXPENSE_CATEGORY_LABEL[c.category])}
            </AppText>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="bodyStrong">{formatLira(c.amount)}</AppText>
              <AppText variant="caption" tone="muted">
                {percent(c.share)}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Month names with the year, so "Aralık" the month never meets "Aralık" (a range). */
const MONTHS = [
  msg('Ocak {year}'),
  msg('Şubat {year}'),
  msg('Mart {year}'),
  msg('Nisan {year}'),
  msg('Mayıs {year}'),
  msg('Haziran {year}'),
  msg('Temmuz {year}'),
  msg('Ağustos {year}'),
  msg('Eylül {year}'),
  msg('Ekim {year}'),
  msg('Kasım {year}'),
  msg('Aralık {year}'),
];

/** "2026-10" → "Ekim 2026" */
export function monthLabel(month: string): string {
  const [year, m] = month.split('-');
  return t(MONTHS[Number(m) - 1], { year });
}

const CHART_HEIGHT = 112;

/**
 * Spending per month as bars from one baseline. A tap on a bar shows its
 * amount above the chart; the last month is shown first.
 */
export function MonthlyBars({
  months,
  selected,
  onSelect,
}: {
  months: { month: string; amount: number }[];
  selected: string;
  onSelect: (month: string) => void;
}) {
  const p = usePalette();
  const f = useFeatureColour('budget');
  const max = Math.max(...months.map((m) => m.amount), 1);
  const current = months.find((m) => m.month === selected) ?? months[months.length - 1];
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <AppText variant="small" tone="muted">
          {monthLabel(current.month)}
        </AppText>
        <AppText variant="heading" testID="month-total">
          {current.amount > 0 ? formatLira(current.amount) : t('Harcama yok')}
        </AppText>
      </View>
      <View style={[styles.plot, { borderColor: p.border }]}>
        {months.map((m) => {
          const on = m.month === current.month;
          const label = `${monthLabel(m.month)}: ${m.amount > 0 ? formatLira(m.amount) : t('Harcama yok')}`;
          return (
            <PressableScale
              key={m.month}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={label}
              onPress={() => onSelect(m.month)}
              style={styles.barSlot}>
              <View
                style={[
                  styles.bar,
                  {
                    height: m.amount > 0 ? Math.max(4, (m.amount / max) * CHART_HEIGHT) : 0,
                    backgroundColor: f.base,
                    opacity: on ? 1 : 0.45,
                  },
                ]}
              />
            </PressableScale>
          );
        })}
      </View>
      <View style={styles.axis}>
        {months.map((m) => (
          <AppText
            key={m.month}
            variant="caption"
            tone={m.month === current.month ? undefined : 'muted'}
            style={[styles.axisLabel, m.month === current.month && { fontFamily: fonts.semibold }]}>
            {monthLabel(m.month).split(' ')[0].slice(0, 3)}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', gap: 2, height: 14, borderRadius: 4, overflow: 'hidden' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  key: { width: 14, height: 14, borderRadius: 4 },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    height: CHART_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: 'row', gap: space.sm, marginTop: -space.sm },
  axisLabel: { flex: 1, textAlign: 'center' },
});
