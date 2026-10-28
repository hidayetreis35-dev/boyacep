import type { PackagePlan } from '@/engine';

export type CanFill = { size: number; fill: number };

/**
 * The cans of a package plan one by one, biggest first, each with how full
 * it ends up after the job: the paint left over comes out of the last cans.
 */
export function canFills(plan: PackagePlan): CanFill[] {
  const cans = [...plan.lines]
    .sort((a, b) => b.size - a.size)
    .flatMap((l) => Array.from({ length: l.count }, () => l.size));
  let spare = Math.max(0, plan.leftover);
  const fills = cans.map((size) => ({ size, fill: 1 }));
  for (let i = fills.length - 1; i >= 0 && spare > 0; i -= 1) {
    const unused = Math.min(spare, fills[i].size);
    fills[i].fill = Math.round(((fills[i].size - unused) / fills[i].size) * 100) / 100;
    spare -= unused;
  }
  return fills;
}
