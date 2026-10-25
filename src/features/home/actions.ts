import type { IconName } from '@/ui/components';

export interface HomeAction {
  key: string;
  title: string;
  subtitle: string;
  icon: IconName;
  /** Route for ready features; undefined while the feature is still being built. */
  href?: '/calculate' | '/cost' | '/guide';
  /** Phase in which the feature ships, shown on "Yakında" screens. */
  phase: number;
}

export const HOME_ACTIONS: HomeAction[] = [
  { key: 'calculate', title: 'Boya Hesapla', subtitle: 'Kaç litre, kaç kutu?', icon: 'calculator', href: '/calculate', phase: 1 },
  { key: 'color', title: 'Rengini Dene', subtitle: 'Fotoğrafında rengi gör', icon: 'color-palette', phase: 5 },
  { key: 'cost', title: 'Maliyet Hesapla', subtitle: 'Malzeme ve işçilik', icon: 'wallet', href: '/cost', phase: 3 },
  { key: 'inspect', title: 'Duvarını İncele', subtitle: 'Kabarma, çatlak, nem', icon: 'scan', phase: 5 },
  { key: 'guide', title: 'Boya Rehberi', subtitle: 'Ustadan adım adım', icon: 'book', href: '/guide', phase: 4 },
  { key: 'ask', title: 'Ustaya Sor', subtitle: 'Uzmana danış', icon: 'chatbubbles', phase: 8 },
];

export function findAction(key: string): HomeAction | undefined {
  return HOME_ACTIONS.find((a) => a.key === key);
}
