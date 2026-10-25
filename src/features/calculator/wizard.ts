import type { SurfaceCondition, SurfaceType } from '@/engine';
import { msg } from '@/i18n';
import type { IconName } from '@/ui/components';

import { toRoomInput, type FormErrors, type RoomForm } from './form';

/** What the user is painting. Only the label and hints change; the maths is the same room engine. */
export type SpaceKind = 'room' | 'living' | 'kitchen' | 'bathroom' | 'home' | 'exterior' | 'custom';

export const SPACES: { value: SpaceKind; label: string; hint: string; icon: IconName; ready: boolean }[] = [
  { value: 'room', label: msg('Oda'), hint: msg('Yatak, çocuk ya da çalışma odası'), icon: 'bed', ready: true },
  { value: 'living', label: msg('Salon'), hint: msg('Oturma ve yemek alanı'), icon: 'tv', ready: true },
  { value: 'kitchen', label: msg('Mutfak'), hint: msg('Buhara dayanıklı boya önerilir'), icon: 'restaurant', ready: true },
  { value: 'bathroom', label: msg('Banyo'), hint: msg('Neme dayanıklı boya önerilir'), icon: 'water', ready: true },
  { value: 'home', label: msg('Tüm ev'), hint: msg('Ev tipi ve metrekareyle hızlı tahmin'), icon: 'home', ready: true },
  { value: 'custom', label: msg('Özel alan'), hint: msg('Koridor, antre, ofis…'), icon: 'shapes', ready: true },
  { value: 'exterior', label: msg('Dış cephe'), hint: msg('Ayrı katsayılar gerekiyor'), icon: 'business', ready: false },
];

export const SPACE_LABEL = Object.fromEntries(SPACES.map((s) => [s.value, s.label])) as Record<SpaceKind, string>;

/** "Duvarın durumu" choices, each mapped to the engine's surface type and condition. */
export type WallState = 'new_plaster' | 'painted' | 'light_damage' | 'heavy_damage' | 'plasterboard' | 'concrete';

export const WALL_STATES: { value: WallState; label: string; hint: string; icon: IconName; surfaceType: SurfaceType; condition: SurfaceCondition }[] = [
  { value: 'painted', label: msg('Daha önce boyanmış'), hint: msg('Temiz, sağlam boya'), icon: 'checkmark-done', surfaceType: 'painted', condition: 'good' },
  { value: 'new_plaster', label: msg('Yeni sıva'), hint: msg('Hiç boyanmamış sıva ya da alçı'), icon: 'construct', surfaceType: 'new_plaster', condition: 'good' },
  { value: 'light_damage', label: msg('Hafif hasarlı'), hint: msg('Küçük delik, ince çatlak'), icon: 'bandage', surfaceType: 'painted', condition: 'minor_repair' },
  { value: 'heavy_damage', label: msg('Çok hasarlı'), hint: msg('Kabarma, dökülme, geniş çatlak'), icon: 'warning', surfaceType: 'painted', condition: 'poor' },
  { value: 'plasterboard', label: msg('Alçıpan'), hint: msg('Yeni alçıpan duvar'), icon: 'grid', surfaceType: 'plasterboard', condition: 'good' },
  { value: 'concrete', label: msg('Brüt beton'), hint: msg('Sıvasız beton yüzey'), icon: 'cube', surfaceType: 'concrete', condition: 'good' },
];

export function wallStateOf(form: Pick<RoomForm, 'surfaceType' | 'surfaceCondition'>): WallState {
  return (
    WALL_STATES.find((w) => w.surfaceType === form.surfaceType && w.condition === form.surfaceCondition)?.value ??
    (form.surfaceCondition === 'poor' ? 'heavy_damage' : form.surfaceCondition === 'minor_repair' ? 'light_damage' : 'painted')
  );
}

export function applyWallState(state: WallState): Pick<RoomForm, 'surfaceType' | 'surfaceCondition'> {
  const w = WALL_STATES.find((x) => x.value === state)!;
  return { surfaceType: w.surfaceType, surfaceCondition: w.condition };
}

export type Surfaces = 'walls' | 'ceiling' | 'both';

export function surfacesOf(form: Pick<RoomForm, 'paintWalls' | 'paintCeiling'>): Surfaces {
  if (form.paintWalls && form.paintCeiling) return 'both';
  return form.paintCeiling ? 'ceiling' : 'walls';
}

export function applySurfaces(s: Surfaces): Pick<RoomForm, 'paintWalls' | 'paintCeiling'> {
  return { paintWalls: s !== 'ceiling', paintCeiling: s !== 'walls' };
}

export type RoomStep = 'space' | 'size' | 'surfaces' | 'openings' | 'condition' | 'coats';

export const ROOM_STEPS: { key: RoomStep; label: string }[] = [
  { key: 'space', label: msg('Hangi alanı boyayacaksın?') },
  { key: 'size', label: msg('Alanın ölçüleri') },
  { key: 'surfaces', label: msg('Boyanacak yüzeyler') },
  { key: 'openings', label: msg('Kapı ve pencereler') },
  { key: 'condition', label: msg('Duvarın durumu') },
  { key: 'coats', label: msg('Kaç kat boya?') },
];

const STEP_FIELDS: Record<RoomStep, (keyof FormErrors)[]> = {
  space: [],
  size: ['length', 'width', 'height', 'form'],
  surfaces: ['paintWalls', 'paintCeiling'],
  openings: ['doorCount', 'doorWidth', 'doorHeight', 'windowCount', 'windowWidth', 'windowHeight'],
  condition: ['surfaceType', 'surfaceCondition'],
  coats: ['coats', 'coverage'],
};

/** Errors that belong to this step only, so the user is never blocked by a later question. */
export function stepErrors(form: RoomForm, step: RoomStep): FormErrors {
  const parsed = toRoomInput(form);
  if (parsed.ok) return {};
  const out: FormErrors = {};
  for (const field of STEP_FIELDS[step]) {
    const message = parsed.errors[field];
    if (message) out[field] = message;
  }
  // A whole-room error (for example openings larger than the walls) shows on the openings step.
  if (step === 'openings' && parsed.errors.form) out.form = parsed.errors.form;
  if (step === 'size') delete out.form;
  return out;
}
