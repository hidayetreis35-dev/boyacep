import { msg } from '@/i18n';

/** The five steps of a painting project, in the order the project screen suggests them. */
export const PROJECT_STEPS = ['measure', 'materials', 'colour', 'budget', 'file'] as const;
export type ProjectStep = (typeof PROJECT_STEPS)[number];

export const STEP_LABEL: Record<ProjectStep, string> = {
  measure: msg('Ölç'),
  materials: msg('Malzeme'),
  colour: msg('Renk'),
  budget: msg('Bütçe'),
  file: msg('Dosya'),
};

/** What is known about a project. `null` means "not loaded yet" or "could not load". */
export interface ProgressFacts {
  rooms: number;
  materials: number | null;
  colours: number | null;
  budget: number | null;
  costs: number | null;
  /** A survey file was shared, or a painter was invited. */
  shared: boolean | null;
}

export type StepState = 'done' | 'todo' | 'unknown';

export function stepStates(f: ProgressFacts): Record<ProjectStep, StepState> {
  const known = (v: number | boolean | null, done: boolean): StepState => (v === null ? 'unknown' : done ? 'done' : 'todo');
  return {
    measure: f.rooms > 0 ? 'done' : 'todo',
    materials: known(f.materials, (f.materials ?? 0) > 0),
    colour: known(f.colours, (f.colours ?? 0) > 0),
    budget: f.budget ? 'done' : known(f.costs, (f.costs ?? 0) > 0),
    file: known(f.shared, f.shared === true),
  };
}

/**
 * The first step still to do. While an earlier step is unknown there is no
 * suggestion, so the screen never points at a step that may already be done.
 */
export function nextStep(states: Record<ProjectStep, StepState>): ProjectStep | null {
  for (const step of PROJECT_STEPS) {
    if (states[step] === 'unknown') return null;
    if (states[step] === 'todo') return step;
  }
  return null;
}

/**
 * The North Star "hazır proje": a measured room, a material list or a budget,
 * and a shared survey file (docs/BOYACEP_SUCCESS_METRICS.md).
 */
export function isReadyProject(states: Record<ProjectStep, StepState>): boolean {
  return states.measure === 'done' && (states.materials === 'done' || states.budget === 'done') && states.file === 'done';
}
