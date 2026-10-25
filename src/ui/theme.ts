import { useColorScheme } from 'react-native';

/**
 * BoyaCep design tokens. Every screen takes colours, spacing, radii and type
 * sizes from here so light and dark themes stay consistent.
 */

const light = {
  background: '#F7F6F3',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEDE8',
  border: '#E3E1DC',
  text: '#1B1F1E',
  textMuted: '#5E6664',
  primary: '#12665F',
  primaryPressed: '#0D4F49',
  onPrimary: '#FFFFFF',
  primarySoft: '#DDEFEC',
  // Darker than a typical amber so accent text on accentSoft passes WCAG AA.
  accent: '#9A5B0E',
  accentSoft: '#FBEBD3',
  danger: '#B42318',
  dangerSoft: '#FDE7E5',
  success: '#1E7A3E',
  successSoft: '#DEF3E5',
};

export type Palette = typeof light;

const dark: Palette = {
  background: '#0E1413',
  surface: '#172120',
  surfaceMuted: '#1F2B29',
  border: '#2A3735',
  text: '#EEF2F1',
  textMuted: '#A3AEAB',
  primary: '#3FB8A9',
  primaryPressed: '#5CCABC',
  onPrimary: '#06201D',
  primarySoft: '#173B37',
  accent: '#F0B256',
  accentSoft: '#3A2C15',
  danger: '#F97066',
  dangerSoft: '#3D1A17',
  success: '#5BC983',
  successSoft: '#163323',
};

export const palettes = { light, dark };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const type = {
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 19, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  number: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
} as const;

export type TypeVariant = keyof typeof type;

/** Content never stretches wider than this on tablets and desktop browsers. */
export const MAX_CONTENT_WIDTH = 640;

/** Minimum touch target for accessibility. */
export const MIN_TOUCH = 44;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
