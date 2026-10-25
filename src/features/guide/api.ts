import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';
import { msg, t } from '@/i18n';
import type { GuideArticleRow, GuideCategory } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

export const GUIDE_CATEGORIES: { value: GuideCategory; label: string }[] = [
  { value: 'preparation', label: msg('Boya öncesi hazırlık') },
  { value: 'primer', label: msg('Astar uygulaması') },
  { value: 'filler_sanding', label: msg('Macun ve zımpara') },
  { value: 'ceiling', label: msg('Tavan boyama') },
  { value: 'walls', label: msg('Duvar boyama') },
  { value: 'tools', label: msg('Rulo ve fırça kullanımı') },
  { value: 'mistakes', label: msg('Boya hataları') },
  { value: 'exterior', label: msg('Dış cephe uygulamaları') },
  { value: 'materials', label: msg('Malzeme seçimi') },
];

export const categoryLabel = (c: GuideCategory) => t(GUIDE_CATEGORIES.find((x) => x.value === c)?.label ?? c);

export type GuideListItem = Pick<GuideArticleRow, 'id' | 'slug' | 'category' | 'title' | 'summary' | 'reading_minutes' | 'status' | 'sort_order'>;

const LIST_COLUMNS = 'id, slug, category, title, summary, reading_minutes, status, sort_order';

/** Published guides for readers. RLS also hides drafts from non-admins. */
export async function listPublishedGuides(db: DbClient): Promise<GuideListItem[]> {
  const { data, error } = await db
    .from('guide_articles')
    .select(LIST_COLUMNS)
    .eq('status', 'published')
    .order('category')
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data;
}

export async function getGuide(db: DbClient, slug: string): Promise<GuideArticleRow> {
  const { data, error } = await db.from('guide_articles').select('*').eq('slug', slug).single();
  if (error) throw new Error(error.message);
  return data;
}

export function useGuides() {
  const { db } = useSession();
  return useQuery({ queryKey: ['guides'], enabled: !!db, queryFn: () => listPublishedGuides(db!) });
}

export function useGuide(slug: string) {
  const { db } = useSession();
  return useQuery({ queryKey: ['guides', slug], enabled: !!db && !!slug, queryFn: () => getGuide(db!, slug) });
}
