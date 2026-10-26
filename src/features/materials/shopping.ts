import AsyncStorage from '@react-native-async-storage/async-storage';

import { quantityText } from '@/features/calculator/labels';
import { t } from '@/i18n';
import type { ProjectMaterialRow } from '@/lib/database.types';
import { formatMoney } from '@/lib/number';

export type ShoppingItem = Pick<ProjectMaterialRow, 'id' | 'name' | 'quantity' | 'unit' | 'unit_price' | 'price_source'>;

/** Items worth buying: anything with a quantity. */
export function shoppingItems<T extends ShoppingItem>(items: T[]): T[] {
  return items.filter((i) => Number(i.quantity) > 0);
}

/** The list as plain text for WhatsApp or any messenger. Already bought items are left out. */
export function shoppingText(title: string, items: ShoppingItem[], bought: ReadonlySet<string>): string {
  const toBuy = shoppingItems(items).filter((i) => !bought.has(i.id));
  const lines = toBuy.map((i) => {
    const line = `• ${t(i.name)}: ${quantityText(Number(i.quantity), i.unit)}`;
    if (i.unit_price === null) return line;
    const total = formatMoney(Number(i.quantity) * Number(i.unit_price));
    return i.price_source === 'store' ? `${line} (${total})` : `${line} (≈ ${total})`;
  });
  const priced = toBuy.filter((i) => i.unit_price !== null);
  const sum = priced.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const parts = [t('BoyaCep alışveriş listesi: {title}', { title }), '', ...(lines.length ? lines : [t('Her şey alındı.')])];
  if (priced.length > 0) {
    parts.push('', t('Fiyatı girilen {count} kalem: yaklaşık {amount}', { count: priced.length, amount: formatMoney(sum) }));
  }
  return parts.join('\n');
}

/** Opens WhatsApp (app or web) with the text ready to send; the user picks the chat. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// Ticks are kept on this phone only: shopping happens on one device, and nothing is sent anywhere.
const key = (projectId: string) => `boyacep.shopping.${projectId}.v1`;

export async function loadBought(projectId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key(projectId));
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export async function saveBought(projectId: string, bought: ReadonlySet<string>): Promise<void> {
  try {
    if (bought.size === 0) await AsyncStorage.removeItem(key(projectId));
    else await AsyncStorage.setItem(key(projectId), JSON.stringify([...bought]));
  } catch {
    // Ticks are a convenience; the list still works without saving them.
  }
}
