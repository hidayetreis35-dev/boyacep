import type { SurfaceCondition, SurfaceType } from './types';

/**
 * Rule-based product type advice ("Malzeme önericisi"). Brand neutral and
 * general: every recommendation says why, and the screen asks the user to
 * confirm with their painter or store. No AI, no prices.
 */

/** How the room is used; decides moisture and wipe resistance. */
export type RoomUse = 'dry' | 'kitchen' | 'bathroom';

export type ColourChange = 'similar' | 'dark_to_light' | 'light_to_dark';

/** Problems the user saw on the wall ("Duvarını İncele" findings, mapped). */
export type WallProblem = 'damp' | 'mould' | 'salt' | 'chalking' | 'smoke_stain' | 'oil_paint';

export interface RecommendInput {
  surfaceType: SurfaceType;
  surfaceCondition: SurfaceCondition;
  use: RoomUse;
  paintCeiling: boolean;
  colourChange?: ColourChange;
  problems?: WallProblem[];
}

export type RecommendationKind = 'primer' | 'wall_paint' | 'ceiling_paint' | 'filler' | 'supplies';

/** required: skipping it is a common cause of failure. recommended: clearly better. optional: nice to have. */
export type RecommendationLevel = 'required' | 'recommended' | 'optional';

export interface Recommendation {
  kind: RecommendationKind;
  level: RecommendationLevel;
  /** Turkish product type, translated where shown. */
  product: string;
  /** Turkish, one sentence. */
  reason: string;
}

export const RECOMMENDATION_KIND_LABEL: Record<RecommendationKind, string> = {
  primer: 'Astar',
  wall_paint: 'Duvar boyası',
  ceiling_paint: 'Tavan boyası',
  filler: 'Macun ve zımpara',
  supplies: 'Yardımcı malzemeler',
};

export const RECOMMENDATION_LEVEL_LABEL: Record<RecommendationLevel, string> = {
  required: 'Gerekli',
  recommended: 'Önerilir',
  optional: 'İsteğe bağlı',
};

const KIND_ORDER: RecommendationKind[] = ['primer', 'filler', 'wall_paint', 'ceiling_paint', 'supplies'];
const LEVEL_ORDER: RecommendationLevel[] = ['required', 'recommended', 'optional'];

/** Problems that need their own primer; the first one found wins over the surface primer. */
const PROBLEM_PRIMER: { problem: WallProblem; product: string; reason: string }[] = [
  {
    problem: 'oil_paint',
    product: 'Geçiş astarı (yağlıdan su bazlıya)',
    reason: 'Yağlı boyanın üstüne su bazlı boya astarsız tutmaz ve dökülür.',
  },
  {
    problem: 'damp',
    product: 'Leke örtücü (izolasyon) astar',
    reason: 'Nem lekesi, kaynak onarılıp duvar kuruduktan sonra bile yeni boyanın altından geri çıkar.',
  },
  {
    problem: 'smoke_stain',
    product: 'Leke örtücü (izolasyon) astar',
    reason: 'Sigara ve is lekesi su bazlı boyanın içinden sararak geri çıkar.',
  },
  {
    problem: 'salt',
    product: 'Tuzlanma astarı',
    reason: 'Duvardaki tuz normal astarı ve boyayı kabartır.',
  },
  {
    problem: 'chalking',
    product: 'Bağlayıcı astar',
    reason: 'Tozlanan yüzey yeni boyanın tutunmasını engeller; bağlayıcı astar tozu sabitler.',
  },
];

const SURFACE_PRIMER: Record<SurfaceType, { product: string; reason: string } | null> = {
  painted: null,
  new_plaster: {
    product: 'Su bazlı iç cephe astarı',
    reason: 'Yeni sıva boyayı emer; astar emiciliği eşitler, boyadan tasarruf ettirir ve yamalı görüntüyü önler.',
  },
  plasterboard: {
    product: 'Alçıpan astarı',
    reason: 'Alçıpan kâğıdı ve derz macunu farklı emer; astarsız boyada derz çizgileri belli olur.',
  },
  concrete: {
    product: 'Beton astarı (bağlayıcı)',
    reason: 'Brüt beton tozlu ve gözeneklidir; astar yüzeyi bağlar ve boyanın tutunmasını sağlar.',
  },
};

