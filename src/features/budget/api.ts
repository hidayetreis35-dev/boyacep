import { randomUUID } from 'expo-crypto';

import { photoPath } from '@/features/photos/prepare';
import type { PickedPhoto } from '@/features/photos/picker';
import { t } from '@/i18n';
import type { ProjectExpenseRow } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

export const RECEIPT_BUCKET = 'project-receipts';

export type ExpenseDraft = Pick<ProjectExpenseRow, 'category' | 'label' | 'amount' | 'spent_on' | 'store_name'>;

/** An expense with a short-lived link to its receipt photo (the bucket is private). */
export type ExpenseWithReceipt = ProjectExpenseRow & { receiptUrl: string | null };

/** True when the live database does not have the expenses table yet. */
export function isNotEnabled(message: string): boolean {
  return message.includes('project_expenses') && (message.includes('schema cache') || message.includes('does not exist'));
}

export function expenseErrorMessage(message: string): string {
  if (isNotEnabled(message)) return t('Akıllı Bütçe sunucuda henüz açılmadı.');
  if (message.includes('expense limit reached')) return t('Bu projede en fazla 300 harcama olabilir.');
  if (message.includes('row-level security')) return t('Bu projeye harcama ekleme yetkin yok.');
  return t('Harcama kaydedilemedi. İnternet bağlantını kontrol et.');
}

export async function listExpenses(db: DbClient, projectId: string): Promise<ExpenseWithReceipt[]> {
  const { data, error } = await db
    .from('project_expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('spent_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const paths = data.flatMap((e) => (e.receipt_path ? [e.receipt_path] : []));
  if (paths.length === 0) return data.map((e) => ({ ...e, receiptUrl: null }));
  const { data: signed, error: signError } = await db.storage.from(RECEIPT_BUCKET).createSignedUrls(paths, 60 * 60);
  // The list is still useful without receipt links.
  const urls = new Map(signError ? [] : signed.map((s) => [s.path, s.signedUrl]));
  return data.map((e) => ({ ...e, receiptUrl: e.receipt_path ? (urls.get(e.receipt_path) ?? null) : null }));
}

/** Every expense of the signed-in user (RLS keeps it to their own projects), for "Ev Bütçem". */
export async function listAllExpenses(db: DbClient): Promise<Pick<ProjectExpenseRow, 'id' | 'project_id' | 'category' | 'amount'>[]> {
  const { data, error } = await db.from('project_expenses').select('id, project_id, category, amount').limit(5000);
  if (error) throw new Error(error.message);
  return data;
}

/** Uploads the receipt first (if any), then records the expense; removes the file again if the record fails. */
export async function addExpense(
  db: DbClient,
  args: { ownerId: string; projectId: string; draft: ExpenseDraft; receipt?: PickedPhoto | null },
): Promise<void> {
  const id = randomUUID();
  let path: string | null = null;
  if (args.receipt) {
    path = photoPath(args.ownerId, args.projectId, id);
    const body = await (await fetch(args.receipt.uri)).arrayBuffer();
    const upload = await db.storage.from(RECEIPT_BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: false });
    if (upload.error) throw new Error(t('Fiş fotoğrafı yüklenemedi. Fişsiz kaydedebilir ya da tekrar deneyebilirsin.'));
  }
  const { error } = await db.from('project_expenses').insert({ id, project_id: args.projectId, receipt_path: path, ...args.draft });
  if (error) {
    if (path) await db.storage.from(RECEIPT_BUCKET).remove([path]);
    throw new Error(expenseErrorMessage(error.message));
  }
}

export async function deleteExpense(db: DbClient, expense: Pick<ProjectExpenseRow, 'id' | 'receipt_path'>): Promise<void> {
  const { error } = await db.from('project_expenses').delete().eq('id', expense.id);
  if (error) throw new Error(t('Harcama silinemedi. İnternet bağlantını kontrol et.'));
  // A leftover file is private and harmless; the row is what the user sees.
  if (expense.receipt_path) await db.storage.from(RECEIPT_BUCKET).remove([expense.receipt_path]);
}

/**
 * Receipt files are not removed by the database cascade. Removes them for one
 * project, or for all of the user's projects. Does nothing before the feature is enabled.
 */
export async function deleteReceipts(db: DbClient, scope: { projectId: string } | { ownerId: string }): Promise<void> {
  let query = db.from('project_expenses').select('receipt_path').not('receipt_path', 'is', null);
  query = 'projectId' in scope ? query.eq('project_id', scope.projectId) : query.eq('owner_id', scope.ownerId);
  const { data, error } = await query;
  if (error) {
    if (isNotEnabled(error.message)) return;
    throw new Error(error.message);
  }
  const paths = data.flatMap((e) => (e.receipt_path ? [e.receipt_path] : []));
  for (let i = 0; i < paths.length; i += 100) {
    const removed = await db.storage.from(RECEIPT_BUCKET).remove(paths.slice(i, i + 100));
    if (removed.error) throw new Error(t('Fiş fotoğrafları silinemedi.'));
  }
}
