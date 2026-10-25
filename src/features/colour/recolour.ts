/**
 * Pixel maths for the realistic wall preview. Pure TypeScript so it runs the
 * same on phone, web and in tests; the Skia view only draws the result.
 *
 * Two jobs:
 * - "Tap to select": grow a region from the tapped points over pixels of a
 *   similar colour, so furniture, frames and windows in other colours stay out.
 * - Lighting: the shader keeps each pixel's lightness relative to the wall's
 *   average, so shadows and texture survive the new colour.
 */

import type { WallOutline } from '@/lib/database.types';

export type Lab = [number, number, number];

/** Seed points (0–1) and how far the colour may drift from them. */
export type TapSelection = { seeds: WallOutline; tolerance: number };

export const TOLERANCES = [
  { value: 'narrow', label: 'Dar', tolerance: 9 },
  { value: 'medium', label: 'Orta', tolerance: 15 },
  { value: 'wide', label: 'Geniş', tolerance: 24 },
] as const;
export type ToleranceKey = (typeof TOLERANCES)[number]['value'];
export const DEFAULT_TOLERANCE = 15;

/** The named step closest to a stored tolerance. */
export function toleranceKeyOf(tolerance: number): ToleranceKey {
  let best: (typeof TOLERANCES)[number] = TOLERANCES[0];
  for (const t of TOLERANCES) if (Math.abs(t.tolerance - tolerance) < Math.abs(best.tolerance - tolerance)) best = t;
  return best.value;
}
export const MAX_SEEDS = 8;
export const MIN_TOLERANCE = 4;
export const MAX_TOLERANCE = 40;

/** Longest side of the working copy of the photo, in pixels. */
export const MASK_SIZE = 360;

// ---------------------------------------------------------------------------
// sRGB ⇄ CIE Lab (D65)
// ---------------------------------------------------------------------------

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
};
const XN = 0.95047;
const YN = 1;
const ZN = 1.08883;
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const fInv = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));

