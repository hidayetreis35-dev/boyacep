import { calculateProject, ENGINE_VERSION } from '@/engine';
import { roomToInput, type RoomWithOpenings } from '@/features/projects/mapping';
import { saveSnapshot } from '@/features/survey/api';
import { buildSurvey, isEmptySurvey, stableStringify, toFinding } from '@/features/survey/model';
import { surveyHtml } from '@/features/survey/pdf';
import type { InspectionResultRow } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

function room(overrides: Partial<RoomWithOpenings> = {}): RoomWithOpenings {
  return {
    id: 'r1',
    project_id: 'p1',
    name: 'Salon',
    length_m: '4.00' as unknown as number,
    width_m: '3.50' as unknown as number,
    height_m: '2.60' as unknown as number,
    paint_walls: true,
    paint_ceiling: true,
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

function inspection(overrides: Partial<InspectionResultRow> = {}): InspectionResultRow {
  return { id: 'i1', project_id: 'p1', place: 'room', symptoms: [], location: null, created_at: '2026-10-25T10:00:00Z', ...overrides };
}

const today = new Date('2026-10-25T12:00:00Z');

describe('buildSurvey', () => {
  it('takes every number from the calculation engine', () => {
    const rooms = [room(), room({ id: 'r2', name: 'Yatak odası', paint_ceiling: false, openings: [] })];
    const model = buildSurvey({ title: 'Ev', rooms, colours: [], inspections: [], photoCount: 0, today });
    const calc = calculateProject(rooms.map(roomToInput));
    if (!calc.ok) throw new Error('fixture should calculate');

    expect(model.totals).toEqual(calc.value.totals);
    expect(model.materials).toEqual(calc.value.materials);
    expect(model.rooms[0]).toMatchObject({ name: 'Salon', length: 4, width: 3.5, height: 2.6, doors: 1, windows: 2 });
    expect(model.rooms[0].wallArea).toBe(calc.value.rooms[0].areas.netWall);
    expect(model.rooms[1].ceilingArea).toBe(0);
    expect(model.rooms[0].litres).toBeCloseTo(calc.value.rooms[0].paint.wallLitres + calc.value.rooms[0].paint.ceilingLitres);
    expect(model.preparedOn).toBe('2026-10-25');
    expect(model.snapshot?.engineVersion).toBe(ENGINE_VERSION);
    expect(model.calculationError).toBeNull();
  });

  it('keeps rooms but explains when a room cannot be calculated', () => {
    const model = buildSurvey({ title: 'Ev', rooms: [room({ height_m: 0 })], colours: [], inspections: [], photoCount: 0, today });
    expect(model.rooms).toHaveLength(1);
    expect(model.totals).toBeNull();
    expect(model.snapshot).toBeNull();
    expect(model.calculationError).toEqual(expect.any(String));
  });

  it('lists the most serious inspections first, with their work plan', () => {
    const model = buildSurvey({
      title: 'Ev',
      rooms: [],
      colours: [],
      inspections: [
        inspection({ id: 'ok', created_at: '2026-10-25T09:00:00Z' }),
        inspection({ id: 'peel', symptoms: ['peeling'], location: 'Koridor' }),
        inspection({ id: 'damp', place: 'wet', symptoms: ['damp_stain', 'mould'], created_at: '2026-10-25T11:00:00Z' }),
      ],
      photoCount: 0,
      today,
    });
    expect(model.findings.map((f) => f.id)).toEqual(['damp', 'peel', 'ok']);
    const damp = model.findings[0];
    expect(damp.title).toBe('Banyo ya da mutfak');
    expect(damp.worst).toBe('expert');
    expect(damp.blocked).toBe(true);
    expect(damp.steps[0]).toMatch(/Nemin/);
    expect(model.findings[1].title).toBe('Koridor');
    expect(model.findings[2].symptoms).toEqual([]);
  });

  it('knows when there is nothing to share yet', () => {
    expect(isEmptySurvey(buildSurvey({ title: 'Ev', rooms: [], colours: [], inspections: [], photoCount: 3, today }))).toBe(true);
    expect(isEmptySurvey(buildSurvey({ title: 'Ev', rooms: [], colours: [], inspections: [inspection()], photoCount: 0, today }))).toBe(false);
  });

  it('ignores symptom ids the app no longer knows', () => {
    expect(toFinding(inspection({ symptoms: ['peeling', 'old_symptom'] })).symptoms.map((s) => s.id)).toEqual(['peeling']);
  });
});

describe('surveyHtml', () => {
  const model = buildSurvey({
    title: 'Ali <b>Bey</b> evi',
    ownerName: 'Ali & Ayşe',
    rooms: [room({ name: '<script>x</script>' })],
    colours: [{ name: 'Adaçayı', hex: '#A3B49A', surface: 'Salon "duvarı"' }],
    inspections: [inspection({ symptoms: ['wide_crack'], location: 'Kapı <üstü>' })],
    photoCount: 2,
    today,
  });
  const html = surveyHtml(model);

  it('escapes everything users typed', () => {
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).toContain('Ali &lt;b&gt;Bey&lt;/b&gt; evi');
    expect(html).toContain('Ali &amp; Ayşe');
    expect(html).toContain('Kapı &lt;üstü&gt;');
    expect(html).toContain('Salon &quot;duvarı&quot;');
  });

  it('has every section, the sources and the honest notes', () => {
    expect(html).toContain('Keşif dosyası');
    expect(html).toContain('25.10.2026');
    expect(html).toContain('<h2>Odalar</h2>');
    expect(html).toContain('<h2>Malzeme ihtiyacı</h2>');
    expect(html).toContain('Tahmini');
    expect(html).toContain('marka ürün kodu değildir');
    expect(html).toContain('Geniş çatlak');
    expect(html).toContain('Boyadan önce nedeni giderilmeli');
    expect(html).toContain('teşhis değildir');
    expect(html).toContain('2 fotoğraf');
    expect(html).toContain(`Hesap sürümü ${ENGINE_VERSION}`);
  });

  it('never puts an unsafe colour into the style attribute', () => {
    const bad = surveyHtml({ ...model, colours: [{ name: 'x', hex: 'red;background:url(x)', surface: null }] });
    expect(bad).not.toContain('style="background:red');
    expect(bad).toContain('style="background:#FFFFFF"');
  });
});

describe('stableStringify', () => {
  it('ignores key order and undefined fields', () => {
    expect(stableStringify({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: undefined } })).toBe(
      stableStringify({ a: { d: [1, { x: 1, y: 2 }] }, b: 1 }),
    );
  });
});

