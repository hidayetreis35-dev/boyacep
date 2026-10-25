import { t } from '@/i18n';
import type { PhotoSurface, WallOutline } from '@/lib/database.types';

import { DEFAULT_TOLERANCE, MAX_SEEDS, MAX_TOLERANCE, MIN_TOLERANCE } from './recolour';

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

export const MAX_SURFACES = 6;

/**
 * Reads project_photos.wall_outline in either stored shape: a single outline
 * (older rows) or a list of surfaces, each outlined by corners or picked by
 * tapping. Invalid entries are dropped.
 */
export function parseSurfaces(value: unknown): PhotoSurface[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  const single = parseOutline(value);
  if (single) return isUsableOutline(single) ? [{ label: t('Duvar'), points: single, hex: null }] : [];
  const out: PhotoSurface[] = [];
  for (const item of value.slice(0, MAX_SURFACES)) {
    if (!item || typeof item !== 'object') continue;
    const { label, points, hex, seeds, tolerance, excludes } = item as Record<string, unknown>;
    const taps = parseOutline(seeds);
    const outline = parseOutline(points);
    const picked = taps && taps.length > 0 && taps.length <= MAX_SEEDS;
    if (!picked && !isUsableOutline(outline)) continue;
    const surface: PhotoSurface = {
      label: typeof label === 'string' && label.trim() ? label.trim().slice(0, 40) : t('Yüzey'),
      points: picked ? [] : outline!,
      hex: typeof hex === 'string' && /^#[0-9A-F]{6}$/.test(hex) ? hex : null,
    };
    if (picked) {
      surface.seeds = taps;
      surface.tolerance =
        typeof tolerance === 'number' && Number.isFinite(tolerance)
          ? Math.min(MAX_TOLERANCE, Math.max(MIN_TOLERANCE, tolerance))
          : DEFAULT_TOLERANCE;
      const out = parseOutline(excludes);
      if (out && out.length > 0 && out.length <= MAX_SEEDS) surface.excludes = out;
    }
    out.push(surface);
  }
  return out;
}