export function recommendMaterials(input: RecommendInput): Recommendation[] {
  const problems = new Set(input.problems ?? []);
  const out: Recommendation[] = [];
  const add = (kind: RecommendationKind, level: RecommendationLevel, product: string, reason: string) => {
    if (!out.some((r) => r.product === product)) out.push({ kind, level, product, reason });
  };

  // Primer: problem primers first, then the surface primer, then repairs and colour change.
  for (const p of PROBLEM_PRIMER) {
    if (problems.has(p.problem)) add('primer', 'required', p.product, p.reason);
  }
  const surface = SURFACE_PRIMER[input.surfaceType];
  if (surface) add('primer', 'required', surface.product, surface.reason);
  if (input.surfaceType === 'painted' && input.surfaceCondition !== 'good') {
    add('primer', 'required', 'Astar (macunlu ve kazınan yerlere)', 'Macunlu yerler boyayı farklı emer; astarsız boyada tamir yerleri parlak ya da mat kalır.');
  }
  if (input.colourChange === 'dark_to_light' && !out.some((r) => r.kind === 'primer')) {
    add('primer', 'recommended', 'Örtücü beyaz astar', 'Koyu rengin üstüne açık renk sürerken astar, gereken boya katını azaltır.');
  }
  if (input.colourChange === 'light_to_dark') {
    add('primer', 'optional', 'Renge yakın tonlu astar', 'Koyu renkler ilk katta yamalı görünebilir; tonlu astar kat sayısını azaltır. Bayiden sor.');
  }

  // Repairs.
  if (input.surfaceCondition === 'minor_repair') {
    add('filler', 'required', 'Hazır macun', 'Küçük delik ve ince çatlaklar boyadan önce doldurulmazsa boyanın altından belli olur.');
    add('filler', 'required', 'Zımpara kâğıdı (180–240 numara)', 'Macun kuruyunca yüzeyi düzlemek için.');
  } else if (input.surfaceCondition === 'poor') {
    add('filler', 'required', 'Saten alçı (perdah macunu)', 'Geniş bozuk yüzeyler ince bir saten alçı katıyla düzlenir.');
    add('filler', 'required', 'Zımpara kâğıdı (120 ve 180–240 numara)', 'Kaba zımpara kabarıkları alır, ince zımpara yüzeyi boyaya hazırlar.');
    add('supplies', 'recommended', 'Spatula ve mala', 'Gevşek boyayı kazımak ve alçıyı yaymak için.');
  }

  // Wall paint by room use and problems.
  if (input.use === 'bathroom' || problems.has('mould')) {
    add('wall_paint', 'required', 'Küfe dayanıklı (anti-bakteriyel) iç cephe boyası', 'Buhar ve yoğuşma olan yerlerde normal boya kısa sürede küflenir.');
  } else if (input.use === 'kitchen') {
    add('wall_paint', 'recommended', 'Silinebilir, buhara dayanıklı iç cephe boyası (ipek mat)', 'Mutfakta yağ ve buhar lekesi olur; ipek mat yüzey kolay silinir.');
  } else {
    add('wall_paint', 'recommended', 'Silinebilir iç cephe boyası', 'Silinebilir boya lekeyi suyla almanı sağlar; çocuk odası ve koridorda fark yaratır.');
  }
  if (input.surfaceCondition === 'poor' && input.use === 'dry') {
    add('wall_paint', 'optional', 'Mat yüzeyli boya', 'Mat boya ışığı az yansıttığı için kalan küçük kusurları gizler.');
  }

  if (input.paintCeiling) {
    if (input.use === 'bathroom') {
      add('ceiling_paint', 'required', 'Küfe dayanıklı tavan boyası', 'Banyoda buhar en çok tavanda birikir.');
    } else {
      add('ceiling_paint', 'recommended', 'Tavan boyası (mat beyaz)', 'Tavan boyası damlatmaz, ışığı yansıtmadan dağıtır ve duvar boyasından ucuzdur.');
    }
  }

  // Supplies.
  const rough = input.surfaceType === 'new_plaster' || input.surfaceType === 'concrete';
  add(
    'supplies',
    'recommended',
    rough ? 'Orta tüylü rulo (12–18 mm)' : 'Kısa tüylü rulo (9–12 mm)',
    rough ? 'Pürüzlü yüzeyde orta tüylü rulo boyayı gözeneklere ulaştırır.' : 'Düz yüzeyde kısa tüylü rulo daha pürüzsüz bir görüntü verir.',
  );
  add('supplies', 'recommended', 'Köşe fırçası, maskeleme bandı ve örtü', 'Köşeler ve kenarlar rulo ile boyanmaz; bant ve örtü temizliği kısaltır.');

  return out.sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level),
  );
}
