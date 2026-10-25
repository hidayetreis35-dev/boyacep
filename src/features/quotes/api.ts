import type { ProCard, QuoteItemRow, QuoteRow, QuoteStatus } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

import type { ItemRecord, QuoteRecord } from './form';

export type QuoteWithItems = {
  quote: QuoteRow;
  items: QuoteItemRow[];
  pro: ProCard | null;
};

function quoteErrorMessage(message: string): string {
  if (message.includes('cannot be edited') || message.includes('items of a sent quote')) {
    return 'Gönderilmiş teklif değiştirilemez. Değiştirmek için önce geri çek.';
  }
  if (message.includes('cannot move')) return 'Teklifin durumu bu şekilde değiştirilemez.';
  if (message.includes('row-level security')) return 'Teklif yazmak için usta rolünün açık olması gerekir.';
  return 'Teklif kaydedilemedi. İnternet bağlantını kontrol et.';
}

export async function listMyQuotes(db: DbClient, userId: string): Promise<QuoteRow[]> {
  const { data, error } = await db.from('quotes').select('*').eq('pro_id', userId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

/** Quotes painters sent for one of the homeowner's projects (never drafts; RLS hides them). */
export async function listReceivedQuotes(db: DbClient, projectId: string): Promise<QuoteRow[]> {
  const { data, error } = await db
    .from('quotes')
    .select('*')
    .eq('project_id', projectId)
    .neq('status', 'draft')
    .order('sent_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getQuote(db: DbClient, id: string): Promise<QuoteWithItems> {
  const { data: quote, error } = await db.from('quotes').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  const [items, pro] = await Promise.all([
    db.from('quote_items').select('*').eq('quote_id', id).order('sort_order'),
    // The card leaves out the painter's phone unless they chose to show it.
    db.rpc('pro_card', { pro: quote.pro_id }).maybeSingle(),
  ]);
  if (items.error) throw new Error(items.error.message);
  return { quote, items: items.data, pro: pro.data ?? null };
}

export async function createQuote(db: DbClient, args: { title: string; projectId?: string | null }): Promise<QuoteRow> {
  const { data, error } = await db
    .from('quotes')
    .insert({ title: args.title, project_id: args.projectId ?? null })
    .select('*')
    .single();
  if (error) throw new Error(quoteErrorMessage(error.message));
  return data;
}

/**
 * Saves a draft and replaces its items. Not atomic: if writing items fails the
 * draft may lose them, so the editor keeps the form and asks to save again.
 */
export async function saveQuote(db: DbClient, id: string, quote: QuoteRecord, items: ItemRecord[]): Promise<void> {
  const updated = await db.from('quotes').update(quote).eq('id', id);
  if (updated.error) throw new Error(quoteErrorMessage(updated.error.message));
  const removed = await db.from('quote_items').delete().eq('quote_id', id);
  if (removed.error) throw new Error(quoteErrorMessage(removed.error.message));
  if (items.length > 0) {
    const inserted = await db.from('quote_items').insert(items.map((i) => ({ ...i, quote_id: id })));
    if (inserted.error) throw new Error(quoteErrorMessage(inserted.error.message));
  }
}

export async function setQuoteStatus(db: DbClient, id: string, status: QuoteStatus): Promise<void> {
  const { error } = await db.from('quotes').update({ status }).eq('id', id);
  if (error) throw new Error(quoteErrorMessage(error.message));
}

export async function deleteQuote(db: DbClient, id: string): Promise<void> {
  const { error } = await db.from('quotes').delete().eq('id', id);
  if (error) throw new Error('Teklif silinemedi.');
}

export async function respondToQuote(db: DbClient, id: string, accept: boolean): Promise<void> {
  const { error } = await db.rpc('respond_to_quote', { quote: id, accept });
  if (error) {
    if (error.message.includes('not waiting')) throw new Error('Bu teklif artık yanıt beklemiyor.');
    throw new Error('Yanıt gönderilemedi. İnternet bağlantını kontrol et.');
  }
}

export const quoteKeys = {
  mine: (userId?: string) => ['quotes', 'mine', userId] as const,
  received: (projectId: string) => ['quotes', 'received', projectId] as const,
  one: (id: string) => ['quotes', 'one', id] as const,
};

