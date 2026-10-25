import RealisticPhoto from './realistic-photo';
import type { PhotoStageProps } from './photo-stage-types';

/** The photo with painted surfaces. On phones Skia is built into the app. */
export function PhotoStage(props: PhotoStageProps) {
  return <RealisticPhoto {...props} />;
}
