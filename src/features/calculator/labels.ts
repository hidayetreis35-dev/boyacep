import type { PackagePlan, SurfaceCondition, SurfaceType, ValueSource } from '@/engine';
import { msg, t } from '@/i18n';
import { formatNumber } from '@/lib/number';

export const SURFACE_TYPE_OPTIONS: { value: SurfaceType; label: string }[] = [
  { value: 'painted', label: msg('Daha önce boyalı') },
  { value: 'new_plaster', label: msg('Yeni sıva / alçı') },
  { value: 'plasterboard', label: msg('Alçıpan') },
  { value: 'concrete', label: msg('Brüt beton') },
];

export const SURFACE_CONDITION_OPTIONS: { value: SurfaceCondition; label: string }[] = [
  { value: 'good', label: msg('İyi') },
  { value: 'minor_repair', label: msg('Ufak tamir') },
  { value: 'poor', label: msg('Kötü (kabarma, çatlak)') },
];

export const SOURCE_LABEL: Record<ValueSource, { label: string; tone: 'success' | 'primary' | 'accent' }> = {
  manufacturer: { label: msg('Üretici föyü'), tone: 'success' },
  user: { label: msg('Senin değerin'), tone: 'primary' },
  estimate: { label: msg('Tahmini'), tone: 'accent' },
};

/** "2 × 15 L + 1 × 2,5 L" */
export function packageText(plan: PackagePlan): string {
  return plan.lines.map((l) => `${l.count} × ${formatNumber(l.size)} L`).join(' + ');
}

/** "4 kg", "2 adet"; the unit is the engine's MaterialUnit or one saved with a material. */
export function quantityText(quantity: number, unit: string): string {
  const count = formatNumber(quantity);
  if (unit === 'adet') return t('{count} adet', { count });
  if (unit === 'rulo') return t('{count} rulo', { count });
  return `${count} ${unit}`;
}
