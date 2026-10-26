import { t } from '@/i18n';
import type { HomeLogRow } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

export type HomeLogDraft = Omit<HomeLogRow, 'id' | 'owner_id' | 'created_at' | 'updated_at'>;

/** True when the live database does not have the home log yet. */
export function isNotEnabled(message: string): boolean {
  return message.includes('home_log') && (message.includes('schema cache') || message.includes('does not exist'));
}

function writeError(message: string): Error {
  if (isNotEnabled(message)) return new Error(t('Ev Hafızası sunucuda henüz açılmadı.'));
  if (message.includes('home log limit reached')) return new Error(t('Ev Hafızası’nda en fazla 500 kayıt olabilir.'));
  return new Error(t('Kaydedilemedi. İnternet bağlantını kontrol et.'));
}

export async function listHomeLog(db: DbClient): Promise<HomeLogRow[]> {
  const { data, error } = await db.from('home_log').select('*').order('painted_on', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function addHomeLog(db: DbClient, drafts: HomeLogDraft[]): Promise<void> {
  if (drafts.length === 0) return;
  const { error } = await db.from('home_log').insert(drafts);
  if (error) throw writeError(error.message);
}

export async function deleteHomeLog(db: DbClient, id: string): Promise<void> {
  const { error } = await db.from('home_log').delete().eq('id', id);
  if (error) throw new Error(t('Kayıt silinemedi. İnternet bağlantını kontrol et.'));
}