export function rgbToLab(r: number, g: number, b: number): Lab {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / XN;
  const y = (0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb) / YN;
  const z = (0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / ZN;
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labToRgb([L, a, b]: Lab): [number, number, number] {
  const fy = (L + 16) / 116;
  const x = fInv(fy + a / 500) * XN;
  const y = fInv(fy) * YN;
  const z = fInv(fy - b / 200) * ZN;
  const lr = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const lg = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const lb = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  return [fromLinear(lr), fromLinear(lg), fromLinear(lb)];
}

export function hexToLab(hex: string): Lab {
  const n = parseInt(hex.slice(1), 16);
  return rgbToLab((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

/** CIE76 colour difference. Good enough for picking neighbouring pixels. */
export function deltaE(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// ---------------------------------------------------------------------------
// Working copy of the photo
// ---------------------------------------------------------------------------

/** Lab values of every pixel, three floats per pixel. */
export type LabImage = { width: number; height: number; lab: Float32Array };

export function toLabImage(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number): LabImage {
  const lab = new Float32Array(width * height * 3);
  for (let i = 0, p = 0; i < width * height; i++, p += 4) {
    const [L, a, b] = rgbToLab(rgba[p], rgba[p + 1], rgba[p + 2]);
    lab[i * 3] = L;
    lab[i * 3 + 1] = a;
    lab[i * 3 + 2] = b;
  }
  return { width, height, lab };
}

/** Size of the working copy for a photo, keeping its shape. */
export function workingSize(width: number, height: number, max = MASK_SIZE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// ---------------------------------------------------------------------------
// Tap to select
// ---------------------------------------------------------------------------

/**
 * Distance used against the seed colour. Lightness counts for less than hue
 * and saturation, so a wall that darkens towards a corner stays one wall.
 */
function seedDistance(lab: Float32Array, i: number, ref: Lab): number {
  const dL = (lab[i * 3] - ref[0]) * 0.5;
  const da = lab[i * 3 + 1] - ref[1];
  const db = lab[i * 3 + 2] - ref[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

function stepDistance(lab: Float32Array, i: number, j: number): number {
  const dL = lab[i * 3] - lab[j * 3];
  const da = lab[i * 3 + 1] - lab[j * 3 + 1];
  const db = lab[i * 3 + 2] - lab[j * 3 + 2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/** Average colour of the 5×5 pixels around (x, y), to ignore noise at the tap. */
function seedColour(img: LabImage, x: number, y: number): Lab {
  const out: Lab = [0, 0, 0];
  let n = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
      const i = py * img.width + px;
      out[0] += img.lab[i * 3];
      out[1] += img.lab[i * 3 + 1];
      out[2] += img.lab[i * 3 + 2];
      n++;
    }
  }
  return [out[0] / n, out[1] / n, out[2] / n];
}

/**
 * Pixels connected to any seed whose colour stays near that seed's colour and
 * changes gradually between neighbours. Sharp colour edges (door frames,
 * furniture, pictures) stop the growth. Returns 0/255 per pixel.
 */
export function selectRegion(img: LabImage, selection: TapSelection): Uint8Array {
  const { width, height, lab } = img;
  const mask = new Uint8Array(width * height);
  const tolerance = Math.min(MAX_TOLERANCE, Math.max(MIN_TOLERANCE, selection.tolerance));
  const step = Math.max(2.5, tolerance * 0.3);
  const queue = new Int32Array(width * height);

  for (const [sx, sy] of selection.seeds.slice(0, MAX_SEEDS)) {
    const x0 = Math.min(width - 1, Math.max(0, Math.round(sx * (width - 1))));
    const y0 = Math.min(height - 1, Math.max(0, Math.round(sy * (height - 1))));
    const start = y0 * width + x0;
    if (mask[start]) continue;
    const ref = seedColour(img, x0, y0);
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    mask[start] = 255;
    while (head < tail) {
      const i = queue[head++];
      const x = i % width;
      const y = (i - x) / width;
      // 4-neighbours
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x - 1 : k === 1 ? x + 1 : x;
        const ny = k === 2 ? y - 1 : k === 3 ? y + 1 : y;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        if (mask[j]) continue;
        if (stepDistance(lab, i, j) > step) continue;
        if (seedDistance(lab, j, ref) > tolerance) continue;
        mask[j] = 255;
        queue[tail++] = j;
      }
    }
  }
  return fillSmallHoles(mask, width, height, Math.round(width * height * 0.002));
}

/**
 * Fills gaps inside the selection smaller than `maxHole` pixels (texture,
 * dust, a nail). Larger gaps such as a picture or a window stay out.
 */
export function fillSmallHoles(mask: Uint8Array, width: number, height: number, maxHole: number): Uint8Array {
  const out = mask.slice();
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const members: number[] = [];
  for (let s = 0; s < width * height; s++) {
    if (out[s] || seen[s]) continue;
    let head = 0;
    let tail = 0;
    let touchesEdge = false;
    members.length = 0;
    queue[tail++] = s;
    seen[s] = 1;
    while (head < tail) {
      const i = queue[head++];
      members.push(i);
      const x = i % width;
      const y = (i - x) / width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x - 1 : k === 1 ? x + 1 : x;
        const ny = k === 2 ? y - 1 : k === 3 ? y + 1 : y;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        if (out[j] || seen[j]) continue;
        seen[j] = 1;
        queue[tail++] = j;
      }
    }
    if (!touchesEdge && members.length <= maxHole) for (const i of members) out[i] = 255;
  }
  return out;
}

/** Fills a corner-drawn outline (0–1 points) into a mask of the given size. */
export function polygonMask(points: WallOutline, width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (points.length < 3) return mask;
  const px = points.map(([x, y]) => [x * width, y * height] as const);
  for (let y = 0; y < height; y++) {
    const cy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < px.length; i++) {
      const [x1, y1] = px[i];
      const [x2, y2] = px[(i + 1) % px.length];
      if ((y1 <= cy && y2 > cy) || (y2 <= cy && y1 > cy)) xs.push(x1 + ((cy - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] - 0.5));
      const to = Math.min(width - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = from; x <= to; x++) mask[y * width + x] = 255;
    }
  }
  return mask;
}

/** Share of the photo the mask covers, 0–1. */
export function coverage(mask: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) n++;
  return mask.length ? n / mask.length : 0;
}

/** Average lightness (L*) of the selected pixels; the shader keeps light and shade relative to it. */
export function meanLightness(img: LabImage, mask: Uint8Array): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    sum += img.lab[i * 3];
    n++;
  }
  return n ? sum / n : 50;
}

/** RGBA bytes for a mask image: white with the mask as alpha. */
export function maskToRgba(mask: Uint8Array): Uint8Array {
  const out = new Uint8Array(mask.length * 4);
  for (let i = 0; i < mask.length; i++) {
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = mask[i];
  }
  return out;
}

/**
 * What one pixel becomes: the paint's hue and saturation, with lightness
 * scaled by how light or dark this pixel is compared with the wall's average.
 * Mirrors the shader so the rule can be tested.
 */
export function recolourPixel(pixel: Lab, wallMeanL: number, paint: Lab): Lab {
  // Darker paint: scale lightness, so shadows deepen in proportion.
  // Lighter paint: shift it, keeping shadows as deep as they were and squeezing
  // highlights into the headroom left above the paint, so nothing burns to white.
  let L: number;
  if (paint[0] <= wallMeanL) L = pixel[0] * (paint[0] / Math.max(1, wallMeanL));
  else {
    const dev = pixel[0] - wallMeanL;
    L = paint[0] + (dev > 0 ? dev * Math.min(1, (100 - paint[0]) / Math.max(1, 100 - wallMeanL)) : dev);
  }
  return [Math.min(100, Math.max(0, L)), paint[1], paint[2]];
}
