import { recommendMaterials, type RecommendInput } from '@/engine';

const base: RecommendInput = { surfaceType: 'painted', surfaceCondition: 'good', use: 'dry', paintCeiling: false };
const products = (input: Partial<RecommendInput>) => recommendMaterials({ ...base, ...input }).map((r) => r.product);
const find = (input: Partial<RecommendInput>, product: string) => recommendMaterials({ ...base, ...input }).find((r) => r.product === product);

describe('recommendMaterials', () => {
  it('needs no primer on a sound painted wall', () => {
    const recs = recommendMaterials(base);
    expect(recs.some((r) => r.kind === 'primer')).toBe(false);
    expect(products({})).toEqual(['Silinebilir iç cephe boyası', 'Kısa tüylü rulo (9–12 mm)', 'Köşe fırçası, maskeleme bandı ve örtü']);
  });

  it.each([
    ['new_plaster', 'Su bazlı iç cephe astarı', 'Orta tüylü rulo (12–18 mm)'],
    ['plasterboard', 'Alçıpan astarı', 'Kısa tüylü rulo (9–12 mm)'],
    ['concrete', 'Beton astarı (bağlayıcı)', 'Orta tüylü rulo (12–18 mm)'],
  ] as const)('requires the right primer and roller on %s', (surfaceType, primer, roller) => {
    expect(find({ surfaceType }, primer)?.level).toBe('required');
    expect(products({ surfaceType })).toContain(roller);
  });

  it('adds filler, sandpaper and patch primer for repairs', () => {
    expect(products({ surfaceCondition: 'minor_repair' })).toEqual(
      expect.arrayContaining(['Astar (macunlu ve kazınan yerlere)', 'Hazır macun', 'Zımpara kâğıdı (180–240 numara)']),
    );
    const poor = products({ surfaceCondition: 'poor' });
    expect(poor).toEqual(expect.arrayContaining(['Saten alçı (perdah macunu)', 'Spatula ve mala', 'Mat yüzeyli boya']));
    expect(poor).not.toContain('Hazır macun');
  });

  it('chooses paint by room use', () => {
    expect(find({ use: 'bathroom' }, 'Küfe dayanıklı (anti-bakteriyel) iç cephe boyası')?.level).toBe('required');
    expect(find({ use: 'kitchen' }, 'Silinebilir, buhara dayanıklı iç cephe boyası (ipek mat)')?.level).toBe('recommended');
    expect(find({ problems: ['mould'] }, 'Küfe dayanıklı (anti-bakteriyel) iç cephe boyası')?.level).toBe('required');
  });

  it('chooses ceiling paint only when the ceiling is painted', () => {
    expect(products({}).some((p) => p.includes('Tavan'))).toBe(false);
    expect(products({ paintCeiling: true })).toContain('Tavan boyası (mat beyaz)');
    expect(find({ paintCeiling: true, use: 'bathroom' }, 'Küfe dayanıklı tavan boyası')?.level).toBe('required');
  });

  it('puts problem primers first and lists one stain primer for several stains', () => {
    const recs = recommendMaterials({ ...base, surfaceType: 'new_plaster', problems: ['smoke_stain', 'damp', 'oil_paint'] });
    expect(recs.filter((r) => r.kind === 'primer').map((r) => r.product)).toEqual([
      'Geçiş astarı (yağlıdan su bazlıya)',
      'Leke örtücü (izolasyon) astar',
      'Su bazlı iç cephe astarı',
    ]);
  });

  it('suggests a covering primer only when going dark to light without another primer', () => {
    expect(find({ colourChange: 'dark_to_light' }, 'Örtücü beyaz astar')?.level).toBe('recommended');
    expect(find({ colourChange: 'dark_to_light', surfaceType: 'new_plaster' }, 'Örtücü beyaz astar')).toBeUndefined();
    expect(find({ colourChange: 'light_to_dark' }, 'Renge yakın tonlu astar')?.level).toBe('optional');
  });

  it('orders by kind, then by how needed it is', () => {
    const kinds = recommendMaterials({ ...base, surfaceCondition: 'poor', paintCeiling: true, problems: ['salt'] }).map((r) => r.kind);
    const order = ['primer', 'filler', 'wall_paint', 'ceiling_paint', 'supplies'];
    expect([...kinds].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(kinds);
  });

  it('gives a reason for every recommendation', () => {
    const recs = recommendMaterials({ surfaceType: 'concrete', surfaceCondition: 'poor', use: 'bathroom', paintCeiling: true, colourChange: 'light_to_dark', problems: ['damp', 'mould', 'salt', 'chalking', 'smoke_stain', 'oil_paint'] });
    for (const r of recs) expect(r.reason.length).toBeGreaterThan(20);
  });
});
