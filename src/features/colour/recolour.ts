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

import { msg } from '@/i18n';
import type { WallOutline } from '@/lib/database.types';

export type Lab = [number, number, number];

/** Seed points (0–1) and how far the colour may drift from them. */
export type TapSelection = { seeds: WallOutline; tolerance: number; excludes?: WallOutline };

export const TOLERANCES = [
  { value: 'narrow', label: msg('Dar'), tolerance: 9 },
  { value: 'medium', label: msg('Orta'), tolerance: 15 },
  { value: 'wide', label: msg('Geniş'), tolerance: 24 },
] as const;
export type ToleranceKey = (typeof TOLERANCES)[number]['value'];
export const DEFAULT_TOLERANCE = 15;

/** The named step closest to a stored tolerance. */
export function toleranceKeyOf(tolerance: number): ToleranceKey {
  let best: (typeof TOLERANCES)[number] = TOLERANCES[0];
  for (const value of TOLERANCES) if (Math.abs(value.tolerance - tolerance) < Math.abs(best.tolerance - tolerance)) best = value;
  return best.value;
}
export const MAX_SEEDS = 8;
export const MIN_TOLERANCE = 4;
export const MAX_TOLERANCE = 40;

/** Longest side of the working copy of the photo, in pixels. */
export const MASK_SIZE = 480;

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
const f = (value: number) => (value > 216 / 24389 ? Math.cbrt(value) : ((24389 / 27) * value + 16) / 116);
const fInv = (value: number) => (value ** 3 > 216 / 24389 ? value ** 3 : (116 * value - 16) / (24389 / 27));

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

/** Lab values of every pixel, three floats per pixel. `edges` and `smooth` (a blurred copy) are filled in on first use. */
export type LabImage = { width: number; height: number; lab: Float32Array; edges?: Float32Array; smooth?: Float32Array };

/** sRGB channel value → linear light, for every byte value. Saves three powers per pixel. */
const LINEAR = Float64Array.from({ length: 256 }, (_, c) => toLinear(c));

/**
 * Same maths as rgbToLab, written out for speed: on Hermes (no JIT) this loop
 * runs for every pixel of the working copy before the first tap.
 */
export function toLabImage(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number): LabImage {
  const n = width * height;
  const lab = new Float32Array(n * 3);
  for (let i = 0, p = 0, o = 0; i < n; i++, p += 4, o += 3) {
    const lr = LINEAR[rgba[p]];
    const lg = LINEAR[rgba[p + 1]];
    const lb = LINEAR[rgba[p + 2]];
    const fx = f((0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / XN);
    const fy = f((0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb) / YN);
    const fz = f((0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / ZN);
    lab[o] = 116 * fy - 16;
    lab[o + 1] = 500 * (fx - fy);
    lab[o + 2] = 200 * (fy - fz);
  }
  return { width, height, lab };
}

/** Size of the working copy for a photo, keeping its shape. */
export function workingSize(width: number, height: number, max = MASK_SIZE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * How sharply the colour changes at each pixel, in Lab units per pixel: a
 * Sobel filter over a lightly blurred copy. Wall texture and JPEG noise score
 * low; the line where a wall meets the ceiling, a door frame or the outline of
 * a sofa scores high. Computed once per image.
 */
export function edgeMap(img: LabImage): Float32Array {
  if (img.edges) return img.edges;
  const { width: w, height: h, lab } = img;
  const tmp = new Float32Array(w * h * 3);
  const soft = new Float32Array(w * h * 3);
  soft.set(lab);
  // Two passes of a separable [1 2 1] / 4 blur; loops are unrolled over the three channels.
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const l = (row + (x > 0 ? x - 1 : 0)) * 3;
        const c = (row + x) * 3;
        const r = (row + (x < w - 1 ? x + 1 : w - 1)) * 3;
        tmp[c] = (soft[l] + 2 * soft[c] + soft[r]) / 4;
        tmp[c + 1] = (soft[l + 1] + 2 * soft[c + 1] + soft[r + 1]) / 4;
        tmp[c + 2] = (soft[l + 2] + 2 * soft[c + 2] + soft[r + 2]) / 4;
      }
    }
    for (let y = 0; y < h; y++) {
      const up = (y > 0 ? y - 1 : 0) * w;
      const row = y * w;
      const down = (y < h - 1 ? y + 1 : h - 1) * w;
      for (let x = 0; x < w; x++) {
        const u = (up + x) * 3;
        const c = (row + x) * 3;
        const d = (down + x) * 3;
        soft[c] = (tmp[u] + 2 * tmp[c] + tmp[d]) / 4;
        soft[c + 1] = (tmp[u + 1] + 2 * tmp[c + 1] + tmp[d + 1]) / 4;
        soft[c + 2] = (tmp[u + 2] + 2 * tmp[c + 2] + tmp[d + 2]) / 4;
      }
    }
  }
  const edges = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const up = (y > 0 ? y - 1 : 0) * w;
    const mid = y * w;
    const down = (y < h - 1 ? y + 1 : h - 1) * w;
    for (let x = 0; x < w; x++) {
      const l = x > 0 ? x - 1 : 0;
      const r = x < w - 1 ? x + 1 : w - 1;
      const ul = (up + l) * 3;
      const ur = (up + r) * 3;
      const ml = (mid + l) * 3;
      const mr = (mid + r) * 3;
      const dl = (down + l) * 3;
      const dr = (down + r) * 3;
      const ux = (up + x) * 3;
      const dx = (down + x) * 3;
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        const gx = soft[ur + k] + 2 * soft[mr + k] + soft[dr + k] - soft[ul + k] - 2 * soft[ml + k] - soft[dl + k];
        const gy = soft[dl + k] + 2 * soft[dx + k] + soft[dr + k] - soft[ul + k] - 2 * soft[ux + k] - soft[ur + k];
        sum += gx * gx + gy * gy;
      }
      edges[mid + x] = Math.sqrt(sum) / 8;
    }
  }
  img.edges = edges;
  img.smooth = soft;
  return edges;
}

