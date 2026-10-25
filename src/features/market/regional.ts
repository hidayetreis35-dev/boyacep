import { ageInDays, ageSummary, materialCost, roundPrice, scaleRange, type PriceSummary, type RangeEstimate } from '@/engine';

import { MATERIAL_PRICES } from './sources';
import { SNAPSHOT, SNAPSHOT_AS_OF } from './snapshot';
import { provinceByCode, type ProvinceCode } from './provinces';
import type { MarketScope } from './types';

/**
 * Regional price references. Deterministic: only the snapshot's statistics
 * and plain arithmetic, no AI. A province's numbers are never used for
 * another province; when a province has too little data the answer is the
 * Türkiye-wide figure, marked as a fallback.
 */

export type PriceUnit = 'perM2' | 'room';

/** Why a reference is not the chosen province's own. */
export type FallbackReason = 'no_city' | 'no_data' | 'insufficient';

export interface MarketReference {
  /** The province whose numbers these are, or 'TR' for all of Türkiye. */
  code: ProvinceCode | 'TR';
  /** Set when the chosen province's own data could not be used. */
  fallback: FallbackReason | null;
  scope: MarketScope;
  unit: PriceUnit;
  summary: PriceSummary;
  sources: string[];
  asOf: string;
}

export function hasProvinceData(code: ProvinceCode, scope: MarketScope, unit: PriceUnit = 'perM2', on: string = today()): boolean {
  const stats = SNAPSHOT[code]?.[scope][unit];
  return !!stats && ageSummary(stats, on).quality !== 'insufficient';
}

/** The provinces with any usable numbers, for comparisons. */
export function provincesWithData(scope: MarketScope, unit: PriceUnit = 'perM2', on: string = today()): ProvinceCode[] {
  return Object.keys(SNAPSHOT).filter((code) => code !== 'TR' && hasProvinceData(code, scope, unit, on));
}

/** Today as YYYY-MM-DD. */
export function today(): string {
  return new Date(Date.now()).toISOString().slice(0, 10);
}

/** The snapshot is shipped inside the app; past this age the screens say it may be out of date. */
export const SNAPSHOT_FRESH_DAYS = 90;

export function snapshotAge(on: string = today()): number {
  return ageInDays(SNAPSHOT_AS_OF, on);
}

/**
 * The reference to show for a province. Quality is re-checked against `on`
 * (today by default), so an old snapshot falls back instead of showing
 * numbers its age no longer supports.
 */
export function marketReference(code: ProvinceCode | null, scope: MarketScope, unit: PriceUnit = 'perM2', on: string = today()): MarketReference {
  const own = code ? SNAPSHOT[code] : undefined;
  const ownSummary = own ? ageSummary(own[scope][unit], on) : undefined;
  if (code && own && ownSummary && ownSummary.quality !== 'insufficient') {
    return { code, fallback: null, scope, unit, summary: ownSummary, sources: own[scope].sources, asOf: SNAPSHOT_AS_OF };
  }
  const tr = SNAPSHOT.TR[scope];
  const fallback: FallbackReason = !code || !provinceByCode(code) ? 'no_city' : own ? 'insufficient' : 'no_data';
  return { code: 'TR', fallback, scope, unit, summary: ageSummary(tr[unit], on), sources: tr.sources, asOf: SNAPSHOT_AS_OF };
}

/** Typical floor area of each home type, used only to turn a per-m² price into a home total. */
export const HOME_AREAS = { '1+1': 65, '2+1': 90, '3+1': 120, '4+1': 150 } as const;
export type HomeSize = keyof typeof HOME_AREAS;

/** A job total for a home of the given floor area, from a per-m² reference. */
export function homeTotal(reference: MarketReference, floorArea: number): RangeEstimate | null {
  if (reference.unit !== 'perM2' || reference.summary.quality === 'insufficient') return null;
  return scaleRange(reference.summary, floorArea);
}

/** The shown range of a reference, rounded for display. */
export function shownRange(reference: MarketReference): RangeEstimate | null {
  const { low, high, quality } = reference.summary;
  if (quality === 'insufficient' || low === null || high === null) return null;
  return reference.unit === 'perM2' ? { low: Math.round(low), high: Math.round(high) } : { low: roundPrice(low), high: roundPrice(high) };
}

/**
 * Paint cost from litres at shop prices for interior paint. Ceiling paint is
 * sold by the kilo and is usually cheaper, so this errs on the high side.
 */
export function paintCost(litres: number): RangeEstimate | null {
  return materialCost([{ quantity: litres, price: MATERIAL_PRICES.interior_paint }]);
}

export type Comparison =
  /** Both sides have medium or strong data and their middle halves do not overlap. */
  | { verdict: 'higher' | 'lower'; difference: number }
  /** Enough data, and the ranges overlap: no real difference. */
  | { verdict: 'similar' }
  /** Not enough data on one side or both to say anything. */
  | { verdict: 'unknown' };

/**
 * Compares price summary a with b. A difference is claimed only when both
 * have at least medium-quality data and their middle halves do not overlap;
 * difference is the gap between the medians, as a share of b's median.
 */
export function compareSummaries(a: PriceSummary | undefined, b: PriceSummary | undefined): Comparison {
  const enough = (s?: PriceSummary): s is PriceSummary & { median: number; low: number; high: number } =>
    !!s && (s.quality === 'medium' || s.quality === 'strong') && s.median !== null && s.low !== null && s.high !== null;
  if (!enough(a) || !enough(b)) return { verdict: 'unknown' };
  if (a.low > b.high) return { verdict: 'higher', difference: (a.median - b.median) / b.median };
  if (a.high < b.low) return { verdict: 'lower', difference: (b.median - a.median) / b.median };
  return { verdict: 'similar' };
}

export function compareProvinces(a: ProvinceCode, b: ProvinceCode, scope: MarketScope, on: string = today()): Comparison {
  const summary = (code: ProvinceCode) => {
    const s = SNAPSHOT[code]?.[scope].perM2;
    return s && ageSummary(s, on);
  };
  return compareSummaries(summary(a), summary(b));
}
