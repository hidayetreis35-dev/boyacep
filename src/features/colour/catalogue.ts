import { msg, t } from '@/i18n';

/**
 * BoyaCep's generic colour catalogue. These are generic tones, not any brand's
 * colour codes: the studio tells users to check the real swatch. Brand colour
 * cards live in a separate layer (`BRAND_CATALOGUES` in colour-data.ts).
 *
 * Names are Turkish data: they are saved with project colours and translated
 * where shown, t(colour.name). The i18n tests check every name has an English entry.
 */

export type FamilyKey =
  | 'whites'
  | 'creams'
  | 'beiges'
  | 'greys'
  | 'darks'
  | 'blues'
  | 'greens'
  | 'yellows'
  | 'earth'
  | 'pinks'
  | 'reds'
  | 'purples';

export type CatalogColour = {
  id: string;
  name: string;
  hex: string;
  family: FamilyKey;
};

export const FAMILIES: { key: FamilyKey; label: string; sample: string }[] = [
  { key: 'whites', label: msg('Beyazlar'), sample: '#F4F2EC' },
  { key: 'creams', label: msg('Krem tonları'), sample: '#EFE3C8' },
  { key: 'beiges', label: msg('Bejler'), sample: '#D8C3A5' },
  { key: 'greys', label: msg('Griler'), sample: '#B9B8B3' },
  { key: 'darks', label: msg('Antrasit ve koyular'), sample: '#3E4144' },
  { key: 'blues', label: msg('Maviler'), sample: '#6F95B8' },
  { key: 'greens', label: msg('Yeşiller'), sample: '#8FA587' },
  { key: 'yellows', label: msg('Sarılar'), sample: '#E8C468' },
  { key: 'earth', label: msg('Toprak tonları'), sample: '#B9744F' },
  { key: 'pinks', label: msg('Pembeler'), sample: '#E2AFAF' },
  { key: 'reds', label: msg('Kırmızı ve bordolar'), sample: '#9E3B3B' },
  { key: 'purples', label: msg('Morlar'), sample: '#8E7AA8' },
];