// ---------------------------------------------------------------------------
// Tap to select
// ---------------------------------------------------------------------------

/**
 * Edge strength a selection may cross. Up to the medium setting it grows
 * gently, so corner lines still stop it; the wide setting allows much more,
 * for textured walls (sponge paint, brick).
 */
export function edgeLimitFor(tolerance: number): number {
  return tolerance <= DEFAULT_TOLERANCE ? tolerance * 0.2 : DEFAULT_TOLERANCE * 0.2 + (tolerance - DEFAULT_TOLERANCE) * 0.35;
}
/** On a textured wall (brick, wallpaper) the limit rises to this many times the texture's own edges. */
const TEXTURE_FACTOR = 2.5;
/** No surface may cross edges stronger than this, however textured. */
const MAX_EDGE_LIMIT = 8;
/** How much lightness counts in the colour distance, for pixels darker or lighter than the tap. */
export const DARKER_WEIGHT = 0.35;
export const LIGHTER_WEIGHT = 0.5;
/** Paint fades out over this many pixels where a surface ends without an edge… */
const FADE_PIXELS = 12;
/** …and over colours up to this share of the tolerance beyond it. */
const FADE_RANGE = 0.5;
/** Fades only cross smooth light gradients: no edge above this, no jump between neighbours above twice this. */
const FADE_EDGE = 1.5;
/** Extra cost of stepping onto an edge pixel, so competing selections meet at edges. */
const EDGE_COST = 4;

/**
 * Distance used against the seed colour. Light falling unevenly on a wall
 * changes its lightness a lot and its colour a little, so lightness counts
 * for less, and the pixel's colour is first brought to the seed's brightness:
 * the same paint in shadow and in sun then measures as the same colour.
 * Darker counts for less than lighter: shadows along frames and corners
 * belong to the wall, while lighter edges are usually trim or ceiling.
 */
