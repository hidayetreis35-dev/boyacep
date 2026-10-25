import { QUOTE_KIND_LABEL, lineTotal, quoteTotals, type QuoteItemKind } from '@/engine';
import type { ProProfileRow, QuoteItemRow, QuoteRow } from '@/lib/database.types';
import { escapeHtml } from '@/lib/html';
import { formatMoney, formatNumber } from '@/lib/number';

const multiline = (text: string) => escapeHtml(text).replace(/\n/g, '<br>');

/** "2026-10-25" → "25.10.2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

const KIND_ORDER: QuoteItemKind[] = ['labor', 'material', 'other'];

/** A printable A4 quote. Every value from users is escaped. */
export function quoteHtml(args: {
  quote: QuoteRow;
  items: QuoteItemRow[];
  pro: Pick<ProProfileRow, 'full_name' | 'business_name' | 'phone' | 'city'> | null;
}): string {
  const { quote, items, pro } = args;
  const lines = items.map((i) => ({ kind: i.kind, quantity: Number(i.quantity), unitPrice: Number(i.unit_price) }));
  const totals = quoteTotals(lines, Number(quote.vat_rate), Number(quote.discount));

  const rows = KIND_ORDER.flatMap((kind) => {
    const group = items.filter((i) => i.kind === kind);
    if (group.length === 0) return [];
    return [
      `<tr class="group"><td colspan="5">${QUOTE_KIND_LABEL[kind]}</td></tr>`,
      ...group.map(
        (i) => `<tr>
          <td>${escapeHtml(i.description)}</td>
          <td class="num">${formatNumber(Number(i.quantity), 2)}</td>
          <td>${escapeHtml(i.unit)}</td>
          <td class="num">${formatMoney(Number(i.unit_price))}</td>
          <td class="num">${formatMoney(lineTotal({ quantity: Number(i.quantity), unitPrice: Number(i.unit_price) }))}</td>
        </tr>`,
      ),
    ];
  }).join('');

  const from = pro
    ? [pro.business_name, pro.full_name, pro.city, pro.phone].filter(Boolean).map((v) => escapeHtml(String(v))).join('<br>')
    : '';
  const to = [quote.customer_name, quote.customer_contact].filter(Boolean).map(escapeHtml).join('<br>');

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>Teklif ${quote.number}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1B1F1E; font-size: 12px; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #12665F; }
  .muted { color: #5C6664; }
  .head { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
  .parties { display: flex; gap: 24px; margin-bottom: 20px; }
  .parties div { flex: 1; padding: 10px; border: 1px solid #E3E1DC; border-radius: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 6px 4px; border-bottom: 1px solid #E3E1DC; text-align: left; vertical-align: top; }
  th { font-size: 11px; color: #5C6664; }
  .num { text-align: right; white-space: nowrap; }
  tr.group td { font-weight: 700; background: #F3F6F5; }
  .totals { margin-top: 12px; margin-left: auto; width: 280px; }
  .totals td { border: none; padding: 3px 4px; }
  .grand td { font-size: 15px; font-weight: 700; border-top: 2px solid #12665F; }
  .notes { margin-top: 20px; }
  footer { margin-top: 32px; font-size: 10px; color: #5C6664; }
</style></head>
<body>
  <div class="head">
    <div><h1>${escapeHtml(quote.title)}</h1><div class="muted">Teklif No: ${quote.number}</div></div>
    <div class="muted" style="text-align:right">Tarih: ${formatDate(quote.sent_at ?? quote.created_at)}${
      quote.valid_until ? `<br>Geçerlilik: ${formatDate(quote.valid_until)}` : ''
    }</div>
  </div>
  <div class="parties">
    <div><strong>Teklifi veren</strong><br>${from || '<span class="muted">—</span>'}</div>
    <div><strong>Müşteri</strong><br>${to || '<span class="muted">—</span>'}</div>
  </div>
  <table>
    <thead><tr><th>Açıklama</th><th class="num">Miktar</th><th>Birim</th><th class="num">Birim fiyat</th><th class="num">Tutar</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td>Ara toplam</td><td class="num">${formatMoney(totals.subtotal)}</td></tr>
    ${totals.discount > 0 ? `<tr><td>İndirim</td><td class="num">-${formatMoney(totals.discount)}</td></tr>` : ''}
    <tr><td>KDV (%${formatNumber(Number(quote.vat_rate), 2)})</td><td class="num">${formatMoney(totals.vat)}</td></tr>
    <tr class="grand"><td>Genel toplam</td><td class="num">${formatMoney(totals.total)}</td></tr>
  </table>
  ${quote.notes ? `<div class="notes"><strong>Notlar</strong><br>${multiline(quote.notes)}</div>` : ''}
  <footer>Bu teklif BoyaCep ile hazırlanmıştır. Fiyatlar teklifi verenin beyanıdır.</footer>
</body></html>`;
}
