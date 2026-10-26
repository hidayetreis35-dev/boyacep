import { useColorScheme } from 'react-native';

/**
 * BoyaCep design tokens. Every screen takes colours, spacing, radii and type
 * from here so light and dark themes stay consistent.
 *
 * Brand: deep navy for trust, a paint-can orange for the main call to action,
 * warm white paper, and one paint-inspired colour per feature.
 */

const light = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1F5',
  border: '#E2E6ED',
  text: '#141B2D',
  textMuted: '#585F70',
  /** Navy: buttons, links, selected states. */
  primary: '#1B2B4B',
  primaryPressed: '#0F1B33',
  onPrimary: '#FFFFFF',
  primarySoft: '#E5EAF4',
  /** Paint-can orange: the one main action on a screen. */
  cta: '#FF6B2C',
  ctaPressed: '#F0561A',
  onCta: '#1A1206',
  // Text-safe orange for accent text on accentSoft.
  accent: '#A8430E',
  accentSoft: '#FFE9DC',
  teal: '#0A7570',
  tealSoft: '#D9F2EF',
  danger: '#B42318',
  dangerSoft: '#FDE7E5',
  success: '#1E7A3E',
  successSoft: '#DEF3E5',
  /** Hero gradient. */
  heroFrom: '#14213D',
  heroTo: '#1F3358',
  onHero: '#FFFFFF',
  onHeroMuted: '#C9D4E8',
  shadow: 'rgba(20, 27, 45, 0.08)',
};

export type Palette = typeof light;

const dark: Palette = {
  background: '#0B1120',
  surface: '#141C2F',
  surfaceMuted: '#1C2640',
  border: '#28344F',
  text: '#F1F3F8',
  textMuted: '#A9B2C6',
  primary: '#9DB8FF',
  primaryPressed: '#B8CBFF',
  onPrimary: '#0B1120',
  primarySoft: '#1E2B4A',
  cta: '#FF7E45',
  ctaPressed: '#FF9663',
  onCta: '#1A1206',
  accent: '#FFB48A',
  accentSoft: '#3A2216',
  teal: '#5FD3CB',
  tealSoft: '#123634',
  danger: '#F97066',
  dangerSoft: '#3D1A17',
  success: '#5BC983',
  successSoft: '#163323',
  heroFrom: '#111A2E',
  heroTo: '#1A2A48',
  onHero: '#FFFFFF',
  onHeroMuted: '#B9C6DD',
  shadow: 'rgba(0, 0, 0, 0.35)',
};

export const palettes = { light, dark };

/** Each feature has its own paint colour so it is recognisable everywhere. */
export type FeatureKey = 'calculate' | 'color' | 'cost' | 'inspect' | 'guide' | 'ask' | 'projects';

export type FeatureColour = { base: string; soft: string; ink: string };

const featureLight: Record<FeatureKey, FeatureColour> = {
  calculate: { base: '#FF6B2C', soft: '#FFE9DC', ink: '#8F3609' },
  color: { base: '#C2367A', soft: '#FBE3EE', ink: '#8A1F53' },
  cost: { base: '#0E9F7E', soft: '#DAF3EA', ink: '#0A6650' },
  inspect: { base: '#4C5FD5', soft: '#E4E7FB', ink: '#2E3C9E' },
  guide: { base: '#D99A1E', soft: '#FBEFD3', ink: '#7A5410' },
  ask: { base: '#0EA5B7', soft: '#D8F3F6', ink: '#0B6672' },
  projects: { base: '#1B2B4B', soft: '#E5EAF4', ink: '#1B2B4B' },
};

const featureDark: Record<FeatureKey, FeatureColour> = {
  calculate: { base: '#FF7E45', soft: '#3A2216', ink: '#FFC4A3' },
  color: { base: '#E0619D', soft: '#3A1A2B', ink: '#F6B7D4' },
  cost: { base: '#2CC79F', soft: '#12332B', ink: '#9BE8D2' },
  inspect: { base: '#7D8CF0', soft: '#1E2348', ink: '#C3CBFA' },
  guide: { base: '#F0B23A', soft: '#352912', ink: '#F7D89A' },
  ask: { base: '#35C3D3', soft: '#0F3238', ink: '#A6E8F0' },
  projects: { base: '#9DB8FF', soft: '#1E2B4A', ink: '#C8D7FF' },
};

export const featurePalettes = { light: featureLight, dark: featureDark };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Plus Jakarta Sans, loaded in the root layout. Falls back to the system font. */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const type = {
  display: { fontSize: 32, lineHeight: 38, fontFamily: fonts.extrabold, letterSpacing: -0.6 },
  title: { fontSize: 26, lineHeight: 32, fontFamily: fonts.extrabold, letterSpacing: -0.4 },
  heading: { fontSize: 19, lineHeight: 26, fontFamily: fonts.bold, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fonts.regular },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontFamily: fonts.semibold },
  small: { fontSize: 14, lineHeight: 20, fontFamily: fonts.medium },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.semibold },
  overline: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, letterSpacing: 1 },
  number: { fontSize: 36, lineHeight: 42, fontFamily: fonts.extrabold, letterSpacing: -0.8 },
} as const;

export type TypeVariant = keyof typeof type;

/** Content never stretches wider than this on tablets and desktop browsers. */
export const MAX_CONTENT_WIDTH = 680;

/** Screens with two columns may grow to this width once the window is wide enough. */
export const MAX_WIDE_WIDTH = 1160;
export const WIDE_BREAKPOINT = 980;

/** Minimum touch target for accessibility. */
export const MIN_TOUCH = 44;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useFeatureColour(key: FeatureKey): FeatureColour {
  return (useColorScheme() === 'dark' ? featureDark : featureLight)[key];
}

/** Soft card shadow; boxShadow works on iOS, Android and web. */
export function shadowOf(p: Palette, level: 1 | 2 = 1) {
  return { boxShadow: level === 1 ? `0px 4px 16px ${p.shadow}` : `0px 12px 32px ${p.shadow}` } as const;
}
