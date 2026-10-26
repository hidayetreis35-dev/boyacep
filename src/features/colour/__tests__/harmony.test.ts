import { COLOURS, CLASSICS, searchColours, TRENDS } from '@/features/colour/catalogue';
import { distance, harmonies, hexToHsl, hslToHex, lrv, nearest } from '@/features/colour/harmony';

describe('catalogue', () => {
  it('has more than a hundred unique, valid colours', () => {
    expect(COLOURS.length).toBeGreaterThanOrEqual(140);
    expect(new Set(COLOURS.map((c) => c.hex)).size).toBe(COLOURS.length);
    expect(new Set(COLOURS.map((c) => c.name)).size).toBe(COLOURS.length);
    for (const c of COLOURS) expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('builds the editorial lists from real catalogue colours', () => {
    expect(CLASSICS).toHaveLength(8);
    expect(TRENDS).toHaveLength(8);
  });

  it('searches by Turkish name without accents and by code', () => {
    expect(searchColours('adacayi').map((c) => c.name)).toEqual(['Adaçayı']);
    expect(searchColours('#8fb3').map((c) => c.name)).toEqual(['Gök mavisi']);
    expect(searchColours('').length).toBe(COLOURS.length);
  });
});

describe('colour maths', () => {
  it('round-trips hex through HSL', () => {
    for (const hex of ['#8FB3CF', '#B35C3E', '#2F4A3A', '#F7F7F4']) {
      expect(distance(hslToHex(hexToHsl(hex)), hex)).toBeLessThan(3);
    }
  });

  it('snaps any code to the nearest named colour', () => {
    expect(nearest('#8FB3D0').name).toBe('Gök mavisi');
  });

  it('approximates light reflectance', () => {
    expect(lrv('#FFFFFF')).toBe(100);
    expect(lrv('#000000')).toBe(0);
  });

  it('suggests four named schemes that include the base colour', () => {
    const list = harmonies('#A3B49A');
    expect(list.map((h) => h.key)).toEqual(['tonal', 'analogous', 'accent', 'neutral']);
    for (const h of list) {
      expect(h.colours.map((c) => c.name)).toContain('Adaçayı');
      expect(new Set(h.colours.map((c) => c.hex)).size).toBe(h.colours.length);
    }
  });
});
