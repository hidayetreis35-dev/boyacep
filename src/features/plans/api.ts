import { msg } from '@/i18n';
import type { MyPlan } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

export async function getMyPlan(db: DbClient): Promise<MyPlan | null> {
  const { data, error } = await db.rpc('my_plan');
  if (error) throw new Error(error.message);
  return data[0] ?? null;
}

export const PLAN_FEATURES = {
  pro: {
    title: msg('BoyaCep Pro'),
    price: msg('Tek seferlik ödeme'),
    features: [msg('50 proje (ücretsizde 3)'), msg('Proje başına 100 fotoğraf (ücretsizde 20)'), msg('Gelişmiş renk karşılaştırma (yakında)'), msg('Fotoğrafla yapay zekâ incelemesi (yakında)')],
  },
  usta_pro: {
    title: msg('Usta Pro'),
    price: msg('Aylık abonelik'),
    features: [msg('Sınırsız teklif ve PDF'), msg('Müşteri listesi ve iş takvimi (yakında)'), msg('Gelir-gider takibi (yakında)'), msg('Teklifte işletme logosu (yakında)')],
  },
} as const;
