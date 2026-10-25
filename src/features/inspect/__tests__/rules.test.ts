import { assess, SYMPTOMS } from '@/features/inspect/rules';

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
