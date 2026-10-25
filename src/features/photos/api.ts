import { randomUUID } from 'expo-crypto';

import { parseSurfaces } from '@/features/colour/outline';
import type { PhotoSurface, ProjectPhotoRow } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

import type { PickedPhoto } from './picker';
import { MAX_PHOTO_BYTES, photoErrorMessage, photoPath } from './prepare';

export const PHOTO_BUCKET = 'project-photos';

/** A photo with its outlined surfaces parsed from wall_outline. */
export type ProjectPhoto = Omit<ProjectPhotoRow, 'wall_outline'> & { surfaces: PhotoSurface[]; url: string | null };

/** The project's photos with short-lived signed links (the bucket is private). */
export async function listProjectPhotos(db: DbClient, projectId: string): Promise<ProjectPhoto[]> {
  const { data, error } = await db
    .from('project_photos')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (data.length === 0) return [];

  const { data: signed, error: signError } = await db.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(data.map((p) => p.storage_path), 60 * 60);
  if (signError) throw new Error(signError.message);
  const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return data.map(({ wall_outline, ...p }) => ({ ...p, surfaces: parseSurfaces(wall_outline), url: urls.get(p.storage_path) ?? null }));
}

export async function getProjectPhoto(db: DbClient, photoId: string): Promise<ProjectPhoto> {
  const { data, error } = await db.from('project_photos').select('*').eq('id', photoId).single();
  if (error) throw new Error(error.message);
  const { data: signed, error: signError } = await db.storage.from(PHOTO_BUCKET).createSignedUrl(data.storage_path, 60 * 60);
  if (signError) throw new Error(signError.message);
  const { wall_outline, ...row } = data;
  return { ...row, surfaces: parseSurfaces(wall_outline), url: signed.signedUrl };
}

/** Uploads the file first, then records it; removes the file again if the record fails. */
export async function uploadProjectPhoto(
  db: DbClient,
  args: { ownerId: string; projectId: string; roomId?: string | null; photo: PickedPhoto },
): Promise<ProjectPhotoRow> {
  const id = randomUUID();
  const path = photoPath(args.ownerId, args.projectId, id);
  const body = await (await fetch(args.photo.uri)).arrayBuffer();
  if (body.byteLength > MAX_PHOTO_BYTES) throw new Error(photoErrorMessage('exceeded the maximum allowed size'));

  const upload = await db.storage.from(PHOTO_BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (upload.error) throw new Error(photoErrorMessage(upload.error.message));

  const { data, error } = await db
    .from('project_photos')
    .insert({
      id,
      project_id: args.projectId,
      room_id: args.roomId ?? null,
      storage_path: path,
      width: args.photo.width,
      height: args.photo.height,
      byte_size: body.byteLength,
    })
    .select('*')
    .single();
  if (error) {
    await db.storage.from(PHOTO_BUCKET).remove([path]);
    throw new Error(photoErrorMessage(error.message));
  }
  return data;
}

export async function saveSurfaces(db: DbClient, photoId: string, surfaces: PhotoSurface[]): Promise<void> {
  const { error } = await db
    .from('project_photos')
    .update({ wall_outline: surfaces.length > 0 ? surfaces : null })
    .eq('id', photoId);
  if (error) throw new Error('Çizim kaydedilemedi. İnternet bağlantını kontrol et.');
}

/** Removes the file, then the record. A left-over record without a file is harmless; the reverse would leak storage. */
export async function deleteProjectPhoto(db: DbClient, photo: Pick<ProjectPhotoRow, 'id' | 'storage_path'>): Promise<void> {
  const removed = await db.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  if (removed.error) throw new Error('Fotoğraf silinemedi.');
  const { error } = await db.from('project_photos').delete().eq('id', photo.id);
  if (error) throw new Error('Fotoğraf silinemedi.');
}

/** Removes every photo file of a project; called before the project itself is deleted. */
export async function deleteAllProjectPhotos(db: DbClient, projectId: string): Promise<void> {
  const { data, error } = await db.from('project_photos').select('storage_path').eq('project_id', projectId);
  if (error) throw new Error(error.message);
  if (data.length === 0) return;
  const removed = await db.storage.from(PHOTO_BUCKET).remove(data.map((p) => p.storage_path));
  if (removed.error) throw new Error('Proje fotoğrafları silinemedi.');
}
