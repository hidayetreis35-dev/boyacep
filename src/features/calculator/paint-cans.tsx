import { Animated, StyleSheet, View } from 'react-native';

import type { PackagePlan } from '@/engine';
import { formatNumber } from '@/lib/number';
import { AppText } from '@/ui/components';
import { useAnimatedTo } from '@/ui/motion';
import { fonts } from '@/ui/theme';

import { canFills } from './cans';

const RIM = 'rgba(255, 255, 255, 0.72)';
const MAX_CANS = 8;

/** Smaller cans when there are many, so one row holds them on a phone. */
function scaleFor(count: number): number {
  return count <= 4 ? 1 : count <= 6 ? 0.82 : 0.7;
}

function Can({ size, fill, colour, delay, scale }: { size: number; fill: number; colour: string; delay: number; scale: number }) {
  const height = Math.round((22 + 26 * Math.sqrt(size / 15)) * scale);
  const width = Math.round(height * 0.82);
  const level = useAnimatedTo(height * (1 - fill), { from: height, duration: 760, delay });
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.handle, { width: width * 0.55 }]} />
      <View style={[styles.lid, { width }]} />
      <View style={[styles.body, { width: width - 4, height }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colour, transform: [{ translateY: level }] }]} />
      </View>
      <AppText variant="caption" style={[{ color: RIM, fontFamily: fonts.bold, marginTop: 4 }, scale < 1 && { fontSize: 11, lineHeight: 14 }]}>
        {`${formatNumber(size)} L`}
      </AppText>
    </View>
  );
}

/**
 * The cans to buy, filling up with paint one after another; the last ones
 * stay part empty by the amount left over. A picture of the plan above it,
 * so screen readers skip it.
 */
export function PaintCans({ groups }: { groups: { label?: string; colour: string; plan: PackagePlan }[] }) {
  let index = 0;
  return (
    <View style={styles.groups} aria-hidden importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {groups.map((g) => {
        const cans = canFills(g.plan);
        const shown = cans.slice(0, MAX_CANS);
        const scale = scaleFor(shown.length);
        return (
          <View key={g.label ?? g.colour} style={{ gap: 4 }}>
            {g.label ? (
              <AppText variant="caption" style={{ color: RIM }}>
                {g.label}
              </AppText>
            ) : null}
            <View style={[styles.row, scale < 1 && { gap: 6 }]}>
              {shown.map((c, i) => (
                <Can key={i} size={c.size} fill={c.fill} colour={g.colour} delay={350 + 110 * index++} scale={scale} />
              ))}
              {cans.length > shown.length ? (
                <AppText variant="bodyStrong" style={{ color: RIM, alignSelf: 'center' }}>
                  {`+${cans.length - shown.length}`}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  groups: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' },
  handle: { height: 8, borderWidth: 2, borderBottomWidth: 0, borderColor: RIM, borderTopLeftRadius: 8, borderTopRightRadius: 8, marginBottom: -2 },
  lid: { height: 6, borderRadius: 3, backgroundColor: RIM },
  body: {
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: RIM,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
});
