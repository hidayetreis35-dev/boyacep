import { MAX_CEILING_HEIGHT, MAX_COATS, MAX_ROOM_SIDE, MIN_COATS } from './defaults';
import { round } from './round';
import type { Opening, Result, RoomAreas, RoomInput, ValidationIssue } from './types';

function isPositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

function openingArea(openings: Opening[]): number {
  return openings.reduce((sum, o) => sum + o.width * o.height * o.count, 0);
}

function validateOpenings(
  openings: Opening[],
  field: 'doors' | 'windows',
  label: string,
  room: RoomInput,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  openings.forEach((o, i) => {
    const at = `${field}[${i}]`;
    if (!Number.isInteger(o.count) || o.count < 0) {
      issues.push({ field: `${at}.count`, message: `${label} sayısı 0 veya pozitif tam sayı olmalı.` });
    }
    if (o.count > 0 && (!isPositive(o.width) || !isPositive(o.height))) {
      issues.push({ field: at, message: `${label} genişliği ve yüksekliği sıfırdan büyük olmalı.` });
    }
    if (o.height > room.height) {
      issues.push({ field: `${at}.height`, message: `${label} yüksekliği tavan yüksekliğinden büyük olamaz.` });
    }
  });
  return issues;
}

export function validateRoom(room: RoomInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isPositive(room.length) || room.length > MAX_ROOM_SIDE) {
    issues.push({ field: 'length', message: `Oda uzunluğu 0 ile ${MAX_ROOM_SIDE} m arasında olmalı.` });
  }
  if (!isPositive(room.width) || room.width > MAX_ROOM_SIDE) {
    issues.push({ field: 'width', message: `Oda genişliği 0 ile ${MAX_ROOM_SIDE} m arasında olmalı.` });
  }
  if (!isPositive(room.height) || room.height > MAX_CEILING_HEIGHT) {
    issues.push({ field: 'height', message: `Tavan yüksekliği 0 ile ${MAX_CEILING_HEIGHT} m arasında olmalı.` });
  }
  if (!Number.isInteger(room.coats) || room.coats < MIN_COATS || room.coats > MAX_COATS) {
    issues.push({ field: 'coats', message: `Kat sayısı ${MIN_COATS} ile ${MAX_COATS} arasında olmalı.` });
  }
  if (!room.paintWalls && !room.paintCeiling) {
    issues.push({ field: 'surfaces', message: 'Duvar veya tavandan en az birini seçin.' });
  }
  for (const [key, cov] of [
    ['wallCoverage', room.wallCoverage],
    ['ceilingCoverage', room.ceilingCoverage],
  ] as const) {
    if (cov && (!isPositive(cov.m2PerLitre) || cov.m2PerLitre > 40)) {
      issues.push({ field: key, message: 'Sarfiyat 0 ile 40 m²/L arasında olmalı.' });
    }
  }
  if (issues.length > 0) return issues;

  issues.push(...validateOpenings(room.doors, 'doors', 'Kapı', room));
  issues.push(...validateOpenings(room.windows, 'windows', 'Pencere', room));
  if (issues.length > 0) return issues;

  const gross = 2 * (room.length + room.width) * room.height;
  if (room.paintWalls && openingArea(room.doors) + openingArea(room.windows) >= gross) {
    issues.push({ field: 'openings', message: 'Kapı ve pencereler duvar alanından büyük olamaz.' });
  }
  return issues;
}

export function calculateAreas(room: RoomInput): Result<RoomAreas> {
  const issues = validateRoom(room);
  if (issues.length > 0) return { ok: false, issues };

  const perimeter = 2 * (room.length + room.width);
  const grossWall = perimeter * room.height;
  const doorDeduction = openingArea(room.doors);
  const windowDeduction = openingArea(room.windows);
  const netWall = room.paintWalls ? grossWall - doorDeduction - windowDeduction : 0;
  const ceiling = room.paintCeiling ? room.length * room.width : 0;

  return {
    ok: true,
    value: {
      grossWall: round(grossWall),
      doorDeduction: round(doorDeduction),
      windowDeduction: round(windowDeduction),
      netWall: round(netWall),
      ceiling: round(ceiling),
      totalPaintable: round(netWall + ceiling),
      perimeter: round(perimeter),
    },
  };
}
