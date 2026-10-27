import { StyleSheet, View } from 'react-native';

import { COST_GROUP_LABEL, type CostGroup, type CostSummary } from '@/engine';
import { t } from '@/i18n';
import { formatMoney } from '@/lib/number';
import { Disclosure } from '@/ui/brand';
import { AppText, Badge, Icon, Notice, Row, type IconName } from '@/ui/components';
import { HeroPanel } from '@/ui/showcase';
import { fonts, radius, space, usePalette, type Palette } from '@/ui/theme';

type Tone = 'cta' | 'primary' | 'warning' | 'sage' | 'rose' | 'muted';

const GROUP_STYLE: Record<CostGroup, { icon: IconName; tone: Tone }> = {
  paint: { icon: 'color-fill', tone: 'cta' },
  primer: { icon: 'water', tone: 'primary' },
  filler: { icon: 'construct', tone: 'warning' },
  supplies: { icon: 'brush', tone: 'sage' },
  labor: { icon: 'person', tone: 'rose' },
  transport: { icon: 'car', tone: 'primary' },
  other: { icon: 'add-circle', tone: 'muted' },
};

/** Bar colour, icon tint and icon background for a group, from the palette. */
function toneColours(p: Palette, tone: Tone): { bar: string; ink: string; soft: string } {
  switch (tone) {
    case 'cta':
      return { bar: p.cta, ink: p.accent, soft: p.accentSoft };
    case 'primary':
      return { bar: p.primary, ink: p.primary, soft: p.primarySoft };
    case 'warning':
      return { bar: p.warning, ink: p.warning, soft: p.warningSoft };
    case 'sage':
      return { bar: p.sage, ink: p.sageInk, soft: p.sageSoft };
    case 'rose':
      return { bar: p.rose, ink: p.roseInk, soft: p.roseSoft };
    default:
      return { bar: p.textMuted, ink: p.textMuted, soft: p.surfaceMuted };
  }
}

/** Total in a big navy banner, then one card per cost group with a share bar. */
export function CostSummaryCard({ summary, showGroups = true }: { summary: CostSummary; showGroups?: boolean }) {
  const p = usePalette();
  const groups = summary.groups.filter((g) => g.total > 0 || g.missing > 0);
  return (
    <View style={{ gap: space.md }}>
      <HeroPanel liveRegion>
        <AppText variant="overline" style={{ color: p.onHeroMuted }}>
          {t('Tahmini toplam')}
        </AppText>
        <AppText variant="display" style={{ color: p.onHero, fontSize: 40, lineHeight: 46 }} testID="cost-total">
          {formatMoney(summary.total)}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Badge label={t('Kesin fiyat: {amount}', { amount: formatMoney(summary.store) })} tone="success" />
          <Badge label={t('Tahmini: {amount}', { amount: formatMoney(summary.estimate) })} tone="accent" />
        </View>
        {summary.budgetLeft !== null ? (
          <AppText variant="bodyStrong" style={{ color: p.onHero }}>
            {summary.budgetLeft >= 0 ? t('Bütçede kalan') : t('Bütçe aşımı')}: {formatMoney(Math.abs(summary.budgetLeft))}
          </AppText>
        ) : null}
      </HeroPanel>

      {showGroups && groups.length > 0 ? (
        <View style={styles.grid}>
          {groups.map((g) => {
            const style = GROUP_STYLE[g.group];
            const c = toneColours(p, style.tone);
            const share = summary.total > 0 ? g.total / summary.total : 0;
            return (
              <View key={g.group} style={styles.cell}>
                <View style={[styles.group, { backgroundColor: p.surface, borderColor: p.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <View style={[styles.groupIcon, { backgroundColor: c.soft }]}>
                      <Icon name={style.icon} size={14} color={c.ink} />
                    </View>
                    <AppText variant="small" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
                      {t(COST_GROUP_LABEL[g.group])}
                    </AppText>
                  </View>
                  <AppText variant="bodyStrong" style={{ fontFamily: fonts.extrabold, fontSize: 18 }}>
                    {formatMoney(g.total)}
                  </AppText>
                  <View style={[styles.bar, { backgroundColor: p.surfaceMuted }]}>
                    <View style={{ width: `${Math.round(share * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: c.bar }} />
                  </View>
                  {g.missing > 0 ? (
                    <AppText variant="caption" tone="danger">
                      {t('{count} kalem fiyatsız', { count: g.missing })}
                    </AppText>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {showGroups && groups.length > 0 ? (
        <Disclosure title={t('Detaylı döküm')}>
          {groups.map((g) => (
            <Row
              key={g.group}
              label={
                g.missing > 0
                  ? t('{group} ({count} fiyatsız)', { group: t(COST_GROUP_LABEL[g.group]), count: g.missing })
                  : t(COST_GROUP_LABEL[g.group])
              }
              value={formatMoney(g.total)}
            />
          ))}
          <Row strong label={t('Toplam')} value={formatMoney(summary.total)} />
        </Disclosure>
      ) : null}

      {summary.missingPrices > 0 ? (
        <Notice tone="accent">
          {t('{count} kalemin fiyatı girilmedi; toplam eksik. Fiyatları girdikçe toplam tamamlanır.', { count: summary.missingPrices })}
        </Notice>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -space.xs },
  cell: { width: '50%', padding: space.xs },
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.xs },
  groupIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
});
