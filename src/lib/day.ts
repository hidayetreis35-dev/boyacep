import { getLocale } from '@/i18n';

const pad = (n: number) => String(n).padStart(2, '0');

/** The local calendar day as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The day as the user types it in the form. */
export function dayText(iso: string, locale = getLocale()): string {
  const [y, m, d] = iso.split('-');
  return locale === 'en' ? `${d}/${m}/${y}` : `${d}.${m}.${y}`;
}

/** A real calendar day as YYYY-MM-DD, or null. */
export function parseDay(text: string): string | null {
  const s = text.trim();
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  const local = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (local) [d, m, y] = [Number(local[1]), Number(local[2]), Number(local[3])];
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
