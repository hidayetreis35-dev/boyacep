import { COLOURS, type CatalogColour, type FamilyKey } from './catalogue';
import { luminance } from './palette';
import { deltaE, hexToLab, type Lab } from './recolour';

import { t } from '@/i18n';

type Rgb = [number, number, number];
type Hsl = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function hexToHsl(hex: string): Hsl {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as Rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToHex([h, s, l]: Hsl): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

/** Perceptual-ish distance ("redmean"), good enough to snap to the nearest catalogue colour. */
export function distance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
}

export function nearest(hex: string, exclude: string[] = [], families?: FamilyKey[]): CatalogColour {
  let best = COLOURS[0];
  let bestD = Infinity;
  for (const c of COLOURS) {
    if (exclude.includes(c.hex)) continue;
    if (families && !families.includes(c.family)) continue;
    const d = distance(hex, c.hex);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

export type ColourMatch = { colour: CatalogColour; distance: number };

/** "Renk yakala": the catalogue colours closest to a measured one (CIE76 ΔE in Lab), closest first. */
export function closestColours(lab: Lab, count = 5, list: CatalogColour[] = COLOURS): ColourMatch[] {
  return list
    .map((colour) => ({ colour, distance: deltaE(lab, hexToLab(colour.hex)) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

/** How close a match looks. Side by side, most people can't tell colours under about 2–3 ΔE apart. */
export function matchLabel(distance: number): string {
  if (distance < 3) return t('Neredeyse aynı');
  if (distance < 7) return t('Çok yakın');
  if (distance < 14) return t('Yakın');
  return t('Benzer ton');
}

/** Light reflectance value, approximated from relative luminance (0 = black, 100 = white). */
export function lrv(hex: string): number {
  return Math.round(luminance(hex) * 100);
}

export type Harmony = { key: string; title: string; hint: string; colours: CatalogColour[] };

/**
 * Colour schemes decorators use, snapped to real catalogue colours so every
 * suggestion has a name. `base` can be any hex, including a custom code.
 */
export function harmonies(base: string): Harmony[] {
  const [h, s, l] = hexToHsl(base);
  const self = nearest(base);
  const used = [self.hex];
  const snap = (hex: string, families?: FamilyKey[]) => {
    const c = nearest(hex, used, families);
    used.push(c.hex);
    return c;
  };
  const tonal = [snap(hslToHex([h, s, Math.min(0.94, l + 0.22)])), snap(hslToHex([h, s, Math.max(0.12, l - 0.25)]))];
  used.splice(1);
  const analogous = [snap(hslToHex([h - 30, s, l])), snap(hslToHex([h + 30, s, l]))];
  used.splice(1);
  const accent = [snap(hslToHex([h + 180, Math.max(s, 0.35), Math.min(0.6, Math.max(0.35, l))]))];
  used.splice(1);
  const neutral = [snap(l > 0.6 ? '#4A4C4E' : '#F1EDE4', ['whites', 'creams', 'greys', 'darks']), snap('#CBBBA4', ['beiges', 'greys'])];

  return [
    { key: 'tonal', title: t('Ton sür ton'), hint: t('Aynı rengin açığı ve koyusu; sakin ve bütünlüklü.'), colours: [tonal[0], self, tonal[1]] },
    { key: 'analogous', title: t('Komşu renkler'), hint: t('Renk çemberinde yan yana; doğal ve uyumlu.'), colours: [analogous[0], self, analogous[1]] },
    { key: 'accent', title: t('Zıt vurgu'), hint: t('Tek duvarda ya da aksesuarda canlı karşıtlık.'), colours: [self, accent[0]] },
    { key: 'neutral', title: t('Nötr eşlik'), hint: t('Tavan, kapı ve süpürgelik için güvenli eşler.'), colours: [self, ...neutral] },
  ];
}
