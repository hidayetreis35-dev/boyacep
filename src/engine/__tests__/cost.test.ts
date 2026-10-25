import { groupOfCategory, summarizeCost, type PricedMaterial } from '@/engine';

const paint: PricedMaterial = { category: 'interior_paint', quantity: 2, unitPrice: 1850.5, priceSource: 'store' };
const primer: PricedMaterial = { category: 'primer', quantity: 1, unitPrice: 900, priceSource: 'estimate' };
const roller: PricedMaterial = { category: 'roller', quantity: 1, unitPrice: null, priceSource: 'estimate' };
const tape: PricedMaterial = { category: 'masking_tape', quantity: 3, unitPrice: 45, priceSource: 'estimate' };

describe('groupOfCategory', () => {
  it.each([
    ['interior_paint', 'paint'],
    ['ceiling_paint', 'paint'],
    ['exterior_paint', 'paint'],
    ['primer', 'primer'],
    ['filler', 'filler'],
    ['roller', 'supplies'],
    ['masking_tape', 'supplies'],
    ['drop_sheet', 'supplies'],
    ['other', 'other'],
  ] as const)('%s belongs to %s', (category, group) => {
    expect(groupOfCategory(category)).toBe(group);
  });
});

describe('summarizeCost', () => {
  it('returns zeros for an empty list', () => {
    const s = summarizeCost([], []);
    expect(s.total).toBe(0);
    expect(s.missingPrices).toBe(0);
    expect(s.budgetLeft).toBeNull();
    expect(s.groups).toHaveLength(7);
  });

  it('adds quantity x unit price per group and splits store vs estimate', () => {
    const s = summarizeCost(
      [paint, primer, roller, tape],
      [
        { kind: 'labor', amount: 12000, priceSource: 'store' },
        { kind: 'transport', amount: 500, priceSource: 'estimate' },
      ],
    );
    const by = Object.fromEntries(s.groups.map((g) => [g.group, g]));
    expect(by.paint).toEqual({ group: 'paint', total: 3701, store: 3701, missing: 0 });
    expect(by.primer.total).toBe(900);
    expect(by.supplies).toEqual({ group: 'supplies', total: 135, store: 0, missing: 1 });
    expect(by.labor.store).toBe(12000);
    expect(s.total).toBe(17236);
    expect(s.store).toBe(15701);
    expect(s.estimate).toBe(1535);
    expect(s.missingPrices).toBe(1);
  });

  it('does not count unpriced lines with zero quantity as missing', () => {
    expect(summarizeCost([{ ...roller, quantity: 0 }], []).missingPrices).toBe(0);
  });

  it('compares against the budget', () => {
    expect(summarizeCost([paint], [], 5000).budgetLeft).toBe(1299);
    expect(summarizeCost([paint], [], 3000).budgetLeft).toBe(-701);
  });

  it('avoids floating point drift on money', () => {
    const s = summarizeCost([{ category: 'other', quantity: 3, unitPrice: 0.1, priceSource: 'estimate' }], []);
    expect(s.total).toBe(0.3);
  });
});
