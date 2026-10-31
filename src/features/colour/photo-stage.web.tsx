import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { ActivityIndicator, Image, View } from 'react-native';

import { t } from '@/i18n';
import { radius } from '@/ui/theme';

import type { PhotoStageProps } from './photo-stage-types';

/** On the web Skia's engine (canvaskit.wasm) is downloaded the first time the studio opens a photo. */
export function PhotoStage(props: PhotoStageProps) {
  return (
    <WithSkiaWeb
      opts={{ locateFile: (file: string) => `/${file}` }}
      getComponent={() => import('./realistic-photo')}
      componentProps={props}
      fallback={
        <View style={{ width: '100%', aspectRatio: props.aspect, borderRadius: radius.lg, overflow: 'hidden' }}>
          <Image source={{ uri: props.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#FFFFFF" accessibilityLabel={t('Yükleniyor')} />
          </View>
        </View>
      }
    />
  );
}
