import { Animated, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { AppText } from './components';
import { useAnimatedTo, useReducedMotion } from './motion';

const DIGITS = '01234567890123456789'.split('');

function DigitColumn({ digit, lineHeight, style, delay }: { digit: number; lineHeight: number; style: StyleProp<TextStyle>; delay: number }) {
  // Rolls once past every digit, then stops on its own.
  const y = useAnimatedTo(-(10 + digit) * lineHeight, { from: 0, duration: 1000, delay });
  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }}>
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        {DIGITS.map((d, i) => (
          <AppText key={i} style={[style, { lineHeight, height: lineHeight, includeFontPadding: false }]}>
            {d}
          </AppText>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * A number that rolls into place like a meter, digit by digit, for a result's
 * headline. Screen readers and tests read the plain number (`testID` sits on
 * it); the rolling digits are decoration. Shown still when motion is reduced.
 */
export function Odometer({ value, style, lineHeight, testID }: { value: string; style: StyleProp<TextStyle>; lineHeight: number; testID?: string }) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <AppText testID={testID} style={[style, { lineHeight }]}>
        {value}
      </AppText>
    );
  }
  const chars = value.split('');
  return (
    <View>
      <View style={styles.row} aria-hidden importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {chars.map((c, i) =>
          /\d/.test(c) ? (
            <DigitColumn key={`${i}-${c}`} digit={Number(c)} lineHeight={lineHeight} style={style} delay={i * 70} />
          ) : (
            <AppText key={`${i}-${c}`} style={[style, { lineHeight }]}>
              {c}
            </AppText>
          ),
        )}
      </View>
      <AppText testID={testID} style={[style, styles.reader]}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  // Kept for screen readers, out of sight.
  reader: { position: 'absolute', left: 0, top: 0, opacity: 0, width: 1, height: 1, overflow: 'hidden' },
});
