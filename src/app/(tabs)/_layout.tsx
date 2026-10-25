import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useState, type ComponentProps } from 'react';

import { readLocalRoles } from '@/features/account/local-role';

import { usePalette } from '@/ui/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Ana Sayfa', icon: 'home' },
  { name: 'projects', title: 'Projelerim', icon: 'folder-open' },
  { name: 'usta', title: 'Usta', icon: 'construct' },
  { name: 'profile', title: 'Profil', icon: 'person-circle' },
];

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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.primary,
        tabBarInactiveTintColor: p.textMuted,
        tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.border },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} color={color as string} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
