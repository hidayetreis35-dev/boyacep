import { round } from './round';
import type { MaterialCategory } from './types';

/** Where a price came from. Store prices were checked by the user at a shop. */
export type PriceSource = 'estimate' | 'store';

/** Cost groups from the spec: paint, primer, filler, supplies, labour, transport, other. */
export type CostGroup = 'paint' | 'primer' | 'filler' | 'supplies' | 'labor' | 'transport' | 'other';

export const COST_GROUP_LABEL: Record<CostGroup, string> = {
  paint: 'Boya',
  primer: 'Astar',
  filler: 'Macun',
  supplies: 'Yardımcı malzemeler',
  labor: 'İşçilik',
  transport: 'Ulaşım',
  other: 'Diğer giderler',
};

export const COST_GROUP_ORDER: CostGroup[] = ['paint', 'primer', 'filler', 'supplies', 'labor', 'transport', 'other'];

export function groupOfCategory(category: MaterialCategory): CostGroup {
  switch (category) {
    case 'interior_paint':
    case 'ceiling_paint':
    case 'exterior_paint':
      return 'paint';
    case 'primer':
      return 'primer';
    case 'filler':
      return 'filler';
    case 'other':
      return 'other';
    default:
      return 'supplies';
  }
}

export interface PricedMaterial {
  category: MaterialCategory;
  quantity: number;
  /** Per unit; null when the user has not entered a price. */
  unitPrice: number | null;
  priceSource: PriceSource;
}

export interface ExtraCost {
  kind: 'labor' | 'transport' | 'other';
  amount: number;
  priceSource: PriceSource;
}

export interface CostGroupTotal {
  group: CostGroup;
  total: number;
  /** Part of `total` backed by store prices. */
  store: number;
  /** Lines in this group with no price yet. */
  missing: number;
}

export interface CostSummary {
  groups: CostGroupTotal[];
  total: number;
  store: number;
  estimate: number;
  /** Material lines with no price; the total is incomplete while this is above 0. */
  missingPrices: number;
  /** Budget minus total; null without a budget. Negative means over budget. */
  budgetLeft: number | null;
}

export function summarizeCost(materials: PricedMaterial[], extras: ExtraCost[], budget: number | null = null): CostSummary {
  const acc = new Map<CostGroup, CostGroupTotal>(
    COST_GROUP_ORDER.map((group) => [group, { group, total: 0, store: 0, missing: 0 }]),
  );

  for (const m of materials) {
    const g = acc.get(groupOfCategory(m.category))!;
    if (m.unitPrice === null) {
      if (m.quantity > 0) g.missing += 1;
      continue;
    }
    const line = m.quantity * m.unitPrice;
    g.total += line;
    if (m.priceSource === 'store') g.store += line;
  }
  for (const e of extras) {
    const g = acc.get(e.kind)!;
    g.total += e.amount;
    if (e.priceSource === 'store') g.store += e.amount;
  }

  const groups = COST_GROUP_ORDER.map((group) => {
    const g = acc.get(group)!;
    return { group, total: round(g.total), store: round(g.store), missing: g.missing };
  });
  const total = round(groups.reduce((s, g) => s + g.total, 0));
  const store = round(groups.reduce((s, g) => s + g.store, 0));

  return {
    groups,
    total,
    store,
    estimate: round(total - store),
    missingPrices: groups.reduce((s, g) => s + g.missing, 0),
    budgetLeft: budget === null ? null : round(budget - total),
  };
}
