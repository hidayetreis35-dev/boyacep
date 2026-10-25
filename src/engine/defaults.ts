import type { Coverage, SurfaceType } from './types';

/**
 * Generic defaults. Every value here is an ESTIMATE and is surfaced to the
 * user as such. Replace with manufacturer data whenever a product is known.
 * Values marked "usta onayı bekliyor" still need a professional painter's check.
 */

/** Typical interior emulsion spread rate for one coat. */
export const DEFAULT_WALL_COVERAGE: Coverage = { m2PerLitre: 10, source: 'estimate' };
export const DEFAULT_CEILING_COVERAGE: Coverage = { m2PerLitre: 10, source: 'estimate' };
export const DEFAULT_PRIMER_COVERAGE: Coverage = { m2PerLitre: 10, source: 'estimate' };

/** Extra paint for spills, roller load and touch ups. */
export const WASTE_FACTOR = 0.1;

/** Multiplier on finish paint for absorbent surfaces. */
export const SURFACE_ABSORPTION: Record<SurfaceType, number> = {
  painted: 1,
  new_plaster: 1.15,
  plasterboard: 1.05,
  concrete: 1.2,
};

/** Surfaces that need primer regardless of condition. */
export const PRIMER_SURFACES: ReadonlySet<SurfaceType> = new Set([
  'new_plaster',
  'plasterboard',
  'concrete',
]);

/** Common Turkish retail can sizes for interior paint, litres. */
export const DEFAULT_CAN_SIZES = [15, 7.5, 2.5];

/** Filler (macun) per m² of wall needing repair, kg. */
export const FILLER_KG_PER_M2 = { good: 0, minor_repair: 0.1, poor: 0.5 } as const;

/** One sandpaper sheet per this many m² when sanding. */
export const SANDPAPER_M2_PER_SHEET = 10;

export const MASKING_TAPE_M_PER_ROLL = 25;
export const DROP_SHEET_M2 = 20;

/** Coats allowed by the calculator. */
export const MIN_COATS = 1;
export const MAX_COATS = 4;

/** Sanity limits for a single room, metres. */
export const MAX_ROOM_SIDE = 50;
export const MAX_CEILING_HEIGHT = 10;
