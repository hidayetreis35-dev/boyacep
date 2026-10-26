import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { resizeFor } from './prepare';

export type PickedPhoto = { uri: string; width: number; height: number };
export type PickResult = { ok: true; photo: PickedPhoto } | { ok: false; reason: 'cancelled' | 'permission' };

/**
 * Lets the user take or choose a photo, then shrinks it to a JPEG.
 * The photo stays on the device until something uploads it.
 */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickResult> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'permission' };

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || result.assets.length === 0) return { ok: false, reason: 'cancelled' };

  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  const resize = resizeFor(asset.width, asset.height);
  if (resize) context.resize(resize);
  const image = await context.renderAsync();
  // Re-encoding also drops location and other metadata from the original file.
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { ok: true, photo: { uri: saved.uri, width: saved.width, height: saved.height } };
}
