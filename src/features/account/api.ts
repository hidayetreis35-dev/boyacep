import type { AppRole, ProfileRow } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

export type SelectableRole = Exclude<AppRole, 'admin'>;

export const ROLE_LABEL: Record<AppRole, string> = {
  homeowner: 'Ev sahibi',
  pro: 'Usta',
  admin: 'Yönetici',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Maps Supabase auth errors to plain Turkish. */
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('expired') || m.includes('invalid')) return 'Kod hatalı veya süresi dolmuş. Yeni kod isteyin.';
  if (m.includes('rate') || m.includes('too many')) return 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.';
  if (m.includes('network') || m.includes('fetch')) return 'İnternet bağlantısı yok gibi görünüyor.';
  return 'Bir sorun oluştu. Lütfen tekrar deneyin.';
}

export async function sendEmailCode(db: DbClient, email: string): Promise<void> {
  const { error } = await db.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
  if (error) throw new Error(authErrorMessage(error.message));
}

export async function verifyEmailCode(db: DbClient, email: string, code: string): Promise<void> {
  const { error } = await db.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
  if (error) throw new Error(authErrorMessage(error.message));
}

export async function signOut(db: DbClient): Promise<void> {
  const { error } = await db.auth.signOut();
  if (error) throw new Error(authErrorMessage(error.message));
}

export interface Account {
  profile: ProfileRow;
  roles: AppRole[];
}

export async function getAccount(db: DbClient, userId: string): Promise<Account> {
  const [profile, roles] = await Promise.all([
    db.from('profiles').select('*').eq('id', userId).single(),
    db.from('user_roles').select('role').eq('user_id', userId),
  ]);
  if (profile.error) throw new Error(profile.error.message);
  if (roles.error) throw new Error(roles.error.message);
  return { profile: profile.data, roles: roles.data.map((r) => r.role) };
}

/** Grants the given roles (idempotent) and makes the first one active if none is. */
export async function enableRoles(db: DbClient, userId: string, roles: SelectableRole[], makeActive?: SelectableRole) {
  if (roles.length > 0) {
    const { error } = await db
      .from('user_roles')
      .upsert(roles.map((role) => ({ user_id: userId, role })), { onConflict: 'user_id,role', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  if (makeActive) await setActiveRole(db, userId, makeActive);
}

export async function disableRole(db: DbClient, userId: string, role: SelectableRole): Promise<void> {
  const { error } = await db.from('user_roles').delete().eq('user_id', userId).eq('role', role);
  if (error) throw new Error(error.message);
}

export async function setActiveRole(db: DbClient, userId: string, role: AppRole): Promise<void> {
  const { error } = await db.from('profiles').update({ active_role: role }).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function updateDisplayName(db: DbClient, userId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length > 80) throw new Error('İsim en fazla 80 karakter olabilir.');
  const { error } = await db.from('profiles').update({ display_name: trimmed || null }).eq('id', userId);
  if (error) throw new Error(error.message);
}