function seedDistance(lab: Float32Array, i: number, ref: Lab): number {
  const L = lab[i * 3];
  const s = Math.min(1.5, Math.max(0.67, (ref[0] + 16) / (L + 16)));
  const dL = (L - ref[0]) * (L < ref[0] ? DARKER_WEIGHT : LIGHTER_WEIGHT);
  const da = lab[i * 3 + 1] * s - ref[1];
  const db = lab[i * 3 + 2] * s - ref[2];
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
 * How busy the surface around a tap is: the upper quartile of edge strength
 * within 21 px, counting only pixels of the surface's own colour, so a
 * chandelier or a frame next to the tap doesn't make a plain wall look textured.
 */
function localTexture(img: LabImage, edges: Float32Array, x0: number, y0: number, ref: Lab, tolerance: number): number {
  const { width, height, lab } = img;
  const values: number[] = [];
  for (let dy = -21; dy <= 21; dy += 3) {
    for (let dx = -21; dx <= 21; dx += 3) {
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const i = y * width + x;
      if (seedDistance(lab, i, ref) <= tolerance) values.push(edges[i]);
    }
  }
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length * 0.75)] ?? 0;
}

/**
 * A fingertip is wide: a tap meant for the wall can land on a skirting line
 * or a frame's edge. Moves the tap to the calmest pixel within 4 px.
 */
function calmestNear(edges: Float32Array, width: number, height: number, sx: number, sy: number): [number, number] {
  const x0 = Math.min(width - 1, Math.max(0, Math.round(sx * (width - 1))));
  const y0 = Math.min(height - 1, Math.max(0, Math.round(sy * (height - 1))));
  let best: [number, number] = [x0, y0];
  let bestScore = edges[y0 * width + x0];
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      // Prefer near pixels a little, so a calm wall under the finger wins over a calmer one further off.
      const score = edges[y * width + x] + Math.hypot(dx, dy) * 0.05;
      if (score < bestScore) {
        best = [x, y];
        bestScore = score;
      }
    }
  }
  return best;
}

/** A binary min-heap of pixel indices keyed by path cost. */
class CostHeap {
  private keys = new Float64Array(1024);
  private items = new Int32Array(1024);
  size = 0;

  push(item: number, key: number) {
    if (this.size === this.keys.length) {
      const keys = new Float64Array(this.size * 2);
      keys.set(this.keys);
      this.keys = keys;
      const items = new Int32Array(this.size * 2);
      items.set(this.items);
      this.items = items;
    }
    let i = this.size++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= key) break;
      this.keys[i] = this.keys[parent];
      this.items[i] = this.items[parent];
      i = parent;
    }
    this.keys[i] = key;
    this.items[i] = item;
  }

  pop(): number {
    const top = this.items[0];
    const key = this.keys[--this.size];
    const item = this.items[this.size];
    let i = 0;
    for (;;) {
      let child = 2 * i + 1;
      if (child >= this.size) break;
      if (child + 1 < this.size && this.keys[child + 1] < this.keys[child]) child++;
      if (this.keys[child] >= key) break;
      this.keys[i] = this.keys[child];
      this.items[i] = this.items[child];
      i = child;
    }
    this.keys[i] = key;
    this.items[i] = item;
    return top;
  }
}

const IN = 1;
const OUT = 2;

/**
 * Picks a surface from taps, the way paint visualisers' "magic fill" works,
 * with two additions that keep it from spilling:
 *
 * - Growth stops at edges (Sobel), not only at colour changes, so a white
 *   wall stops at the corner line with a white ceiling.
 * - "Remove" taps grow at the same time and claim what is theirs. Both sides
 *   pay extra to cross an edge, so they meet at the edge between them.
 *
 * Afterwards thin leaks are cut, the edge band the growth stopped short of is
 * added back where its colour matches, and small gaps are filled. Returns
 * 255 for the surface, 0 outside it, and values between where it fades out.
 */
