import * as Haptics from 'expo-haptics';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const NATIVE = Platform.OS !== 'web';

// The system "reduce motion" setting, read once and shared by every animated
// component instead of one listener per button.
let reduceMotion = false;
let watching = false;
const listeners = new Set<() => void>();

function setReduceMotion(on: boolean) {
  if (on === reduceMotion) return;
  reduceMotion = on;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!watching) {
    watching = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(setReduceMotion)
      .catch(() => {});
    AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
  }
  return () => {
    listeners.delete(listener);
  };
}

/** True when the phone (or browser) asks apps for less motion: then nothing springs, slides or pulses. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => reduceMotion, () => false);
}

/**
 * A light tick under the finger when a choice changes: a chip, a checkbox, a
 * tab. Phones only; quietly does nothing where haptics are missing.
 */
export function tick() {
  if (Platform.OS === 'web') return;
  try {
    Haptics.selectionAsync().catch(() => {});
  } catch {
    // No haptics module in this build.
  }
}

/** Resolves once the screen has drawn the latest change, such as a busy button, before work that holds the app for a moment. */
export function afterPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

/** A Pressable that springs down slightly while pressed, and stays still when motion is reduced. */
export function PressableScale({ style, onPressIn, onPressOut, ...rest }: PressableProps) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [pressed, setPressed] = useState(false);
  const to = (value: number) => {
    if (reduced) return;
    Animated.spring(scale, { toValue: value, useNativeDriver: NATIVE, speed: 40, bounciness: 6 }).start();
  };
  // Resolve function styles ourselves: animated components don't accept style callbacks.
  const resolved = typeof style === 'function' ? style({ pressed }) : style;
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        to(0.97);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        to(1);
        onPressOut?.(e);
      }}
      style={[resolved, { transform: [{ scale }] }] as StyleProp<ViewStyle>}
    />
  );
}

/** Fades and lifts its children in once, optionally after a short delay. Shown at once when motion is reduced. */
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, { toValue: 1, duration: 360, delay, useNativeDriver: NATIVE }).start();
  }, [progress, delay, reduced]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

/** Grows its child in with a small spring, for a result's icon or a new door in a drawing. Still when motion is reduced. */
export function Pop({ children, delay = 0, from = 0.4, style }: { children: ReactNode; delay?: number; from?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(reduceMotion ? 1 : from));
  useEffect(() => {
    if (reduced) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, { toValue: 1, delay, useNativeDriver: NATIVE, speed: 14, bounciness: 12 }).start();
  }, [scale, delay, reduced]);
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

/**
 * Slides a wizard step in from the side it comes from: 1 from the right
 * (next), -1 from the left (back), 0 just fades. Shown at once when motion
 * is reduced.
 */
export function SlideIn({ children, direction, style }: { children: ReactNode; direction: 1 | 0 | -1; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }).start();
  }, [progress, reduced]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [28 * direction, 0] }) }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

/**
 * A value that eases to `target` whenever the target changes, for opacity
 * and transforms only. It starts at `from` (default: the target itself, so
 * nothing moves on the first frame) and jumps when motion is reduced.
 */
export function useAnimatedTo(target: number, { from, duration = 320, delay = 0 }: { from?: number; duration?: number; delay?: number } = {}): Animated.Value {
  const reduced = useReducedMotion();
  const [value] = useState(() => new Animated.Value(reduceMotion ? target : (from ?? target)));
  useEffect(() => {
    if (reduced) {
      value.setValue(target);
      return;
    }
    const animation = Animated.timing(value, { toValue: target, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE });
    animation.start();
    return () => animation.stop();
  }, [value, target, duration, delay, reduced]);
  return value;
}
