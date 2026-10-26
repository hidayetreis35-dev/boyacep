/**
 * BoyaCep calculation engine types.
 *
 * All lengths are metres, areas square metres, volumes litres.
 * The engine is pure TypeScript: no UI, no network, no AI.
 */

/** Where a number came from. Shown to the user next to every result. */
export type ValueSource =
  /** From a manufacturer technical data sheet. */
  | 'manufacturer'
  /** Typed in by the user. */
  | 'user'
  /** A generic default; must be shown as an estimate. */
  | 'estimate';

export type SurfaceType =
  /** Previously painted wall in usable shape. */
  | 'painted'
  /** New plaster or skim coat (alçı / sıva), absorbs more paint. */
  | 'new_plaster'
  /** Plasterboard (alçıpan). */
  | 'plasterboard'
  /** Bare concrete (brüt beton). */
  | 'concrete';

export type SurfaceCondition = 'good' | 'minor_repair' | 'poor';

export interface Opening {
  /** Metres. */
  width: number;
  /** Metres. */
  height: number;
  /** Number of identical openings. */
  count: number;
}

/** Spread rate of a product for one coat. */
export interface Coverage {
  /** Square metres covered by one litre for one coat. */
  m2PerLitre: number;
  source: ValueSource;
}

export interface RoomInput {
  /** Metres. */
  length: number;
  /** Metres. */
  width: number;
  /** Ceiling height, metres. */
  height: number;
  doors: Opening[];
  windows: Opening[];
  paintWalls: boolean;
  paintCeiling: boolean;
  /** Number of finish coats, 1 to 4. */
  coats: number;
  surfaceType: SurfaceType;
  surfaceCondition: SurfaceCondition;
  /** Wall paint spread rate. Defaults to a generic estimate. */
  wallCoverage?: Coverage;
  /** Ceiling paint spread rate. Defaults to a generic estimate. */
  ceilingCoverage?: Coverage;
}

export interface ValidationIssue {
  field: string;
  /** Turkish, user facing. */
  message: string;
}

export interface Assumption {
  key: string;
  /** Turkish, user facing. */
  label: string;
  source: ValueSource;
}

export interface RoomAreas {
  /** Gross wall area before deductions. */
  grossWall: number;
  doorDeduction: number;
  windowDeduction: number;
  /** Gross wall minus openings. 0 when walls are not painted. */
  netWall: number;
  /** 0 when the ceiling is not painted. */
  ceiling: number;
  /** netWall + ceiling. */
  totalPaintable: number;
  /** Floor perimeter, metres. */
  perimeter: number;
}

export interface PaintNeed {
  /** Litres of wall finish paint, waste included. */
  wallLitres: number;
  /** Litres of ceiling paint, waste included. */
  ceilingLitres: number;
  /** Litres of primer, waste included. 0 when not needed. */
  primerLitres: number;
  primerRecommended: boolean;
}

export interface PackageLine {
  /** Can size, litres. */
  size: number;
  count: number;
}

export interface PackagePlan {
  lines: PackageLine[];
  /** Litres bought. */
  totalLitres: number;
  /** Litres left over. */
  leftover: number;
}

export type MaterialCategory =
  | 'interior_paint'
  | 'ceiling_paint'
  | 'exterior_paint'
  | 'primer'
  | 'filler'
  | 'sandpaper'
  | 'roller'
  | 'brush'
  | 'masking_tape'
  | 'drop_sheet'
  | 'other';

export type MaterialUnit = 'L' | 'kg' | 'adet' | 'rulo';

export interface MaterialItem {
  category: MaterialCategory;
  /** Turkish, user facing. */
  name: string;
  quantity: number;
  unit: MaterialUnit;
  /** Can breakdown for liquid products. */
  packages?: PackagePlan;
  source: ValueSource;
}

export type Result<T> = { ok: true; value: T } | { ok: false; issues: ValidationIssue[] };
