import { assess, SYMPTOMS, workPlan } from '@/features/inspect/rules';

describe('assess', () => {
  it('puts the most serious problem first', () => {
    const result = assess(['patchy', 'wide_crack', 'mould']);
    expect(result.symptoms.map((s) => s.id)).toEqual(['wide_crack', 'mould', 'patchy']);
    expect(result.worst).toBe('expert');
  });

  it('handles an empty or unknown selection', () => {
    expect(assess([])).toEqual({ symptoms: [], worst: null });
    expect(assess(['nope'])).toEqual({ symptoms: [], worst: null });
  });

  it('gives every symptom a cause and steps', () => {
    expect(new Set(SYMPTOMS.map((s) => s.id)).size).toBe(SYMPTOMS.length);
    for (const s of SYMPTOMS) {
      expect(s.cause.length).toBeGreaterThan(20);
      expect(s.steps.length).toBeGreaterThan(1);
    }
  });

  it('only links to guides that exist in the seed', () => {
    const seeded = [
      'ustanin-altin-kurallari', 'boya-oncesi-hazirlik', 'astar-ne-zaman-gerekir', 'macun-ve-zimpara', 'tavan-nasil-boyanir',
      'duvar-boyama-teknigi', 'rulo-ve-firca-secimi', 'sik-yapilan-boya-hatalari', 'dis-cephe-boyasi', 'dogru-boya-secimi',
    ];
    for (const s of SYMPTOMS) if (s.guideSlug) expect(seeded).toContain(s.guideSlug);
  });
});

describe('workPlan', () => {
  it('merges shared steps into one ordered plan', () => {
    const plan = workPlan(['peeling', 'hairline_crack', 'damp_stain'], 'room');
    expect(plan.steps.map((s) => s.key)).toEqual(['water', 'dry', 'protect', 'scrape', 'fill', 'sand', 'primer', 'paint']);
    expect(plan.steps.find((s) => s.key === 'primer')!.text).toBe(
      'Astar sür: leke örtücü (izolasyon) astar, kazınan ve macunlanan yerlere astar.',
    );
    expect(plan.blocked).toBe(true);
    expect(plan.materials).toEqual(expect.arrayContaining(['Spatula', 'Macun', 'Zımpara kâğıdı', 'Leke örtücü astar', 'Astar']));
  });

  it('gives a short plan for a wall in good shape', () => {
    const plan = workPlan([], 'room');
    expect(plan.steps.map((s) => s.key)).toEqual(['protect', 'clean', 'paint']);
    expect(plan.blocked).toBe(false);
  });

  it('picks the paint for the place and for mould', () => {
    expect(workPlan([], 'wet').steps.at(-1)!.text).toMatch(/küfe dayanıklı/);
    expect(workPlan(['mould'], 'room').steps.at(-1)!.text).toMatch(/küfe dayanıklı/);
    expect(workPlan(['chalking'], 'exterior').steps.at(-1)!.text).toMatch(/dış cephe boyası/);
  });

  it('stops at the expert step for a wide crack', () => {
    const plan = workPlan(['wide_crack'], 'room');
    expect(plan.steps[0].key).toBe('expert');
    expect(plan.blocked).toBe(true);
  });
});
