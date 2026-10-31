import { msg, t } from '@/i18n';
import type { AppRole, ProfileRow } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

export type SelectableRole = Exclude<AppRole, 'admin'>;

export const ROLE_LABEL: Record<AppRole, string> = {
  homeowner: msg('Ev sahibi'),
  pro: msg('Usta'),
  admin: msg('Yönetici'),
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Seconds Supabase asks us to wait ("…only request this after 37 seconds"), if any. */
export function retryAfterSeconds(message: string): number | null {
  const m = /after (\d+) seconds?/i.exec(message);
  return m ? Number(m[1]) : null;
}

/** Maps Supabase auth errors to plain Turkish. */
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  const wait = retryAfterSeconds(message);
  if (wait !== null) return t('Güvenlik için yeni e-postayı {seconds} saniye sonra isteyebilirsin.', { seconds: wait });
  // Project-wide hourly limit of the mail sender, not this user's fault.
  if (m.includes('email rate limit')) return t('Şu an çok fazla giriş e-postası gönderildi. Biraz sonra tekrar dene; daha önce gelen e-postayı da kullanabilirsin.');
  if (m.includes('rate') || m.includes('too many')) return t('Çok fazla deneme oldu. Birkaç dakika sonra tekrar dener misin?');
  if (m.includes('email address') || m.includes('invalid format')) return t('Geçerli bir e-posta adresi yazın.');
  if (m.includes('expired') || m.includes('invalid')) return t('Bu kod çalışmadı ya da süresi geçti. Yeni bir kod ister misin?');
  if (m.includes('network') || m.includes('fetch')) return t('İnternet bağlantısı yok gibi görünüyor.');
  return t('Bir şeyler ters gitti. Bir daha dener misin?');
}

/** A sign-in email that was refused because one was sent moments ago. */
export class TooSoonError extends Error {
  constructor(
    message: string,
    readonly seconds: number,
  ) {
    super(message);
  }
}

/** redirectTo is where the link in the email sends the user back to (the app's own URL). */
export async function sendEmailCode(db: DbClient, email: string, redirectTo?: string): Promise<void> {
  const { error } = await db.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
  });
  if (error) {
    const wait = retryAfterSeconds(error.message);
    throw wait !== null ? new TooSoonError(authErrorMessage(error.message), wait) : new Error(authErrorMessage(error.message));
  }
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
  if (trimmed.length > 80) throw new Error(t('İsim en fazla 80 karakter olabilir.'));
  const { error } = await db.from('profiles').update({ display_name: trimmed || null }).eq('id', userId);
  if (error) throw new Error(error.message);
}