export function selectRegion(img: LabImage, selection: TapSelection): Uint8Array {
  const { width, height, lab } = img;
  const n = width * height;
  const edges = edgeMap(img);
  const tolerance = Math.min(MAX_TOLERANCE, Math.max(MIN_TOLERANCE, selection.tolerance));
  const baseLimit = edgeLimitFor(tolerance);

  const label = new Uint8Array(n);
  const owner = new Uint8Array(n);
  const cost = new Float32Array(n).fill(Infinity);
  const done = new Uint8Array(n);
  const refs: Lab[] = [];
  const limits: number[] = [];
  const tolerances: number[] = [];
  const heap = new CostHeap();
  const seedPixels: number[] = [];

  const plant = (points: WallOutline | undefined, kind: number) => {
    for (const [sx, sy] of (points ?? []).slice(0, MAX_SEEDS)) {
      const [x, y] = calmestNear(edges, width, height, sx, sy);
      const i = y * width + x;
      if (cost[i] === 0) continue;
      const ref = seedColour(img, x, y);
      // Dark colours sit close together in Lab (a dark wall, a dark floor, a shadow), so dark taps get less room.
      const dark = Math.min(1, Math.max(0.55, (ref[0] + 16) / 56));
      refs.push(ref);
      tolerances.push(tolerance * dark);
      limits.push(Math.min(MAX_EDGE_LIMIT, Math.max(baseLimit * dark, localTexture(img, edges, x, y, ref, tolerance * dark) * TEXTURE_FACTOR)));
      cost[i] = 0;
      label[i] = kind;
      owner[i] = refs.length - 1;
      heap.push(i, 0);
      if (kind === IN) seedPixels.push(i);
    }
  };
  plant(selection.seeds, IN);
  plant(selection.excludes, OUT);

  const accepts = (i: number, j: number) => edges[j] <= limits[owner[i]] && seedDistance(lab, j, refs[owner[i]]) <= tolerances[owner[i]];

  if (!selection.excludes?.length) {
    // Nothing competes, so plain flood order is enough and much faster on a phone.
    const queue = new Int32Array(n);
    let head = 0;
    let tail = 0;
    for (const i of seedPixels) {
      done[i] = 1;
      queue[tail++] = i;
    }
    while (head < tail) {
      const i = queue[head++];
      const x = i % width;
      const y = (i - x) / width;
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x - 1 : k === 1 ? x + 1 : x;
        const ny = k === 2 ? y - 1 : k === 3 ? y + 1 : y;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        if (done[j] || !accepts(i, j)) continue;
        done[j] = 1;
        label[j] = IN;
        owner[j] = owner[i];
        queue[tail++] = j;
      }
    }
  } else {
    // Keep and remove taps grow together, cheapest path first, so they meet at the edge between them.
    while (heap.size > 0) {
      const i = heap.pop();
      if (done[i]) continue;
      done[i] = 1;
      const x = i % width;
      const y = (i - x) / width;
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x - 1 : k === 1 ? x + 1 : x;
        const ny = k === 2 ? y - 1 : k === 3 ? y + 1 : y;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        if (done[j] || !accepts(i, j)) continue;
        const c = cost[i] + 1 + edges[j] * EDGE_COST;
        if (c >= cost[j]) continue;
        cost[j] = c;
        label[j] = label[i];
        owner[j] = owner[i];
        heap.push(j, c);
      }
    }
  }

  let mask: Uint8Array = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (label[i] === IN) mask[i] = 255;
  mask = keepConnected(open(mask, width, height), width, height, seedPixels);

  // Edges are found on a blurred copy, so growth stops a few pixels short of the real line. Add those
  // pixels back while they match the surface and the raw colour doesn't jump: that jump is the line itself.
  const jump = Math.max(4, tolerance * 0.4);
  for (let pass = 0; pass < 4; pass++) {
    const added: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mask[i] || label[i] === OUT) continue;
      const x = i % width;
      const y = (i - x) / width;
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x - 1 : k === 1 ? x + 1 : x;
        const ny = k === 2 ? y - 1 : k === 3 ? y + 1 : y;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        if (!mask[j] || label[j] !== IN || stepDistance(lab, i, j) > jump) continue;
        if (seedDistance(lab, i, refs[owner[j]]) > tolerances[owner[j]] * 0.8) continue;
        added.push(i, j);
        break;
      }
    }
    if (added.length === 0) break;
    for (let k = 0; k < added.length; k += 2) {
      mask[added[k]] = 255;
      label[added[k]] = IN;
      owner[added[k]] = owner[added[k + 1]];
    }
  }

  const keepOut = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (label[i] === OUT) keepOut[i] = 1;
  mask = fillSmallHoles(mask, width, height, Math.max(30, Math.round(n * 0.001)), keepOut);

  // Where the surface ends only because its colour drifted (strong window light on a plain wall), fade the
  // paint out over a few pixels instead of stopping on a hard line. Edges and removed spots still stop it.
  // Colours are compared on the blurred copy here, so JPEG blocks don't show in the fade.
  const smooth = img.smooth!;
  let frontier: number[] = [];
  for (let i = 0; i < n; i++) {
    if (mask[i] !== 255) continue;
    const x = i % width;
    if (
      (x > 0 && !mask[i - 1]) ||
      (x < width - 1 && !mask[i + 1]) ||
      (i >= width && !mask[i - width]) ||
      (i < n - width && !mask[i + width])
    ) {
      frontier.push(i);
    }
  }
  for (let step = 1; step <= FADE_PIXELS && frontier.length > 0; step++) {
    const next: number[] = [];
    for (const i of frontier) {
      const o = owner[i];
      const x = i % width;
      const y = (i - x) / width;
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x - 1 : k === 1 ? x + 1 : x;
        const ny = k === 2 ? y - 1 : k === 3 ? y + 1 : y;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        if (mask[j] || keepOut[j] || edges[j] > FADE_EDGE || stepDistance(lab, i, j) > FADE_EDGE * 2) continue;
        const value = tolerances[o];
        const byColour = 1 - (seedDistance(smooth, j, refs[o]) - value) / (value * FADE_RANGE);
        const alpha = Math.round(255 * Math.min(1, byColour) * (1 - step / (FADE_PIXELS + 1)));
        if (alpha < 1) continue;
        mask[j] = Math.min(254, alpha);
        owner[j] = o;
        next.push(j);
      }
    }
    frontier = next;
  }
  return mask;
}