const RAW: Record<FamilyKey, [string, string][]> = {
  whites: [
    ['Kar beyazı', '#F7F7F4'],
    ['Saf beyaz', '#FBFBF9'],
    ['Kırık beyaz', '#F1EDE4'],
    ['Pamuk', '#F4F1EA'],
    ['Süt', '#F3EFE6'],
    ['İnci', '#EEEAE1'],
    ['Porselen', '#EEF0EE'],
    ['Buz beyazı', '#EDF1F2'],
    ['Kireç', '#ECE9E1'],
    ['Tebeşir', '#E9E6DD'],
    ['Ay ışığı', '#EBEBE6'],
    ['Sabah sisi', '#E6E8E4'],
  ],
  creams: [
    ['Fildişi', '#EFE6D2'],
    ['Vanilya', '#F1E6C9'],
    ['Krem', '#EFE3C8'],
    ['Kaymak', '#F2E9D6'],
    ['Badem sütü', '#EDE1CA'],
    ['Keten', '#E8DCC4'],
    ['Pirinç kâğıdı', '#EDE4D0'],
    ['Lokum', '#F0E2CF'],
    ['Bal köpüğü', '#EFDDB8'],
    ['Şampanya', '#E9D9B9'],
    ['Peynir altı', '#EAE0C0'],
    ['Mum ışığı', '#F0DFB4'],
  ],
  beiges: [
    ['Kum beji', '#DCCBB0'],
    ['Kum', '#D8C3A5'],
    ['Vizon', '#B8A898'],
    ['Latte', '#C9B49A'],
    ['Kaju', '#D4BC9A'],
    ['Taş beji', '#CBBBA4'],
    ['Hasır', '#D3BE96'],
    ['Deve tüyü', '#BFA07A'],
    ['Mantar', '#A99A88'],
    ['Kakule', '#C2B28F'],
    ['Sütlü kahve', '#B49C81'],
    ['Greige', '#BDB4A6'],
  ],
  greys: [
    ['Açık gri', '#D9D9D6'],
    ['Gümüş', '#CACBC8'],
    ['Sis grisi', '#C7C9C5'],
    ['Taş grisi', '#A7A49D'],
    ['Çakıl', '#B5B1A8'],
    ['Beton', '#A3A39E'],
    ['Kurşun', '#8E9091'],
    ['Fırtına', '#868B8E'],
    ['Güvercin', '#9FA3A6'],
    ['Mavi gri', '#9AA6AE'],
    ['Yeşil gri', '#A2A79C'],
    ['Sıcak gri', '#ABA49B'],
  ],
  darks: [
    ['Antrasit', '#4A4C4E'],
    ['Füme', '#5C5F61'],
    ['Kömür', '#3E4144'],
    ['Grafit', '#46494C'],
    ['Gece mavisi', '#2C3440'],
    ['Lacivert', '#25324A'],
    ['Mürekkep', '#2B2F3A'],
    ['Orman gecesi', '#2E3A33'],
    ['Bitter', '#3D3330'],
    ['Arduvaz', '#4F575C'],
    ['Volkan', '#363636'],
    ['Siyah inci', '#26282A'],
  ],
  blues: [
    ['Buz mavisi', '#D6E4EC'],
    ['Bebek mavisi', '#CFE0EE'],
    ['Gök mavisi', '#8FB3CF'],
    ['Denizci', '#6F95B8'],
    ['Pudra mavisi', '#B7CBDA'],
    ['Çelik mavisi', '#7E97AA'],
    ['Petrol mavisi', '#2F5D6B'],
    ['Turkuaz', '#4FA3A5'],
    ['Okyanus', '#3F6E8C'],
    ['Kobalt', '#3A5A9B'],
    ['Su yeşili', '#A9D3CF'],
    ['Ege', '#5D8FA8'],
  ],
  greens: [
    ['Nane', '#CFE3D3'],
    ['Adaçayı', '#A3B49A'],
    ['Okaliptüs', '#8FA587'],
    ['Zeytin', '#6F7550'],
    ['Orman yeşili', '#2F4A3A'],
    ['Fıstık', '#B9C99B'],
    ['Yosun', '#77805D'],
    ['Çam', '#3F5E4E'],
    ['Lime', '#C7D48D'],
    ['Defne', '#7A8B6A'],
    ['Zümrüt', '#2E6B57'],
    ['Pastel yeşil', '#D6E2C8'],
  ],
  yellows: [
    ['Limon kabuğu', '#F2E3A1'],
    ['Muz', '#F1DC8B'],
    ['Güneş', '#E8C468'],
    ['Hardal', '#C9A13B'],
    ['Safran', '#E0A93A'],
    ['Kehribar', '#D19A3E'],
    ['Buğday', '#E2CC92'],
    ['Pastel sarı', '#F3E8B9'],
    ['Altın', '#C8A24D'],
    ['Zerdeçal', '#D6A12A'],
    ['Kayısı', '#EDB97A'],
    ['Ballı', '#E4BE73'],
  ],
  earth: [
    ['Kil', '#C08A6B'],
    ['Terakota', '#B35C3E'],
    ['Kiremit', '#A65A3F'],
    ['Tarçın', '#9C5F3D'],
    ['Karamel', '#B9744F'],
    ['Pas', '#9B4E2F'],
    ['Toprak', '#8A6A50'],
    ['Kahve', '#6B4E3D'],
    ['Ceviz', '#5E4535'],
    ['Okra', '#C2873E'],
    ['Şeftali', '#F2C6A8'],
    ['Somon', '#E8A88A'],
  ],
  pinks: [
    ['Pudra', '#EED8D3'],
    ['Gül kurusu', '#C49A9A'],
    ['Pembe kuvars', '#E2AFAF'],
    ['Şeker pembe', '#F0C4CC'],
    ['Mercan', '#E58F7E'],
    ['Antik pembe', '#D3A6A0'],
    ['Leylak pembe', '#D8B6C4'],
    ['Fuşya', '#C2367A'],
    ['Karpuz', '#E0757A'],
    ['Nar çiçeği', '#D9645E'],
    ['Ten', '#E6C3B4'],
    ['Flamingo', '#EFA7A0'],
  ],
  reds: [
    ['Bordo', '#6E2A33'],
    ['Şarap', '#7B2E3A'],
    ['Vişne', '#8E2C35'],
    ['Kırmızı biber', '#A83A32'],
    ['Nar', '#B0353A'],
    ['Domates', '#C9473A'],
    ['Kızıl', '#9E3B3B'],
    ['Mürdüm', '#5E2B3A'],
    ['Tuğla', '#A0523D'],
    ['Kan taşı', '#7A3A35'],
    ['Gül', '#B5525F'],
    ['Kına', '#8F4430'],
  ],
  purples: [
    ['Lavanta', '#C7BEDB'],
    ['Leylak', '#B7A8CF'],
    ['Ametist', '#8E7AA8'],
    ['Erik', '#5D3D5E'],
    ['Patlıcan', '#4A2E45'],
    ['Menekşe', '#7F6A9B'],
    ['Mor salkım', '#A493C2'],
    ['Pastel mor', '#DDD3E8'],
    ['Mürver', '#6E4F73'],
    ['Orkide', '#B78FB6'],
    ['Gece moru', '#3F3352'],
    ['Lila', '#CDBBD6'],
  ],
};

export const COLOURS: CatalogColour[] = (Object.keys(RAW) as FamilyKey[]).flatMap((family) =>
  RAW[family].map(([name, hex], i) => ({ id: `${family}-${i + 1}`, name, hex, family })),
);

const BY_HEX = new Map(COLOURS.map((c) => [c.hex, c]));
const BY_NAME = new Map(COLOURS.map((c) => [c.name, c]));

export function colourByHex(hex: string): CatalogColour | undefined {
  return BY_HEX.get(hex.toUpperCase());
}

const pick = (names: string[]) => names.map((n) => BY_NAME.get(n)!).filter(Boolean);

/** Timeless choices for living spaces. Editorial picks, not sales data. */
export const CLASSICS = pick(['Kırık beyaz', 'Fildişi', 'Kum beji', 'Greige', 'Açık gri', 'Taş grisi', 'Buz mavisi', 'Adaçayı']);

/** Warm, earthy and calm tones popular in interior design in 2026. Editorial picks. */
export const TRENDS = pick(['Terakota', 'Okaliptüs', 'Petrol mavisi', 'Gül kurusu', 'Hardal', 'Zeytin', 'Erik', 'Karamel']);

export function familyLabel(key: FamilyKey): string {
  return t(FAMILIES.find((f) => f.key === key)?.label ?? key);
}

/** Search by name in Turkish or the current language ("adaçayı", "sage") or code ("#8FB3", "8fb3cf"). Turkish letters are matched loosely. */
export function searchColours(query: string, list: CatalogColour[] = COLOURS): CatalogColour[] {
  const q = fold(query.trim());
  if (!q) return list;
  const hex = q.replace(/^#/, '');
  return list.filter(
    (c) =>
      fold(c.name).includes(q) ||
      fold(t(c.name)).includes(q) ||
      (/^[0-9a-f]{2,6}$/.test(hex) && c.hex.slice(1).toLowerCase().startsWith(hex)),
  );
}

/** Lower-case with Turkish letters folded to plain Latin ones, for loose matching. */
export function fold(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a');
}
