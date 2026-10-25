import {
  calculateProject,
  ENGINE_VERSION,
  type Assumption,
  type MaterialItem,
  type ProjectTotals,
} from '@/engine';
import { assess, PLACES, workPlan, type Severity } from '@/features/inspect/rules';
import { roomToInput, type RoomWithOpenings } from '@/features/projects/mapping';
import type { InspectionResultRow, Json, ProjectColourRow } from '@/lib/database.types';

/**
 * Akıllı Keşif Dosyası: everything a painter needs to quote without a site
 * visit, in one place. Numbers come from the calculation engine; findings come
 * from the rule-based wall inspection. Nothing here is guessed by AI.
 */

export type SurveyRoom = {
  name: string;
  length: number;
  width: number;
  height: number;
  doors: number;
  windows: number;
  wallArea: number;
  ceilingArea: number;
  litres: number;
};

export type SurveyFinding = {
  id: string;
  /** Where the user said it is, or the kind of place when they left it empty. */
  title: string;
  placeLabel: string;
  symptoms: { id: string; label: string; severity: Severity }[];
  worst: Severity | null;
  /** Something must be fixed (water, structure) before painting. */
  blocked: boolean;
  steps: string[];
  createdAt: string;
};

export type SurveyColour = Pick<ProjectColourRow, 'name' | 'hex' | 'surface'>;

export type SurveyModel = {
  title: string;
  /** Shown to painters: whose home it is. */
  ownerName: string | null;
  /** YYYY-MM-DD */
  preparedOn: string;
  rooms: SurveyRoom[];
  totals: ProjectTotals | null;
  materials: MaterialItem[];
  assumptions: Assumption[];
  /** Why the totals are missing although rooms exist. */
  calculationError: string | null;
  colours: SurveyColour[];
  findings: SurveyFinding[];
  photoCount: number;
  /** Stored as a calculation snapshot when the homeowner shares the file. */
  snapshot: { engineVersion: string; input: Json; result: Json } | null;
};

const SEVERITY_RANK: Record<Severity, number> = { expert: 0, careful: 1, diy: 2 };
const rank = (s: Severity | null) => (s === null ? 3 : SEVERITY_RANK[s]);

const placeLabel = (place: InspectionResultRow['place']) => PLACES.find((p) => p.value === place)?.label ?? place;

/** Drops undefined fields so the value is plain JSON. */
const toJson = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;

export function toFinding(row: InspectionResultRow): SurveyFinding {
  const { symptoms, worst } = assess(row.symptoms);
  const plan = workPlan(row.symptoms, row.place);
  return {
    id: row.id,
    title: row.location ?? placeLabel(row.place),
    placeLabel: placeLabel(row.place),
    symptoms: symptoms.map((s) => ({ id: s.id, label: s.label, severity: s.severity })),
    worst,
    blocked: plan.blocked,
    steps: plan.steps.map((s) => s.text),
    createdAt: row.created_at,
  };
}

export function buildSurvey(args: {
  title: string;
  ownerName?: string | null;
  rooms: RoomWithOpenings[];
  colours: SurveyColour[];
  inspections: InspectionResultRow[];
  photoCount: number;
  today?: Date;
}): SurveyModel {
  const inputs = args.rooms.map(roomToInput);
  const calc = inputs.length > 0 ? calculateProject(inputs) : null;
  const ok = calc?.ok ? calc.value : null;

  const rooms: SurveyRoom[] = args.rooms.map((room, i) => {
    const count = (kind: 'door' | 'window') =>
      room.openings.filter((o) => o.kind === kind).reduce((n, o) => n + o.count, 0);
    const r = ok?.rooms[i];
    return {
      name: room.name,
      length: Number(room.length_m),
      width: Number(room.width_m),
      height: Number(room.height_m),
      doors: count('door'),
      windows: count('window'),
      wallArea: r?.areas.netWall ?? 0,
      ceilingArea: r?.areas.ceiling ?? 0,
      litres: r ? r.paint.wallLitres + r.paint.ceilingLitres : 0,
    };
  });

  const findings = args.inspections
    .map(toFinding)
    .sort((a, b) => rank(a.worst) - rank(b.worst) || a.createdAt.localeCompare(b.createdAt));

  return {
    title: args.title,
    ownerName: args.ownerName ?? null,
    preparedOn: (args.today ?? new Date()).toISOString().slice(0, 10),
    rooms,
    totals: ok?.totals ?? null,
    materials: ok?.materials ?? [],
    assumptions: ok?.assumptions ?? [],
    calculationError: calc && !calc.ok ? (calc.issues[0]?.message ?? 'Bir odanın ölçüleri hatalı.') : null,
    colours: args.colours,
    findings,
    photoCount: args.photoCount,
    snapshot: ok
      ? {
          engineVersion: ENGINE_VERSION,
          input: toJson({ rooms: inputs }),
          result: toJson({ totals: ok.totals, materials: ok.materials }),
        }
      : null,
  };
}

/** True when the survey has nothing worth sharing yet. */
export const isEmptySurvey = (m: SurveyModel) => m.rooms.length === 0 && m.findings.length === 0 && m.colours.length === 0;

/** JSON with sorted keys, so two snapshots compare equal whatever order the database returns. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
