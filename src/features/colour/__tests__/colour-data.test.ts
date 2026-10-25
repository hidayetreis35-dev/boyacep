import {
  BRAND_CATALOGUES,
  brandCatalogueProblems,
  brandRecords,
  colourCaption,
  colourFacts,
  GENERIC_COLOURS,
  harmonyNames,
  temperatureOf,
  type BrandCatalogue,
} from '@/features/colour/colour-data';
import { COLOURS } from '@/features/colour/catalogue';
import { hexToLab } from '@/features/colour/recolour';

const byName = (name: string) => GENERIC_COLOURS.find((c) => c.name === name)!;

const catalogue = (over: Partial<BrandCatalogue> = {}): BrandCatalogue => ({
  brand: 'Örnek Boya',
  source: { name: 'Örnek Boya renk kartı', licence: 'Yazılı izin, 2026' },
  checkedOn: '2026-10-25',
  colours: [
    { productCode: 'OB-1001', name: 'Sabah Sisi', hex: '#E8E6DF' },
    { productCode: 'OB-2040', name: 'Göl Mavisi', hex: '#6F95B8' },
  ],
  ...over,
});

describe('generic colour records', () => {
  it('has a full record for every catalogue colour', () => {
    expect(GENERIC_COLOURS).toHaveLength(COLOURS.length);
    for (const c of GENERIC_COLOURS) {
      expect(c.rgb).toHaveLength(3);
      expect(c.lab[0]).toBeGreaterThanOrEqual(0);
      expect(c.lab[0]).toBeLessThanOrEqual(100);
      expect(c.familyLabel).not.toBe('');
      expect(c.lrv).toBeGreaterThanOrEqual(0);
      expect(c.source.licence).not.toBe('');
      expect(c.brand).toBeUndefined();
      expect(c.productCode).toBeUndefined();
    }
  });

  it('keeps ids unique', () => {
    expect(new Set(GENERIC_COLOURS.map((c) => c.id)).size).toBe(GENERIC_COLOURS.length);
  });

  it('reads RGB from the hex code', () => {
    expect(byName('Lacivert').rgb).toEqual([0x25, 0x32, 0x4a]);
  });

  it('tells warm, cool and neutral tones apart', () => {
    expect(byName('Terakota').temperature).toBe('warm');
    expect(byName('Hardal').temperature).toBe('warm');
    expect(byName('Lacivert').temperature).toBe('cool');
    expect(byName('Petrol mavisi').temperature).toBe('cool');
    expect(byName('Antrasit').temperature).toBe('neutral');
    expect(temperatureOf(hexToLab('#FFFFFF'))).toBe('neutral');
  });

  it('sorts tones by depth', () => {
    expect(byName('Kırık beyaz').depth).toBe('light');
    expect(byName('Adaçayı').depth).toBe('mid');
    expect(byName('Lacivert').depth).toBe('deep');
  });

  it('names matching colours', () => {
    const names = harmonyNames('#A3B49A');
    expect(Object.keys(names).length).toBeGreaterThan(0);
    for (const list of Object.values(names)) expect(list.length).toBeGreaterThan(0);
  });
});

describe('brand layer', () => {
  it('ships no brand colours until one is added with permission', () => {
    expect(BRAND_CATALOGUES).toEqual([]);
  });

  it('accepts a complete catalogue and keeps its codes', () => {
    const c = catalogue();
    expect(brandCatalogueProblems(c)).toEqual([]);
    const records = brandRecords(c);
    expect(records.map((r) => [r.brand, r.productCode, r.name])).toEqual([
      ['Örnek Boya', 'OB-1001', 'Sabah Sisi'],
      ['Örnek Boya', 'OB-2040', 'Göl Mavisi'],
    ]);
    expect(records[1].family).toBe('blues');
    expect(records[0].source.name).toBe('Örnek Boya renk kartı');
  });

  it('rejects a catalogue without source, licence or check date', () => {
    const c = catalogue({ source: { name: '', licence: '' }, checkedOn: '' });
    expect(brandCatalogueProblems(c)).toEqual(['Kaynak ya da lisans/izin bilgisi yok.', 'Kontrol tarihi yok.']);
    expect(brandRecords(c)).toEqual([]);
  });

  it('rejects missing or repeated product codes and bad hex', () => {
    const c = catalogue({
      colours: [
        { productCode: 'OB-1', name: 'Bir', hex: '#FFFFFF' },
        { productCode: 'OB-1', name: 'İki', hex: '#ffffff' },
        { productCode: ' ', name: 'Üç', hex: '#000000' },
      ],
    });
    expect(brandCatalogueProblems(c)).toEqual([
      '2. renk: ürün kodu tekrar ediyor (OB-1).',
      '2. renk: renk kodu #RRGGBB biçiminde değil.',
      '3. renk: ürün kodu yok.',
    ]);
  });

  it('never captions a generic colour like a brand code', () => {
    expect(colourCaption(byName('Adaçayı'))).toBe('Genel ton · marka kodu değildir');
    expect(colourCaption({ brand: 'Örnek Boya', productCode: 'OB-1001' })).toBe('Örnek Boya · OB-1001');
    expect(colourCaption({ brand: 'Örnek Boya' })).toBe('Genel ton · marka kodu değildir');
  });
});

describe('colourFacts', () => {
  it('describes catalogue tones and typed codes', () => {
    expect(colourFacts('#B35C3E')).toEqual({ temperature: 'warm', depth: 'mid', caption: 'Genel ton · marka kodu değildir' });
    expect(colourFacts('#123456')).toEqual({ temperature: 'cool', depth: 'deep', caption: 'Kendi girdiğin renk kodu' });
  });
});
