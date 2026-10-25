import { isUsableOutline, outlineArea, parseOutline, toNormalised, toSvgPoints } from '@/features/colour/outline';
import { isLight, normaliseHex, PALETTE } from '@/features/colour/palette';

describe('outline', () => {
  it('normalises taps and keeps them inside the photo', () => {
    expect(toNormalised(50, 25, 200, 100)).toEqual([0.25, 0.25]);
    expect(toNormalised(-10, 150, 200, 100)).toEqual([0, 1]);
    expect(toNormalised(10, 10, 0, 100)).toEqual([0, 0]);
  });

  it('draws points at the shown size', () => {
    expect(toSvgPoints([[0, 0], [0.5, 0.25]], 200, 100)).toBe('0,0 100,25');
  });

  it('measures area and rejects lines', () => {
    const square: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    expect(outlineArea(square)).toBe(1);
    expect(isUsableOutline(square)).toBe(true);
    expect(isUsableOutline([[0, 0], [0.5, 0.5], [1, 1]])).toBe(false);
    expect(isUsableOutline([[0, 0], [1, 0]])).toBe(false);
    expect(isUsableOutline(null)).toBe(false);
  });

  it('accepts only well-formed stored outlines', () => {
    expect(parseOutline([[0.1, 0.2], [0.3, 0.4]])).toEqual([[0.1, 0.2], [0.3, 0.4]]);
    expect(parseOutline([[0.1, 2]])).toBeNull();
    expect(parseOutline([['a', 0]])).toBeNull();
    expect(parseOutline('x')).toBeNull();
  });
});

describe('palette', () => {
  it('normalises hex input', () => {
    expect(normaliseHex('#a1b2c3')).toBe('#A1B2C3');
    expect(normaliseHex(' abc ')).toBe('#AABBCC');
    expect(normaliseHex('#12')).toBeNull();
    expect(normaliseHex('zzzzzz')).toBeNull();
  });

  it('has valid, unique colours', () => {
    const all = PALETTE.flatMap((g) => g.colours);
    for (const c of all) expect(normaliseHex(c.hex)).toBe(c.hex);
    expect(new Set(all.map((c) => c.hex)).size).toBe(all.length);
  });

  it('tells light from dark', () => {
    expect(isLight('#F7F7F4')).toBe(true);
    expect(isLight('#25324A')).toBe(false);
  });
});
