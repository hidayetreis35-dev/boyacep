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

export function findAction(key: string): HomeAction | undefined {
  return HOME_ACTIONS.find((a) => a.key === key);
}