describe('saveSnapshot', () => {
  const snapshot = { engineVersion: ENGINE_VERSION, input: { rooms: [{ a: 1, b: 2 }] }, result: { totals: { x: 1 } } };

  function fakeDb(last: unknown) {
    const insert = jest.fn().mockResolvedValue({ error: null });
    const select = {
      eq: () => select,
      order: () => select,
      limit: () => select,
      maybeSingle: () => Promise.resolve({ data: last, error: null }),
    };
    const db = { from: jest.fn(() => ({ select: () => select, insert })) } as unknown as DbClient;
    return { db, insert };
  }

  it('stores the first snapshot', async () => {
    const { db, insert } = fakeDb(null);
    expect(await saveSnapshot(db, 'p1', snapshot)).toBe(true);
    expect(insert).toHaveBeenCalledWith({ project_id: 'p1', engine_version: ENGINE_VERSION, input: snapshot.input, result: snapshot.result });
  });

  it('skips a snapshot identical to the last one, whatever the key order', async () => {
    const { db, insert } = fakeDb({ engine_version: ENGINE_VERSION, input: { rooms: [{ b: 2, a: 1 }] }, result: { totals: { x: 1 } } });
    expect(await saveSnapshot(db, 'p1', snapshot)).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it('stores a new snapshot when the numbers changed', async () => {
    const { db, insert } = fakeDb({ engine_version: ENGINE_VERSION, input: snapshot.input, result: { totals: { x: 2 } } });
    expect(await saveSnapshot(db, 'p1', snapshot)).toBe(true);
    expect(insert).toHaveBeenCalled();
  });
});
