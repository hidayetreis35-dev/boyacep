import type { PriceQuality } from '@/engine';
import { msg } from '@/i18n';

/**
 * Where BoyaCep's market numbers come from. Names are proper nouns (data);
 * descriptions go through msg(). The full research log, with the sources
 * that were checked and left out, is docs/BOYACEP_MARKET_DATA_SOURCES.md.
 */
export type SourceKind =
  /** Requests with quotes published on a service platform. */
  | 'platform'
  /** A painting firm's own published price list. */
  | 'firm'
  /** Statistics a platform published about its own quotes. */
  | 'aggregate'
  /** A public tender unit price (Çevre, Şehircilik ve İklim Değişikliği Bakanlığı). */
  | 'official'
  /** Shop prices for paint and supplies. */
  | 'retail';

export interface MarketSource {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
  /** What the source covers, in one line. */
  scope: string;
  /** When BoyaCep read it. */
  researched: string;
  /** When its data was published: YYYY-MM-DD, or YYYY-MM when only the month is known. */
  dataDate: string;
  /** How BoyaCep may use it. */
  terms: string;
}

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  platform: msg('Hizmet platformu'),
  firm: msg('Firma fiyat listesi'),
  aggregate: msg('Platform istatistiği'),
  official: msg('Resmi birim fiyat'),
  retail: msg('Mağaza fiyatı'),
};

export const MARKET_SOURCES: Record<string, MarketSource> = {
  armut: {
    id: 'armut',
    name: 'Armut',
    url: 'https://armut.com/fiyatlari/boyaci-boya-badana-ustasi_32',
    kind: 'platform',
    scope: msg('İl sayfalarında tarihli örnek boya işleri: ilçe, m², oda, malzeme durumu ve fiyat aralığı'),
    researched: '2026-10-25',
    dataDate: '2026-10',
    terms: msg('İlanlar kopyalanmaz; BoyaCep yalnızca kendi hesapladığı yuvarlanmış aralığı gösterir.'),
  },
  urlaboyaci: {
    id: 'urlaboyaci',
    name: 'Urla Boyacı',
    url: 'https://urlaboyaci.com/boya-badana-fiyatlari',
    kind: 'firm',
    scope: msg('İzmir, malzeme dahil, ev tipine göre fiyat listesi (tavan hariç)'),
    researched: '2026-10-25',
    dataDate: '2026-08',
    terms: msg('Firmanın herkese açık fiyat listesi; tek gözlem sayılır.'),
  },
  izdekor: {
    id: 'izdekor',
    name: 'İzdekor',
    url: 'https://izdekor.com.tr/izmir-boyaci/',
    kind: 'firm',
    scope: msg('İzmir Bornova, 3+1 ev, malzeme ve tavan dahil örnek fiyat'),
    researched: '2026-10-25',
    dataDate: '2026-02-14',
    terms: msg('Firmanın herkese açık örneği; tek gözlem sayılır.'),
  },
  gigbi: {
    id: 'gigbi',
    name: 'Gigbi',
    url: 'https://www.gigbi.com/fiyatlar/boya-badana-ustasi',
    kind: 'aggregate',
    scope: msg('Türkiye geneli teklif istatistiği; malzemenin dahil olup olmadığı belirtilmemiş'),
    researched: '2026-10-25',
    dataDate: '2026-09',
    terms: msg('Platformun yayımladığı özet rakamlar, kaynak gösterilerek aktarılır.'),
  },
  herpoz: {
    id: 'herpoz',
    name: 'Herpoz',
    url: 'https://herpoz.com/detay/15-540-1507-Eski-boyali-yuzeylere-astar-uygulanarak-iki-kat-Su-bazli-Plastik-Mat-ic-Cephe-Boyasi-ortuculuk-Sinif-2-YOD-Sinif2-Parlaklik-G3-ic-cephe-',
    kind: 'official',
    scope: msg('Bakanlık iç cephe boya birim fiyatı (poz 15.540.1507), ikincil kaynaktan'),
    researched: '2026-10-25',
    dataDate: '2025-12',
    terms: msg('Resmi rakam, ama Bakanlık sayfasından doğrulanamadı.'),
  },
  karekod: {
    id: 'karekod',
    name: 'Karekod',
    url: 'https://www.karekod.org/blog/boya-fiyatlari/',
    kind: 'retail',
    scope: msg('15 L iç cephe, 17,5 kg tavan ve 15 L dış cephe boyası fiyat aralıkları'),
    researched: '2026-10-25',
    dataDate: '2026-09-17',
    terms: msg('Yayımlanmış fiyat aralığı; marka ve mağazaya göre değişir.'),
  },
  cimri: {
    id: 'cimri',
    name: 'Cimri',
    url: 'https://www.cimri.com/ic-cephe-duvar-boyasi/en-ucuz-filli-boya-ic-cephe-duvar-boyasi-fiyatlari',
    kind: 'retail',
    scope: msg('Fiyat karşılaştırma sitesindeki iç cephe boyası, astar ve macun fiyatları'),
    researched: '2026-10-25',
    dataDate: '2026-10-25',
    terms: msg('Anlık mağaza fiyatları; kampanyalarla değişir.'),
  },
};

