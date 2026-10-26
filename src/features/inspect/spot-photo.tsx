import { useState } from 'react';
import { Image, Pressable, View, type GestureResponderEvent } from 'react-native';

import { t } from '@/i18n';
import { AppText } from '@/ui/components';
import { fonts, radius, useFeatureColour, usePalette } from '@/ui/theme';

export type Spot = [number, number];
export const MAX_SPOTS = 5;

/**
 * The wall photo with numbered markers. While `marking`, a tap adds a marker
 * where the user wants to look closely. Positions are stored as 0–1 fractions.
 */
export function SpotPhoto({
  uri,
  aspect,
  spots,
  marking,
  onAddSpot,
  maxHeight,
}: {
  uri: string;
  aspect: number;
  spots: Spot[];
  marking: boolean;
  onAddSpot?: (spot: Spot) => void;
  /** Keeps tall photos from filling the screen on later steps. */
  maxHeight?: number;
}) {
  const p = usePalette();
  const f = useFeatureColour('inspect');
  const [box, setBox] = useState(0);
  let width = box;
  let height = box > 0 ? box / aspect : 0;
  if (maxHeight && height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspect;
  }

  const onPress = (e: GestureResponderEvent) => {
    if (!marking || width === 0 || spots.length >= MAX_SPOTS) return;
    // Native touches carry locationX/Y; a mouse click on web carries offsetX/Y instead.
    const ne = e.nativeEvent as Partial<{ locationX: number; locationY: number; offsetX: number; offsetY: number }>;
    const x = ne.locationX ?? ne.offsetX;
    const y = ne.locationY ?? ne.offsetY;
    if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return;
    onAddSpot?.([Math.min(1, Math.max(0, x / width)), Math.min(1, Math.max(0, y / height))]);
  };

  return (
    <View testID="spot-photo" onLayout={(e) => setBox(e.nativeEvent.layout.width)} style={{ width: '100%', alignItems: 'center' }}>
      {box > 0 ? (
        <Pressable
          onPress={onPress}
          disabled={!marking}
          accessibilityRole={marking ? 'button' : 'image'}
          accessibilityLabel={marking ? t('Fotoğraf: sorunlu yere dokun') : t('Duvar fotoğrafı, {count} işaret', { count: spots.length })}
          style={{ width, height, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: p.surfaceMuted }}>
          <Image source={{ uri }} style={{ width, height }} resizeMode="cover" />
          {spots.map(([x, y], i) => (
            <View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: x * width - 16,
                top: y * height - 16,
                width: 32,
                height: 32,
                borderRadius: 16,
                borderWidth: 3,
                borderColor: '#FFFFFF',
                backgroundColor: f.base,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <AppText variant="small" style={{ color: '#FFFFFF', fontFamily: fonts.bold }}>
                {i + 1}
              </AppText>
            </View>
          ))}
        </Pressable>
      ) : (
        <View style={{ width: '100%', aspectRatio: aspect }} />
      )}
    </View>
  );
}
