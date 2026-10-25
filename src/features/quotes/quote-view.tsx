import { View } from 'react-native';

import { QUOTE_KIND_LABEL, lineTotal, quoteTotals, type QuoteItemKind } from '@/engine';
import { VERIFICATION_LABEL } from '@/features/pros/form';
import type { ProProfileRow, QuoteItemRow, QuoteRow } from '@/lib/database.types';
import { formatMoney, formatNumber } from '@/lib/number';
import { AppText, Badge, Card, Row } from '@/ui/components';
import { space } from '@/ui/theme';

import { QUOTE_STATUS_LABEL } from './form';
import { formatDate } from './pdf';

const KIND_ORDER: QuoteItemKind[] = ['labor', 'material', 'other'];

export function QuoteTotalsCard({ items, vatRate, discount }: { items: { kind: QuoteItemKind; quantity: number; unitPrice: number }[]; vatRate: number; discount: number }) {
  const t = quoteTotals(items, vatRate, discount);
  return (
    <Card>
      {KIND_ORDER.filter((k) => t.byKind[k] > 0).map((k) => (
        <Row key={k} label={QUOTE_KIND_LABEL[k]} value={formatMoney(t.byKind[k])} />
      ))}
      <Row label="Ara toplam" value={formatMoney(t.subtotal)} />
      {t.discount > 0 ? <Row label="İndirim" value={`-${formatMoney(t.discount)}`} /> : null}
      <Row label={`KDV (%${formatNumber(vatRate, 2)})`} value={formatMoney(t.vat)} />
      <Row label="Genel toplam" value={formatMoney(t.total)} strong />
    </Card>
  );
}

/** Read-only quote, as both the painter and the homeowner see it. */
export function QuoteView({ quote, items, pro, showPro }: { quote: QuoteRow; items: QuoteItemRow[]; pro: ProProfileRow | null; showPro: boolean }) {
  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Badge
            label={QUOTE_STATUS_LABEL[quote.status]}
            tone={quote.status === 'accepted' ? 'success' : quote.status === 'sent' ? 'primary' : 'muted'}
          />
          <Badge label={`Teklif No: ${quote.number}`} />
        </View>
        <AppText variant="heading">{quote.title}</AppText>
        {quote.sent_at ? <Row label="Gönderildi" value={formatDate(quote.sent_at)} /> : null}
        {quote.valid_until ? <Row label="Geçerlilik" value={formatDate(quote.valid_until)} /> : null}
        {quote.responded_at ? <Row label="Yanıt" value={formatDate(quote.responded_at)} /> : null}
        {quote.customer_name ? <Row label="Müşteri" value={quote.customer_name} /> : null}
      </Card>

      {showPro && pro ? (
        <Card>
          <AppText variant="bodyStrong">{pro.business_name || pro.full_name}</AppText>
          {pro.business_name ? <AppText tone="muted">{pro.full_name}</AppText> : null}
          <AppText tone="muted">{pro.city}</AppText>
          <View style={{ flexDirection: 'row' }}>
            <Badge label={VERIFICATION_LABEL[pro.verification_status]} tone={pro.verification_status === 'verified' ? 'success' : 'muted'} />
          </View>
          {pro.show_phone && pro.phone ? <Row label="Telefon" value={pro.phone} /> : null}
        </Card>
      ) : null}

      {KIND_ORDER.map((kind) => {
        const group = items.filter((i) => i.kind === kind);
        if (group.length === 0) return null;
        return (
          <View key={kind} style={{ gap: space.sm }}>
            <AppText variant="heading">{QUOTE_KIND_LABEL[kind]}</AppText>
            <Card>
              {group.map((i) => (
                <View key={i.id} style={{ gap: 2 }}>
                  <AppText variant="bodyStrong">{i.description}</AppText>
                  <Row
                    label={`${formatNumber(Number(i.quantity), 2)} ${i.unit} × ${formatMoney(Number(i.unit_price))}`}
                    value={formatMoney(lineTotal({ quantity: Number(i.quantity), unitPrice: Number(i.unit_price) }))}
                  />
                </View>
              ))}
            </Card>
          </View>
        );
      })}

      <QuoteTotalsCard
        items={items.map((i) => ({ kind: i.kind, quantity: Number(i.quantity), unitPrice: Number(i.unit_price) }))}
        vatRate={Number(quote.vat_rate)}
        discount={Number(quote.discount)}
      />

      {quote.notes ? (
        <Card>
          <AppText variant="bodyStrong">Notlar</AppText>
          <AppText>{quote.notes}</AppText>
        </Card>
      ) : null}
    </>
  );
}
