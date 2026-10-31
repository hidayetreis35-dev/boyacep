import { round } from './round';

export type QuoteItemKind = 'labor' | 'material' | 'other';

export const QUOTE_KIND_LABEL: Record<QuoteItemKind, string> = {
  labor: 'İşçilik',
  material: 'Malzeme',
  other: 'Diğer',
};

export interface QuoteLine {
  kind: QuoteItemKind;
  quantity: number;
  unitPrice: number;
}

export interface QuoteTotals {
  /** Line totals by kind, before discount and VAT. */
  byKind: Record<QuoteItemKind, number>;
  subtotal: number;
  /** Discount actually applied; never more than the subtotal. */
  discount: number;
  taxable: number;
  vat: number;
  total: number;
}

export const lineTotal = (line: Pick<QuoteLine, 'quantity' | 'unitPrice'>) => round(line.quantity * line.unitPrice, 2);

/** Quote totals in kuruş-exact steps: lines → subtotal → discount → VAT on the remainder. */
export function quoteTotals(lines: QuoteLine[], vatRate: number, discount: number): QuoteTotals {
  const byKind: Record<QuoteItemKind, number> = { labor: 0, material: 0, other: 0 };
  for (const line of lines) byKind[line.kind] = round(byKind[line.kind] + lineTotal(line), 2);
  const subtotal = round(byKind.labor + byKind.material + byKind.other, 2);
  const appliedDiscount = round(Math.min(Math.max(discount, 0), subtotal), 2);
  const taxable = round(subtotal - appliedDiscount, 2);
  const vat = round((taxable * Math.max(vatRate, 0)) / 100, 2);
  return { byKind, subtotal, discount: appliedDiscount, taxable, vat, total: round(taxable + vat, 2) };
}

export interface QuoteForComparison {
  id: string;
  totals: QuoteTotals;
}

export interface ComparedQuote extends QuoteForComparison {
  cheapest: boolean;
  /** How much more than the cheapest quote; 0 for the cheapest. */
  aboveCheapest: number;
  /** total / highest total, 0..1, for bars drawn from one baseline. */
  share: number;
}

/**
 * Quotes side by side, cheapest first. Only price is compared: scope,
 * materials and dates are for the homeowner to read, so nothing here says
 * which quote is "best".
 */
export function compareQuotes(quotes: QuoteForComparison[]): ComparedQuote[] {
  if (quotes.length === 0) return [];
  const sorted = [...quotes].sort((a, b) => a.totals.total - b.totals.total);
  const low = sorted[0].totals.total;
  const high = sorted[sorted.length - 1].totals.total;
  return sorted.map((q) => ({
    ...q,
    cheapest: q.totals.total === low,
    aboveCheapest: round(q.totals.total - low, 2),
    share: high > 0 ? q.totals.total / high : 0,
  }));
}
