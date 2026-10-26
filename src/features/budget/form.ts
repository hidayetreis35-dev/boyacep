import type { ExpenseCategory } from '@/engine';
import { getLocale, msg } from '@/i18n';
import { parseDecimal } from '@/lib/number';

import type { ExpenseDraft } from './api';

export interface ExpenseForm {
  category: ExpenseCategory;
  label: string;
  amount: string;
  /** As typed: 20.10.2026, 20/10/2026 or 2026-10-20. */
  date: string;
  store: string;
}

export type ExpenseErrors = Partial<Record<'label' | 'amount' | 'date' | 'store', string>>;

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

/** Money as people type it: 1850,50 · 1.850,50 · 12.000 (Turkish) or 1,850.50 (English). */
export function parseAmount(text: string): number {
  const s = text.trim().replace(/[\s₺]/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) return Number(s.replace(/,/g, ''));
  return parseDecimal(s);
}

export function emptyExpenseForm(category: ExpenseCategory = 'paint', now = new Date()): ExpenseForm {
  return { category, label: '', amount: '', date: dayText(todayIso(now)), store: '' };
}

export function toExpenseDraft(form: ExpenseForm, now = new Date()): { ok: true; draft: ExpenseDraft } | { ok: false; errors: ExpenseErrors } {
  const errors: ExpenseErrors = {};
  const label = form.label.trim();
  if (!label) errors.label = msg('Ne aldığını ya da ödediğini yaz.');
  else if (label.length > 120) errors.label = msg('En fazla 120 harf.');

  const amount = parseAmount(form.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = msg('Tutarı sıfırdan büyük bir sayı olarak yaz.');
  else if (amount > 100_000_000) errors.amount = msg('Tutar çok büyük.');

  const day = parseDay(form.date);
  if (!day) errors.date = msg('Tarihi GG.AA.YYYY olarak yaz.');
  else if (day > todayIso(now)) errors.date = msg('İleri bir tarih olamaz.');
  else if (day < '2000-01-01') errors.date = msg('Tarih 2000 yılından önce olamaz.');

  const store = form.store.trim();
  if (store.length > 80) errors.store = msg('En fazla 80 harf.');

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    draft: { category: form.category, label, amount: Math.round(amount * 100) / 100, spent_on: day!, store_name: store || null },
  };
}
