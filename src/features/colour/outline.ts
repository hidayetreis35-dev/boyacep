import type { WallOutline } from '@/lib/database.types';

export const MAX_OUTLINE_POINTS = 24;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const round4 = (v: number) => Math.round(v * 10000) / 10000;

/** A tap at (x, y) on a view of the given size, as a normalised point. */
export function toNormalised(x: number, y: number, width: number, height: number): [number, number] {
  if (width <= 0 || height <= 0) return [0, 0];
  return [round4(clamp01(x / width)), round4(clamp01(y / height))];
}

/** "x1,y1 x2,y2 …" for an SVG polygon drawn at the given size. */
export function toSvgPoints(outline: WallOutline, width: number, height: number): string {
  return outline.map(([x, y]) => `${round4(x * width)},${round4(y * height)}`).join(' ');
}

/** Shoelace area of the outline, in the same normalised units (0–1). */
export function outlineArea(outline: WallOutline): number {
  let sum = 0;
  for (let i = 0; i < outline.length; i++) {
    const [x1, y1] = outline[i];
    const [x2, y2] = outline[(i + 1) % outline.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/** At least three points that enclose a visible area. */
export function isUsableOutline(outline: WallOutline | null | undefined): outline is WallOutline {
  return !!outline && outline.length >= 3 && outlineArea(outline) >= 0.001;
}

/** Validates an outline read from the database. */
export function parseOutline(value: unknown): WallOutline | null {
  if (!Array.isArray(value) || value.length > MAX_OUTLINE_POINTS) return null;
  const points: WallOutline = [];
  for (const p of value) {
    if (!Array.isArray(p) || p.length !== 2) return null;
    const [x, y] = p;
    if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || x > 1 || y < 0 || y > 1) return null;
    points.push([x, y]);
  }
  return points;
}
