import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadBought, saveBought, shoppingItems, shoppingText, whatsappUrl, type ShoppingItem } from '../shopping';

const paint: ShoppingItem = { id: 'm1', name: 'İç cephe boyası (7,5 L kutu)', quantity: 2, unit: 'kutu', unit_price: 1200, price_source: 'store' };
const roller: ShoppingItem = { id: 'm2', name: 'Rulo', quantity: 1, unit: 'adet', unit_price: 150, price_source: 'estimate' };
const tape: ShoppingItem = { id: 'm3', name: 'Maskeleme bandı', quantity: 3, unit: 'rulo', unit_price: null, price_source: 'estimate' };
const none: ShoppingItem = { id: 'm4', name: 'Astar', quantity: 0, unit: 'kutu', unit_price: null, price_source: 'estimate' };

describe('shopping list', () => {
  it('skips items with no quantity', () => {
    expect(shoppingItems([paint, none]).map((i) => i.id)).toEqual(['m1']);
  });

  it('writes the list with quantities and prices', () => {
    expect(shoppingText('Salon', [paint, roller, tape, none], new Set())).toBe(
      [
        'BoyaCep alışveriş listesi: Salon',
        '',
        '• İç cephe boyası (7,5 L kutu): 2 kutu (2.400,00 ₺)',
        '• Rulo: 1 adet (≈ 150,00 ₺)',
        '• Maskeleme bandı: 3 rulo',
        '',
        'Fiyatı girilen 2 kalem: yaklaşık 2.550,00 ₺',
      ].join('\n'),
    );
  });

  it('leaves out what was already bought', () => {
    const text = shoppingText('Salon', [paint, roller, tape], new Set(['m1', 'm2']));
    expect(text).not.toContain('İç cephe');
    expect(text).toContain('Maskeleme bandı');
    expect(text).not.toContain('yaklaşık');
    expect(shoppingText('Salon', [paint], new Set(['m1']))).toContain('Her şey alındı.');
  });

  it('builds a WhatsApp link', () => {
    expect(whatsappUrl('Boya: 2 kutu & rulo')).toBe('https://wa.me/?text=Boya%3A%202%20kutu%20%26%20rulo');
  });

  it('remembers ticks per project on the device', async () => {
    await saveBought('p1', new Set(['m1']));
    expect([...(await loadBought('p1'))]).toEqual(['m1']);
    expect((await loadBought('p2')).size).toBe(0);
    await saveBought('p1', new Set());
    expect((await loadBought('p1')).size).toBe(0);
  });

  it('ignores a damaged saved value', async () => {
    await AsyncStorage.setItem('boyacep.shopping.p3.v1', '{oops');
    expect((await loadBought('p3')).size).toBe(0);
  });
});
