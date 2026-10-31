import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { compareQuotes, quoteTotals, type ComparedQuote } from '@/engine';
import { t } from '@/i18n';
import type { QuoteItemRow, QuoteRow } from '@/lib/database.types';
import { formatMoney } from '@/lib/number';
import { AppText, Badge, Button, Card, ListItem } from '@/ui/components';
import { radius, space, useFeatureColour, usePalette } from '@/ui/theme';

import { QUOTE_STATUS_LABEL } from './form';
import { formatDate } from './pdf';
import { useQuoteItems, useReceivedQuotes } from './queries';

/** Quotes still on the table: a withdrawn or turned-down quote is not compared. */
const COMPARABLE = new Set<QuoteRow['status']>(['sent', 'accepted']);

/** Totals of each quote from its lines, with the quote's own VAT and discount. */
export function compareReceived(quotes: QuoteRow[], items: QuoteItemRow[]): (ComparedQuote & { quote: QuoteRow })[] {
  const byQuote = new Map(quotes.map((q) => [q.id, q]));
  const compared = compareQuotes(
    quotes.map((q) => ({
      id: q.id,
      totals: quoteTotals(
        items
          .filter((i) => i.quote_id === q.id)
          .map((i) => ({
            kind: i.kind,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unit_price),
          })),
        Number(q.vat_rate),
        Number(q.discount),
      ),
    })),
  );
  return compared.map((c) => ({ ...c, quote: byQuote.get(c.id)! }));
}

/** Two or more quotes side by side: totals as bars from one baseline, cheapest first. */
function QuoteComparison({ quotes }: { quotes: QuoteRow[] }) {
  const p = usePalette();
  const f = useFeatureColour('cost');
  const items = useQuoteItems(quotes.map((q) => q.id));
  if (!items.data) return null;
  const rows = compareReceived(quotes, items.data);
  return (
    <View testID="quote-comparison">
      <Card>
        <AppText variant="heading">{t('Teklifleri karşılaştır')}</AppText>
        {rows.map((r) => (
          <View key={r.id} style={{ gap: 6 }} testID={`compare-${r.id}`}>
            <View style={styles.row}>
              <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                {r.quote.title}
              </AppText>
              <AppText variant="bodyStrong">{formatMoney(r.totals.total)}</AppText>
            </View>
            <View style={[styles.track, { backgroundColor: p.surfaceMuted }]}>
              <View
                style={[styles.bar, { width: `${Math.max(2, r.share * 100)}%`, backgroundColor: f.base }]}
              />
            </View>
            <View style={styles.row}>
              <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                {t('İşçilik {labor} · Malzeme {material}', {
                  labor: formatMoney(r.totals.byKind.labor),
                  material: formatMoney(r.totals.byKind.material),
                })}
              </AppText>
              {r.cheapest ? (
                <Badge label={t('En düşük fiyat')} tone="success" />
              ) : (
                <AppText variant="caption" tone="muted">
                  {`+${formatMoney(r.aboveCheapest)}`}
                </AppText>
              )}
            </View>
          </View>
        ))}
        <AppText variant="caption" tone="muted">
          {t('Toplamlara KDV ve indirim dahil. En düşük fiyat her zaman en iyi teklif değildir: işin kapsamına, malzemenin markasına ve geçerlilik tarihine de bak.')}
        </AppText>
        <Button label={t('Şehrindeki usta fiyatları')} icon="stats-chart" variant="ghost" onPress={() => router.push('/prices')} />
      </Card>
    </View>
  );
}

/** Quotes painters sent for this project. Hidden while there are none. */
export function ReceivedQuotes({ projectId }: { projectId: string }) {
  const quotes = useReceivedQuotes(projectId);
  if (!quotes.data || quotes.data.length === 0) return null;
  const comparable = quotes.data.filter((q) => COMPARABLE.has(q.status));
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="heading">{t('Gelen teklifler')}</AppText>
      {comparable.length >= 2 ? <QuoteComparison quotes={comparable} /> : null}
      {quotes.data.map((q) => (
        <ListItem
          key={q.id}
          title={q.title}
          subtitle={q.sent_at ? t('Gönderildi: {date}', { date: formatDate(q.sent_at) }) : undefined}
          onPress={() => router.push({ pathname: '/quotes/[id]', params: { id: q.id } })}>
          <View style={{ flexDirection: 'row' }}>
            <Badge label={t(QUOTE_STATUS_LABEL[q.status])} tone={q.status === 'accepted' ? 'success' : q.status === 'sent' ? 'primary' : 'muted'} />
          </View>
        </ListItem>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
});
