import { emptyQuickCost, isInvalid, lineAmounts, quickCostSummary } from '@/features/cost/quick-cost';

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

describe('lineAmounts', () => {
  it('multiplies litres by the litre price and keeps totals as typed', () => {
    const form = {
      ...emptyQuickCost('10', '4'),
      paintPrice: { amount: '150', source: 'estimate' as const },
      primerPrice: { amount: '100', source: 'store' as const },
      filler: { amount: '380', source: 'estimate' as const },
    };
    expect(lineAmounts(form)).toEqual({ paint: 1500, primer: 400, filler: 380, supplies: null, labour: null, extras: {} });
  });

  it('treats the paint price as a total when litres are unknown and ignores labour when painting yourself', () => {
    const form = { ...emptyQuickCost(), paintPrice: { amount: '2500', source: 'estimate' as const }, labour: { amount: '4000', source: 'estimate' as const } };
    expect(lineAmounts(form).paint).toBe(2500);
    expect(lineAmounts(form).labour).toBeNull();
    expect(lineAmounts({ ...form, who: 'pro' }).labour).toBe(4000);
  });

  it('agrees with the summary total', () => {
    const form = {
      ...emptyQuickCost('2', ''),
      who: 'pro' as const,
      paintPrice: { amount: '200', source: 'estimate' as const },
      supplies: { amount: '520', source: 'estimate' as const },
      labour: { amount: '2800', source: 'estimate' as const },
      extras: { cleaning: { amount: '300', source: 'estimate' as const } },
    };
    const l = lineAmounts(form);
    const sum = [l.paint, l.primer, l.filler, l.supplies, l.labour, ...Object.values(l.extras)].reduce<number>((a, b) => a + (b ?? 0), 0);
    expect(sum).toBe(quickCostSummary(form).total);
  });
});
