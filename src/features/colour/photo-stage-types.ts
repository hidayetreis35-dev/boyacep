import type { GestureResponderEvent } from 'react-native';

import type { PhotoSurface, WallOutline } from '@/lib/database.types';

import { toNormalised } from './outline';

/** How the surface being added is picked: tap similar colour, or draw its corners. */
export type SelectMode = 'tap' | 'corners';

export type PhotoStageProps = {
  uri: string;
  /** width / height of the photo */
  aspect: number;
  surfaces: PhotoSurface[];
  /** Index of the highlighted surface. */
  active: number;
  /** The surface being picked, while `drawing`. */
  draft: { mode: SelectMode; points: WallOutline; tolerance: number };
  drawing: boolean;
  showColour: boolean;
  /** 0–1: how fully the paint replaces the photo's own colour. */
  amount: number;
  onTap: (point: [number, number]) => void;
};

/** A press on a view of the given size as a 0–1 point, or null. */
export function pressPoint(e: GestureResponderEvent, width: number, height: number): [number, number] | null {
  // Native touches carry locationX/Y; a mouse click on web carries offsetX/Y instead.
  const ne = e.nativeEvent as Partial<{ locationX: number; locationY: number; offsetX: number; offsetY: number }>;
  const x = ne.locationX ?? ne.offsetX;
  const y = ne.locationY ?? ne.offsetY;
  if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return toNormalised(x, y, width, height);
}

export const TAP_LABEL = 'Fotoğraf: boyanacak yere dokun';
export const CORNER_LABEL = 'Fotoğraf: yüzeyin köşesine dokun';
