import { emptyQuickCost, isInvalid, quickCostSummary } from '@/features/cost/quick-cost';

describe('quickCostSummary', () => {
  it('multiplies litres by the litre price and adds the other lines', () => {
    const form = emptyQuickCost('13,9', '6');
    form.paintPrice = { amount: '200', source: 'store' };
    form.primerPrice = { amount: '100', source: 'estimate' };
    form.supplies = { amount: '450', source: 'estimate' };
    const s = quickCostSummary(form);
    expect(s.total).toBe(13.9 * 200 + 600 + 450);
    expect(s.store).toBe(2780);
    expect(s.groups.find((g) => g.group === 'paint')!.total).toBe(2780);
  });

  it('only counts labour when a painter does the job', () => {
    const form = emptyQuickCost('10');
    form.paintPrice = { amount: '100', source: 'estimate' };
    form.labour = { amount: '5000', source: 'estimate' };
    expect(quickCostSummary(form).total).toBe(1000);
    expect(quickCostSummary({ ...form, who: 'pro' }).total).toBe(6000);
  });

  it('treats the paint price as a total when litres are unknown', () => {
    const form = emptyQuickCost();
    form.paintPrice = { amount: '2500', source: 'estimate' };
    expect(quickCostSummary(form).total).toBe(2500);
  });

  it('adds switched-on extras and compares with the budget', () => {
    const form = emptyQuickCost();
    form.extras = { transport: { amount: '300', source: 'estimate' }, cleaning: { amount: '200', source: 'store' } };
    form.budget = '400';
    const s = quickCostSummary(form);
    expect(s.total).toBe(500);
    expect(s.budgetLeft).toBe(-100);
  });

  it('flags text that is not a number', () => {
    expect(isInvalid('12a')).toBe(true);
    expect(isInvalid('')).toBe(false);
    expect(isInvalid('1.250,5')).toBe(true);
    expect(isInvalid('1250,5')).toBe(false);
  });
});
