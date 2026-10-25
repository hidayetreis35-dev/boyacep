import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { CORNER_LABEL, pressPoint, TAP_LABEL, type PhotoStageProps } from './photo-stage-types';

/** Tests run without Skia's native engine: same touch surface, no drawing. */
export function PhotoStage({ aspect, drawing, draft, onTap }: PhotoStageProps) {
  const [width, setWidth] = useState(0);
  const height = width > 0 ? width / aspect : 0;
  return (
    <View testID="wall-canvas" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Pressable
        disabled={!drawing}
        accessibilityRole={drawing ? 'button' : 'image'}
        accessibilityLabel={drawing ? (draft.mode === 'tap' ? TAP_LABEL : CORNER_LABEL) : 'Oda fotoğrafı ve renk önizlemesi'}
        onPress={(e) => {
          const pt = pressPoint(e, width, height);
          if (pt) onTap(pt);
        }}
        style={{ width, height }}
      />
    </View>
  );
}
