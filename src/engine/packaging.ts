import { round } from './round';
import type { PackagePlan } from './types';

/** Work in centilitres so sizes like 0.75 L or 2.5 L stay exact integers. */
const UNIT = 100;

/**
 * Picks cans that cover `litres` with the least leftover, then the fewest cans.
 * Exact search (unbounded knapsack), so it never misses a better combination.
 */
export function planPackages(litres: number, sizes: number[]): PackagePlan {
  const cans = [...new Set(sizes)].filter((s) => Number.isFinite(s) && s > 0);
  if (cans.length === 0) throw new Error('planPackages: at least one positive can size is required');
  if (!Number.isFinite(litres) || litres < 0) throw new Error('planPackages: litres must be >= 0');

  if (litres === 0) return { lines: [], totalLitres: 0, leftover: 0 };

  const need = Math.ceil(round(litres * UNIT, 4));
  const units = cans.map((s) => Math.round(s * UNIT));
  const limit = need + Math.max(...units);

  // fewest[v] = fewest cans that sum exactly to v; last[v] = can index used last.
  const fewest = new Array<number>(limit + 1).fill(Infinity);
  const last = new Array<number>(limit + 1).fill(-1);
  fewest[0] = 0;
  for (let v = 1; v <= limit; v++) {
    for (let i = 0; i < units.length; i++) {
      const prev = v - units[i];
      if (prev >= 0 && fewest[prev] + 1 < fewest[v]) {
        fewest[v] = fewest[prev] + 1;
        last[v] = i;
      }
    }
  }

  let best = need;
  while (fewest[best] === Infinity) best++;

  const counts = new Map<number, number>();
  for (let v = best; v > 0; v -= units[last[v]]) {
    const size = cans[last[v]];
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }

  const lines = [...counts.entries()]
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.size - a.size);

  return {
    lines,
    totalLitres: round(best / UNIT),
    leftover: round((best - litres * UNIT) / UNIT),
  };
}
