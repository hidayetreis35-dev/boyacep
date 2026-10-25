import { t } from '@/i18n';

/** Longest side of uploaded photos. Enough for the colour preview, small enough for mobile data. */
export const MAX_PHOTO_SIDE = 1600;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** The resize to apply, or null when the photo is already small enough. */
export function resizeFor(width: number, height: number, maxSide = MAX_PHOTO_SIDE): { width: number } | { height: number } | null {
  if (width <= maxSide && height <= maxSide) return null;
  return width >= height ? { width: maxSide } : { height: maxSide };
}

/** <owner>/<project>/<photo>.jpg — the layout storage policies check. */
export function photoPath(ownerId: string, projectId: string, photoId: string): string {
  return `${ownerId}/${projectId}/${photoId}.jpg`;
}

export function photoErrorMessage(message: string): string {
  if (message.includes('photo limit reached')) return t('Bu projede en fazla 20 fotoğraf olabilir. Yer açmak için eski bir fotoğrafı sil.');
  if (message.toLowerCase().includes('exceeded the maximum allowed size') || message.includes('Payload too large')) {
    return t('Fotoğraf çok büyük (en fazla 10 MB).');
  }
  if (message.includes('mime type')) return t('Sadece JPEG, PNG veya WebP fotoğraf yüklenebilir.');
  if (message.includes('row-level security')) return t('Bu projeye fotoğraf ekleme yetkin yok.');
  return t('Fotoğraf yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.');
}
