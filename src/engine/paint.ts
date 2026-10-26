import {
  DEFAULT_CEILING_COVERAGE,
  DEFAULT_PRIMER_COVERAGE,
  DEFAULT_WALL_COVERAGE,
  PRIMER_SURFACES,
  SURFACE_ABSORPTION,
  WASTE_FACTOR,
} from './defaults';
import { round } from './round';
import { calculateAreas } from './surfaces';
import type { Assumption, Coverage, PaintNeed, Result, RoomAreas, RoomInput } from './types';

export interface RoomCalculation {
  areas: RoomAreas;
  paint: PaintNeed;
  assumptions: Assumption[];
}

/**
 * Litres for `coats` coats over `area`. Absorbent surfaces soak up extra
 * paint on the first coat only.
 */
function finishLitres(area: number, coats: number, coverage: Coverage, absorption: number): number {
  if (area === 0) return 0;
  const base = (area * coats) / coverage.m2PerLitre;
  const firstCoatExtra = (area * (absorption - 1)) / coverage.m2PerLitre;
  return (base + firstCoatExtra) * (1 + WASTE_FACTOR);
}

export function needsPrimer(room: Pick<RoomInput, 'surfaceType' | 'surfaceCondition'>): boolean {
  return PRIMER_SURFACES.has(room.surfaceType) || room.surfaceCondition === 'poor';
}

export function calculateRoom(room: RoomInput): Result<RoomCalculation> {
  const areas = calculateAreas(room);
  if (!areas.ok) return areas;

  const { netWall, ceiling, totalPaintable } = areas.value;
  const wallCoverage = room.wallCoverage ?? DEFAULT_WALL_COVERAGE;
  const ceilingCoverage = room.ceilingCoverage ?? DEFAULT_CEILING_COVERAGE;
  const absorption = SURFACE_ABSORPTION[room.surfaceType];
  const primerRecommended = needsPrimer(room);

  const paint: PaintNeed = {
    wallLitres: round(finishLitres(netWall, room.coats, wallCoverage, absorption), 1),
    ceilingLitres: round(finishLitres(ceiling, room.coats, ceilingCoverage, absorption), 1),
    primerLitres: primerRecommended
      ? round((totalPaintable / DEFAULT_PRIMER_COVERAGE.m2PerLitre) * (1 + WASTE_FACTOR), 1)
      : 0,
    primerRecommended,
  };

  const assumptions: Assumption[] = [
    {
      key: 'waste',
      label: `%${WASTE_FACTOR * 100} fire payı eklendi`,
      source: 'estimate',
    },
  ];
  if (room.paintWalls) {
    assumptions.push({
      key: 'wallCoverage',
      label: `Duvar boyası sarfiyatı: ${wallCoverage.m2PerLitre} m²/L (tek kat)`,
      source: wallCoverage.source,
    });
  }
  if (room.paintCeiling) {
    assumptions.push({
      key: 'ceilingCoverage',
      label: `Tavan boyası sarfiyatı: ${ceilingCoverage.m2PerLitre} m²/L (tek kat)`,
      source: ceilingCoverage.source,
    });
  }
  if (absorption !== 1) {
    assumptions.push({
      key: 'absorption',
      label: `Yüzey boyayı fazla emer: ilk katta %${round((absorption - 1) * 100, 0)} fazla boya`,
      source: 'estimate',
    });
  }
  if (primerRecommended) {
    assumptions.push({
      key: 'primerCoverage',
      label: `Astar sarfiyatı: ${DEFAULT_PRIMER_COVERAGE.m2PerLitre} m²/L (tek kat)`,
      source: DEFAULT_PRIMER_COVERAGE.source,
    });
  }

  return { ok: true, value: { areas: areas.value, paint, assumptions } };
}
