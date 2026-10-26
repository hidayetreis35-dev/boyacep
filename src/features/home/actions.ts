import { msg } from '@/i18n';
import type { IconName } from '@/ui/components';
import type { FeatureKey } from '@/ui/theme';

export interface HomeAction {
  key: string;
  /** Colour identity of the feature. */
  feature: FeatureKey;
  title: string;
  subtitle: string;
  icon: IconName;
  /** Route for ready features; undefined while the feature is still being built. */
  href?: '/calculate' | '/cost' | '/guide' | '/colour' | '/inspect' | '/ask';
  /** Phase in which the feature ships, shown on "Yakında" screens. */
  phase: number;
}

export const HOME_ACTIONS: HomeAction[] = [
  { key: 'calculate', feature: 'calculate', title: msg('Ne Kadar Boya?'), subtitle: msg('Adım adım litre ve kutu hesabı'), icon: 'color-fill', href: '/calculate', phase: 1 },
  { key: 'color', feature: 'color', title: msg('Renk Stüdyosu'), subtitle: msg('Renkleri keşfet, duvarında dene'), icon: 'color-palette', href: '/colour', phase: 5 },
  { key: 'cost', feature: 'cost', title: msg('Maliyet Hesapla'), subtitle: msg('Boya, malzeme ve işçilik'), icon: 'wallet', href: '/cost', phase: 3 },
  { key: 'inspect', feature: 'inspect', title: msg('Duvarını İncele'), subtitle: msg('Kabarma, çatlak, nem'), icon: 'scan', href: '/inspect', phase: 5 },
  { key: 'guide', feature: 'guide', title: msg('Boya Rehberi'), subtitle: msg('Ustadan adım adım'), icon: 'book', href: '/guide', phase: 4 },
  { key: 'ask', feature: 'ask', title: msg('Ustaya Sor'), subtitle: msg('Uzmana danış'), icon: 'chatbubbles', href: '/ask', phase: 8 },
];

/** Shown on the home grid and service lists but not built yet; they open an honest "Yakında" screen. */
export const SOON_ACTIONS: HomeAction[] = [
  { key: 'ai-design', feature: 'color', title: msg('AI Tasarım'), subtitle: msg('Hayalindeki evi tasarla'), icon: 'sparkles', phase: 4 },
  { key: 'notifications', feature: 'projects', title: msg('Bildirimler'), subtitle: msg('Proje ve teklif haberleri'), icon: 'notifications', phase: 2 },
];

/** Trades besides painting. BoyaCep starts with paint work; the others open later. */
export interface ServiceCategory {
  key: string;
  title: string;
  icon: IconName;
  /** Only painting is open today. */
  open: boolean;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { key: 'painter', title: msg('Boyacı'), icon: 'color-fill', open: true },
  { key: 'electrician', title: msg('Elektrikçi'), icon: 'flash', open: false },
  { key: 'plumber', title: msg('Tesisatçı'), icon: 'water', open: false },
  { key: 'carpenter', title: msg('Marangoz'), icon: 'hammer', open: false },
  { key: 'air-conditioning', title: msg('Klima'), icon: 'snow', open: false },
  { key: 'cleaning', title: msg('Temizlik'), icon: 'sparkles', open: false },
  { key: 'tiling', title: msg('Fayans'), icon: 'grid', open: false },
];

export function findAction(key: string): HomeAction | undefined {
  return HOME_ACTIONS.find((a) => a.key === key) ?? SOON_ACTIONS.find((a) => a.key === key);
}

export function findService(key: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((c) => c.key === key);
}
