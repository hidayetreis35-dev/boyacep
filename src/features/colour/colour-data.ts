/**
 * BoyaCep's colour data in two separate layers:
 *
 * 1. Generic colours (the catalogue): BoyaCep's own names for common tones.
 *    They have no product code and are never shown as a brand's colour.
 * 2. Brand catalogues: a manufacturer's real colours with their product codes.
 *    Each catalogue must say where it came from and under which licence or
 *    permission it is used. None is bundled yet.
 *
 * Every record carries its source and licence so a colour can always be traced.
 */

import { COLOURS, familyLabel, type CatalogColour, type FamilyKey } from './catalogue';
import { harmonies, hexToRgb, lrv, nearest } from './harmony';
import { hexToLab, type Lab } from './recolour';

import { msg, t } from '@/i18n';

export type Temperature = 'warm' | 'cool' | 'neutral';
export type Depth = 'light' | 'mid' | 'deep';

export type ColourSource = { name: string; licence: string; url?: string };

/** Everything BoyaCep knows about one colour. */
export type ColourRecord = {
  id: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
  lab: Lab;
  family: FamilyKey;
  familyLabel: string;
  /** Light, mid or deep tone within its family. */
  depth: Depth;
  temperature: Temperature;
  /** Light reflectance value, approximate, 0–100. */
  lrv: number;
  source: ColourSource;
  /** Only for brand colours. */
  brand?: string;
  productCode?: string;
};

export const BOYACEP_SOURCE: ColourSource = {
  name: msg('BoyaCep genel renk kataloğu'),
  licence: msg('BoyaCep’e ait; genel ton adlarıdır, marka ürün kodu değildir'),
};

export const TEMPERATURE_LABEL: Record<Temperature, string> = { warm: msg('Sıcak ton'), cool: msg('Soğuk ton'), neutral: msg('Nötr') };
export const DEPTH_LABEL: Record<Depth, string> = { light: msg('Açık'), mid: msg('Orta'), deep: msg('Koyu') };

/**
 * Warm or cool from the Lab hue angle. Low-chroma greys and whites are
 * neutral. Reds, oranges and yellows (and yellow-greens) are warm; greens,
 * blues and violets are cool; pinks turning to red are warm again.
 */
export function temperatureOf(lab: Lab): Temperature {
  const [, a, b] = lab;
  const chroma = Math.hypot(a, b);
  if (chroma < 6) return 'neutral';
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return hue < 100 || hue >= 330 ? 'warm' : 'cool';
}

export function depthOf(lab: Lab): Depth {
  return lab[0] >= 75 ? 'light' : lab[0] >= 45 ? 'mid' : 'deep';
}

export function toRecord(colour: CatalogColour, source: ColourSource = BOYACEP_SOURCE): ColourRecord {
  const lab = hexToLab(colour.hex);
  const rgb = hexToRgb(colour.hex);
  return {
    id: colour.id,
    name: colour.name,
    hex: colour.hex,
    rgb,
    lab,
    family: colour.family,
    familyLabel: familyLabel(colour.family),
    depth: depthOf(lab),
    temperature: temperatureOf(lab),
    lrv: lrv(colour.hex),
    source,
  };
}

/** The generic catalogue as full records. */
export const GENERIC_COLOURS: ColourRecord[] = COLOURS.map((c) => toRecord(c));

const GENERIC_BY_HEX = new Map(GENERIC_COLOURS.map((c) => [c.hex, c]));

/** What the app says about any colour: a catalogue tone or a code the user typed. */
export function colourFacts(hex: string): { temperature: Temperature; depth: Depth; caption: string } {
  const record = GENERIC_BY_HEX.get(hex);
  const lab = record?.lab ?? hexToLab(hex);
  return {
    temperature: temperatureOf(lab),
    depth: depthOf(lab),
    caption: record ? colourCaption(record) : t('Kendi girdiğin renk kodu'),
  };
}

/** Matching colours for a record, by name, from the harmony rules. */
export function harmonyNames(hex: string): Record<string, string[]> {
  return Object.fromEntries(harmonies(hex).map((h) => [h.key, h.colours.map((c) => c.name)]));
}

// ---------------------------------------------------------------------------
// Brand layer
// ---------------------------------------------------------------------------

export type BrandColour = { productCode: string; name: string; hex: string };

export type BrandCatalogue = {
  brand: string;
  /** Where the data came from and under what terms BoyaCep may show it. */
  source: ColourSource;
  /** Date the codes and colours were last checked against the brand's own card (YYYY-MM-DD). */
  checkedOn: string;
  colours: BrandColour[];
};

/**
 * Brand catalogues added with the manufacturer's permission or an open licence.
 * Empty on purpose: BoyaCep does not invent product codes.
 */
export const BRAND_CATALOGUES: BrandCatalogue[] = [];

/** Problems that keep a brand catalogue out of the app. Empty means it can be used. */
export function brandCatalogueProblems(catalogue: BrandCatalogue): string[] {
  const problems: string[] = [];
  if (!catalogue.brand.trim()) problems.push(t('Marka adı yok.'));
  if (!catalogue.source.name.trim() || !catalogue.source.licence.trim()) problems.push(t('Kaynak ya da lisans/izin bilgisi yok.'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(catalogue.checkedOn)) problems.push(t('Kontrol tarihi yok.'));
  const codes = new Set<string>();
  catalogue.colours.forEach((c, i) => {
    const n = i + 1;
    if (!c.productCode.trim()) problems.push(t('{n}. renk: ürün kodu yok.', { n }));
    else if (codes.has(c.productCode)) problems.push(t('{n}. renk: ürün kodu tekrar ediyor ({code}).', { n, code: c.productCode }));
    codes.add(c.productCode);
    if (!/^#[0-9A-F]{6}$/.test(c.hex)) problems.push(t('{n}. renk: renk kodu #RRGGBB biçiminde değil.', { n }));
    if (!c.name.trim()) problems.push(t('{n}. renk: ad yok.', { n }));
  });
  return problems;
}

/** A valid brand catalogue as records; family comes from the nearest generic colour. */
export function brandRecords(
  catalogue: BrandCatalogue,
  nearestFamily: (hex: string) => FamilyKey = (hex) => nearest(hex).family,
): ColourRecord[] {
  if (brandCatalogueProblems(catalogue).length > 0) return [];
  return catalogue.colours.map((c) => ({
    ...toRecord({ id: `${catalogue.brand}-${c.productCode}`, name: c.name, hex: c.hex, family: nearestFamily(c.hex) }, catalogue.source),
    brand: catalogue.brand,
    productCode: c.productCode,
  }));
}

/** How a colour is labelled: brand colours with their code, generic ones clearly as generic. */
export function colourCaption(record: Pick<ColourRecord, 'brand' | 'productCode'>): string {
  return record.brand && record.productCode ? `${record.brand} · ${record.productCode}` : t('Genel ton · marka kodu değildir');
}
