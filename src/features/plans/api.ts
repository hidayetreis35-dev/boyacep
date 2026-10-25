import type { MyPlan } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

export async function getMyPlan(db: DbClient): Promise<MyPlan | null> {
  const { data, error } = await db.rpc('my_plan');
  if (error) throw new Error(error.message);
  return data[0] ?? null;
}

export const PLAN_FEATURES = {
  pro: {
    title: 'BoyaCep Pro',
    price: 'Tek seferlik ödeme',
    features: ['50 proje (ücretsizde 3)', 'Proje başına 100 fotoğraf (ücretsizde 20)', 'Gelişmiş renk karşılaştırma (yakında)', 'Fotoğrafla yapay zekâ incelemesi (yakında)'],
  },
  usta_pro: {
    title: 'Usta Pro',
    price: 'Aylık abonelik',
    features: ['Sınırsız teklif ve PDF', 'Müşteri listesi ve iş takvimi (yakında)', 'Gelir-gider takibi (yakında)', 'Teklifte işletme logosu (yakında)'],
  },
} as const;
