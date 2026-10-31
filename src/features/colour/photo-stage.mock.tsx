import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { pressPoint, stageLabel, type PaintedPhotoExport, type PhotoStageProps } from './photo-stage-types';
import type { Lab } from './recolour';

/** What "Renk yakala" reads from the photo in tests: a light sage, close to but not exactly "Adaçayı". */
export const MOCK_PICKED: Lab = [72, -8, 11];

/** What sharing gets in tests instead of a drawn photo: the start of a JPEG file. */
export const MOCK_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
export const mockExport = jest.fn<ReturnType<PaintedPhotoExport>, Parameters<PaintedPhotoExport>>(() => MOCK_JPEG);

/** Tests run without Skia's native engine: same touch surface, no drawing. */
export function PhotoStage({ aspect, drawing, draft, onTap, picking, onPick, exportRef }: PhotoStageProps) {
  useEffect(() => {
    if (!exportRef) return;
    exportRef.current = mockExport;
    return () => {
      exportRef.current = null;
    };
  }, [exportRef]);
  const [width, setWidth] = useState(0);
  const height = width > 0 ? width / aspect : 0;
  const active = drawing || !!picking;
  return (
    <View testID="wall-canvas" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Pressable
        disabled={!active}
        accessibilityRole={active ? 'button' : 'image'}
        accessibilityLabel={stageLabel({ picking, drawing, draft })}
        onPress={(e) => {
          const pt = pressPoint(e, width, height);
          if (!pt) return;
          if (picking) onPick?.(MOCK_PICKED, pt);
          else onTap(pt);
        }}
        style={{ width, height }}
      />
    </View>
  );
}
