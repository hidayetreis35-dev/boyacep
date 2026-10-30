import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { formatNumber } from '@/lib/number';

import { AppText } from './components';
import { useReducedMotion } from './motion';

const STEPS = 16;
const DURATION = 800;

/** The numbers a counter shows on its way from `from` to `to`: quick at first, then slowing down, ending on `to` itself. */
export function countSteps(from: number, to: number, steps = STEPS): number[] {
  return Array.from({ length: steps }, (_, i) => (i === steps - 1 ? to : from + (to - from) * (1 - (1 - (i + 1) / steps) ** 3)));
}

/**
 * A result's headline number that counts up to its value, and again from the
 * old value when it grows. A smaller value shows at once. The final number
 * holds its place on the page while the count runs on top of it, so nothing
 * around it moves; screen readers and tests read that final number (`testID`
 * sits on it). Shown still when motion is reduced.
 */
export function Odometer({ value, decimals = 1, style, lineHeight, testID }: { value: number; decimals?: number; style: StyleProp<TextStyle>; lineHeight: number; testID?: string }) {
  const reduced = useReducedMotion();
  // The number on screen while counting; null once it has settled on `value`.
  const [shown, setShown] = useState<number | null>(reduced ? null : 0);
  const current = useRef(0);

  useEffect(() => {
    const from = current.current;
    if (reduced || value <= from) {
      current.current = value;
      setShown(null);
      return;
    }
    const steps = countSteps(from, value);
    let i = 0;
    const timer = setInterval(() => {
      current.current = steps[i];
      i += 1;
      if (i >= steps.length) {
        clearInterval(timer);
        setShown(null);
      } else {
        setShown(current.current);
      }
    }, DURATION / STEPS);
    return () => clearInterval(timer);
  }, [value, reduced]);

  const counting = shown !== null;
  // Count with the final number's decimals: 12,3 counts 0,8 … 11,9 and 12 counts 1 … 11.
  const places = Number.isInteger(Number(value.toFixed(decimals))) ? 0 : decimals;
  return (
    <View>
      <AppText testID={testID} style={[style, { lineHeight }, counting && styles.holder]} numberOfLines={1}>
        {formatNumber(value, decimals)}
      </AppText>
      {counting ? (
        <AppText
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[style, { lineHeight }, styles.count]}
          numberOfLines={1}>
          {formatNumber(Math.floor(shown * 10 ** places) / 10 ** places, places)}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Holds the final number's width and height while the count draws over it.
  holder: { opacity: 0 },
  count: { position: 'absolute', left: 0, top: 0 },
});
