import { summarizeCost, type CostSummary, type ExtraCost, type PricedMaterial, type PriceSource } from '@/engine';
import { parseDecimal } from '@/lib/number';

/** Who does the work decides which lines are asked for. */
export type WhoPaints = 'self' | 'pro';

export const WHO_OPTIONS: { value: WhoPaints; label: string; hint: string }[] = [
  { value: 'self', label: 'Kendim boyayacağım', hint: 'Sadece malzeme' },
  { value: 'pro', label: 'Usta boyayacak', hint: 'Malzeme ve işçilik' },
];

/** Optional extras the user can switch on. */
export type ExtraKind = 'transport' | 'protection' | 'cleaning';
export const EXTRA_OPTIONS: { value: ExtraKind; label: string }[] = [
  { value: 'transport', label: 'Taşıma / nakliye' },
  { value: 'protection', label: 'Eşya koruma' },
  { value: 'cleaning', label: 'İş sonu temizlik' },
];

export type Price = { amount: string; source: PriceSource };

export interface QuickCostForm {
  who: WhoPaints;
  paintLitres: string;
  primerLitres: string;
  /** Per litre. */
  paintPrice: Price;
  /** Per litre. */
  primerPrice: Price;
  /** Totals. */
  filler: Price;
  supplies: Price;
  labour: Price;
  extras: Partial<Record<ExtraKind, Price>>;
  budget: string;
}

export const emptyPrice = (): Price => ({ amount: '', source: 'estimate' });

export function emptyQuickCost(paintLitres = '', primerLitres = ''): QuickCostForm {
  return {
    who: 'self',
    paintLitres,
    primerLitres,
    paintPrice: emptyPrice(),
    primerPrice: emptyPrice(),
    filler: emptyPrice(),
    supplies: emptyPrice(),
    labour: emptyPrice(),
    extras: {},
    budget: '',
  };
}

const value = (text: string): number | null => {
  if (text.trim() === '') return null;
  const n = parseDecimal(text);
  return Number.isFinite(n) ? n : null;
};

/** True when text was typed but is not a number. */
export const isInvalid = (text: string) => text.trim() !== '' && value(text) === null;

/** Turns the form into the shared cost engine's input. Labour only counts when a painter does the job. */
export function quickCostSummary(form: QuickCostForm): CostSummary {
  const materials: PricedMaterial[] = [];
  const litres = value(form.paintLitres);
  const paintPrice = value(form.paintPrice.amount);
  if (litres !== null && paintPrice !== null) {
    materials.push({ category: 'interior_paint', quantity: litres, unitPrice: paintPrice, priceSource: form.paintPrice.source });
  } else if (litres === null && paintPrice !== null) {
    // No litres yet: treat the typed amount as the total paint cost.
    materials.push({ category: 'interior_paint', quantity: 1, unitPrice: paintPrice, priceSource: form.paintPrice.source });
  }
  const primerLitres = value(form.primerLitres);
  const primerPrice = value(form.primerPrice.amount);
  if (primerLitres !== null && primerLitres > 0 && primerPrice !== null) {
    materials.push({ category: 'primer', quantity: primerLitres, unitPrice: primerPrice, priceSource: form.primerPrice.source });
  }
  const filler = value(form.filler.amount);
  if (filler !== null) materials.push({ category: 'filler', quantity: 1, unitPrice: filler, priceSource: form.filler.source });
  const supplies = value(form.supplies.amount);
  if (supplies !== null) materials.push({ category: 'roller', quantity: 1, unitPrice: supplies, priceSource: form.supplies.source });

  const extras: ExtraCost[] = [];
  const labour = value(form.labour.amount);
  if (form.who !== 'self' && labour !== null) extras.push({ kind: 'labor', amount: labour, priceSource: form.labour.source });
  for (const [kind, price] of Object.entries(form.extras) as [ExtraKind, Price][]) {
    const amount = value(price.amount);
    if (amount !== null) extras.push({ kind: kind === 'transport' ? 'transport' : 'other', amount, priceSource: price.source });
  }

  const budget = value(form.budget);
  return summarizeCost(materials, extras, budget);
}
