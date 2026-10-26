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
