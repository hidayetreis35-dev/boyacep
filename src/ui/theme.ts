import { useColorScheme } from 'react-native';

/**
 * BoyaCep design tokens ("Sıcak lacivert"). Every screen takes colours,
 * spacing, radii, type and motion from here so light and dark themes stay
 * consistent.
 *
 * Brand: navy for trust, paint-can orange for the one main action on a
 * screen, cream paper, and two warm accents: sage green (budget, projects,
 * done) and dusty rose (colour and inspiration). Every text pair passes
 * WCAG AA; see __tests__/contrast.test.ts.
 */

const light = {
  /** Cream paper. */
  background: '#F7F3EC',
  surface: '#FFFFFF',
  /** Sand: inputs and unselected chips. */
  surfaceMuted: '#EFE9DC',
  border: '#E4DCCE',
  text: '#16203A',
  textMuted: '#5A6072',
  /** Navy: buttons, links, selected states. */
  primary: '#1B2B4B',
  primaryPressed: '#121C33',
  onPrimary: '#FFFFFF',
  primarySoft: '#E5EAF4',
  /** Paint-can orange: the one main action on a screen. */
  cta: '#FF6B2C',
  ctaPressed: '#F0561A',
  onCta: '#1A1206',
  // Text-safe orange (brick) for accent text on accentSoft.
  accent: '#B4460F',
  accentSoft: '#FFE9DC',
  /** Sage green: budget, savings, done. */
  sage: '#3F6B50',
  sageSoft: '#E3ECE3',
  sageInk: '#2F5640',
  /** Dusty rose: colour studio and inspiration. */
  rose: '#A8456A',
  roseSoft: '#F8E3E8',
  roseInk: '#8A2F50',
  /** @deprecated Kept for older screens; same as sage. */
  teal: '#3F6B50',
  tealSoft: '#E3ECE3',
  danger: '#B42318',
  dangerSoft: '#FDE7E5',
  success: '#3F6B50',
  successSoft: '#E3ECE3',
  /** Mustard: "limited data" and soft warnings. */
  warning: '#A15C07',
  warningSoft: '#FBEFD8',
  /** Hero gradient and the darkest navy. */
  heroFrom: '#121C33',
  heroTo: '#1F3358',
  onHero: '#FFFFFF',
  onHeroMuted: '#C9D4E8',
  /** Shadow tints for levels 1, 2 and 3. */
  shadow: 'rgba(22, 32, 58, 0.06)',
  shadowRaised: 'rgba(22, 32, 58, 0.10)',
  shadowFloating: 'rgba(22, 32, 58, 0.16)',
};

export type Palette = typeof light;

const dark: Palette = {
  background: '#0E1626',
  surface: '#141C2F',
  surfaceMuted: '#1C2640',
  border: '#28344F',
  text: '#E7EBF3',
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
  sage: '#7FB08F',
  sageSoft: '#14231B',
  sageInk: '#A8D4B4',
  rose: '#E58AA6',
  roseSoft: '#3A1A26',
  roseInk: '#F4B8CA',
  teal: '#7FB08F',
  tealSoft: '#14231B',
  danger: '#F97066',
  dangerSoft: '#3D1A17',
  success: '#7FB08F',
  successSoft: '#14231B',
  warning: '#E0A458',
  warningSoft: '#33240F',
  heroFrom: '#0A101D',
  heroTo: '#1A2A48',
  onHero: '#FFFFFF',
  onHeroMuted: '#B9C6DD',
  shadow: 'rgba(0, 0, 0, 0.30)',
  shadowRaised: 'rgba(0, 0, 0, 0.40)',
  shadowFloating: 'rgba(0, 0, 0, 0.50)',
};

export const palettes = { light, dark };

/**
 * Features share four brand colours so the app reads as one family:
 * orange for measuring and money, rose for colour and ideas, sage for your
 * own home and budget, navy for pros and checks.
 */
