import type { PriceSummary } from '@/engine';

import type { ProvinceCode } from './provinces';

/** Painting work with or without the paint and supplies. */
export type MarketScope = 'labour' | 'materials';

export interface ScopeStats {
  /** TRY per m² of the home's floor area, for homes of 31–300 m². */
  perM2: PriceSummary;
  /** TRY per job for a single room (up to 30 m² of floor). */
  room: PriceSummary;
  /** Publishers behind the numbers, ids from MARKET_SOURCES. */
  sources: string[];
}

export type ProvinceStats = Record<MarketScope, ScopeStats>;

/** Statistics by province plate code, and 'TR' for all of Türkiye. */
export type MarketSnapshot = Record<ProvinceCode | 'TR', ProvinceStats>;
