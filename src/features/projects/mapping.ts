import type { Opening, RoomInput } from '@/engine';
import type { ProjectStatus, RoomOpeningRow, RoomRow } from '@/lib/database.types';
import { formatNumber } from '@/lib/number';
import type { RoomForm } from '@/features/calculator/form';

export interface RoomWithOpenings extends RoomRow {
  openings: RoomOpeningRow[];
}

export type RoomRecord = Omit<RoomRow, 'id' | 'project_id' | 'created_at' | 'updated_at' | 'sort_order' | 'name'>;
export type OpeningRecord = Pick<RoomOpeningRow, 'kind' | 'width_m' | 'height_m' | 'count'>;

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: 'Taslak',
  planning: 'Planlanıyor',
  awaiting_quote: 'Teklif bekliyor',
  in_progress: 'Devam ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
};

export const STATUS_ORDER: ProjectStatus[] = [
  'draft',
  'planning',
  'awaiting_quote',
  'in_progress',
  'completed',
  'cancelled',
];

function toOpenings(rows: RoomOpeningRow[], kind: 'door' | 'window'): Opening[] {
  return rows
    .filter((o) => o.kind === kind)
    .map((o) => ({ width: Number(o.width_m), height: Number(o.height_m), count: o.count }));
}

/** A saved room as engine input. Postgres numerics may arrive as strings, so coerce. */
export function roomToInput(room: RoomWithOpenings): RoomInput {
  const coverage =
    room.coverage_m2_per_l != null && room.coverage_source
      ? { m2PerLitre: Number(room.coverage_m2_per_l), source: room.coverage_source }
      : undefined;
  return {
    length: Number(room.length_m),
    width: Number(room.width_m),
    height: Number(room.height_m),
    doors: toOpenings(room.openings, 'door'),
    windows: toOpenings(room.openings, 'window'),
    paintWalls: room.paint_walls,
    paintCeiling: room.paint_ceiling,
    coats: room.coats,
    surfaceType: room.surface_type,
    surfaceCondition: room.surface_condition,
    wallCoverage: coverage,
    ceilingCoverage: coverage,
  };
}

/** Validated engine input to the columns stored for a room. */
export function inputToRecord(input: RoomInput): { room: RoomRecord; openings: OpeningRecord[] } {
  const openings: OpeningRecord[] = [
    ...input.doors.map((o) => ({ kind: 'door' as const, width_m: o.width, height_m: o.height, count: o.count })),
    ...input.windows.map((o) => ({ kind: 'window' as const, width_m: o.width, height_m: o.height, count: o.count })),
  ].filter((o) => o.count > 0);
  return {
    room: {
      length_m: input.length,
      width_m: input.width,
      height_m: input.height,
      paint_walls: input.paintWalls,
      paint_ceiling: input.paintCeiling,
      coats: input.coats,
      surface_type: input.surfaceType,
      surface_condition: input.surfaceCondition,
      coverage_m2_per_l: input.wallCoverage?.m2PerLitre ?? null,
      coverage_source: input.wallCoverage?.source === 'estimate' ? null : (input.wallCoverage?.source ?? null),
    },
    openings,
  };
}

const text = (n: number) => formatNumber(n, 2);

/** A saved room back into the editable form. The form holds one door size and one window size. */
export function roomToForm(room: RoomWithOpenings): RoomForm {
  const door = room.openings.find((o) => o.kind === 'door');
  const window = room.openings.find((o) => o.kind === 'window');
  const doorCount = room.openings.filter((o) => o.kind === 'door').reduce((s, o) => s + o.count, 0);
  const windowCount = room.openings.filter((o) => o.kind === 'window').reduce((s, o) => s + o.count, 0);
  return {
    length: text(Number(room.length_m)),
    width: text(Number(room.width_m)),
    height: text(Number(room.height_m)),
    doorCount,
    doorWidth: door ? text(Number(door.width_m)) : '0,9',
    doorHeight: door ? text(Number(door.height_m)) : '2,1',
    windowCount,
    windowWidth: window ? text(Number(window.width_m)) : '1,2',
    windowHeight: window ? text(Number(window.height_m)) : '1,4',
    paintWalls: room.paint_walls,
    paintCeiling: room.paint_ceiling,
    coats: room.coats,
    surfaceType: room.surface_type,
    surfaceCondition: room.surface_condition,
    coverage: room.coverage_m2_per_l != null ? text(Number(room.coverage_m2_per_l)) : '',
    coverageSource: room.coverage_source ?? 'manufacturer',
  };
}
