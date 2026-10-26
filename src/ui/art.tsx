import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

/**
 * Flat illustrations drawn for BoyaCep (no stock photos). Decoration only:
 * every illustration is hidden from screen readers.
 */

const SOFA = '#E8DCCB';
const SOFA_SHADE = '#D6C6B0';
const WOOD = '#8A5A3C';
const LEAF = '#4E8C5A';
const LEAF_DARK = '#356B42';
const POT = '#C96B3C';

function Plant({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Path d="M0 0 C-14 -18 -16 -40 -4 -56 C2 -38 4 -18 0 0Z" fill={LEAF} />
      <Path d="M0 0 C12 -16 26 -30 24 -52 C10 -40 2 -22 0 0Z" fill={LEAF_DARK} />
      <Path d="M0 0 C-20 -8 -32 -22 -34 -38 C-18 -30 -6 -18 0 0Z" fill={LEAF_DARK} />
      <Path d="M0 0 C6 -24 4 -50 14 -66 C18 -44 10 -20 0 0Z" fill={LEAF} />
      <Path d="M-12 0 H12 L9 22 H-9Z" fill={POT} />
    </G>
  );
}

function Sofa({ x, y, w, cushions }: { x: number; y: number; w: number; cushions: [string, string] }) {
  const h = w * 0.42;
  return (
    <G transform={`translate(${x} ${y})`}>
      <Rect x={w * 0.06} y={0} width={w * 0.88} height={h * 0.62} rx={h * 0.12} fill={SOFA_SHADE} />
      <Rect x={0} y={h * 0.38} width={w} height={h * 0.46} rx={h * 0.12} fill={SOFA} />
      <Rect x={0} y={h * 0.26} width={w * 0.12} height={h * 0.6} rx={h * 0.08} fill={SOFA_SHADE} />
      <Rect x={w * 0.88} y={h * 0.26} width={w * 0.12} height={h * 0.6} rx={h * 0.08} fill={SOFA_SHADE} />
      <Rect x={w * 0.18} y={h * 0.14} width={w * 0.2} height={h * 0.3} rx={h * 0.08} fill={cushions[0]} />
      <Rect x={w * 0.62} y={h * 0.14} width={w * 0.2} height={h * 0.3} rx={h * 0.08} fill={cushions[1]} />
      <Rect x={w * 0.1} y={h * 0.84} width={w * 0.04} height={h * 0.16} fill={WOOD} />
      <Rect x={w * 0.86} y={h * 0.84} width={w * 0.04} height={h * 0.16} fill={WOOD} />
    </G>
  );
}

function Lamp({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Path d={`M-14 0 H14 L8 -${h * 0.22} H-8Z`} fill="#F2C14E" transform={`translate(0 ${h * 0.22})`} />
      <Rect x={-1.5} y={h * 0.22} width={3} height={h * 0.78} fill="#3B3B3B" />
      <Ellipse cx={0} cy={h} rx={12} ry={3} fill="#3B3B3B" />
    </G>
  );
}

/** Home banner: a calm corner of a living room. */
export function InspirationArt({ width = 140, height = 120 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 140 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect width="140" height="120" fill="#EADBC8" />
      <Rect x="0" y="92" width="140" height="28" fill="#C9A27E" />
      <Rect x="70" y="14" width="44" height="50" rx="3" fill="#F7F1E7" />
      <Rect x="91" y="14" width="2" height="50" fill="#E2D6C4" />
      <Rect x="70" y="38" width="44" height="2" fill="#E2D6C4" />
      <Sofa x={8} y={60} w={86} cushions={['#E07A4F', '#5C8A8A']} />
      <Plant x={118} y={78} scale={0.62} />
    </Svg>
  );
}

/** Welcome hero: sofa, plant and lamp on the navy background, with paint drops. */
export function WelcomeArt({ width = 320, height = 210 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 320 210" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Ellipse cx="160" cy="196" rx="140" ry="12" fill="#2E4369" />
      <Rect x="62" y="186" width="196" height="10" rx="5" fill="#3A5480" />
      <Sofa x={70} y={104} w={180} cushions={['#FF6B2C', '#C2367A']} />
      <Plant x={40} y={166} scale={1.05} />
      <Lamp x={282} y={70} h={120} />
    </Svg>
  );
}

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

/** Colour Studio: a living room whose wall takes the chosen colour. */
export function RoomArt({ wall, width = 340, height = 200 }: { wall: string; width?: number | string; height?: number | string }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 340 200" preserveAspectRatio="xMidYMid slice" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect width="340" height="200" fill={wall} />
      <Rect width="340" height="200" fill="#000000" opacity={0.04} />
      <Rect x="0" y="0" width="60" height="200" fill="#000000" opacity={0.05} />
      <Rect x="0" y="156" width="340" height="44" fill="#B88A64" />
      <Rect x="0" y="152" width="340" height="5" fill="#F4EFE7" />
      <Rect x="210" y="26" width="74" height="86" rx="3" fill="#FBF8F2" />
      <Rect x="245" y="26" width="3" height="86" fill="#E8E0D3" />
      <Rect x="210" y="66" width="74" height="3" fill="#E8E0D3" />
      <Rect x="40" y="40" width="60" height="44" rx="2" fill="#FFFFFF" opacity={0.85} />
      <Path d="M46 78 L62 58 L74 70 L82 62 L94 78Z" fill="#9DB4A0" />
      <Ellipse cx="160" cy="184" rx="110" ry="9" fill="#A57A55" />
      <Sofa x={84} y={106} w={150} cushions={['#E07A4F', '#5C8A8A']} />
      <Plant x={300} y={160} scale={0.9} />
      <Lamp x={44} y={86} h={70} />
    </Svg>
  );
}
