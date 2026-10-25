import { t } from '@/i18n';
import type { ProProfileRow, VerificationStatus } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

import type { ProRecord } from './form';

export async function getMyProProfile(db: DbClient, userId: string): Promise<ProProfileRow | null> {
  const { data, error } = await db.from('pro_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveProProfile(db: DbClient, userId: string, record: ProRecord): Promise<ProProfileRow> {
  const { data, error } = await db
    .from('pro_profiles')
    .upsert({ user_id: userId, ...record }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) {
    if (error.message.includes('row-level security')) throw new Error(t('Usta profili için önce Profil sekmesinden usta rolünü aç.'));
    throw new Error(t('Profil kaydedilemedi. İnternet bağlantını kontrol et.'));
  }
  return data;
}

export async function requestVerification(db: DbClient, userId: string): Promise<void> {
  const { error } = await db.from('pro_profiles').update({ verification_status: 'pending' }).eq('user_id', userId);
  if (error) throw new Error(t('Doğrulama isteği gönderilemedi.'));
}

// ---- Admin -------------------------------------------------------------------

export async function listProProfiles(db: DbClient): Promise<ProProfileRow[]> {
  const { data, error } = await db.from('pro_profiles').select('*').order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function setVerification(db: DbClient, userId: string, status: VerificationStatus): Promise<void> {
  const { error } = await db.from('pro_profiles').update({ verification_status: status }).eq('user_id', userId);
  if (error) throw new Error(t('Kaydedilemedi.'));
}
