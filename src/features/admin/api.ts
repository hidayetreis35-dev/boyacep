import { useQuery } from '@tanstack/react-query';

import { useAccount, useSession } from '@/features/account/session';
import { t } from '@/i18n';
import type { AdminStats, ClientErrorRow, GuideArticleRow, GuideCategory } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

/** True only for accounts with the admin role. The database enforces the same rule with RLS. */
export function useIsAdmin() {
  const account = useAccount();
  return { ...account, isAdmin: !!account.data?.roles.includes('admin') };
}

export async function fetchAdminStats(db: DbClient): Promise<AdminStats | null> {
  const { data, error } = await db.rpc('admin_stats');
  if (error) throw new Error(error.message);
  return data[0] ?? null;
}

export type AdminGuideItem = Pick<GuideArticleRow, 'id' | 'slug' | 'category' | 'title' | 'status' | 'updated_at'>;

/** Every guide, drafts included. RLS returns drafts to admins only. */
export async function listAllGuides(db: DbClient): Promise<AdminGuideItem[]> {
  const { data, error } = await db
    .from('guide_articles')
    .select('id, slug, category, title, status, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getGuideById(db: DbClient, id: string): Promise<GuideArticleRow> {
  const { data, error } = await db.from('guide_articles').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

export type GuideForm = {
  slug: string;
  category: GuideCategory;
  title: string;
  summary: string;
  body: string;
  readingMinutes: string;
  published: boolean;
};

export const EMPTY_GUIDE_FORM: GuideForm = {
  slug: '',
  category: 'walls',
  title: '',
  summary: '',
  body: '',
  readingMinutes: '3',
  published: false,
};

export function guideToForm(g: GuideArticleRow): GuideForm {
  return {
    slug: g.slug,
    category: g.category,
    title: g.title,
    summary: g.summary,
    body: g.body,
    readingMinutes: String(g.reading_minutes),
    published: g.status === 'published',
  };
}

const TR_MAP: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i̇: 'i', ö: 'o', ş: 's', ü: 'u' };

/** "Tavan Boyama İpuçları" → "tavan-boyama-ipuclari" */
export function slugify(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]|i̇/g, (c) => TR_MAP[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

export type GuideFormErrors = Partial<Record<'slug' | 'title' | 'summary' | 'body' | 'readingMinutes', string>>;

export type GuideRecord = {
  slug: string;
  category: GuideCategory;
  title: string;
  summary: string;
  body: string;
  reading_minutes: number;
  status: 'draft' | 'published';
};

/** Mirrors the database checks so the editor can explain problems before saving. */
export function validateGuideForm(form: GuideForm): { record: GuideRecord } | { errors: GuideFormErrors } {
  const errors: GuideFormErrors = {};
  const slug = form.slug.trim();
  const title = form.title.trim();
  const minutes = Number(form.readingMinutes.trim());

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    errors.slug = t('Sadece küçük harf, rakam ve tire kullan (ör. tavan-boyama).');
  }
  if (title.length === 0) errors.title = t('Başlık gerekli.');
  else if (title.length > 140) errors.title = t('Başlık en fazla 140 karakter olabilir.');
  if (form.summary.length > 300) errors.summary = t('Özet en fazla 300 karakter olabilir.');
  if (form.body.length > 20000) errors.body = t('Yazı en fazla 20.000 karakter olabilir.');
  if (form.published && form.body.trim().length === 0) errors.body = t('Boş bir yazı yayınlanamaz.');
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) errors.readingMinutes = t('1 ile 60 arasında bir sayı gir.');

  if (Object.keys(errors).length > 0) return { errors };
  return {
    record: {
      slug,
      category: form.category,
      title,
      summary: form.summary.trim(),
      body: form.body.trim(),
      reading_minutes: minutes,
      status: form.published ? 'published' : 'draft',
    },
  };
}

function saveErrorMessage(message: string): string {
  if (message.includes('duplicate key') || message.includes('guide_articles_slug_key')) {
    return t('Bu adres (slug) başka bir yazıda kullanılıyor. Farklı bir adres yaz.');
  }
  if (message.includes('row-level security')) return t('Bu işlem için yönetici yetkisi gerekiyor.');
  return t('Kaydedilemedi. İnternet bağlantını kontrol edip tekrar dene.');
}

/**
 * Creates or updates a guide. The first publish stamps published_at; later edits keep it,
 * and taking a guide back to draft clears it.
 */
export async function saveGuide(
  db: DbClient,
  record: GuideRecord,
  existing?: Pick<GuideArticleRow, 'id' | 'published_at'>,
): Promise<GuideArticleRow> {
  const published_at =
    record.status === 'published' ? (existing?.published_at ?? new Date().toISOString()) : null;
  const query = existing
    ? db.from('guide_articles').update({ ...record, published_at }).eq('id', existing.id)
    : db.from('guide_articles').insert({ ...record, published_at });
  const { data, error } = await query.select('*').single();
  if (error) throw new Error(saveErrorMessage(error.message));
  return data;
}

export async function deleteGuide(db: DbClient, id: string): Promise<void> {
  const { error } = await db.from('guide_articles').delete().eq('id', id);
  if (error) throw new Error(saveErrorMessage(error.message));
}

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  guides: ['admin', 'guides'] as const,
  guide: (id: string) => ['admin', 'guides', id] as const,
};

export function useAdminStats(enabled: boolean) {
  const { db } = useSession();
  return useQuery({ queryKey: adminKeys.stats, enabled: !!db && enabled, queryFn: () => fetchAdminStats(db!) });
}

export function useAdminGuides(enabled: boolean) {
  const { db } = useSession();
  return useQuery({ queryKey: adminKeys.guides, enabled: !!db && enabled, queryFn: () => listAllGuides(db!) });
}

export function useAdminGuide(id: string | undefined, enabled: boolean) {
  const { db } = useSession();
  return useQuery({
    queryKey: adminKeys.guide(id ?? ''),
    enabled: !!db && !!id && enabled,
    queryFn: () => getGuideById(db!, id!),
  });
}

export async function listRecentErrors(db: DbClient): Promise<ClientErrorRow[]> {
  const { data, error } = await db.from('client_errors').select('*').order('created_at', { ascending: false }).limit(20);
  if (error) throw new Error(error.message);
  return data;
}

export function useRecentErrors(enabled: boolean) {
  const { db } = useSession();
  return useQuery({ queryKey: ['admin', 'errors'], enabled: !!db && enabled, queryFn: () => listRecentErrors(db!) });
}
