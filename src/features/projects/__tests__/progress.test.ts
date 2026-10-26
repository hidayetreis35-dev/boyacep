import { isReadyProject, nextStep, stepStates, type ProgressFacts } from '../progress';

const empty: ProgressFacts = { rooms: 0, materials: 0, colours: 0, budget: null, costs: 0, shared: false };

describe('project steps', () => {
  it('starts with measuring', () => {
    const states = stepStates(empty);
    expect(states).toEqual({ measure: 'todo', materials: 'todo', colour: 'todo', budget: 'todo', file: 'todo' });
    expect(nextStep(states)).toBe('measure');
    expect(isReadyProject(states)).toBe(false);
  });

  it('suggests the first step still to do', () => {
    expect(nextStep(stepStates({ ...empty, rooms: 2, materials: 5 }))).toBe('colour');
    expect(nextStep(stepStates({ ...empty, rooms: 1, materials: 3, colours: 1 }))).toBe('budget');
  });

  it('counts a budget or any cost as the budget step', () => {
    expect(stepStates({ ...empty, budget: 5000 }).budget).toBe('done');
    expect(stepStates({ ...empty, costs: 1 }).budget).toBe('done');
    expect(stepStates({ ...empty, budget: 5000, costs: null }).budget).toBe('done');
  });

  it('makes no suggestion while an earlier step is still loading', () => {
    const states = stepStates({ ...empty, rooms: 1, materials: null });
    expect(states.materials).toBe('unknown');
    expect(nextStep(states)).toBeNull();
  });

  it('has nothing left when every step is done', () => {
    const states = stepStates({ rooms: 1, materials: 4, colours: 2, budget: 8000, costs: 2, shared: true });
    expect(nextStep(states)).toBeNull();
    expect(isReadyProject(states)).toBe(true);
  });

  it('calls a project ready without colours', () => {
    expect(isReadyProject(stepStates({ ...empty, rooms: 1, budget: 3000, shared: true }))).toBe(true);
    expect(isReadyProject(stepStates({ ...empty, rooms: 1, materials: 2, shared: false }))).toBe(false);
  });
});
