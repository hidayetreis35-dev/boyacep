import { DEFAULT_CAN_SIZES, planPackages } from '@/engine';

import { canFills } from '../cans';

describe('canFills', () => {
  it('lists every can, biggest first, and takes the leftover from the last ones', () => {
    // 26,4 L: 1 × 15 L + 1 × 7,5 L + 2 × 2,5 L = 27,5 L bought, 1,1 L left.
    const fills = canFills(planPackages(26.4, DEFAULT_CAN_SIZES));
    expect(fills.map((c) => c.size)).toEqual([15, 7.5, 2.5, 2.5]);
    expect(fills.slice(0, 3).every((c) => c.fill === 1)).toBe(true);
    expect(fills[3].fill).toBeCloseTo(0.56, 2);
  });

  it('spreads a big leftover over more than one can', () => {
    expect(canFills({ lines: [{ size: 2.5, count: 3 }], totalLitres: 7.5, leftover: 3 })).toEqual([
      { size: 2.5, fill: 1 },
      { size: 2.5, fill: 0.8 },
      { size: 2.5, fill: 0 },
    ]);
  });

  it('draws nothing for an empty plan', () => {
    expect(canFills({ lines: [], totalLitres: 0, leftover: 0 })).toEqual([]);
  });
});
