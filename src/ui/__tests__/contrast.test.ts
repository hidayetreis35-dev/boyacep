import { luminance } from '@/features/colour/palette';
import { palettes } from '@/ui/theme';

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
];

describe.each(['light', 'dark'] as const)('%s theme contrast', (scheme) => {
  it.each(PAIRS)('%s on %s meets WCAG AA', (fg, bg) => {
    expect(contrast(palettes[scheme][fg], palettes[scheme][bg])).toBeGreaterThanOrEqual(4.5);
  });
});
