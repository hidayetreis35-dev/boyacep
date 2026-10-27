import type { SurfaceCondition, SurfaceType } from './types';

/** What a room needs, as far as the plan is concerned. */
export interface PlanRoom {
  name: string;
  paintWalls: boolean;
  paintCeiling: boolean;
  coats: number;
  surfaceType: SurfaceType;
  surfaceCondition: SurfaceCondition;
}

export type PlanStepKind = 'prepare' | 'scrape' | 'fill' | 'sand' | 'prime' | 'ceiling' | 'walls' | 'finish';

export interface PlanStep {
  kind: PlanStepKind;
  /** Room names, in the project's order. */
  rooms: string[];
  /** For "walls": finish coats for these rooms. */
  coats?: number;
}

/**
 * The work in the order painters do it, room by room: prepare, repair what
 * needs it, prime new or repaired surfaces, ceilings before walls, then clean
 * up. Rule-based, from the rooms' own surface and condition; steps with no
 * room are left out.
 */
export function renovationPlan(rooms: PlanRoom[]): PlanStep[] {
  const painted = rooms.filter((r) => r.paintWalls || r.paintCeiling);
  if (painted.length === 0) return [];
  const names = (pick: (r: PlanRoom) => boolean) => painted.filter(pick).map((r) => r.name);
  const steps: PlanStep[] = [
    { kind: 'prepare', rooms: names(() => true) },
    { kind: 'scrape', rooms: names((r) => r.surfaceCondition === 'poor') },
    { kind: 'fill', rooms: names((r) => r.surfaceCondition === 'minor_repair') },
    { kind: 'sand', rooms: names((r) => r.surfaceCondition === 'good' && r.surfaceType === 'painted') },
    { kind: 'prime', rooms: names((r) => r.surfaceType !== 'painted' || r.surfaceCondition !== 'good') },
    { kind: 'ceiling', rooms: names((r) => r.paintCeiling) },
  ];
  const coats = [...new Set(painted.filter((r) => r.paintWalls).map((r) => r.coats))].sort((a, b) => a - b);
  for (const c of coats) steps.push({ kind: 'walls', coats: c, rooms: names((r) => r.paintWalls && r.coats === c) });
  steps.push({ kind: 'finish', rooms: names(() => true) });
  return steps.filter((s) => s.rooms.length > 0);
}
