import { calculateRoom } from '@/engine';
import { EMPTY_ROOM_FORM, toRoomInput } from '@/features/calculator/form';
import { inputToRecord, roomToForm, roomToInput, type RoomWithOpenings } from '@/features/projects/mapping';

function savedRoom(overrides: Partial<RoomWithOpenings> = {}): RoomWithOpenings {
  return {
    id: 'r1',
    project_id: 'p1',
    name: 'Salon',
    // Postgres numeric columns arrive as strings from PostgREST.
    length_m: '4.00' as unknown as number,
    width_m: '3.50' as unknown as number,
    height_m: '2.60' as unknown as number,
    paint_walls: true,
    paint_ceiling: false,
    coats: 2,
    surface_type: 'painted',
    surface_condition: 'good',
    coverage_m2_per_l: null,
    coverage_source: null,
    sort_order: 0,
    created_at: '',
    updated_at: '',
    openings: [
      { id: 'o1', room_id: 'r1', kind: 'door', width_m: 0.9, height_m: 2.1, count: 1, created_at: '' },
      { id: 'o2', room_id: 'r1', kind: 'window', width_m: 1.2, height_m: 1.4, count: 2, created_at: '' },
    ],
    ...overrides,
  };
}

describe('roomToInput', () => {
  it('coerces numeric strings and splits openings', () => {
    const input = roomToInput(savedRoom());
    expect(input).toMatchObject({ length: 4, width: 3.5, height: 2.6, paintCeiling: false });
    expect(input.doors).toEqual([{ width: 0.9, height: 2.1, count: 1 }]);
    expect(input.windows).toEqual([{ width: 1.2, height: 1.4, count: 2 }]);
    expect(input.wallCoverage).toBeUndefined();
    expect(calculateRoom(input).ok).toBe(true);
  });

  it('carries a stored spread rate with its source', () => {
    const input = roomToInput(savedRoom({ coverage_m2_per_l: 12, coverage_source: 'manufacturer' }));
    expect(input.wallCoverage).toEqual({ m2PerLitre: 12, source: 'manufacturer' });
  });
});

describe('form <-> record round trip', () => {
  it('saves what the user typed and loads it back unchanged', () => {
    const form = { ...EMPTY_ROOM_FORM, length: '4', width: '3,5', windowCount: 2, coverage: '12', coverageSource: 'user' as const };
    const parsed = toRoomInput(form);
    if (!parsed.ok) throw new Error('form should be valid');
    const { room, openings } = inputToRecord(parsed.input);
    expect(room).toMatchObject({ length_m: 4, width_m: 3.5, coverage_m2_per_l: 12, coverage_source: 'user' });
    expect(openings).toEqual([
      { kind: 'door', width_m: 0.9, height_m: 2.1, count: 1 },
      { kind: 'window', width_m: 1.2, height_m: 1.4, count: 2 },
    ]);

    const reloaded = roomToForm({
      ...savedRoom(),
      ...room,
      openings: openings.map((o, i) => ({ ...o, id: `o${i}`, room_id: 'r1', created_at: '' })),
    });
    expect(toRoomInput(reloaded)).toEqual(parsed);
  });

  it('stores no spread rate when the user left it empty', () => {
    const parsed = toRoomInput({ ...EMPTY_ROOM_FORM, length: '3', width: '3' });
    if (!parsed.ok) throw new Error('form should be valid');
    expect(inputToRecord(parsed.input).room).toMatchObject({ coverage_m2_per_l: null, coverage_source: null });
  });
});
