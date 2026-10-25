import { calculateProject, type RoomInput } from '@/engine';
import { carryOverPrices, materialsToDrafts } from '@/features/materials/from-calculation';

const room: RoomInput = {
  length: 4,
  width: 3,
  height: 2.5,
  doors: [],
  windows: [],
  paintWalls: true,
  paintCeiling: true,
  coats: 2,
  surfaceType: 'painted',
  surfaceCondition: 'good',
};

describe('materialsToDrafts', () => {
  it('lists paint per can size and other items as they are', () => {
    const calc = calculateProject([room, room, room]);
    if (!calc.ok) throw new Error('valid');
    const drafts = materialsToDrafts(calc.value.materials);
    // 3 rooms x 7.7 L = 23.1 L walls -> 15 + 7.5 + 2.5; 3 x 2.6 = 7.8 L ceiling -> 7.5 + 2.5
    expect(drafts.filter((d) => d.category === 'interior_paint')).toEqual([
      { category: 'interior_paint', name: 'İç cephe boyası (15 L kutu)', quantity: 1, unit: 'kutu' },
      { category: 'interior_paint', name: 'İç cephe boyası (7,5 L kutu)', quantity: 1, unit: 'kutu' },
      { category: 'interior_paint', name: 'İç cephe boyası (2,5 L kutu)', quantity: 1, unit: 'kutu' },
    ]);
    expect(drafts.find((d) => d.category === 'masking_tape')).toMatchObject({ unit: 'rulo' });
    expect(drafts.some((d) => d.category === 'primer')).toBe(false);
  });
});

describe('carryOverPrices', () => {
  it('keeps prices for rows with the same name and leaves new rows unpriced', () => {
    const out = carryOverPrices(
      [
        { category: 'interior_paint', name: 'İç cephe boyası (15 L kutu)', quantity: 2, unit: 'kutu' },
        { category: 'roller', name: 'Rulo ve boya teknesi', quantity: 1, unit: 'adet' },
      ],
      [{ name: 'İç cephe boyası (15 L kutu)', unit_price: 1850, price_source: 'store', store_name: 'Market', note: null }],
    );
    expect(out[0]).toMatchObject({ quantity: 2, unit_price: 1850, price_source: 'store', store_name: 'Market' });
    expect(out[1]).toMatchObject({ unit_price: null, price_source: 'estimate', store_name: null });
  });
});
