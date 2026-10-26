import { EMPTY_ROOM_FORM } from '@/features/calculator/form';
import { applySurfaces, applyWallState, stepErrors, surfacesOf, wallStateOf, WALL_STATES } from '@/features/calculator/wizard';

describe('wall state mapping', () => {
  it.each(WALL_STATES.map((w) => w.value))('round-trips %s', (state) => {
    expect(wallStateOf(applyWallState(state))).toBe(state);
  });

  it('maps damage levels to the engine conditions', () => {
    expect(applyWallState('light_damage')).toEqual({ surfaceType: 'painted', surfaceCondition: 'minor_repair' });
    expect(applyWallState('heavy_damage')).toEqual({ surfaceType: 'painted', surfaceCondition: 'poor' });
  });
});

describe('surfaces mapping', () => {
  it.each(['walls', 'ceiling', 'both'] as const)('round-trips %s', (s) => expect(surfacesOf(applySurfaces(s))).toBe(s));
});

describe('stepErrors', () => {
  it('reports only the current step', () => {
    const form = { ...EMPTY_ROOM_FORM, length: '', coverage: '99' };
    expect(Object.keys(stepErrors(form, 'size'))).toEqual(['length', 'width']);
    expect(stepErrors(form, 'surfaces')).toEqual({});
    expect(Object.keys(stepErrors(form, 'coats'))).toEqual(['coverage']);
  });

  it('shows openings larger than the walls on the openings step', () => {
    const form = { ...EMPTY_ROOM_FORM, length: '1', width: '1', height: '2,5', windowCount: 20 };
    expect(stepErrors(form, 'size')).toEqual({});
    expect(stepErrors(form, 'openings').form).toBe('Kapı ve pencereler duvar alanından büyük olamaz.');
  });
});