export function sourceName(id: string): string {
  return MARKET_SOURCES[id]?.name ?? id;
}

/**
 * Gigbi's own published quote statistics for all of Türkiye, by floor area.
 * Their city pages repeat these national figures, so they are never shown as
 * a city's price.
 */
export const NATIONAL_QUOTE_BANDS = {
  sourceId: 'gigbi',
  period: msg('Son 12 ay (Eylül 2026’ya kadar)'),
  quotes: 3398,
  median: 17_000,
  middleHalf: { low: 10_000, high: 25_000 },
  bands: [
    { label: msg('50 m²’ye kadar'), maxArea: 50, median: 10_000, low: 7_000, high: 15_000, quotes: 440 },
    { label: msg('51–100 m²'), maxArea: 100, median: 15_000, low: 11_000, high: 20_000, quotes: 1_137 },
    { label: msg('101–150 m²'), maxArea: 150, median: 20_000, low: 15_000, high: 25_000, quotes: 871 },
    { label: msg('150 m²’den büyük'), maxArea: Infinity, median: 28_000, low: 15_000, high: 43_000, quotes: 238 },
  ],
  /** Jobs agreed on the platform: 352 over 24 months, 13,000 TL paid on average. */
  agreed: { jobs: 352, months: 24, mean: 13_000 },
} as const;

/**
 * The ministry's tender unit price for repainting an interior wall: two coats
 * of water-based paint on primer, per m² of wall, material, labour and
 * contractor profit included. Read from a secondary site, so marked unverified.
 */
export const OFFICIAL_UNIT_PRICE = {
  sourceId: 'herpoz',
  code: '15.540.1507',
  perWallM2: 214.21,
  period: '2025-12',
  verified: false,
} as const;

/**
 * Shop prices per litre (or kg for ceiling paint), from published ranges.
 * Quality is set by hand: these are one or two publications, not counted
 * observations, so nothing here is stronger than "limited".
 */
export interface MaterialPriceRange {
  label: string;
  unit: 'L' | 'kg';
  low: number;
  high: number;
  quality: PriceQuality;
  sources: string[];
  dataDate: string;
}

export const MATERIAL_PRICES = {
  interior_paint: {
    label: msg('İç cephe boyası'),
    unit: 'L',
    // 15 L: 2.500–5.000 TL (Karekod), 2.480–4.500 TL (Cimri, Filli).
    low: 165,
    high: 335,
    quality: 'limited',
    sources: ['karekod', 'cimri'],
    dataDate: '2026-10-25',
  },
  ceiling_paint: {
    label: msg('Tavan boyası'),
    unit: 'kg',
    // 17,5 kg: 1.300–2.500 TL (Karekod).
    low: 75,
    high: 145,
    quality: 'limited',
    sources: ['karekod'],
    dataDate: '2026-09-17',
  },
  exterior_paint: {
    label: msg('Dış cephe boyası'),
    unit: 'L',
    // 15 L: 3.200–5.900 TL (Karekod).
    low: 215,
    high: 395,
    quality: 'limited',
    sources: ['karekod'],
    dataDate: '2026-09-17',
  },
  // One price each (Cimri): not enough for a range.
  primer: { label: msg('Astar'), unit: 'L', low: 0, high: 0, quality: 'insufficient', sources: ['cimri'], dataDate: '2026-10-25' },
  filler: { label: msg('Macun'), unit: 'kg', low: 0, high: 0, quality: 'insufficient', sources: ['cimri'], dataDate: '2026-10-25' },
} satisfies Record<string, MaterialPriceRange>;
