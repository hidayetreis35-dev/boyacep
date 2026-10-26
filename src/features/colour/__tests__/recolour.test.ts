import {
  coverage,
  deltaE,
  fillSmallHoles,
  hexToLab,
  labToRgb,
  meanLab,
  paintInPhoto,
  photoWhite,
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

/** A 100×80 corner of a room: a white ceiling above a white wall, `step` L* apart, both shaded left to right. */
function wallAndCeiling(step: number) {
  const w = 100;
  const h = 80;
  const px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = labToRgb([(y < 25 ? 92 : 92 - step) - (x / w) * 6, 0, 3]);
      px.set([r, g, b, 255], (y * w + x) * 4);
    }
  }
  return toLabImage(px, w, h);
}

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

  it('stops at the line where a wall meets a ceiling of the same colour', () => {
    const mask = selectRegion(wallAndCeiling(10), { seeds: [[0.5, 0.7]], tolerance: 15 });
    expect(at(mask, 50, 60)).toBe(255);
    expect(at(mask, 50, 10)).toBe(0);
    expect(at(mask, 50, 26)).toBe(255); // right up to the line
  });

  it('a remove tap keeps out a ceiling the selection would otherwise take', () => {
    const img = wallAndCeiling(3);
    const leaky = selectRegion(img, { seeds: [[0.5, 0.7]], tolerance: 24 });
    expect(at(leaky, 50, 10)).toBe(255);
    const mask = selectRegion(img, { seeds: [[0.5, 0.7]], excludes: [[0.5, 0.1]], tolerance: 24 });
    expect(at(mask, 50, 60)).toBe(255);
    expect(at(mask, 50, 10)).toBe(0);
    expect(at(mask, 10, 5)).toBe(0);
    // They meet at the line between them.
    expect(coverage(mask)).toBeGreaterThan(0.62);
    expect(coverage(mask)).toBeLessThan(0.72);
  });

  it('moves a tap that lands on a small mark onto the wall around it', () => {
    const mask = selectRegion(room(), { seeds: [[20 / 99, 20 / 79]], tolerance: 15 });
    expect(at(mask, 30, 30)).toBe(255);
    expect(at(mask, 70, 20)).toBe(0);
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

  it('never fills a gap the user removed', () => {
    const mask = new Uint8Array(100).fill(255);
    mask[55] = 0;
    const keepOut = new Uint8Array(100);
    keepOut[55] = 1;
    expect(fillSmallHoles(mask, 10, 10, 4, keepOut)[55]).toBe(0);
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
  const wall: [number, number, number] = [60, 2, 14];

  it('keeps shadows darker than lit areas, and the average on the paint', () => {
    const img = room();
    const mask = selectRegion(img, { seeds: [[0.1, 0.2]], tolerance: 15 });
    const mean = meanLab(img, mask);
    const paint = hexToLab('#25324A');
    const pixel = (x: number, y: number): [number, number, number] => [img.lab[(y * 100 + x) * 3], img.lab[(y * 100 + x) * 3 + 1], img.lab[(y * 100 + x) * 3 + 2]];
    const lit = recolourPixel(pixel(5, 10), mean, paint);
    const shade = recolourPixel(pixel(95, 10), mean, paint);
    expect(lit[0]).toBeGreaterThan(shade[0]);
    const atMean = recolourPixel(mean, mean, paint);
    expect(atMean[0]).toBeCloseTo(paint[0], 5);
    expect(atMean[1]).toBeCloseTo(paint[1], 5);
    expect(atMean[2]).toBeCloseTo(paint[2], 5);
  });

  it('makes paint less colourful in shade and more in light, as real paint looks', () => {
    const paint = hexToLab('#B35C3E');
    const chroma = (lab: number[]) => Math.hypot(lab[1], lab[2]);
    const shade = recolourPixel([45, wall[1], wall[2]], wall, paint);
    const light = recolourPixel([70, wall[1], wall[2]], wall, paint);
    expect(chroma(shade)).toBeLessThan(chroma(paint));
    expect(chroma(light)).toBeGreaterThan(chroma(paint));
  });

  it('keeps the photo’s local tint, such as warm lamp light', () => {
    const paint = hexToLab('#F1EDE4');
    const plain = recolourPixel(wall, wall, paint);
    const warm = recolourPixel([wall[0], wall[1] + 4, wall[2] + 10], wall, paint);
    expect(warm[2]).toBeGreaterThan(plain[2] + 5);
  });

  it('eases highlights towards white instead of clipping when going lighter', () => {
    const paint = hexToLab('#F7F7F4');
    const mid = recolourPixel([45, 0, 0], [45, 0, 0], paint);
    const shadow = recolourPixel([35, 0, 0], [45, 0, 0], paint);
    const highlight = recolourPixel([60, 0, 0], [45, 0, 0], paint);
    const brighter = recolourPixel([75, 0, 0], [45, 0, 0], paint);
    expect(mid[0]).toBeCloseTo(paint[0], 5);
    expect(shadow[0]).toBeLessThan(mid[0] - 10);
    expect(highlight[0]).toBeGreaterThan(mid[0]);
    expect(brighter[0]).toBeGreaterThan(highlight[0]);
    expect(brighter[0]).toBeLessThan(100);
  });

  it('shows paint dimmer in a dim photo, the way the room’s own whites are', () => {
    const paint = hexToLab('#F1EDE4');
    const bright = recolourPixel(wall, wall, paint, 100);
    const dim = recolourPixel(wall, wall, paint, 80);
    expect(bright[0]).toBeCloseTo(paint[0], 5);
    expect(dim[0]).toBeLessThan(paint[0] - 10);
    expect(paintInPhoto(paint, 100)).toEqual(paint);
  });

  it('finds how light white is in a photo', () => {
    const lab = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) lab[i * 3] = i < 97 ? 50 : 82; // 3% of pixels are the photo's whites
    expect(photoWhite({ width: 10, height: 10, lab })).toBe(82);
    expect(photoWhite({ width: 10, height: 10, lab: new Float32Array(300) })).toBe(60);
  });

  it('scales the working copy down to the mask size', () => {
    expect(workingSize(4032, 3024)).toEqual({ width: 480, height: 360 });
    expect(workingSize(200, 100)).toEqual({ width: 200, height: 100 });
  });
});
