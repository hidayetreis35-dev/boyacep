import { summarizePrices } from '@/engine';
import { cleanChoice } from '@/features/market/city';
import { PILOT_PROVINCES, PROVINCES, searchProvinces } from '@/features/market/provinces';
import {
  compareProvinces,
  compareSummaries,
  hasProvinceData,
  homeTotal,
  marketReference,
  paintCost,
  provincesWithData,
  shownRange,
} from '@/features/market/regional';
import { SNAPSHOT, SNAPSHOT_AS_OF } from '@/features/market/snapshot';
import { MARKET_SOURCES, MATERIAL_PRICES } from '@/features/market/sources';

describe('provinces', () => {
  it('lists all 81 provinces with unique plate codes', () => {
    expect(PROVINCES).toHaveLength(81);
    expect(new Set(PROVINCES.map((p) => p.code)).size).toBe(81);
    expect(PROVINCES.map((p) => p.code)).toEqual(Array.from({ length: 81 }, (_, i) => String(i + 1).padStart(2, '0')));
  });

  it('finds provinces without Turkish letters or by plate code', () => {
    expect(searchProvinces('izm').map((p) => p.name)).toEqual(['İzmir']);
    expect(searchProvinces('45').map((p) => p.name)).toEqual(['Manisa']);
    expect(searchProvinces('cank').map((p) => p.name)).toEqual(['Çankırı']);
    expect(searchProvinces('zzz')).toEqual([]);
  });
});

describe('snapshot', () => {
  it('covers the pilot provinces and Türkiye, with known sources only', () => {
    for (const code of [...PILOT_PROVINCES, 'TR']) expect(SNAPSHOT[code]).toBeDefined();
    for (const stats of Object.values(SNAPSHOT)) {
      for (const scope of [stats.labour, stats.materials]) {
        for (const id of scope.sources) expect(MARKET_SOURCES[id]).toBeDefined();
      }
    }
  });

  it('never shows a median or mean that its quality does not allow', () => {
    for (const stats of Object.values(SNAPSHOT)) {
      for (const s of [stats.labour.perM2, stats.labour.room, stats.materials.perM2, stats.materials.room]) {
        if (s.quality !== 'strong') expect(s.mean).toBeNull();
        if (s.quality === 'limited' || s.quality === 'insufficient') expect(s.median).toBeNull();
        if (s.quality === 'insufficient') expect([s.low, s.high]).toEqual([null, null]);
        else expect(s.low!).toBeLessThanOrEqual(s.high!);
      }
    }
  });

  it('is dated no later than today', () => {
    expect(SNAPSHOT_AS_OF <= new Date().toISOString().slice(0, 10)).toBe(true);
  });
});

describe('marketReference', () => {
  it('uses the chosen province when it has data', () => {
    const r = marketReference('35', 'materials');
    expect(r).toMatchObject({ code: '35', fallback: null });
    expect(r.summary).toBe(SNAPSHOT['35'].materials.perM2);
  });

  it('falls back to Türkiye, never to another province', () => {
    expect(marketReference('02', 'labour')).toMatchObject({ code: 'TR', fallback: 'no_data' }); // Adıyaman: no page
    expect(marketReference(null, 'labour')).toMatchObject({ code: 'TR', fallback: 'no_city' });
    expect(marketReference('99', 'labour')).toMatchObject({ code: 'TR', fallback: 'no_city' });
    // Manisa single rooms: too few records.
    expect(marketReference('45', 'labour', 'room')).toMatchObject({ code: 'TR', fallback: 'insufficient' });
  });

  it('lists only provinces with usable data', () => {
    const codes = provincesWithData('labour');
    expect(codes).toContain('45');
    expect(codes).toContain('35');
    expect(codes).not.toContain('TR');
    expect(codes.every((c) => hasProvinceData(c, 'labour'))).toBe(true);
  });
});

describe('totals', () => {
  it('scales a per-m² reference to a home and rounds it', () => {
    const r = marketReference('TR', 'labour');
    const total = homeTotal(r, 90)!;
    expect(total.low).toBeGreaterThan(0);
    expect(total.low % 500).toBe(0);
    expect(total.high).toBeGreaterThanOrEqual(total.low);
  });

  it('gives no total for a room reference or missing data', () => {
    expect(homeTotal(marketReference('TR', 'labour', 'room'), 90)).toBeNull();
  });

  it('shows per-m² ranges in whole lira', () => {
    const range = shownRange(marketReference('35', 'labour'))!;
    expect(Number.isInteger(range.low) && Number.isInteger(range.high)).toBe(true);
  });

  it('prices paint from shop prices', () => {
    const { low, high } = MATERIAL_PRICES.interior_paint;
    expect(paintCost(30)).toEqual({ low: Math.round((30 * low) / 500) * 500, high: Math.round((30 * high) / 500) * 500 });
    expect(paintCost(0)).toBeNull();
  });
});

describe('compareProvinces', () => {
  it('claims nothing while one side has only limited data', () => {
    expect(SNAPSHOT['45'].labour.perM2.quality).toBe('limited');
    expect(compareProvinces('45', '35', 'labour')).toEqual({ verdict: 'unknown' });
    expect(compareProvinces('45', '35', 'materials')).toEqual({ verdict: 'unknown' });
    expect(compareProvinces('02', '35', 'materials')).toEqual({ verdict: 'unknown' });
  });

  it('only claims a difference when the middle halves do not overlap', () => {
    const obs = (from: number, sources = 2) =>
      Array.from({ length: 12 }, (_, i) => ({ value: from + i, observed: '2026-10-01', sourceId: `s${i % sources}`, kind: 'quote' as const }));
    const cheap = summarizePrices(obs(100), '2026-10-25');
    const dear = summarizePrices(obs(200), '2026-10-25');
    const close = summarizePrices(obs(104), '2026-10-25');
    expect(cheap.quality).toBe('medium');
    const higher = compareSummaries(dear, cheap);
    expect(higher.verdict).toBe('higher');
    expect(higher.verdict === 'higher' && Math.round(higher.difference * 100)).toBe(95);
    expect(compareSummaries(cheap, dear).verdict).toBe('lower');
    expect(compareSummaries(cheap, close)).toEqual({ verdict: 'similar' });
    // One publisher only: limited, so no claim even with a big gap.
    expect(compareSummaries(summarizePrices(obs(200, 1), '2026-10-25'), cheap)).toEqual({ verdict: 'unknown' });
  });
});

describe('city choice', () => {
  it('keeps only known provinces and their districts', () => {
    expect(cleanChoice({ province: '45', district: 'Turgutlu' })).toEqual({ province: '45', district: 'Turgutlu', answered: true });
    expect(cleanChoice({ province: '45', district: 'Bornova' })).toEqual({ province: '45', district: null, answered: true });
    expect(cleanChoice({ province: '99' })).toEqual({ province: null, district: null, answered: false });
    expect(cleanChoice({ province: null, answered: true })).toEqual({ province: null, district: null, answered: true });
    expect(cleanChoice('junk')).toEqual({ province: null, district: null, answered: false });
  });
});
