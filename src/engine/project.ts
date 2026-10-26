import {
  DEFAULT_CAN_SIZES,
  DROP_SHEET_M2,
  FILLER_KG_PER_M2,
  MASKING_TAPE_M_PER_ROLL,
  SANDPAPER_M2_PER_SHEET,
} from './defaults';
import { calculateRoom, type RoomCalculation } from './paint';
import { planPackages } from './packaging';
import { round } from './round';
import type {
  Assumption,
  MaterialItem,
  Result,
  RoomInput,
  ValidationIssue,
  ValueSource,
} from './types';

export interface ProjectOptions {
  /** Available can sizes, litres. */
  canSizes?: number[];
}

export interface ProjectTotals {
  netWall: number;
  ceiling: number;
  totalPaintable: number;
  wallLitres: number;
  ceilingLitres: number;
  primerLitres: number;
}

export interface ProjectCalculation {
  rooms: RoomCalculation[];
  totals: ProjectTotals;
  materials: MaterialItem[];
  assumptions: Assumption[];
}

/** The weakest source wins: one estimate makes the total an estimate. */
function weakestSource(sources: ValueSource[]): ValueSource {
  if (sources.includes('estimate')) return 'estimate';
  if (sources.includes('user')) return 'user';
  return 'manufacturer';
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function openingPerimeter(room: RoomInput): number {
  return sum([...room.doors, ...room.windows].map((o) => 2 * (o.width + o.height) * o.count));
}

export function calculateProject(
  inputs: RoomInput[],
  options: ProjectOptions = {},
): Result<ProjectCalculation> {
  if (inputs.length === 0) {
    return { ok: false, issues: [{ field: 'rooms', message: 'En az bir oda ekleyin.' }] };
  }

  const rooms: RoomCalculation[] = [];
  const issues: ValidationIssue[] = [];
  inputs.forEach((input, i) => {
    const result = calculateRoom(input);
    if (result.ok) rooms.push(result.value);
    else issues.push(...result.issues.map((x) => ({ ...x, field: `rooms[${i}].${x.field}` })));
  });
  if (issues.length > 0) return { ok: false, issues };

  const canSizes = options.canSizes ?? DEFAULT_CAN_SIZES;
  const totals: ProjectTotals = {
    netWall: round(sum(rooms.map((r) => r.areas.netWall))),
    ceiling: round(sum(rooms.map((r) => r.areas.ceiling))),
    totalPaintable: round(sum(rooms.map((r) => r.areas.totalPaintable))),
    wallLitres: round(sum(rooms.map((r) => r.paint.wallLitres)), 1),
    ceilingLitres: round(sum(rooms.map((r) => r.paint.ceilingLitres)), 1),
    primerLitres: round(sum(rooms.map((r) => r.paint.primerLitres)), 1),
  };

  const materials: MaterialItem[] = [];
  if (totals.wallLitres > 0) {
    materials.push({
      category: 'interior_paint',
      name: 'İç cephe boyası',
      quantity: totals.wallLitres,
      unit: 'L',
      packages: planPackages(totals.wallLitres, canSizes),
      source: weakestSource(inputs.filter((r) => r.paintWalls).map((r) => r.wallCoverage?.source ?? 'estimate')),
    });
  }
  if (totals.ceilingLitres > 0) {
    materials.push({
      category: 'ceiling_paint',
      name: 'Tavan boyası',
      quantity: totals.ceilingLitres,
      unit: 'L',
      packages: planPackages(totals.ceilingLitres, canSizes),
      source: weakestSource(
        inputs.filter((r) => r.paintCeiling).map((r) => r.ceilingCoverage?.source ?? 'estimate'),
      ),
    });
  }
  if (totals.primerLitres > 0) {
    materials.push({
      category: 'primer',
      name: 'Astar',
      quantity: totals.primerLitres,
      unit: 'L',
      packages: planPackages(totals.primerLitres, canSizes),
      source: 'estimate',
    });
  }

  const fillerKg = sum(
    inputs.map((r, i) => rooms[i].areas.totalPaintable * FILLER_KG_PER_M2[r.surfaceCondition]),
  );
  if (fillerKg > 0) {
    materials.push({ category: 'filler', name: 'Macun', quantity: Math.ceil(fillerKg), unit: 'kg', source: 'estimate' });
  }

  const repairArea = sum(
    inputs.map((r, i) => (r.surfaceCondition === 'good' ? 0 : rooms[i].areas.totalPaintable)),
  );
  if (repairArea > 0) {
    materials.push({
      category: 'sandpaper',
      name: 'Zımpara kâğıdı',
      quantity: Math.ceil(repairArea / SANDPAPER_M2_PER_SHEET),
      unit: 'adet',
      source: 'estimate',
    });
  }

  const big = totals.totalPaintable > 100;
  materials.push({ category: 'roller', name: 'Rulo ve boya teknesi', quantity: big ? 2 : 1, unit: 'adet', source: 'estimate' });
  materials.push({ category: 'brush', name: 'Köşe fırçası', quantity: big ? 2 : 1, unit: 'adet', source: 'estimate' });

  // Tape along the floor and ceiling lines plus around every opening.
  const tapeMetres = sum(inputs.map((r, i) => rooms[i].areas.perimeter * 2 + openingPerimeter(r)));
  materials.push({
    category: 'masking_tape',
    name: 'Maskeleme bandı',
    quantity: Math.max(1, Math.ceil(tapeMetres / MASKING_TAPE_M_PER_ROLL)),
    unit: 'rulo',
    source: 'estimate',
  });

  const floorArea = sum(inputs.map((r) => r.length * r.width));
  materials.push({
    category: 'drop_sheet',
    name: `Koruyucu örtü (${DROP_SHEET_M2} m²)`,
    quantity: Math.max(1, Math.ceil(floorArea / DROP_SHEET_M2)),
    unit: 'adet',
    source: 'estimate',
  });

  const seen = new Set<string>();
  const assumptions = rooms
    .flatMap((r) => r.assumptions)
    .filter((a) => {
      const id = `${a.key}|${a.label}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  assumptions.push({
    key: 'canSizes',
    label: `Kutu boyları: ${canSizes.map((s) => `${s} L`).join(', ')}`,
    source: options.canSizes ? 'user' : 'estimate',
  });

  return { ok: true, value: { rooms, totals, materials, assumptions } };
}
