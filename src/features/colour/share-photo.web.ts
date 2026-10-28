import { t } from '@/i18n';

export const SHARED_PHOTO_NAME = 'boyacep-oda.jpg';

/** The browser's share sheet where it can share files (most phones); a download everywhere else. */
export async function sharePaintedPhoto(jpeg: Uint8Array): Promise<boolean> {
  const file = new File([jpeg as Uint8Array<ArrayBuffer>], SHARED_PHOTO_NAME, { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: t('Boyanmış oda') });
    } catch (e) {
      // Closing the share sheet is not an error.
      if ((e as Error).name !== 'AbortError') throw e;
    }
    return true;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = SHARED_PHOTO_NAME;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}