/** Erode then dilate by one pixel (3×3): cuts one-pixel bridges a selection leaked through. */
export function open(mask: Uint8Array, width: number, height: number): Uint8Array {
  // A 3×3 minimum or maximum is a 1×3 pass followed by a 3×1 pass.
  const pass = (src: Uint8Array, min: boolean, horizontal: boolean) => {
    const out = new Uint8Array(src.length);
    const stride = horizontal ? 1 : width;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const pos = horizontal ? x : y;
        const last = (horizontal ? width : height) - 1;
        const a = src[pos > 0 ? i - stride : i];
        const b = src[i];
        const c = src[pos < last ? i + stride : i];
        out[i] = min ? (a && b && c ? 255 : 0) : a || b || c ? 255 : 0;
      }
    }
    return out;
  };
  const eroded = pass(pass(mask, true, true), true, false);
  const opened = pass(pass(eroded, false, true), false, false);
  // Opening must not add anything that wasn't selected.
  for (let i = 0; i < opened.length; i++) if (!mask[i]) opened[i] = 0;
  return opened;
}

/** Only the parts of the mask connected to one of the start pixels (or right next to it). */
function keepConnected(mask: Uint8Array, width: number, height: number, starts: number[]): Uint8Array {
  const out = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let tail = 0;
  for (const s of starts) {
    const sx = s % width;
    const sy = (s - sx) / width;
    // A tap on a thin strip may have been opened away; use the nearest kept pixel.
    let found = -1;
    for (let r = 0; r <= 3 && found < 0; r++) {
      for (let dy = -r; dy <= r && found < 0; dy++) {
        for (let dx = -r; dx <= r && found < 0; dx++) {
          const x = sx + dx;
          const y = sy + dy;
          if (x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x]) found = y * width + x;
        }
      }
    }
    if (found >= 0 && !out[found]) {
      out[found] = 255;
      queue[tail++] = found;
    }
  }
  let head = 0;
  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    const y = (i - x) / width;
    for (let k = 0; k < 4; k++) {
      const nx = k === 0 ? x - 1 : k === 1 ? x + 1 : x;
      const ny = k === 2 ? y - 1 : k === 3 ? y + 1 : y;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const j = ny * width + nx;
      if (!mask[j] || out[j]) continue;
      out[j] = 255;
      queue[tail++] = j;
    }
  }
  return out;
}

/**
 * Fills gaps inside the selection smaller than `maxHole` pixels (texture,
 * dust, a nail). Larger gaps such as a picture or a window stay out, and so
 * does any gap that holds a pixel in `keepOut` (a spot the user removed).
 */
