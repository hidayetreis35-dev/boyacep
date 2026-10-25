import {
  addRanges,
  ageInDays,
  flagOutliers,
  materialCost,
  MAX_AGE_DAYS,
  quantile,
  roundPrice,
  scaleRange,
  summarizePrices,
  type PriceObservation,
} from '@/engine';

const AS_OF = '2026-10-25';

/** Observations spread over `sources` publishers, all made on one date. */
function obs(values: number[], sources = 1, observed = '2026-10-01'): PriceObservation[] {
  return values.map((value, i) => ({ value, observed, sourceId: `s${i % sources}`, kind: 'platform_request' }));
}

const range = (n: number, from = 100) => Array.from({ length: n }, (_, i) => from + i);

describe('quantile', () => {
  it('interpolates between neighbours', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([10, 20, 30, 40, 50], 0.25)).toBe(20);
    expect(quantile([7], 0.75)).toBe(7);
  });

  it('refuses an empty list', () => {
    expect(() => quantile([], 0.5)).toThrow();
  });
});

describe('flagOutliers', () => {
  it('flags only values more than 4x from the median in a small sample', () => {
    expect(flagOutliers([100, 120, 140, 1000])).toEqual([false, false, false, true]);
    expect(flagOutliers([100, 120, 140, 350])).toEqual([false, false, false, false]);
  });

  it('uses log-scale Tukey fences from 8 values', () => {
    const values = [...range(10, 100), 2000];
    const flags = flagOutliers(values);
    expect(flags.at(-1)).toBe(true);
    expect(flags.slice(0, -1).every((f) => !f)).toBe(true);
  });

  it('keeps the input order and handles an empty list', () => {
    expect(flagOutliers([])).toEqual([]);
    expect(flagOutliers([5000, 100, 110, 120])).toEqual([true, false, false, false]);
  });
});

describe('summarizePrices', () => {
  it('is insufficient with no data or too few observations', () => {
    expect(summarizePrices([], AS_OF)).toMatchObject({ quality: 'insufficient', low: null, high: null, median: null });
    expect(summarizePrices(obs([100, 120, 140, 160]), AS_OF).quality).toBe('insufficient');
  });

  it('shows the observed min–max but no median for limited data', () => {
    const s = summarizePrices(obs([100, 120, 140, 160, 180]), AS_OF);
    expect(s).toMatchObject({ quality: 'limited', low: 100, high: 180, middleHalf: false, median: null, mean: null });
  });

  it('switches to the middle half from 10 observations, even when only limited', () => {
    const s = summarizePrices(obs(range(12)), AS_OF);
    expect(s.quality).toBe('limited'); // one source
    expect(s.middleHalf).toBe(true);
    expect(s.low).toBe(quantile(range(12), 0.25));
    expect(s.high).toBe(quantile(range(12), 0.75));
  });

  it('gives a median but no mean for medium data', () => {
    const s = summarizePrices(obs(range(12), 2), AS_OF);
    expect(s.quality).toBe('medium');
    expect(s.median).toBe(105.5);
    expect(s.mean).toBeNull();
  });

  it('gives median and mean for strong data', () => {
    const s = summarizePrices(obs(range(30), 3), AS_OF);
    expect(s.quality).toBe('strong');
    expect(s.median).toBe(114.5);
    expect(s.mean).toBe(114.5);
    expect(s.sources).toBe(3);
  });

  it('lowers the level when the newest record is old', () => {
    expect(summarizePrices(obs(range(30), 3, '2026-06-01'), AS_OF).quality).toBe('medium');
    expect(summarizePrices(obs(range(30), 3, '2026-01-01'), AS_OF).quality).toBe('limited');
    expect(summarizePrices(obs(range(30), 3, '2025-06-01'), AS_OF).quality).toBe('insufficient');
  });

  it('leaves out records older than the maximum age and counts them', () => {
    const old = obs([100, 110], 1, '2023-01-01');
    const s = summarizePrices([...obs(range(5)), ...old], AS_OF);
    expect(ageInDays('2023-01-01', AS_OF)).toBeGreaterThan(MAX_AGE_DAYS);
    expect(s.stale).toBe(2);
    expect(s.observations).toBe(5);
    expect(s.oldest).toBe('2026-10-01');
  });

  it('flags outliers instead of using them', () => {
    const s = summarizePrices(obs([100, 110, 120, 130, 140, 362_500]), AS_OF);
    expect(s.outliers).toBe(1);
    expect(s.observations).toBe(5);
    expect(s.high).toBe(140);
  });

  it('ignores zero, negative and non-numeric values', () => {
    const s = summarizePrices(obs([0, -5, Number.NaN, 100, 110, 120, 130, 140]), AS_OF);
    expect(s.observations).toBe(5);
    expect(s.low).toBe(100);
  });

  it('counts several records of one publisher as one source', () => {
    expect(summarizePrices(obs(range(40), 1), AS_OF)).toMatchObject({ sources: 1, quality: 'limited' });
  });
});

describe('roundPrice', () => {
  it('rounds to 10 below 1000 and to 500 above', () => {
    expect(roundPrice(144)).toBe(140);
    expect(roundPrice(145)).toBe(150);
    expect(roundPrice(12_240)).toBe(12_000);
    expect(roundPrice(12_260)).toBe(12_500);
  });
});

describe('scaleRange and materialCost', () => {
  it('scales a per-m² range by area', () => {
    expect(scaleRange({ low: 100, high: 150 }, 90)).toEqual({ low: 9000, high: 13_500 });
  });

  it('gives no total without a range or an area', () => {
    expect(scaleRange({ low: null, high: null }, 90)).toBeNull();
    expect(scaleRange({ low: 100, high: 150 }, 0)).toBeNull();
  });

  it('adds material quantities times their price range', () => {
    const cost = materialCost([
      { quantity: 30, price: { low: 160, high: 330 } },
      { quantity: 5, price: { low: 240, high: 300 } },
      { quantity: 0, price: { low: 999, high: 999 } },
    ]);
    expect(cost).toEqual({ low: roundPrice(30 * 160 + 5 * 240), high: roundPrice(30 * 330 + 5 * 300) });
    expect(materialCost([])).toBeNull();
  });

  it('adds two ranges only when both exist', () => {
    expect(addRanges({ low: 1, high: 2 }, { low: 3, high: 4 })).toEqual({ low: 4, high: 6 });
    expect(addRanges({ low: 1, high: 2 }, null)).toBeNull();
  });
});
