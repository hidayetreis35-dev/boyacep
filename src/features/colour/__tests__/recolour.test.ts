import {
  coverage,
  deltaE,
  fillSmallHoles,
  hexToLab,
  labToRgb,
  meanLightness,
  polygonMask,
  recolourPixel,
  rgbToLab,
  selectRegion,
  toLabImage,
  workingSize,
} from '@/features/colour/recolour';

/** A 100×80 "room": a beige wall that darkens to the right, a dark window, a sofa and a small nail. */
function room() {
  const w = 100;
  const h = 80;
  const px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // Wall: light beige with a soft shadow towards the right edge.
      const shade = 1 - (x / w) * 0.35;
      let rgb = [228 * shade, 214 * shade, 190 * shade];
      if (x >= 60 && x < 85 && y >= 10 && y < 40) rgb = [70, 110, 150]; // window (blue sky)
      if (y >= 55) rgb = [120, 70, 50]; // brown sofa along the bottom
      if (x === 20 && y === 20) rgb = [40, 40, 40]; // nail
      px[i] = Math.round(rgb[0]);
      px[i + 1] = Math.round(rgb[1]);
      px[i + 2] = Math.round(rgb[2]);
      px[i + 3] = 255;
    }
  }
  return toLabImage(px, w, h);
}

const at = (mask: Uint8Array, x: number, y: number) => mask[y * 100 + x];

describe('colour conversion', () => {
  it('matches known Lab values', () => {
    const white = rgbToLab(255, 255, 255);
    expect(white[0]).toBeCloseTo(100, 1);
    expect(Math.abs(white[1])).toBeLessThan(0.1);
    const red = rgbToLab(255, 0, 0);
    expect(red[0]).toBeCloseTo(53.24, 1);
    expect(red[1]).toBeCloseTo(80.09, 0);
    expect(red[2]).toBeCloseTo(67.2, 0);
  });

  it('round-trips through Lab', () => {
    for (const hex of ['#A3B49A', '#25324A', '#B35C3E', '#F7F7F4']) {
      const [r, g, b] = labToRgb(hexToLab(hex));
      const back = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
      expect(back).toBe(hex);
    }
  });

  it('measures colour difference', () => {
    expect(deltaE([50, 0, 0], [50, 0, 0])).toBe(0);
    expect(deltaE([50, 0, 0], [53, 4, 0])).toBe(5);
  });
});

describe('tap to select', () => {
  it('selects the shaded wall but not the window, the sofa or beyond', () => {
    const mask = selectRegion(room(), { seeds: [[0.1, 0.2]], tolerance: 15 });
    expect(at(mask, 5, 5)).toBe(255); // near the tap
    expect(at(mask, 95, 30)).toBe(255); // same wall in shadow
    expect(at(mask, 70, 20)).toBe(0); // window
    expect(at(mask, 50, 70)).toBe(0); // sofa
    expect(at(mask, 20, 20)).toBe(255); // the nail is a small hole and gets filled
  });

  it('a tap on the sofa selects only the sofa', () => {
    const mask = selectRegion(room(), { seeds: [[0.5, 0.9]], tolerance: 15 });
    expect(at(mask, 50, 70)).toBe(255);
    expect(at(mask, 10, 10)).toBe(0);
    expect(coverage(mask)).toBeCloseTo(25 / 80, 2);
  });

  it('adds up several taps', () => {
    const one = selectRegion(room(), { seeds: [[0.1, 0.2]], tolerance: 15 });
    const two = selectRegion(room(), { seeds: [[0.1, 0.2], [0.7, 0.3]], tolerance: 15 });
    expect(at(one, 70, 20)).toBe(0);
    expect(at(two, 70, 20)).toBe(255);
    expect(coverage(two)).toBeGreaterThan(coverage(one));
  });

  it('a narrower tolerance stops earlier on a gradient', () => {
    const narrow = selectRegion(room(), { seeds: [[0.05, 0.2]], tolerance: 4 });
    const wide = selectRegion(room(), { seeds: [[0.05, 0.2]], tolerance: 15 });
    expect(coverage(narrow)).toBeLessThan(coverage(wide));
  });

  it('fills small holes but keeps big ones and anything open to the edge', () => {
    const w = 10;
    const h = 10;
    const mask = new Uint8Array(w * h).fill(255);
    mask[5 * w + 5] = 0; // 1 px hole
    for (let y = 1; y < 4; y++) for (let x = 1; x < 4; x++) mask[y * w + x] = 0; // 9 px hole
    mask[9 * w + 9] = 0; // corner, open to the edge
    const out = fillSmallHoles(mask, w, h, 4);
    expect(out[5 * w + 5]).toBe(255);
    expect(out[2 * w + 2]).toBe(0);
    expect(out[9 * w + 9]).toBe(0);
  });
});

describe('corner outlines', () => {
  it('fills a polygon', () => {
    const mask = polygonMask([[0, 0], [0.5, 0], [0.5, 1], [0, 1]], 100, 80);
    expect(coverage(mask)).toBeCloseTo(0.5, 2);
    expect(at(mask, 10, 40)).toBe(255);
    expect(at(mask, 80, 40)).toBe(0);
  });

  it('ignores fewer than three points', () => {
    expect(coverage(polygonMask([[0, 0], [1, 1]], 10, 10))).toBe(0);
  });
});

describe('lighting', () => {
  it('keeps shadows darker than lit areas after recolouring', () => {
    const img = room();
    const mask = selectRegion(img, { seeds: [[0.1, 0.2]], tolerance: 15 });
    const mean = meanLightness(img, mask);
    const paint = hexToLab('#25324A');
    const lit = recolourPixel([img.lab[(10 * 100 + 5) * 3], 0, 0], mean, paint);
    const shade = recolourPixel([img.lab[(10 * 100 + 95) * 3], 0, 0], mean, paint);
    expect(lit[0]).toBeGreaterThan(shade[0]);
    expect(lit[1]).toBe(paint[1]);
    expect(lit[2]).toBe(paint[2]);
    // On average the wall ends up as light as the paint.
    expect((lit[0] + shade[0]) / 2).toBeCloseTo(paint[0], -1);
  });

  it('keeps shading when going lighter instead of burning to white', () => {
    const paint = hexToLab('#F7F7F4');
    const shadow = recolourPixel([35, 0, 0], 45, paint);
    const mid = recolourPixel([45, 0, 0], 45, paint);
    const highlight = recolourPixel([60, 0, 0], 45, paint);
    expect(mid[0]).toBeCloseTo(paint[0], 5);
    expect(mid[0] - shadow[0]).toBeCloseTo(10, 5);
    expect(highlight[0]).toBeGreaterThan(mid[0]);
    expect(highlight[0]).toBeLessThan(100);
  });

  it('scales the working copy down to the mask size', () => {
    expect(workingSize(4032, 3024)).toEqual({ width: 360, height: 270 });
    expect(workingSize(200, 100)).toEqual({ width: 200, height: 100 });
  });
});
