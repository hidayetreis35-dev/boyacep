import type { MaterialItem } from '@/engine';
import { formatNumber } from '@/lib/number';
import type { MaterialUnitDb, ProjectMaterialRow } from '@/lib/database.types';

export type MaterialDraft = Pick<ProjectMaterialRow, 'category' | 'name' | 'quantity' | 'unit'>;

/**
 * Turns the engine's material list into shopping list rows. Paint is listed per
 * can size ("İç cephe boyası (15 L kutu)") because shops price per can.
 */
export function materialsToDrafts(items: MaterialItem[]): MaterialDraft[] {
  return items.flatMap((item): MaterialDraft[] => {
    if (item.packages && item.packages.lines.length > 0) {
      return item.packages.lines.map((line) => ({
        category: item.category,
        name: `${item.name} (${formatNumber(line.size)} L kutu)`,
        quantity: line.count,
        unit: 'kutu',
      }));
    }
    return [{ category: item.category, name: item.name, quantity: item.quantity, unit: item.unit as MaterialUnitDb }];
  });
}

type PriceFields = Pick<ProjectMaterialRow, 'unit_price' | 'price_source' | 'store_name' | 'note'>;

/**
 * When the calculation is re-run, keep prices the user already entered for rows
 * with the same name, so updating measurements does not wipe their shop prices.
 */
export function carryOverPrices(
  drafts: MaterialDraft[],
  previous: Pick<ProjectMaterialRow, 'name' | 'unit_price' | 'price_source' | 'store_name' | 'note'>[],
): (MaterialDraft & PriceFields)[] {
  const byName = new Map(previous.map((p) => [p.name, p]));
  return drafts.map((d) => {
    const p = byName.get(d.name);
    return {
      ...d,
      unit_price: p?.unit_price ?? null,
      price_source: p?.unit_price != null ? p.price_source : 'estimate',
      store_name: p?.store_name ?? null,
      note: p?.note ?? null,
    };
  });
}
