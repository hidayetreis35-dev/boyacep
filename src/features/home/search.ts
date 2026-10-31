import type { Href } from 'expo-router';

import { fold, searchColours } from '@/features/colour/catalogue';
import { GUIDE_CATEGORIES } from '@/features/guide/api';
import { msg, t } from '@/i18n';
import type { IconName } from '@/ui/components';
import type { FeatureKey } from '@/ui/theme';

import type { SpaceKind } from '@/features/calculator/wizard';

/**
 * In-app search on the home screen: features, rooms, colour names and guides.
 * Nothing goes to a server; guide titles are searched only when the list is
 * already loaded.
 */

export type SearchKind = 'feature' | 'room' | 'colour' | 'guide';

export interface SearchHit {
  key: string;
  kind: SearchKind;
  /** Already translated. */
  title: string;
  icon: IconName;
  feature: FeatureKey;
  href: Href;
  /** Colour results show their swatch. */
  swatch?: string;
}

export const KIND_LABEL: Record<SearchKind, string> = {
  feature: msg('Araç'),
  room: msg('Oda'),
  colour: msg('Renk'),
  guide: msg('Rehber'),
};

type Entry = {
  key: string;
  kind: 'feature' | 'room';
  title: string;
  icon: IconName;
  feature: FeatureKey;
  href: Href;
  /** Written folded (no Turkish letters), the way queries are matched. English words too. */
  words: string[];
};

const room = (space: SpaceKind): Href => ({ pathname: '/calculate', params: { space } });

const ENTRIES: Entry[] = [
  { key: 'calculate', kind: 'feature', title: msg('Boya Hesapla'), icon: 'color-fill', feature: 'calculate', href: '/calculate', words: ['boya', 'hesap', 'litre', 'kutu', 'kac litre', 'metrekare', 'm2', 'paint', 'calculate', 'how much'] },
  { key: 'colour', kind: 'feature', title: msg('Renk Stüdyosu'), icon: 'color-palette', feature: 'color', href: '/colour', words: ['renk', 'renkler', 'katalog', 'palet', 'dene', 'duvarda dene', 'colour', 'color', 'try'] },
  { key: 'inspect', kind: 'feature', title: msg('Duvarını İncele'), icon: 'scan', feature: 'inspect', href: '/inspect', words: ['duvar', 'nem', 'rutubet', 'kuf', 'catlak', 'kabarma', 'dokulme', 'leke', 'sorun', 'wall', 'damp', 'mould', 'mold', 'crack', 'peeling'] },
  { key: 'cost', kind: 'feature', title: msg('Maliyet Hesapla'), icon: 'calculator', feature: 'cost', href: '/cost', words: ['maliyet', 'masraf', 'tutar', 'para', 'iscilik', 'kendin yap', 'cost', 'price', 'labour'] },
  { key: 'prices', kind: 'feature', title: msg('Boya Fiyatları'), icon: 'stats-chart', feature: 'cost', href: '/prices', words: ['fiyat', 'fiyatlar', 'piyasa', 'sehir', 'm2 fiyati', 'iscilik', 'prices', 'market'] },
  { key: 'guide', kind: 'feature', title: msg('Boya Rehberi'), icon: 'book', feature: 'guide', href: '/guide', words: ['rehber', 'nasil', 'astar', 'macun', 'zimpara', 'tavan', 'rulo', 'firca', 'guide', 'how to', 'primer'] },
  { key: 'ask', kind: 'feature', title: msg('Ustaya Sor'), icon: 'chatbubbles', feature: 'ask', href: '/ask', words: ['sor', 'soru', 'uzman', 'danis', 'ask', 'question', 'expert'] },
  { key: 'pros', kind: 'feature', title: msg('Usta Bul'), icon: 'person', feature: 'ask', href: '/services', words: ['usta', 'boyaci', 'hizmet', 'teklif', 'painter', 'pro', 'quote'] },
  { key: 'projects', kind: 'feature', title: msg('Projelerim'), icon: 'briefcase', feature: 'projects', href: '/projects', words: ['proje', 'projeler', 'tadilat', 'yenileme', 'project', 'renovation'] },
  { key: 'budget', kind: 'feature', title: msg('Ev Bütçesi'), icon: 'wallet', feature: 'budget', href: '/budget', words: ['butce', 'harcama', 'gider', 'budget', 'spending'] },
  { key: 'home-log', kind: 'feature', title: msg('Ev Hafızası'), icon: 'time', feature: 'projects', href: '/home-log', words: ['hafiza', 'gecmis', 'ne zaman', 'kayit', 'bakim', 'history', 'home log'] },
  { key: 'room-living', kind: 'room', title: msg('Salon'), icon: 'tv', feature: 'calculate', href: room('living'), words: ['salon', 'oturma odasi', 'yemek', 'living room', 'lounge'] },
  { key: 'room-bedroom', kind: 'room', title: msg('Yatak odası'), icon: 'bed', feature: 'calculate', href: room('room'), words: ['yatak', 'oda', 'cocuk odasi', 'calisma odasi', 'bedroom', 'kids room', 'study'] },
  { key: 'room-kitchen', kind: 'room', title: msg('Mutfak'), icon: 'restaurant', feature: 'calculate', href: room('kitchen'), words: ['mutfak', 'kitchen'] },
  { key: 'room-bathroom', kind: 'room', title: msg('Banyo'), icon: 'water', feature: 'calculate', href: room('bathroom'), words: ['banyo', 'tuvalet', 'wc', 'bathroom', 'toilet'] },
  { key: 'room-home', kind: 'room', title: msg('Tüm ev'), icon: 'home', feature: 'calculate', href: room('home'), words: ['tum ev', 'ev', 'daire', '2+1', '3+1', 'whole home', 'flat', 'apartment'] },
  { key: 'room-custom', kind: 'room', title: msg('Özel alan'), icon: 'shapes', feature: 'calculate', href: room('custom'), words: ['koridor', 'antre', 'hol', 'ofis', 'merdiven', 'hallway', 'office'] },
];

