import { useState } from 'react';
import { Image, Pressable, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Polygon, Polyline } from 'react-native-svg';

import type { PhotoSurface, WallOutline } from '@/lib/database.types';
import { radius, usePalette } from '@/ui/theme';

import { isUsableOutline, toNormalised, toSvgPoints } from './outline';

/**
 * The photo with each outlined surface tinted in its colour.
 * While drawing, each tap adds a corner of the surface being drawn.
 */
export function WallCanvas({
  uri,
  aspect,
  surfaces,
  active,
  draft,
  opacity,
  showColour,
  drawing,
  onAddPoint,
}: {
  uri: string;
  /** width / height of the photo */
  aspect: number;
  surfaces: PhotoSurface[];
  /** Index of the highlighted surface. */
  active: number;
  /** Corners of the surface being drawn. */
  draft: WallOutline;
  opacity: number;
  showColour: boolean;
  drawing: boolean;
  onAddPoint: (point: [number, number]) => void;
}) {
  const p = usePalette();
  const [width, setWidth] = useState(0);
  const height = width > 0 ? width / aspect : 0;
  const draftPoints = toSvgPoints(draft, width, height);
  const draftClosed = isUsableOutline(draft);

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
      style={{ width: '100%', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: p.surfaceMuted }}>
      {width > 0 ? (
        <Pressable
          onPress={onPress}
          disabled={!drawing}
          accessibilityRole={drawing ? 'button' : 'image'}
          accessibilityLabel={drawing ? 'Fotoğraf: yüzeyin köşesine dokun' : 'Oda fotoğrafı ve renk önizlemesi'}
          style={{ width, height }}>
          <Image source={{ uri }} style={{ width, height }} resizeMode="cover" />
          <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
            {showColour
              ? surfaces.map((s, i) =>
                  s.hex && !(drawing && i === active) ? (
                    <Polygon key={i} points={toSvgPoints(s.points, width, height)} fill={s.hex} fillOpacity={opacity} />
                  ) : null,
                )
              : null}
            {!drawing && surfaces[active] ? (
              <Polygon points={toSvgPoints(surfaces[active].points, width, height)} fill="none" stroke="#FFFFFF" strokeWidth={2} strokeDasharray="8 6" />
            ) : null}
            {drawing && draft.length > 0 ? (
              <>
                {draft.length > 1 ? (
                  <Polyline
                    points={draftClosed ? `${draftPoints} ${toSvgPoints([draft[0]], width, height)}` : draftPoints}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                ) : null}
                {draft.map(([x, y], i) => (
                  <Circle key={i} cx={x * width} cy={y * height} r={8} fill={i === 0 ? p.cta : p.primary} stroke="#FFFFFF" strokeWidth={2} />
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
