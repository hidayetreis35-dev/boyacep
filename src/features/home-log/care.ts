import { fold } from '@/features/colour/catalogue';
import { msg, t } from '@/i18n';
import type { HomeLogRow } from '@/lib/database.types';

/** Whole calendar months from one YYYY-MM-DD day to a later one; 0 if it is not later. */
export function monthsSince(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.max(0, (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0));
}

/** "3 ay önce boyandı", "2 yıl önce boyandı": whole months or years, rounded down. */
export function paintedAgo(months: number): string {
  if (months < 1) return t('Bu ay boyandı');
  if (months < 12) return months === 1 ? t('1 ay önce boyandı') : t('{months} ay önce boyandı', { months });
  const years = Math.floor(months / 12);
  return years === 1 ? t('1 yıl önce boyandı') : t('{years} yıl önce boyandı', { years });
}

export type CareRule = { years: number; reason: string };

// Folded to plain letters (see `fold`), in Turkish and English, as people type places.
const OUTSIDE = ['dis cephe', 'cephe', 'balkon', 'bahce', 'teras', 'exterior', 'facade', 'outside', 'balcony', 'garden', 'terrace'];
const DAMP = ['banyo', 'tuvalet', 'lavabo', 'wc', 'bathroom', 'toilet', 'shower'];
const BUSY = ['mutfak', 'koridor', 'antre', 'hol', 'cocuk', 'merdiven', 'giris', 'kitchen', 'hall', 'corridor', 'kid', 'child', 'stair', 'entrance'];

/**
 * How often a place is usually repainted. Rough intervals decorators give,
 * shown as an estimate: wear, light and damp change them.
 */
export function careRule(place: string): CareRule {
  const p = fold(place);
  const has = (words: string[]) => words.some((w) => p.includes(w));
  if (has(OUTSIDE)) return { years: 8, reason: msg('Dış cephe genelde 7–10 yılda bir yenilenir.') };
  if (has(DAMP)) return { years: 4, reason: msg('Nemli yerler genelde 3–5 yılda bir yenilenir.') };
  if (has(BUSY)) return { years: 4, reason: msg('Sık kullanılan yerler genelde 3–5 yılda bir yenilenir.') };
  return { years: 6, reason: msg('İç duvarlar genelde 5–7 yılda bir yenilenir.') };
}

export type CareReminder = { entry: HomeLogRow; months: number; rule: CareRule; status: 'due' | 'soon' };

/** Within this many months of the usual interval a place counts as "soon". */
export const SOON_MONTHS = 6;

/**
 * Places that may be due a fresh coat, most overdue first. Only the latest
 * entry for a place counts: a wall painted again last year is not due.
 */
export function careReminders(rows: HomeLogRow[], today: string): CareReminder[] {
  const latest = new Map<string, HomeLogRow>();
  for (const row of rows) {
    const key = fold(row.place.trim());
    const seen = latest.get(key);
    if (!seen || row.painted_on > seen.painted_on) latest.set(key, row);
  }
  const out: (CareReminder & { over: number })[] = [];
  for (const entry of latest.values()) {
    const months = monthsSince(entry.painted_on, today);
    const rule = careRule(entry.place);
    const over = months - rule.years * 12;
    if (over >= 0) out.push({ entry, months, rule, status: 'due', over });
    else if (over >= -SOON_MONTHS) out.push({ entry, months, rule, status: 'soon', over });
  }
  return out.sort((a, b) => b.over - a.over).map(({ over: _, ...r }) => r);
}
