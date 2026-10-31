import type { GestureResponderEvent } from 'react-native';

import { msg } from '@/i18n';
import type { PhotoSurface, WallOutline } from '@/lib/database.types';

import { toNormalised } from './outline';
import type { Lab } from './recolour';

/** How the surface being added is picked: tap similar colour, or draw its corners. */
export type SelectMode = 'tap' | 'corners';

/** Text in a corner of the shared photo: a line per painted surface, then a short note. */
export type PhotoCaption = { lines: string[]; note: string };

/** Draws the painted photo for sharing, without selection guides, as JPEG bytes. Null if it could not be drawn. */
export type PaintedPhotoExport = (caption: PhotoCaption) => Uint8Array | null;

export type PhotoStageProps = {
  uri: string;
  /** width / height of the photo */
  aspect: number;
  surfaces: PhotoSurface[];
  /** Index of the highlighted surface. */
  active: number;
  /** The surface being picked, while `drawing`. `excludes` are taps on spots to keep out. */
  draft: { mode: SelectMode; points: WallOutline; excludes: WallOutline; tolerance: number };
  drawing: boolean;
  showColour: boolean;
  /** 0–1: how fully the paint replaces the photo's own colour. */
  amount: number;
  onTap: (point: [number, number]) => void;
  /** "Renk yakala": a tap reports the colour under it instead of selecting. Wins over `drawing`. */
  picking?: boolean;
  /** Where the last colour was taken from; marked on the photo while picking. */
  pickedAt?: [number, number] | null;
  onPick?: (colour: Lab, point: [number, number]) => void;
  /** Set by the stage once the photo is ready, so the studio can share the painted room. */
  exportRef?: { current: PaintedPhotoExport | null };
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

export const TAP_LABEL = msg('Fotoğraf: boyanacak yere dokun');
export const CORNER_LABEL = msg('Fotoğraf: yüzeyin köşesine dokun');
export const PICK_LABEL = msg('Fotoğraf: rengini öğrenmek istediğin yere dokun');
export const PHOTO_LABEL = msg('Oda fotoğrafı ve renk önizlemesi');

/** What the photo's touch surface is for right now, as a screen-reader label. */
export function stageLabel({ picking, drawing, draft }: Pick<PhotoStageProps, 'picking' | 'drawing' | 'draft'>): string {
  if (picking) return PICK_LABEL;
  if (drawing) return draft.mode === 'tap' ? TAP_LABEL : CORNER_LABEL;
  return PHOTO_LABEL;
}
