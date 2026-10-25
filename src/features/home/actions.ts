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
  { key: 'calculate', feature: 'calculate', title: 'Ne Kadar Boya?', subtitle: 'Adım adım litre ve kutu hesabı', icon: 'color-fill', href: '/calculate', phase: 1 },
  { key: 'color', feature: 'color', title: 'Renk Stüdyosu', subtitle: 'Renkleri keşfet, duvarında dene', icon: 'color-palette', href: '/colour', phase: 5 },
  { key: 'cost', feature: 'cost', title: 'Maliyet Hesapla', subtitle: 'Boya, malzeme ve işçilik', icon: 'wallet', href: '/cost', phase: 3 },
  { key: 'inspect', feature: 'inspect', title: 'Duvarını İncele', subtitle: 'Kabarma, çatlak, nem', icon: 'scan', href: '/inspect', phase: 5 },
  { key: 'guide', feature: 'guide', title: 'Boya Rehberi', subtitle: 'Ustadan adım adım', icon: 'book', href: '/guide', phase: 4 },
  { key: 'ask', feature: 'ask', title: 'Ustaya Sor', subtitle: 'Uzmana danış', icon: 'chatbubbles', href: '/ask', phase: 8 },
];

export function findAction(key: string): HomeAction | undefined {
  return HOME_ACTIONS.find((a) => a.key === key);
}
