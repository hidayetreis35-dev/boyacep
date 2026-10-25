import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';

import { readLocalRoles } from '@/features/account/local-role';
import { AppTabBar, type TabIcon } from '@/ui/tab-bar';
import { usePalette } from '@/ui/theme';

const TABS: { name: string; title: string; icon: TabIcon }[] = [
  { name: 'index', title: 'Ana Sayfa', icon: { active: 'home', inactive: 'home-outline' } },
  { name: 'projects', title: 'Projelerim', icon: { active: 'albums', inactive: 'albums-outline' } },
  { name: 'usta', title: 'Usta', icon: { active: 'construct', inactive: 'construct-outline' } },
  { name: 'profile', title: 'Profil', icon: { active: 'person-circle', inactive: 'person-circle-outline' } },
];

const ICONS = Object.fromEntries(TABS.map((t) => [t.name, t.icon]));

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
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
      ))}
    </Tabs>
  );
}
