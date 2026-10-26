import { lineTotal, quoteTotals } from '@/engine';

describe('quoteTotals', () => {
  const lines = [
    { kind: 'labor' as const, quantity: 62, unitPrice: 120 },
    { kind: 'material' as const, quantity: 2, unitPrice: 1850 },
    { kind: 'material' as const, quantity: 3, unitPrice: 85.5 },
    { kind: 'other' as const, quantity: 1, unitPrice: 400 },
  ];

  it('adds lines by kind, then discount, then VAT', () => {
    expect(quoteTotals(lines, 20, 500)).toEqual({
      byKind: { labor: 7440, material: 3956.5, other: 400 },
      subtotal: 11796.5,
      discount: 500,
      taxable: 11296.5,
      vat: 2259.3,
      total: 13555.8,
    });
  });

  it('never discounts below zero', () => {
    const t = quoteTotals([{ kind: 'labor', quantity: 1, unitPrice: 100 }], 20, 250);
    expect(t.discount).toBe(100);
    expect(t.total).toBe(0);
  });

  it('handles no VAT and an empty quote', () => {
    expect(quoteTotals(lines, 0, 0).total).toBe(11796.5);
    expect(quoteTotals([], 20, 0).total).toBe(0);
  });

  it('rounds each line to kuruş', () => {
    expect(lineTotal({ quantity: 3.33, unitPrice: 10.01 })).toBe(33.33);
    expect(quoteTotals([{ kind: 'other', quantity: 0.1, unitPrice: 0.2 }], 0, 0).total).toBe(0.02);
  });
});