const MAX_HITS = 8;

/** 3 when the title starts with the query, 2 when it contains it, 1 for a keyword, 0 for no match. */
function score(q: string, title: string, words: string[]): number {
  const names = [fold(title), fold(t(title))];
  if (names.some((n) => n.startsWith(q))) return 3;
  if (names.some((n) => n.includes(q))) return 2;
  if (words.some((w) => w.startsWith(q) || (q.length >= 3 && w.includes(q)) || (w.length >= 3 && q.startsWith(w)))) return 1;
  return 0;
}

export function searchApp(query: string, guides: { slug: string; title: string }[] = []): SearchHit[] {
  const q = fold(query.trim());
  if (q.length < 2) return [];

  const ranked: { hit: SearchHit; score: number; order: number }[] = [];
  ENTRIES.forEach((e, order) => {
    const s = score(q, e.title, e.words);
    if (s > 0) ranked.push({ hit: { key: e.key, kind: e.kind, title: t(e.title), icon: e.icon, feature: e.feature, href: e.href }, score: s, order });
  });

  searchColours(query)
    .slice(0, 4)
    .forEach((c, i) => {
      ranked.push({
        hit: { key: `colour-${c.id}`, kind: 'colour', title: t(c.name), icon: 'color-palette', feature: 'color', href: { pathname: '/colour', params: { hex: c.hex } }, swatch: c.hex },
        score: score(q, c.name, []) || 1,
        order: 100 + i,
      });
    });

  guides.forEach((g, i) => {
    const s = score(q, g.title, []);
    if (s > 0) ranked.push({ hit: { key: `guide-${g.slug}`, kind: 'guide', title: g.title, icon: 'book', feature: 'guide', href: { pathname: '/guide/[slug]', params: { slug: g.slug } } }, score: s, order: 200 + i });
  });

  GUIDE_CATEGORIES.forEach((c, i) => {
    const s = score(q, c.label, []);
    if (s > 1) ranked.push({ hit: { key: `topic-${c.value}`, kind: 'guide', title: t(c.label), icon: 'book', feature: 'guide', href: '/guide' }, score: s, order: 300 + i });
  });

  return ranked
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, MAX_HITS)
    .map((r) => r.hit);
}
