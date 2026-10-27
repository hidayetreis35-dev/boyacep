import { Image, type ImageStyle } from 'expo-image';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

/**
 * Real room photos (free licences, see assets/photos/SOURCES.md).
 * colourRoomWall is colour-room.jpg with its wall cut out and turned into a
 * shading layer by scripts/photos/wall-overlay.py, so any colour drawn under
 * it looks painted on the wall.
 */
export const PHOTOS = {
  welcome: require('../../assets/photos/welcome.jpg'),
  inspiration: require('../../assets/photos/inspiration.jpg'),
  wallProblem: require('../../assets/photos/wall-problem.jpg'),
  bathroom: require('../../assets/photos/bathroom.jpg'),
  bedroom: require('../../assets/photos/bedroom.jpg'),
  colourRoom: require('../../assets/photos/colour-room.jpg'),
  livingRoom: require('../../assets/photos/living-room.jpg'),
  kidsRoom: require('../../assets/photos/kids-room.jpg'),
  study: require('../../assets/photos/study.jpg'),
  kitchenGreen: require('../../assets/photos/kitchen-green.jpg'),
  hallway: require('../../assets/photos/hallway.jpg'),
  wholeHome: require('../../assets/photos/whole-home.jpg'),
  facade: require('../../assets/photos/facade.jpg'),
  renovation: require('../../assets/photos/renovation.jpg'),
  decoration: require('../../assets/photos/decoration.jpg'),
  colourRoomWall: require('../../assets/photos/colour-room-wall.webp'),
} as const;

export type PhotoName = keyof typeof PHOTOS;

/** A decorative photo that fills its box. */
export function Photo({ name, style }: { name: PhotoName; style?: StyleProp<ImageStyle> }) {
  return <Image source={PHOTOS[name]} contentFit="cover" transition={150} style={style} accessible={false} />;
}

/** The sample room with its wall painted in `wall`. */
export function RoomPhoto({ wall, style }: { wall: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: wall, overflow: 'hidden' }, style]}>
      <Image source={PHOTOS.colourRoomWall} contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} />
    </View>
  );
}
