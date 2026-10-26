import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Flat illustrations drawn for BoyaCep, used where no photo fits (rooms and
 * homes use real photos from ./photos). Decoration only: hidden from screen readers.
 */

/** City choice: a generic Turkish skyline with domes and minarets. */
export function CityArt({ width = 340, height = 110 }: { width?: number; height?: number }) {
  const c = '#D5DCE8';
  const d = '#C2CBDB';
  return (
    <Svg width={width} height={height} viewBox="0 0 340 110" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x="0" y="96" width="340" height="14" fill={d} />
      <Rect x="10" y="60" width="26" height="40" fill={c} />
      <Rect x="40" y="44" width="20" height="56" fill={d} />
      <Rect x="64" y="70" width="30" height="30" fill={c} />
      <Path d="M110 100 V74 A26 26 0 0 1 162 74 V100Z" fill={d} />
      <Circle cx="136" cy="52" r="3" fill={d} />
      <Rect x="100" y="30" width="5" height="70" fill={c} />
      <Path d="M100 30 L102.5 20 L105 30Z" fill={c} />
      <Rect x="167" y="30" width="5" height="70" fill={c} />
      <Path d="M167 30 L169.5 20 L172 30Z" fill={c} />
      <Rect x="184" y="56" width="24" height="44" fill={c} />
      <Rect x="212" y="20" width="18" height="80" fill={d} />
      <Path d="M212 20 L221 6 L230 20Z" fill={d} />
      <Rect x="236" y="64" width="34" height="36" fill={c} />
      <Rect x="274" y="48" width="22" height="52" fill={d} />
      <Rect x="300" y="70" width="32" height="30" fill={c} />
    </Svg>
  );
}
