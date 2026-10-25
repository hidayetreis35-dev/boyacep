import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState, type ComponentProps } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { AppText } from './components';
import { PressableScale } from './motion';
import { fonts, radius, shadowOf, space, usePalette } from './theme';

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
      <View style={styles.pillWrap}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.pill,
            { backgroundColor: p.accentSoft, opacity: progress, transform: [{ scaleX: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
          ]}
        />
        <Ionicons name={focused ? icon.active : icon.inactive} size={22} color={focused ? p.cta : p.textMuted} />
      </View>
      <AppText
        variant="caption"
        numberOfLines={1}
        style={{ color: focused ? p.text : p.textMuted, fontFamily: focused ? fonts.bold : fonts.medium }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/** Rounded bottom navigation with an animated pill behind the active tab. */
export function AppTabBar({ state, descriptors, emitter, navigateToTab, insets, icons }: BottomTabBarProps & { icons: Record<string, TabIcon> }) {
  const p = usePalette();
  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, space.sm), backgroundColor: p.background }]}>
      <View style={[styles.bar, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p, 2)]} accessibilityRole="tablist">
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
  outer: { paddingHorizontal: space.md, paddingTop: space.xs },
  bar: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
    ...(Platform.OS === 'web' ? { marginBottom: space.sm } : null),
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 52, justifyContent: 'center' },
  pillWrap: { width: 54, height: 30, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: radius.pill },
});
