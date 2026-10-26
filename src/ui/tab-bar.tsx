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
      accessibilityState={{ selected: focused }}
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

/** Flat bottom navigation; the active tab is orange. */
export function AppTabBar({ state, descriptors, emitter, navigateToTab, insets, icons }: BottomTabBarProps & { icons: Record<string, TabIcon> }) {
  const p = usePalette();
  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, space.sm), backgroundColor: p.surface, borderColor: p.border }, shadowOf(p, 2)]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const focused = state.index === index;
          return (
            <TabButton
              key={route.key}
              label={label}
              icon={icons[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' }}
              focused={focused}
              onPress={() => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: space.xs, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  bar: { flexDirection: 'row', alignSelf: 'center', width: '100%', maxWidth: 640 },
  tab: { flex: 1, alignItems: 'center', gap: 3, minHeight: 50, justifyContent: 'center' },
});
