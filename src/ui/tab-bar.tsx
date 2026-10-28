import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState, type ComponentProps } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { AppText } from './components';
import { PressableScale } from './motion';
import { fonts, shadowOf, space, usePalette } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type TabIcon = { active: IconName; inactive: IconName };

function TabButton({
  label,
  icon,
  focused,
  onPress,
  onLongPress,
}: {
  label: string;
  icon: TabIcon;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const p = usePalette();
  const [progress] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => {
    Animated.spring(progress, { toValue: focused ? 1 : 0, useNativeDriver: Platform.OS !== 'web', speed: 20, bounciness: 8 }).start();
  }, [focused, progress]);

  return (
    <PressableScale
      accessibilityRole="tab"
      aria-selected={focused}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tab}>
      <Animated.View style={{ transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }}>
        <Ionicons name={focused ? icon.active : icon.inactive} size={23} color={focused ? p.cta : p.textMuted} />
      </Animated.View>
      <AppText
        variant="caption"
        numberOfLines={1}
        style={{ fontSize: 11, color: focused ? p.accent : p.textMuted, fontFamily: focused ? fonts.bold : fonts.medium }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/** One row of the sidebar on wide screens: icon and label side by side, the active row tinted. */
function SideButton({ label, icon, focused, onPress }: { label: string; icon: TabIcon; focused: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="tab"
      aria-selected={focused}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.side, { backgroundColor: focused ? p.primarySoft : 'transparent' }]}>
      <Ionicons name={focused ? icon.active : icon.inactive} size={22} color={focused ? p.primary : p.textMuted} />
      <AppText variant="bodyStrong" numberOfLines={1} style={{ color: focused ? p.primary : p.textMuted, fontFamily: focused ? fonts.bold : fonts.medium }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/**
 * Flat bottom navigation on phones, the active tab orange. On wide screens
 * (tabBarPosition 'left') the same tabs become a sidebar with the logo on top.
 */
/** The tab bar is the app's menu: a navigation landmark on the web. */
const WEB_NAV = Platform.OS === 'web' ? 'navigation' : undefined;

export function AppTabBar({ state, descriptors, emitter, navigateToTab, insets, icons, sidebar }: BottomTabBarProps & { icons: Record<string, TabIcon>; sidebar?: boolean }) {
  const p = usePalette();
  const tabs = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const label = typeof options.title === 'string' ? options.title : route.name;
    const focused = state.index === index;
    const icon = icons[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    return { key: route.key, label, focused, icon, onPress, onLongPress: () => emitter.emit({ type: 'tabLongPress', target: route.key }) };
  });

  if (sidebar) {
    return (
      <View role={WEB_NAV} style={[styles.sidebar, { paddingTop: insets.top + space.xl, backgroundColor: p.surface, borderColor: p.border }]}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: p.cta }]}>
            <Ionicons name="color-fill" size={18} color={p.onCta} />
          </View>
          <AppText variant="heading" style={{ fontFamily: fonts.display, fontSize: 22 }}>
            BoyaCep
          </AppText>
        </View>
        <View style={{ gap: 4 }} accessibilityRole="tablist">
          {tabs.map((tab) => (
            <SideButton key={tab.key} label={tab.label} icon={tab.icon} focused={tab.focused} onPress={tab.onPress} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View role={WEB_NAV} style={[styles.outer, { paddingBottom: Math.max(insets.bottom, space.sm), backgroundColor: p.surface, borderColor: p.border }, shadowOf(p, 2)]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {tabs.map((tab) => (
          <TabButton key={tab.key} label={tab.label} icon={tab.icon} focused={tab.focused} onPress={tab.onPress} onLongPress={tab.onLongPress} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: space.xs, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  bar: { flexDirection: 'row', alignSelf: 'center', width: '100%', maxWidth: 640 },
  tab: { flex: 1, alignItems: 'center', gap: 3, minHeight: 50, justifyContent: 'center' },
  sidebar: { width: 240, height: '100%', borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.md, gap: space.xl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm },
  logo: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  side: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, borderRadius: 14, paddingHorizontal: space.md },
});
