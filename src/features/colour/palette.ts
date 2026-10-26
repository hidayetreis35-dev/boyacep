/**
 * Common wall colours for the preview. These are generic tones, not any
 * brand's colour codes: the screen tells users to check the real swatch.
 */

export type PaletteColour = { name: string; hex: string };
export type PaletteGroup = { label: string; colours: PaletteColour[] };

export const PALETTE: PaletteGroup[] = [
  {
    label: 'Beyaz ve kırık beyaz',
    colours: [
      { name: 'Kar beyazı', hex: '#F7F7F4' },
      { name: 'Kırık beyaz', hex: '#F1EDE4' },
      { name: 'Fildişi', hex: '#EFE6D2' },
    ],
  },
  {
    label: 'Bej ve toprak',
    colours: [
      { name: 'Kum beji', hex: '#DCCBB0' },
      { name: 'Vizon', hex: '#B8A898' },
      { name: 'Kil', hex: '#C08A6B' },
      { name: 'Terakota', hex: '#B35C3E' },
    ],
  },
  {
    label: 'Gri',
    colours: [
      { name: 'Açık gri', hex: '#D9D9D6' },
      { name: 'Taş grisi', hex: '#A7A49D' },
      { name: 'Antrasit', hex: '#4A4C4E' },
    ],
  },
  {
    label: 'Mavi',
    colours: [
      { name: 'Buz mavisi', hex: '#D6E4EC' },
      { name: 'Gök mavisi', hex: '#8FB3CF' },
      { name: 'Petrol mavisi', hex: '#2F5D6B' },
      { name: 'Lacivert', hex: '#25324A' },
    ],
  },
  {
    label: 'Yeşil',
    colours: [
      { name: 'Nane', hex: '#CFE3D3' },
      { name: 'Adaçayı', hex: '#A3B49A' },
      { name: 'Zeytin', hex: '#6F7550' },
      { name: 'Orman yeşili', hex: '#2F4A3A' },
    ],
  },
  {
    label: 'Sıcak tonlar',
    colours: [
      { name: 'Şeftali', hex: '#F2C6A8' },
      { name: 'Hardal', hex: '#C9A13B' },
      { name: 'Gül kurusu', hex: '#C49A9A' },
      { name: 'Bordo', hex: '#6E2A33' },
    ],
  },
];

/** Accepts "#a1b2c3", "a1b2c3" or "#abc"; returns "#A1B2C3" or null. */
export function normaliseHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split('').map((c) => c + c).join('').toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}

/** Relative luminance (WCAG), used to pick a readable label colour on a swatch. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export const isLight = (hex: string) => luminance(hex) > 0.4;
