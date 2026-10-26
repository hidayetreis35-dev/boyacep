import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';

import { readLocalRoles } from '@/features/account/local-role';
import { msg, t } from '@/i18n';
import { AppTabBar, type TabIcon } from '@/ui/tab-bar';
import { usePalette } from '@/ui/theme';

const TABS: { name: string; title: string; icon: TabIcon }[] = [
  { name: 'index', title: msg('Ana Sayfa'), icon: { active: 'home', inactive: 'home-outline' } },
  { name: 'projects', title: msg('Projelerim'), icon: { active: 'briefcase', inactive: 'briefcase-outline' } },
  { name: 'services', title: msg('Hizmetler'), icon: { active: 'construct', inactive: 'construct-outline' } },
  { name: 'budget', title: msg('Bütçe'), icon: { active: 'wallet', inactive: 'wallet-outline' } },
  { name: 'profile', title: msg('Profil'), icon: { active: 'person', inactive: 'person-outline' } },
];

const ICONS = Object.fromEntries(TABS.map((value) => [value.name, value.icon]));

export default function TabLayout() {
  const p = usePalette();
  // First launch: ask homeowner or painter before anything else.
  const [firstLaunch, setFirstLaunch] = useState<boolean | null>(null);
  useEffect(() => {
    readLocalRoles().then((roles) => setFirstLaunch(roles === null));
  }, []);

  if (firstLaunch) return <Redirect href="/welcome" />;
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} icons={ICONS} />}
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: p.background } }}>
      {TABS.map((value) => (
        <Tabs.Screen key={value.name} name={value.name} options={{ title: t(value.title) }} />
      ))}
    </Tabs>
  );
}
