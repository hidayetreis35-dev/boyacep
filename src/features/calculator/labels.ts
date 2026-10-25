import type { SurfaceCondition, SurfaceType, ValueSource } from '@/engine';

export const SURFACE_TYPE_OPTIONS: { value: SurfaceType; label: string }[] = [
  { value: 'painted', label: 'Daha önce boyalı' },
  { value: 'new_plaster', label: 'Yeni sıva / alçı' },
  { value: 'plasterboard', label: 'Alçıpan' },
  { value: 'concrete', label: 'Brüt beton' },
];

export const SURFACE_CONDITION_OPTIONS: { value: SurfaceCondition; label: string }[] = [
  { value: 'good', label: 'İyi' },
  { value: 'minor_repair', label: 'Ufak tamir' },
  { value: 'poor', label: 'Kötü (kabarma, çatlak)' },
];

export const SOURCE_LABEL: Record<ValueSource, { label: string; tone: 'success' | 'primary' | 'accent' }> = {
  manufacturer: { label: 'Üretici föyü', tone: 'success' },
  user: { label: 'Senin değerin', tone: 'primary' },
  estimate: { label: 'Tahmini', tone: 'accent' },
};
