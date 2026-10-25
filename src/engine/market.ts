import { round } from './round';

/**
 * Market price statistics: how sure BoyaCep can be about a price range, and
 * the range itself. Pure and deterministic, like the rest of the engine.
 * The rules are documented in docs/BOYACEP_PRICE_QUALITY_METHODOLOGY.md.
 */

/** What a price observation is, from weakest to strongest evidence. */
export type PriceKind =
  /** A price on a firm's own website or price list. */
  | 'firm_price_list'
  /** A request and its quotes published on a service platform. */
  | 'platform_request'
  /** A public tender unit price (Çevre, Şehircilik ve İklim Değişikliği Bakanlığı). */
  | 'official_unit_price'
  /** A quote given to a BoyaCep user. */
  | 'quote'
  /** A quote the customer accepted in BoyaCep. */
  | 'accepted_quote'
  /** A finished job whose price both sides confirmed in BoyaCep. */
  | 'completed_job';

export interface PriceObservation {
  /** Price in the group's unit, for example TRY per m² of floor area. */
  value: number;
  /** ISO date (YYYY-MM-DD) the price was published or given. */
  observed: string;
  /** Who published it. Several records from one publisher are one source. */
  sourceId: string;
  kind: PriceKind;
}

export type PriceQuality = 'strong' | 'medium' | 'limited' | 'insufficient';

/** Below this many observations the quartiles mean little, so the observed min–max is shown. */
export const MIDDLE_HALF_FROM = 10;

/** Minimum evidence for each quality level. Ages are in days before the as-of date. */
export const QUALITY_RULES = {
  strong: { observations: 30, sources: 3, newestAge: 90 },
  medium: { observations: 10, sources: 2, newestAge: 180 },
  limited: { observations: 5, sources: 1, newestAge: 365 },
} as const;

/** Observations older than this are left out of every statistic. */
export const MAX_AGE_DAYS = 730;

export interface PriceSummary {
  quality: PriceQuality;
  /** Observations used, after outliers and old records were left out. */
  observations: number;
  sources: number;
  /** Observations flagged as outliers: kept for review, not used. */
  outliers: number;
  /** Observations left out for age. */
  stale: number;
  newest: string | null;
  oldest: string | null;
  /** Only for medium and strong data. */
  median: number | null;
  /** Only for strong data. */
  mean: number | null;
  /** The range to show: the middle half from 10 observations on, the observed range below that. */
  low: number | null;
  high: number | null;
  /** True when low/high are the middle half (P25–P75), false when they are the observed min–max. */
  middleHalf: boolean;
}

const DAY = 86_400_000;

export function ageInDays(date: string, asOf: string): number {
  return Math.floor((Date.parse(asOf) - Date.parse(date)) / DAY);
}

/** Linear-interpolated quantile of an ascending list. */
export function quantile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) throw new Error('quantile of an empty list');
  const k = (sorted.length - 1) * p;
  const lower = Math.floor(k);
  const upper = Math.min(lower + 1, sorted.length - 1);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (k - lower);
}

/**
 * Marks values far from the rest. Prices are skewed, so the fences are set on
 * the logarithm: outside Q1 − 1.5·IQR … Q3 + 1.5·IQR. With fewer than 8
 * values the quartiles are unreliable, so only values more than 4× away from
 * the median are marked.
 */
export function flagOutliers(values: readonly number[]): boolean[] {
  const logs = values.map((v) => Math.log(v));
  const sorted = [...logs].sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  if (sorted.length < 8) {
    const median = quantile(sorted, 0.5);
    return logs.map((l) => Math.abs(l - median) > Math.log(4));
  }
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const fence = 1.5 * (q3 - q1);
  return logs.map((l) => l < q1 - fence || l > q3 + fence);
}

function qualityOf(observations: number, sources: number, newestAge: number): PriceQuality {
  for (const level of ['strong', 'medium', 'limited'] as const) {
    const rule = QUALITY_RULES[level];
    if (observations >= rule.observations && sources >= rule.sources && newestAge <= rule.newestAge) return level;
  }
  return 'insufficient';
}

