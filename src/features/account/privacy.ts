import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { PHOTO_BUCKET } from '@/features/photos/api';
import { msg, t } from '@/i18n';
import type { Json } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

import { writeLocalRoles } from './local-role';

/** The confirmation word for account deletion, typed by the user: the Turkish word or the one shown in their language. */
export const DELETE_CONFIRMATION = msg('SİL');

export function isDeleteConfirmed(input: string): boolean {
  const word = input.trim();
  return word.toLocaleUpperCase('tr') === DELETE_CONFIRMATION || word.toUpperCase() === t(DELETE_CONFIRMATION);
}

export function exportFileName(date = new Date()): string {
  return `boyacep-verilerim-${date.toISOString().slice(0, 10)}.json`;
}

export async function fetchMyData(db: DbClient): Promise<Json> {
  const { data, error } = await db.rpc('export_my_data_v2');
  if (error || data === null) throw new Error(t('Veriler hazırlanamadı. İnternet bağlantını kontrol et.'));
  return data;
}

/** Saves the export as a JSON file: a download on web, the share sheet on phones. */
export async function saveExport(data: Json): Promise<void> {
  const text = JSON.stringify(data, null, 2);
  const name = exportFileName();
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: name });
}

/**
 * Deletes the signed-in account: photo files first (the database cannot remove
 * storage files), then the account, which takes every database row with it.
 */
export async function deleteMyAccount(db: DbClient, userId: string): Promise<void> {
  const { data: photos, error } = await db.from('project_photos').select('storage_path').eq('owner_id', userId);
  if (error) throw new Error(t('Hesap silinemedi. İnternet bağlantını kontrol et.'));
  const paths = photos.map((p) => p.storage_path);
  for (let i = 0; i < paths.length; i += 100) {
    const removed = await db.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + 100));
    if (removed.error) throw new Error(t('Fotoğraflar silinemedi; hesap silinmedi. Tekrar dene.'));
  }
  const { error: deleteError } = await db.rpc('delete_my_account');
  if (deleteError) {
    if (deleteError.message.includes('admins must')) throw new Error(t('Yönetici hesapları önce başka bir yönetici tarafından yetkisiz bırakılmalı.'));
    throw new Error(t('Hesap silinemedi. İnternet bağlantını kontrol et.'));
  }
  await writeLocalRoles([]);
  // The session belongs to a deleted user now; drop it on this device only.
  await db.auth.signOut({ scope: 'local' });
}
