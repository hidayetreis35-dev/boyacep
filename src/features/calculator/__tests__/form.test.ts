import { EMPTY_ROOM_FORM, toRoomInput, type RoomForm } from '@/features/calculator/form';

function form(overrides: Partial<RoomForm> = {}): RoomForm {
  return { ...EMPTY_ROOM_FORM, length: '4', width: '3,5', ...overrides };
}

describe('toRoomInput', () => {
  it('converts comma decimals and builds openings', () => {
    const r = toRoomInput(form());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.width).toBe(3.5);
    expect(r.input.height).toBe(2.6);
    expect(r.input.doors).toEqual([{ width: 0.9, height: 2.1, count: 1 }]);
    expect(r.input.windows).toEqual([{ width: 1.2, height: 1.4, count: 1 }]);
    expect(r.input.wallCoverage).toBeUndefined();
  });

  it('drops openings with count 0 even if their sizes are blank', () => {
    const r = toRoomInput(form({ doorCount: 0, doorWidth: '', windowCount: 0, windowHeight: '' }));
    expect(r.ok && r.input.doors).toEqual([]);
    expect(r.ok && r.input.windows).toEqual([]);
  });

  it('applies a typed spread rate to walls and ceiling with its source', () => {
    const r = toRoomInput(form({ coverage: '12', coverageSource: 'user' }));
    expect(r.ok && r.input.wallCoverage).toEqual({ m2PerLitre: 12, source: 'user' });
    expect(r.ok && r.input.ceilingCoverage).toEqual({ m2PerLitre: 12, source: 'user' });
  });

  it('shows empty dimensions as field errors', () => {
    const r = toRoomInput(form({ length: '', width: 'abc' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(['length', 'width']);
  });

  it('routes opening and coverage errors to the right fields', () => {
    const tallDoor = toRoomInput(form({ doorHeight: '3' }));
    expect(!tallDoor.ok && tallDoor.errors.doorHeight).toBeTruthy();
    const badCoverage = toRoomInput(form({ coverage: '0' }));
    expect(!badCoverage.ok && badCoverage.errors.coverage).toBeTruthy();
  });

  it('reports a form-level error when no surface is chosen', () => {
    const r = toRoomInput(form({ paintWalls: false, paintCeiling: false }));
    expect(!r.ok && r.errors.form).toBe('Duvar veya tavandan en az birini seçin.');
  });
});
