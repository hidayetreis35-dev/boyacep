import { useState } from 'react';
import { Image, Pressable, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Polygon, Polyline } from 'react-native-svg';

import type { WallOutline } from '@/lib/database.types';
import { radius, usePalette } from '@/ui/theme';

import { isUsableOutline, toNormalised, toSvgPoints } from './outline';

/**
 * The photo with the chosen colour laid over the outlined wall.
 * While drawing, each tap adds a corner of the wall.
 */
export function WallCanvas({
  uri,
  aspect,
  outline,
  colour,
  opacity,
  showColour,
  drawing,
  onAddPoint,
}: {
  uri: string;
  /** width / height of the photo */
  aspect: number;
  outline: WallOutline;
  colour: string;
  opacity: number;
  showColour: boolean;
  drawing: boolean;
  onAddPoint: (point: [number, number]) => void;
}) {
  const p = usePalette();
  const [width, setWidth] = useState(0);
  const height = width > 0 ? width / aspect : 0;
  const closed = isUsableOutline(outline);
  const points = toSvgPoints(outline, width, height);

  const onPress = (e: GestureResponderEvent) => {
    if (!drawing || width === 0) return;
    // Native touches carry locationX/Y; a mouse click on web carries offsetX/Y instead.
    const ne = e.nativeEvent as Partial<{ locationX: number; locationY: number; offsetX: number; offsetY: number }>;
    const x = ne.locationX ?? ne.offsetX;
    const y = ne.locationY ?? ne.offsetY;
    if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return;
    onAddPoint(toNormalised(x, y, width, height));
  };

  return (
    <View
      testID="wall-canvas"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ width: '100%', borderRadius: radius.md, overflow: 'hidden', backgroundColor: p.surfaceMuted }}>
      {width > 0 ? (
        <Pressable
          onPress={onPress}
          disabled={!drawing}
          accessibilityRole={drawing ? 'button' : 'image'}
          accessibilityLabel={drawing ? 'Fotoğraf: duvarın köşesine dokun' : 'Duvar fotoğrafı ve renk önizlemesi'}
          style={{ width, height }}>
          <Image source={{ uri }} style={{ width, height }} resizeMode="cover" />
          <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
            {closed && showColour ? <Polygon points={points} fill={colour} fillOpacity={opacity} /> : null}
            {drawing && outline.length > 0 ? (
              <>
                {outline.length > 1 ? (
                  <Polyline
                    points={closed ? `${points} ${toSvgPoints([outline[0]], width, height)}` : points}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                ) : null}
                {outline.map(([x, y], i) => (
                  <Circle key={i} cx={x * width} cy={y * height} r={7} fill={i === 0 ? p.accent : p.primary} stroke="#FFFFFF" strokeWidth={2} />
                ))}
              </>
            ) : null}
          </Svg>
        </Pressable>
      ) : (
        <View style={{ aspectRatio: aspect }} />
      )}
    </View>
  );
}
