import { DEFAULT_WALL_COVERAGE, WASTE_FACTOR } from './defaults';
import { round } from './round';
import type { Result } from './types';

/**
 * "3+1, 120 m²" style estimate for a whole home.
 * Wall area is floor area times a factor that grows with room count.
 * The factors are draft values awaiting a professional painter's check.
 */
export const HOUSE_TYPES = ['1+0', '1+1', '2+1', '3+1', '4+1', '5+1', '6+1'] as const;
export type HouseType = (typeof HOUSE_TYPES)[number];

export const WALL_FACTOR: Record<HouseType, number> = {
  '1+0': 2.3,
  '1+1': 2.4,
  '2+1': 2.6,
  '3+1': 2.8,
  '4+1': 3.0,
  '5+1': 3.2,
  '6+1': 3.4,
};

export interface QuickInput {
  houseType: HouseType;
  /** Net floor area, m². */
  floorArea: number;
  includeCeilings: boolean;
  coats: number;
}

export interface QuickEstimate {
  wallArea: number;
  ceilingArea: number;
  wallLitres: number;
  ceilingLitres: number;
  totalLitres: number;
}

export function quickEstimate(input: QuickInput): Result<QuickEstimate> {
  const issues = [];
  if (!Number.isFinite(input.floorArea) || input.floorArea < 10 || input.floorArea > 1000) {
    issues.push({ field: 'floorArea', message: 'Net alan 10 ile 1000 m² arasında olmalı.' });
  }
  if (!Number.isInteger(input.coats) || input.coats < 1 || input.coats > 4) {
    issues.push({ field: 'coats', message: 'Kat sayısı 1 ile 4 arasında olmalı.' });
  }
  if (!(input.houseType in WALL_FACTOR)) {
    issues.push({ field: 'houseType', message: 'Geçerli bir ev tipi seçin.' });
  }
  if (issues.length > 0) return { ok: false, issues };

  const wallArea = input.floorArea * WALL_FACTOR[input.houseType];
  const ceilingArea = input.includeCeilings ? input.floorArea : 0;
  const perArea = (input.coats / DEFAULT_WALL_COVERAGE.m2PerLitre) * (1 + WASTE_FACTOR);
  const wallLitres = round(wallArea * perArea, 1);
  const ceilingLitres = round(ceilingArea * perArea, 1);

  return {
    ok: true,
    value: {
      wallArea: round(wallArea, 1),
      ceilingArea: round(ceilingArea, 1),
      wallLitres,
      ceilingLitres,
      totalLitres: round(wallLitres + ceilingLitres, 1),
    },
  };
}

export interface AreaInput {
  /** Paintable wall area the user measured, m². */
  wallArea: number;
  /** Ceiling area, m²; null when the ceiling is not painted. */
  ceilingArea: number | null;
  coats: number;
}

export interface AreaEstimate {
  wallLitres: number;
  ceilingLitres: number;
  totalLitres: number;
}

/** Litres for a wall area the user already knows (the "Manuel Giriş" calculator). */
export function areaEstimate(input: AreaInput): Result<AreaEstimate> {
  const issues = [];
  if (!Number.isFinite(input.wallArea) || input.wallArea < 1 || input.wallArea > 5000) {
    issues.push({ field: 'wallArea', message: 'Duvar alanı 1 ile 5000 m² arasında olmalı.' });
  }
  if (input.ceilingArea !== null && (!Number.isFinite(input.ceilingArea) || input.ceilingArea < 1 || input.ceilingArea > 2000)) {
    issues.push({ field: 'ceilingArea', message: 'Tavan alanı 1 ile 2000 m² arasında olmalı.' });
  }
  if (!Number.isInteger(input.coats) || input.coats < 1 || input.coats > 4) {
    issues.push({ field: 'coats', message: 'Kat sayısı 1 ile 4 arasında olmalı.' });
  }
  if (issues.length > 0) return { ok: false, issues };

  const perArea = (input.coats / DEFAULT_WALL_COVERAGE.m2PerLitre) * (1 + WASTE_FACTOR);
  const wallLitres = round(input.wallArea * perArea, 1);
  const ceilingLitres = round((input.ceilingArea ?? 0) * perArea, 1);
  return { ok: true, value: { wallLitres, ceilingLitres, totalLitres: round(wallLitres + ceilingLitres, 1) } };
}