export function fillSmallHoles(mask: Uint8Array, width: number, height: number, maxHole: number, keepOut?: Uint8Array): Uint8Array {
  const out = mask.slice();
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const members: number[] = [];
  for (let s = 0; s < width * height; s++) {
    if (out[s] || seen[s]) continue;
    let head = 0;
    let tail = 0;
    let keep = false;
    members.length = 0;
    queue[tail++] = s;
    seen[s] = 1;
    while (head < tail) {
      const i = queue[head++];
      // Only gaps up to maxHole get filled, so stop collecting once a gap is bigger.
      if (members.length <= maxHole) members.push(i);
      const x = i % width;
      const y = (i - x) / width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1 || keepOut?.[i]) keep = true;
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
    if (!keep && members.length <= maxHole) for (const i of members) out[i] = 255;
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

/** Average colour of the selected pixels; the shader keeps light, shade and tint relative to it. */
export function meanLab(img: LabImage, mask: Uint8Array): Lab {
  const sum: Lab = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] !== 255) continue;
    sum[0] += img.lab[i * 3];
    sum[1] += img.lab[i * 3 + 1];
    sum[2] += img.lab[i * 3 + 2];
    n++;
  }
  return n ? [sum[0] / n, sum[1] / n, sum[2] / n] : [50, 0, 0];
}

/**
 * RGBA bytes for the mask image the shader reads, with a one-pixel soft edge
 * (3×3 average) so it scales up smoothly. Alpha is the mask. Red says where
 * the edge is a real line (255), which the shader sharpens at full resolution
 * by colour, and where the paint fades out on purpose (0), which it leaves soft.
 */
export function maskToRgba(mask: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(mask.length * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let fading = false;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const py = y + dy;
        if (py < 0 || py >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const px = x + dx;
          if (px < 0 || px >= width) continue;
          const v = mask[py * width + px];
          sum += v;
          if (v > 0 && v < 255) fading = true;
          n++;
        }
      }
      const i = (y * width + x) * 4;
      out[i] = fading ? 0 : 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = Math.round(sum / n);
    }
  }
  return out;
}

/**
 * How light white looks in this photo: the 98th percentile of L*. A dim
 * evening photo might top out at 80; a bright one near 100.
 */
export function photoWhite(img: LabImage): number {
  const n = img.width * img.height;
  const counts = new Uint32Array(101);
  for (let i = 0; i < n; i++) counts[Math.min(100, Math.max(0, Math.round(img.lab[i * 3])))]++;
  let seen = 0;
  for (let L = 100; L >= 0; L--) {
    seen += counts[L];
    if (seen >= n * 0.02) return Math.min(100, Math.max(60, L));
  }
  return 100;
}

/**
 * The paint as it would look under this photo's light: a swatch is judged in
 * good light, so in a dim photo the same paint is shown dimmer, the way the
 * room's own whites are.
 */
export function paintInPhoto(paint: Lab, white: number): Lab {
  const k = (white + 16) / 116;
  return [(paint[0] + 16) * k - 16, paint[1] * k, paint[2] * k];
}

/** Lightness above this (or above the paint, if lighter) eases towards white instead of clipping. */
export const HIGHLIGHT_KNEE = 88;
/** Share of the photo's own colour variation kept on the new paint: warm lamp light, cool window light. */
export const TINT = 0.6;

/**
 * What one pixel becomes. Same rule as the shader, so it can be tested.
 *
 * - Exposure: the paint is first dimmed to the photo's light (`photoWhite`).
 * - Light and shade: (L + 16) follows the cube root of the light a surface
 *   reflects, so scaling it by paint/wall scales the reflected light while
 *   each pixel keeps its share of light and shade. A pixel as light as the
 *   wall's average gets exactly the paint's lightness.
 * - Colour: the paint's a/b, weaker in shade and stronger in light, as real
 *   paint looks, plus part of the photo's local tint.
 */
export function recolourPixel(pixel: Lab, wall: Lab, swatch: Lab, white = 100): Lab {
  const paint = paintInPhoto(swatch, white);
  const knee = Math.max(HIGHLIGHT_KNEE, paint[0]);
  let L = (pixel[0] + 16) * ((paint[0] + 16) / (wall[0] + 16)) - 16;
  if (L > knee) L = knee + (100 - knee) * (1 - Math.exp(-(L - knee) / Math.max(0.5, 100 - knee)));
  L = Math.max(0, L);
  const light = (L + 16) / (paint[0] + 16);
  return [L, paint[1] * light + (pixel[1] - wall[1]) * TINT, paint[2] * light + (pixel[2] - wall[2]) * TINT];
}
