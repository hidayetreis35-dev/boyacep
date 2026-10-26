import { summarizeBudget, summarizeCost, type PricedMaterial } from '@/engine';

const paint: PricedMaterial = { category: 'interior_paint', quantity: 2, unitPrice: 2000, priceSource: 'store' };
const primer: PricedMaterial = { category: 'primer', quantity: 1, unitPrice: 800, priceSource: 'estimate' };
const roller: PricedMaterial = { category: 'roller', quantity: 1, unitPrice: null, priceSource: 'estimate' };
// Plan: paint 4000, material 800 (+1 missing price), labour 6000 → 10 800.
const plan = summarizeCost([paint, primer, roller], [{ kind: 'labor', amount: 6000, priceSource: 'estimate' }]);

describe('summarizeBudget', () => {
  it('puts planned cost groups into spending categories', () => {
    const s = summarizeBudget(plan, [], null);
    expect(s.lines).toEqual([
      { category: 'paint', planned: 4000, spent: 0 },
      { category: 'material', planned: 800, spent: 0 },
      { category: 'labor', planned: 6000, spent: 0 },
      { category: 'other', planned: 0, spent: 0 },
    ]);
    expect(s.planned).toBe(10800);
    expect(s.missingPrices).toBe(1);
  });

  it('has no budget status without a budget', () => {
    const s = summarizeBudget(plan, [{ category: 'paint', amount: 1000 }], null);
    expect(s).toMatchObject({ status: 'no-budget', budget: null, left: null, usedShare: null, forecastOver: false, spent: 1000 });
  });

  it('treats a zero budget as no budget', () => {
    expect(summarizeBudget(plan, [], 0).status).toBe('no-budget');
  });

  it('adds up spending per category and what is left', () => {
    const s = summarizeBudget(plan, [{ category: 'paint', amount: 3900.4 }, { category: 'paint', amount: 99.6 }, { category: 'labor', amount: 2000 }], 15000);
    expect(s.lines[0]).toEqual({ category: 'paint', planned: 4000, spent: 4000 });
    expect(s.spent).toBe(6000);
    expect(s.left).toBe(9000);
    expect(s.usedShare).toBeCloseTo(0.4);
    expect(s.status).toBe('on-track');
  });

  it('forecasts with whichever is larger per category', () => {
    // Paint went 1000 over its plan; labour not paid yet. 5000 + 800 + 6000.
    const s = summarizeBudget(plan, [{ category: 'paint', amount: 5000 }], 11000);
    expect(s.forecast).toBe(11800);
    expect(s.status).toBe('on-track');
    expect(s.forecastOver).toBe(true);
  });

  it('warns near the limit and when over', () => {
    expect(summarizeBudget(plan, [{ category: 'other', amount: 9000 }], 10000).status).toBe('near-limit');
    const over = summarizeBudget(plan, [{ category: 'other', amount: 10500 }], 10000);
    expect(over.status).toBe('over');
    expect(over.left).toBe(-500);
    expect(over.forecastOver).toBe(false);
  });
});
