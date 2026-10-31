import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { t } from '@/i18n';

export const SHARED_PHOTO_NAME = 'boyacep-oda.jpg';

/** Opens the phone's share sheet with the painted photo. False when this phone cannot share files. */
export async function sharePaintedPhoto(jpeg: Uint8Array): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  // One file in the app's cache, replaced each time: shared photos do not pile up.
  const file = new File(Paths.cache, SHARED_PHOTO_NAME);
  file.create({ overwrite: true });
  await file.write(jpeg);
  await Sharing.shareAsync(file.uri, { mimeType: 'image/jpeg', dialogTitle: t('Boyanmış odayı paylaş'), UTI: 'public.jpeg' });
  return true;
}
