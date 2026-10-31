import { METER_ON_TRACK, METER_OVER } from '@/features/budget/charts';
import { luminance } from '@/features/colour/palette';
import { VERDICT_SHADES } from '@/features/inspect/inspect-result';
import { featurePalettes, palettes, type FeatureKey } from '@/ui/theme';

/** WCAG contrast ratio between two colours. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text pairs that appear in the app; body text needs 4.5:1 (WCAG AA).
const PAIRS: [keyof (typeof palettes)['light'], keyof (typeof palettes)['light']][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['textMuted', 'surfaceMuted'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['primary', 'primarySoft'],
  ['onPrimary', 'primary'],
  ['accent', 'accentSoft'],
  ['danger', 'dangerSoft'],
  ['danger', 'surface'],
  ['success', 'successSoft'],
  ['onCta', 'cta'],
  ['teal', 'tealSoft'],
  ['sage', 'sageSoft'],
  ['sageInk', 'sageSoft'],
  ['sage', 'surface'],
  ['rose', 'roseSoft'],
  ['roseInk', 'roseSoft'],
  ['rose', 'surface'],
  ['accent', 'background'],
  ['warning', 'warningSoft'],
  ['onHero', 'heroFrom'],
  ['onHero', 'heroTo'],
  ['onHeroMuted', 'heroFrom'],
  ['onHeroMuted', 'heroTo'],
];

describe.each(['light', 'dark'] as const)('%s theme contrast', (scheme) => {
  it.each(PAIRS)('%s on %s meets WCAG AA', (fg, bg) => {
    expect(contrast(palettes[scheme][fg], palettes[scheme][bg])).toBeGreaterThanOrEqual(4.5);
  });
});

// Feature cards put the feature's ink text on its soft tint.
const FEATURES = Object.keys(featurePalettes.light) as FeatureKey[];

describe.each(['light', 'dark'] as const)('%s feature colour contrast', (scheme) => {
  it.each(FEATURES)('%s ink on its soft tint meets WCAG AA', (key) => {
    const { ink, soft } = featurePalettes[scheme][key];
    expect(contrast(ink, soft)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('verdict banner shades', () => {
  it.each(Object.entries(VERDICT_SHADES))('white text on %s meets WCAG AA', (_, shade) => {
    expect(contrast('#FFFFFF', shade)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('budget meter on the navy panel', () => {
  // A meter is a graphic, so it needs 3:1 against what it sits on (WCAG 1.4.11).
  it.each(['light', 'dark'] as const)('%s mode', (mode) => {
    for (const fill of [METER_ON_TRACK, METER_OVER]) {
      for (const bg of [palettes[mode].heroFrom, palettes[mode].heroTo]) expect(contrast(fill, bg)).toBeGreaterThanOrEqual(3);
    }
  });
});
