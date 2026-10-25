import { t } from '@/i18n';
import type { DbClient } from '@/lib/supabase';

import { authErrorMessage } from './api';

/**
 * What the user pasted (or the app was opened with) after asking for a sign-in email.
 * Supabase's built-in mailer sends a link, not a code, until custom SMTP lets us edit the
 * template, so we accept the 6-8 digit code, the link from the email, or the redirect back
 * to the app that carries a session.
 */
export type AuthInput =
  | { kind: 'code'; code: string }
  | { kind: 'verify'; tokenHash: string; type: 'magiclink' | 'signup' | 'email' }
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'error'; message: string };

function params(part: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of part.split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = i < 0 ? pair : pair.slice(0, i);
    const v = i < 0 ? '' : pair.slice(i + 1);
    try {
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export function parseAuthInput(raw: string): AuthInput | null {
  const input = raw.trim();
  if (/^\d{6,8}$/.test(input)) return { kind: 'code', code: input };
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) return null;

  const hashAt = input.indexOf('#');
  const beforeHash = hashAt < 0 ? input : input.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  const all = {
    ...params(queryAt < 0 ? '' : beforeHash.slice(queryAt + 1)),
    ...params(hashAt < 0 ? '' : input.slice(hashAt + 1)),
  };

  if (all.access_token && all.refresh_token) {
    return { kind: 'session', accessToken: all.access_token, refreshToken: all.refresh_token };
  }
  if (all.error_description || all.error) {
    return { kind: 'error', message: authErrorMessage(all.error_description || all.error) };
  }
  if (all.token && /\/auth\/v1\/verify$/.test(queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt))) {
    const type = all.type === 'signup' || all.type === 'email' ? all.type : 'magiclink';
    return { kind: 'verify', tokenHash: all.token, type };
  }
  return null;
}

/** Signs in with a pasted code or link. */
export async function completeSignIn(db: DbClient, email: string, raw: string): Promise<void> {
  const parsed = parseAuthInput(raw);
  if (!parsed) throw new Error(t('E-postadaki kodu ya da giriş bağlantısını yapıştırın.'));
  if (parsed.kind === 'error') throw new Error(parsed.message);
  const { error } =
    parsed.kind === 'code'
      ? await db.auth.verifyOtp({ email: email.trim().toLowerCase(), token: parsed.code, type: 'email' })
      : parsed.kind === 'verify'
        ? await db.auth.verifyOtp({ token_hash: parsed.tokenHash, type: parsed.type })
        : await db.auth.setSession({ access_token: parsed.accessToken, refresh_token: parsed.refreshToken });
  if (error) throw new Error(authErrorMessage(error.message));
}
