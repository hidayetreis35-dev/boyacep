import {
  calculateAreas,
  calculateProject,
  calculateRoom,
  planPackages,
  areaEstimate,
  quickEstimate,
  type RoomInput,
} from '@/engine';

/** 4 x 3 m room, 2.5 m ceiling, one door, one window. */
function room(overrides: Partial<RoomInput> = {}): RoomInput {
  return {
    length: 4,
    width: 3,
    height: 2.5,
    doors: [{ width: 0.9, height: 2.1, count: 1 }],
    windows: [{ width: 1.5, height: 1.2, count: 1 }],
    paintWalls: true,
    paintCeiling: true,
    coats: 2,
    surfaceType: 'painted',
    surfaceCondition: 'good',
    ...overrides,
  };
}

function ok<T>(r: { ok: true; value: T } | { ok: false; issues: unknown }): T {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.issues)}`);
  return r.value;
}

function fields(r: { ok: boolean; issues?: { field: string }[] }): string[] {
  return r.ok ? [] : (r.issues ?? []).map((i) => i.field);
}

describe('calculateAreas', () => {
  it('computes gross wall, deductions, net wall and ceiling', () => {
    expect(ok(calculateAreas(room()))).toEqual({
      grossWall: 35,
      doorDeduction: 1.89,
      windowDeduction: 1.8,
      netWall: 31.31,
      ceiling: 12,
      totalPaintable: 43.31,
      perimeter: 14,
    });
  });

  it('multiplies openings by count', () => {
    const a = ok(calculateAreas(room({ windows: [{ width: 1, height: 1, count: 3 }] })));
    expect(a.windowDeduction).toBe(3);
    expect(a.netWall).toBe(30.11);
  });

  it('handles a room without openings', () => {
    const a = ok(calculateAreas(room({ doors: [], windows: [] })));
    expect(a.netWall).toBe(35);
  });

  it('ignores openings with count 0', () => {
    const a = ok(calculateAreas(room({ doors: [{ width: 0, height: 0, count: 0 }] })));
    expect(a.doorDeduction).toBe(0);
  });

  it('reports zero wall area when only the ceiling is painted', () => {
    const a = ok(calculateAreas(room({ paintWalls: false })));
    expect(a.netWall).toBe(0);
    expect(a.ceiling).toBe(12);
    expect(a.totalPaintable).toBe(12);
  });

  it('reports zero ceiling when only walls are painted', () => {
    const a = ok(calculateAreas(room({ paintCeiling: false })));
    expect(a.ceiling).toBe(0);
    expect(a.totalPaintable).toBe(31.31);
  });

  it.each([
    ['length', { length: 0 }],
    ['length', { length: -3 }],
    ['length', { length: Number.NaN }],
    ['width', { width: 60 }],
    ['height', { height: 0 }],
    ['height', { height: 12 }],
    ['coats', { coats: 0 }],
    ['coats', { coats: 1.5 }],
    ['coats', { coats: 5 }],
    ['surfaces', { paintWalls: false, paintCeiling: false }],
    ['wallCoverage', { wallCoverage: { m2PerLitre: 0, source: 'user' as const } }],
  ])('rejects invalid %s', (field, overrides) => {
    expect(fields(calculateAreas(room(overrides)))).toContain(field);
  });

  it('rejects a door taller than the ceiling', () => {
    expect(fields(calculateAreas(room({ doors: [{ width: 0.9, height: 3, count: 1 }] })))).toContain(
      'doors[0].height',
    );
  });

  it('rejects a negative opening count', () => {
    expect(fields(calculateAreas(room({ windows: [{ width: 1, height: 1, count: -1 }] })))).toContain(
      'windows[0].count',
    );
  });

  it('rejects openings larger than the walls', () => {
    const r = calculateAreas(
      room({ length: 2, width: 2, height: 2, doors: [], windows: [{ width: 4, height: 2, count: 3 }] }),
    );
    expect(fields(r)).toEqual(['openings']);
  });
});

describe('calculateRoom', () => {
  it('computes paint for a painted wall in good condition', () => {
    const r = ok(calculateRoom(room()));
    // 31.31 m² x 2 coats / 10 m²/L x 1.1 waste = 6.89 L
    expect(r.paint.wallLitres).toBe(6.9);
    // 12 m² x 2 / 10 x 1.1 = 2.64 L
    expect(r.paint.ceilingLitres).toBe(2.6);
    expect(r.paint.primerRecommended).toBe(false);
    expect(r.paint.primerLitres).toBe(0);
  });

  it('scales with the number of coats', () => {
    expect(ok(calculateRoom(room({ coats: 1 }))).paint.wallLitres).toBe(3.4);
    expect(ok(calculateRoom(room({ coats: 3 }))).paint.wallLitres).toBe(10.3);
  });

  it('uses a manufacturer spread rate when given', () => {
    const r = ok(calculateRoom(room({ wallCoverage: { m2PerLitre: 12, source: 'manufacturer' } })));
    // 31.31 x 2 / 12 x 1.1 = 5.74 L
    expect(r.paint.wallLitres).toBe(5.7);
    expect(r.assumptions.find((a) => a.key === 'wallCoverage')?.source).toBe('manufacturer');
  });

  it('adds first-coat absorption and primer for new plaster', () => {
    const r = ok(calculateRoom(room({ surfaceType: 'new_plaster' })));
    // (31.31 x 2 / 10 + 31.31 x 0.15 / 10) x 1.1 = 7.40 L
    expect(r.paint.wallLitres).toBe(7.4);
    // 43.31 / 10 x 1.1 = 4.76 L
    expect(r.paint.primerLitres).toBe(4.8);
    expect(r.paint.primerRecommended).toBe(true);
    expect(r.assumptions.map((a) => a.key)).toEqual(
      expect.arrayContaining(['absorption', 'primerCoverage']),
    );
  });

  it.each([
    ['plasterboard', 'good', true],
    ['concrete', 'good', true],
    ['painted', 'minor_repair', false],
    ['painted', 'poor', true],
  ] as const)('primer for %s / %s is %s', (surfaceType, surfaceCondition, expected) => {
    const r = ok(calculateRoom(room({ surfaceType, surfaceCondition })));
    expect(r.paint.primerRecommended).toBe(expected);
  });

  it('marks generic defaults as estimates', () => {
    const r = ok(calculateRoom(room()));
    expect(r.assumptions.find((a) => a.key === 'wallCoverage')?.source).toBe('estimate');
    expect(r.assumptions.find((a) => a.key === 'waste')?.source).toBe('estimate');
  });

  it('passes validation errors through', () => {
    expect(calculateRoom(room({ height: 0 })).ok).toBe(false);
  });
});

describe('planPackages', () => {
  const sizes = [15, 7.5, 2.5];

  it('returns nothing for zero litres', () => {
    expect(planPackages(0, sizes)).toEqual({ lines: [], totalLitres: 0, leftover: 0 });
  });

  it('prefers one big can for an exact match', () => {
    expect(planPackages(15, sizes).lines).toEqual([{ size: 15, count: 1 }]);
  });

  it('finds the least leftover, then the fewest cans', () => {
    expect(planPackages(23, sizes)).toEqual({
      lines: [
        { size: 15, count: 1 },
        { size: 7.5, count: 1 },
        { size: 2.5, count: 1 },
      ],
      totalLitres: 25,
      leftover: 2,
    });
  });

  it('uses two small cans instead of one big one when that wastes less', () => {
    expect(planPackages(2.6, sizes).lines).toEqual([{ size: 2.5, count: 2 }]);
  });

  it('works with fractional can sizes', () => {
    expect(planPackages(3, [0.75, 2.5])).toEqual({
      lines: [{ size: 0.75, count: 4 }],
      totalLitres: 3,
      leftover: 0,
    });
  });

  it('handles large orders', () => {
    const p = planPackages(100.3, sizes);
    expect(p.totalLitres).toBe(102.5);
    expect(p.lines).toEqual([
      { size: 15, count: 6 },
      { size: 7.5, count: 1 },
      { size: 2.5, count: 2 },
    ]);
  });

  it('rejects bad input', () => {
    expect(() => planPackages(5, [])).toThrow();
    expect(() => planPackages(-1, sizes)).toThrow();
  });
});

describe('calculateProject', () => {
  it('requires at least one room', () => {
    expect(fields(calculateProject([]))).toEqual(['rooms']);
  });

  it('prefixes room errors with the room index', () => {
    expect(fields(calculateProject([room(), room({ length: 0 })]))).toContain('rooms[1].length');
  });

  it('builds a material list for one room in good condition', () => {
    const p = ok(calculateProject([room()]));
    expect(p.totals).toEqual({
      netWall: 31.31,
      ceiling: 12,
      totalPaintable: 43.31,
      wallLitres: 6.9,
      ceilingLitres: 2.6,
      primerLitres: 0,
    });
    const byCat = Object.fromEntries(p.materials.map((m) => [m.category, m]));
    expect(byCat.interior_paint.packages?.lines).toEqual([{ size: 7.5, count: 1 }]);
    expect(byCat.ceiling_paint.packages?.lines).toEqual([{ size: 2.5, count: 2 }]);
    expect(byCat.primer).toBeUndefined();
    expect(byCat.filler).toBeUndefined();
    expect(byCat.sandpaper).toBeUndefined();
    // 14 m x 2 + door 6 m + window 5.4 m = 39.4 m -> 2 rolls of 25 m
    expect(byCat.masking_tape.quantity).toBe(2);
    expect(byCat.drop_sheet.quantity).toBe(1);
    expect(byCat.roller.quantity).toBe(1);
  });

  it('adds primer, filler and sandpaper for a wall in poor condition', () => {
    const p = ok(calculateProject([room({ surfaceCondition: 'poor' })]));
    const byCat = Object.fromEntries(p.materials.map((m) => [m.category, m]));
    expect(byCat.primer.quantity).toBe(4.8);
    // 43.31 m² x 0.5 kg = 21.7 kg -> 22 kg
    expect(byCat.filler.quantity).toBe(22);
    expect(byCat.sandpaper.quantity).toBe(5);
  });

  it('sums rooms and buys cans on the total, not per room', () => {
    const p = ok(calculateProject([room(), room(), room()]));
    expect(p.totals.wallLitres).toBe(20.7);
    const paint = p.materials.find((m) => m.category === 'interior_paint');
    expect(paint?.packages?.totalLitres).toBe(22.5);
  });

  it('skips ceiling paint when no ceiling is painted', () => {
    const p = ok(calculateProject([room({ paintCeiling: false })]));
    expect(p.materials.some((m) => m.category === 'ceiling_paint')).toBe(false);
  });

  it('marks paint as manufacturer data only when every room has it', () => {
    const mfr = { m2PerLitre: 12, source: 'manufacturer' as const };
    const all = ok(calculateProject([room({ wallCoverage: mfr }), room({ wallCoverage: mfr })]));
    expect(all.materials[0].source).toBe('manufacturer');
    const mixed = ok(calculateProject([room({ wallCoverage: mfr }), room()]));
    expect(mixed.materials[0].source).toBe('estimate');
  });

  it('deduplicates assumptions and records can sizes', () => {
    const p = ok(calculateProject([room(), room()], { canSizes: [10, 2.5] }));
    expect(p.assumptions.filter((a) => a.key === 'waste')).toHaveLength(1);
    expect(p.assumptions.find((a) => a.key === 'canSizes')).toEqual({
      key: 'canSizes',
      label: 'Kutu boyları: 10 L, 2.5 L',
      source: 'user',
    });
  });
});

describe('quickEstimate', () => {
  it('estimates a 3+1, 120 m² home with ceilings', () => {
    expect(ok(quickEstimate({ houseType: '3+1', floorArea: 120, includeCeilings: true, coats: 2 }))).toEqual({
      wallArea: 336,
      ceilingArea: 120,
      wallLitres: 73.9,
      ceilingLitres: 26.4,
      totalLitres: 100.3,
    });
  });

  it('grows the wall factor with room count', () => {
    const small = ok(quickEstimate({ houseType: '1+1', floorArea: 100, includeCeilings: false, coats: 2 }));
    const big = ok(quickEstimate({ houseType: '6+1', floorArea: 100, includeCeilings: false, coats: 2 }));
    expect(small.wallArea).toBe(240);
    expect(big.wallArea).toBe(340);
    expect(small.ceilingLitres).toBe(0);
  });

  it.each([
    ['floorArea', { floorArea: 5 }],
    ['floorArea', { floorArea: Number.NaN }],
    ['coats', { coats: 0 }],
    ['houseType', { houseType: '9+1' }],
  ])('rejects invalid %s', (field, overrides) => {
    const input = { houseType: '2+1', floorArea: 90, includeCeilings: true, coats: 2, ...overrides };
    expect(fields(quickEstimate(input as never))).toContain(field);
  });
});

describe('areaEstimate', () => {
  it('turns a measured wall area into litres, with waste', () => {
    // 120 m² × 2 coats / 10 m²/L × 1.1 = 26.4 L
    expect(ok(areaEstimate({ wallArea: 120, ceilingArea: null, coats: 2 }))).toEqual({ wallLitres: 26.4, ceilingLitres: 0, totalLitres: 26.4 });
  });

  it('adds the ceiling when it is painted', () => {
    expect(ok(areaEstimate({ wallArea: 50, ceilingArea: 20, coats: 1 }))).toEqual({ wallLitres: 5.5, ceilingLitres: 2.2, totalLitres: 7.7 });
  });

  it('rejects impossible input', () => {
    const r = areaEstimate({ wallArea: 0, ceilingArea: 0, coats: 5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.field)).toEqual(['wallArea', 'ceilingArea', 'coats']);
  });
});
