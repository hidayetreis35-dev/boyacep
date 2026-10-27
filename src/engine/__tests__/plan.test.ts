import { renovationPlan, type PlanRoom } from '@/engine';

const room = (name: string, overrides: Partial<PlanRoom> = {}): PlanRoom => ({
  name,
  paintWalls: true,
  paintCeiling: false,
  coats: 2,
  surfaceType: 'painted',
  surfaceCondition: 'good',
  ...overrides,
});

describe('renovationPlan', () => {
  it('orders the work the way painters do it, room by room', () => {
    const plan = renovationPlan([
      room('Salon', { paintCeiling: true }),
      room('Yatak odası', { surfaceCondition: 'minor_repair' }),
      room('Banyo', { surfaceType: 'new_plaster', coats: 3 }),
      room('Koridor', { surfaceCondition: 'poor', paintCeiling: true }),
    ]);
    expect(plan).toEqual([
      { kind: 'prepare', rooms: ['Salon', 'Yatak odası', 'Banyo', 'Koridor'] },
      { kind: 'scrape', rooms: ['Koridor'] },
      { kind: 'fill', rooms: ['Yatak odası'] },
      { kind: 'sand', rooms: ['Salon'] },
      { kind: 'prime', rooms: ['Yatak odası', 'Banyo', 'Koridor'] },
      { kind: 'ceiling', rooms: ['Salon', 'Koridor'] },
      { kind: 'walls', coats: 2, rooms: ['Salon', 'Yatak odası', 'Koridor'] },
      { kind: 'walls', coats: 3, rooms: ['Banyo'] },
      { kind: 'finish', rooms: ['Salon', 'Yatak odası', 'Banyo', 'Koridor'] },
    ]);
  });

  it('leaves out rooms with nothing to paint, and steps with no room', () => {
    expect(renovationPlan([room('Salon'), room('Kiler', { paintWalls: false })]).map((s) => s.kind)).toEqual(['prepare', 'sand', 'walls', 'finish']);
    expect(renovationPlan([room('Kiler', { paintWalls: false })])).toEqual([]);
    expect(renovationPlan([])).toEqual([]);
  });

  it('paints a ceiling-only room without a walls step', () => {
    expect(renovationPlan([room('Mutfak', { paintWalls: false, paintCeiling: true })]).map((s) => s.kind)).toEqual(['prepare', 'sand', 'ceiling', 'finish']);
  });
});
