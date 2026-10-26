import type { RoomInput, SurfaceCondition, SurfaceType, ValidationIssue } from '@/engine';
import { validateRoom } from '@/engine';
import { t } from '@/i18n';
import { parseDecimal } from '@/lib/number';

/** What the room form holds: raw text so the user can type "2,5". */
export interface RoomForm {
  length: string;
  width: string;
  height: string;
  doorCount: number;
  doorWidth: string;
  doorHeight: string;
  windowCount: number;
  windowWidth: string;
  windowHeight: string;
  paintWalls: boolean;
  paintCeiling: boolean;
  coats: number;
  surfaceType: SurfaceType;
  surfaceCondition: SurfaceCondition;
  /** Optional product spread rate, m²/L per coat. Empty means "use estimate". */
  coverage: string;
  coverageSource: 'manufacturer' | 'user';
}

export type RoomFormField = keyof RoomForm | 'form';

export const EMPTY_ROOM_FORM: RoomForm = {
  length: '',
  width: '',
  height: '2,6',
  doorCount: 1,
  doorWidth: '0,9',
  doorHeight: '2,1',
  windowCount: 1,
  windowWidth: '1,2',
  windowHeight: '1,4',
  paintWalls: true,
  paintCeiling: true,
  coats: 2,
  surfaceType: 'painted',
  surfaceCondition: 'good',
  coverage: '',
  coverageSource: 'manufacturer',
};

/** Maps an engine field path to the form field that should show the error. */
function formField(engineField: string): RoomFormField {
  if (engineField.startsWith('doors')) return engineField.endsWith('count') ? 'doorCount' : 'doorHeight';
  if (engineField.startsWith('windows')) return engineField.endsWith('count') ? 'windowCount' : 'windowHeight';
  if (engineField === 'wallCoverage' || engineField === 'ceilingCoverage') return 'coverage';
  if (engineField in EMPTY_ROOM_FORM) return engineField as keyof RoomForm;
  return 'form';
}

export type FormErrors = Partial<Record<RoomFormField, string>>;

export function toRoomInput(form: RoomForm): { ok: true; input: RoomInput } | { ok: false; errors: FormErrors } {
  const coverageText = form.coverage.trim();
  const coverage = coverageText === '' ? undefined : { m2PerLitre: parseDecimal(coverageText), source: form.coverageSource };

  const input: RoomInput = {
    length: parseDecimal(form.length),
    width: parseDecimal(form.width),
    height: parseDecimal(form.height),
    doors: form.doorCount > 0
      ? [{ width: parseDecimal(form.doorWidth), height: parseDecimal(form.doorHeight), count: form.doorCount }]
      : [],
    windows: form.windowCount > 0
      ? [{ width: parseDecimal(form.windowWidth), height: parseDecimal(form.windowHeight), count: form.windowCount }]
      : [],
    paintWalls: form.paintWalls,
    paintCeiling: form.paintCeiling,
    coats: form.coats,
    surfaceType: form.surfaceType,
    surfaceCondition: form.surfaceCondition,
    wallCoverage: coverage,
    ceilingCoverage: coverage,
  };

  const issues: ValidationIssue[] = validateRoom(input);
  if (issues.length === 0) return { ok: true, input };

  const errors: FormErrors = {};
  for (const issue of issues) {
    const field = formField(issue.field);
    errors[field] ??= t(issue.message);
  }
  return { ok: false, errors };
}