/**
 * Summarises observations that share one scope and unit. Non-positive
 * values and old records are left out, outliers are flagged and left out,
 * and the quality level decides which numbers may be shown.
 */
export function summarizePrices(all: readonly PriceObservation[], asOf: string): PriceSummary {
  const valid = all.filter((o) => Number.isFinite(o.value) && o.value > 0);
  const fresh = valid.filter((o) => ageInDays(o.observed, asOf) <= MAX_AGE_DAYS);
  const flags = flagOutliers(fresh.map((o) => o.value));
  const used = fresh.filter((_, i) => !flags[i]);
  const values = used.map((o) => o.value).sort((a, b) => a - b);
  const dates = used.map((o) => o.observed).sort();
  const sources = new Set(used.map((o) => o.sourceId)).size;
  const newest = dates.at(-1) ?? null;
  const quality = newest ? qualityOf(values.length, sources, ageInDays(newest, asOf)) : 'insufficient';
  const shown = quality !== 'insufficient';
  const middleHalf = shown && values.length >= MIDDLE_HALF_FROM;
  return {
    quality,
    observations: values.length,
    sources,
    outliers: flags.filter(Boolean).length,
    stale: valid.length - fresh.length,
    newest,
    oldest: dates[0] ?? null,
    median: quality === 'strong' || quality === 'medium' ? quantile(values, 0.5) : null,
    mean: quality === 'strong' ? values.reduce((a, b) => a + b, 0) / values.length : null,
    low: shown ? (middleHalf ? quantile(values, 0.25) : values[0]) : null,
    high: shown ? (middleHalf ? quantile(values, 0.75) : values[values.length - 1]) : null,
    middleHalf,
  };
}

/**
 * Re-checks a stored summary against a later date. Data only gets older, so
 * its level can only drop, and the numbers the new level does not allow are
 * removed: a snapshot shipped in the app never looks fresher than it is.
 */
export function ageSummary(summary: PriceSummary, today: string): PriceSummary {
  if (!summary.newest || summary.quality === 'insufficient') return summary;
  const age = ageInDays(summary.newest, today);
  const levels = ['strong', 'medium', 'limited'] as const;
  const quality = levels.slice(levels.indexOf(summary.quality)).find((l) => age <= QUALITY_RULES[l].newestAge) ?? 'insufficient';
  if (quality === summary.quality) return summary;
  const shown = quality !== 'insufficient';
  return {
    ...summary,
    quality,
    median: quality === 'medium' ? summary.median : null,
    mean: null,
    low: shown ? summary.low : null,
    high: shown ? summary.high : null,
    middleHalf: shown && summary.middleHalf,
  };
}

/** Rounds a price for display, so a statistic never looks more exact than it is. */
export function roundPrice(value: number): number {
  if (value < 1000) return round(value / 10, 0) * 10;
  return round(value / 500, 0) * 500;
}

export interface RangeEstimate {
  low: number;
  high: number;
}

/** A job total from a per-m² range: floor area × price per m², rounded. */
export function scaleRange(perM2: Pick<PriceSummary, 'low' | 'high'>, area: number): RangeEstimate | null {
  if (perM2.low === null || perM2.high === null || !(area > 0)) return null;
  return { low: roundPrice(perM2.low * area), high: roundPrice(perM2.high * area) };
}

/** Retail price per litre (or kg) of a material, as a range. */
export interface MaterialPrice {
  low: number;
  high: number;
}

export interface MaterialNeed {
  quantity: number;
  price: MaterialPrice;
}

/** Material cost range: each quantity × its low and high price, summed and rounded. */
export function materialCost(needs: readonly MaterialNeed[]): RangeEstimate | null {
  const used = needs.filter((n) => n.quantity > 0);
  if (used.length === 0) return null;
  const low = used.reduce((sum, n) => sum + n.quantity * n.price.low, 0);
  const high = used.reduce((sum, n) => sum + n.quantity * n.price.high, 0);
  return { low: roundPrice(low), high: roundPrice(high) };
}

export function addRanges(a: RangeEstimate | null, b: RangeEstimate | null): RangeEstimate | null {
  if (!a || !b) return null;
  return { low: a.low + b.low, high: a.high + b.high };
}