export type FeatureKey = 'calculate' | 'color' | 'cost' | 'inspect' | 'guide' | 'ask' | 'projects' | 'budget';

export type FeatureColour = { base: string; soft: string; ink: string };

const orange = { base: '#FF6B2C', soft: '#FFE9DC', ink: '#8F3609' };
const rose = { base: '#A8456A', soft: '#F8E3E8', ink: '#8A2F50' };
const sage = { base: '#3F6B50', soft: '#E3ECE3', ink: '#2F5640' };
const navy = { base: '#1B2B4B', soft: '#E5EAF4', ink: '#1B2B4B' };

const featureLight: Record<FeatureKey, FeatureColour> = {
  calculate: orange,
  cost: orange,
  color: rose,
  guide: rose,
  projects: sage,
  budget: sage,
  inspect: navy,
  ask: navy,
};

const orangeDark = { base: '#FF7E45', soft: '#3A2216', ink: '#FFC4A3' };
const roseDark = { base: '#E58AA6', soft: '#3A1A26', ink: '#F4B8CA' };
const sageDark = { base: '#7FB08F', soft: '#14231B', ink: '#A8D4B4' };
const navyDark = { base: '#9DB8FF', soft: '#1E2B4A', ink: '#C8D7FF' };

const featureDark: Record<FeatureKey, FeatureColour> = {
  calculate: orangeDark,
  cost: orangeDark,
  color: roseDark,
  guide: roseDark,
  projects: sageDark,
  budget: sageDark,
  inspect: navyDark,
  ask: navyDark,
};

export const featurePalettes = { light: featureLight, dark: featureDark };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, section: 40 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/**
 * Plus Jakarta Sans for text and controls; Bricolage Grotesque only for big
 * headlines. Both load in the root layout and fall back to the system font.
 */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
} as const;

export const type = {
  display: { fontSize: 34, lineHeight: 40, fontFamily: fonts.display, letterSpacing: -0.8 },
  title: { fontSize: 26, lineHeight: 32, fontFamily: fonts.displayBold, letterSpacing: -0.4 },
  heading: { fontSize: 19, lineHeight: 26, fontFamily: fonts.bold, letterSpacing: -0.2 },
  cardTitle: { fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fonts.regular },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontFamily: fonts.semibold },
  small: { fontSize: 14, lineHeight: 20, fontFamily: fonts.medium },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.semibold, letterSpacing: 0.2 },
  overline: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, letterSpacing: 1 },
  number: { fontSize: 36, lineHeight: 42, fontFamily: fonts.extrabold, letterSpacing: -0.8, fontVariant: ['tabular-nums'] as 'tabular-nums'[] },
} as const;

export type TypeVariant = keyof typeof type;

/** Content never stretches wider than this on tablets and desktop browsers. */
export const MAX_CONTENT_WIDTH = 680;

/** Screens with two columns may grow to this width once the window is wide enough. */
export const MAX_WIDE_WIDTH = 1160;
export const WIDE_BREAKPOINT = 980;

/** Minimum touch target for accessibility. */
export const MIN_TOUCH = 44;

/**
 * Animation lengths in ms. Subtle and quick: press feedback is instant, tab
 * and disclosure changes short, cards medium, screen entrances long.
 */
export const duration = { instant: 100, short: 180, medium: 280, long: 420 } as const;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useFeatureColour(key: FeatureKey): FeatureColour {
  return (useColorScheme() === 'dark' ? featureDark : featureLight)[key];
}

/**
 * Soft shadow; boxShadow works on iOS, Android and web. 1 for ordinary cards,
 * 2 for hero cards and floating buttons, 3 for sheets and dialogs. List rows
 * get no shadow, only a hairline.
 */
export function shadowOf(p: Palette, level: 1 | 2 | 3 = 1) {
  const box = { 1: `0px 2px 8px ${p.shadow}`, 2: `0px 10px 28px ${p.shadowRaised}`, 3: `0px 18px 48px ${p.shadowFloating}` }[level];
  return { boxShadow: box } as const;
}
