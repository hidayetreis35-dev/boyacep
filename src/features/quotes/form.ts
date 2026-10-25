import type { QuoteItemKind } from '@/engine';
import type { QuoteItemRow, QuoteRow, QuoteStatus } from '@/lib/database.types';
import { formatNumber, parseDecimal } from '@/lib/number';

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  accepted: 'Kabul edildi',
  rejected: 'Reddedildi',
  withdrawn: 'Geri çekildi',
};

export const VALIDITY_OPTIONS = [
  { value: '7', label: '7 gün' },
  { value: '15', label: '15 gün' },
  { value: '30', label: '30 gün' },
] as const;
export type ValidityDays = (typeof VALIDITY_OPTIONS)[number]['value'];

export type ItemForm = {
  key: string;
  kind: QuoteItemKind;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

export type QuoteForm = {
  title: string;
  customerName: string;
  customerContact: string;
  notes: string;
  vatRate: string;
  discount: string;
  validity: ValidityDays;
  items: ItemForm[];
};

let keySeq = 0;
export const newItemKey = () => `item-${Date.now().toString(36)}-${(keySeq++).toString(36)}`;

export function emptyItem(kind: QuoteItemKind = 'labor'): ItemForm {
  return { key: newItemKey(), kind, description: '', quantity: '1', unit: kind === 'labor' ? 'm²' : 'adet', unitPrice: '' };
}

export function emptyQuoteForm(title = ''): QuoteForm {
  return { title, customerName: '', customerContact: '', notes: '', vatRate: '20', discount: '', validity: '15', items: [emptyItem('labor')] };
}

const fmt = (n: number) => formatNumber(Number(n), 2);

/** Days between creation and the validity date, snapped to the offered options. */
function validityOf(quote: Pick<QuoteRow, 'valid_until' | 'created_at'>): ValidityDays {
  if (!quote.valid_until) return '15';
  const days = Math.round((new Date(quote.valid_until).getTime() - new Date(quote.created_at.slice(0, 10)).getTime()) / 86400000);
  return days <= 10 ? '7' : days <= 20 ? '15' : '30';
}

export function quoteToForm(quote: QuoteRow, items: QuoteItemRow[]): QuoteForm {
  return {
    title: quote.title,
    customerName: quote.customer_name,
    customerContact: quote.customer_contact,
    notes: quote.notes,
    vatRate: fmt(quote.vat_rate),
    discount: Number(quote.discount) > 0 ? fmt(quote.discount) : '',
    validity: validityOf(quote),
    items: items.map((i) => ({
      key: i.id,
      kind: i.kind,
      description: i.description,
      quantity: fmt(i.quantity),
      unit: i.unit,
      unitPrice: fmt(i.unit_price),
    })),
  };
}

export type QuoteRecord = Pick<QuoteRow, 'title' | 'customer_name' | 'customer_contact' | 'notes' | 'vat_rate' | 'discount' | 'valid_until'>;
export type ItemRecord = Pick<QuoteItemRow, 'kind' | 'description' | 'quantity' | 'unit' | 'unit_price' | 'sort_order'>;

export type QuoteFormErrors = {
  title?: string;
  vatRate?: string;
  discount?: string;
  items?: string;
  item?: Record<string, Partial<Record<'description' | 'quantity' | 'unit' | 'unitPrice', string>>>;
};

/** "1.850" typed as a price means one thousand eight hundred fifty in Turkish; allow thousands dots. */
function parseMoney(text: string): number {
  const t = text.trim();
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) return parseDecimal(t.replace(/\./g, ''));
  return parseDecimal(t);
}

export function addDays(date: Date, days: number): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + days));
  return d.toISOString().slice(0, 10);
}

export function validateQuoteForm(
  form: QuoteForm,
  today = new Date(),
): { quote: QuoteRecord; items: ItemRecord[] } | { errors: QuoteFormErrors } {
  const errors: QuoteFormErrors = {};
  const title = form.title.trim();
  const vat = form.vatRate.trim() === '' ? 0 : parseDecimal(form.vatRate);
  const discount = form.discount.trim() === '' ? 0 : parseMoney(form.discount);

  if (!title) errors.title = 'Teklife bir başlık ver.';
  else if (title.length > 120) errors.title = 'Başlık en fazla 120 karakter olabilir.';
  if (!Number.isFinite(vat) || vat < 0 || vat > 50) errors.vatRate = 'KDV oranı 0 ile 50 arasında olmalı.';
  if (!Number.isFinite(discount) || discount < 0) errors.discount = 'İndirim tutarı geçersiz.';

  const items: ItemRecord[] = [];
  const itemErrors: NonNullable<QuoteFormErrors['item']> = {};
  form.items.forEach((item, i) => {
    const e: Partial<Record<'description' | 'quantity' | 'unit' | 'unitPrice', string>> = {};
    const description = item.description.trim();
    const quantity = parseDecimal(item.quantity);
    const unit = item.unit.trim();
    const price = parseMoney(item.unitPrice);
    if (!description) e.description = 'Kalemi açıkla.';
    else if (description.length > 200) e.description = 'En fazla 200 karakter.';
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) e.quantity = 'Miktar geçersiz.';
    if (!unit || unit.length > 20) e.unit = 'Birim yaz.';
    if (!Number.isFinite(price) || price < 0 || price > 10000000) e.unitPrice = 'Fiyat geçersiz.';
    if (Object.keys(e).length > 0) itemErrors[item.key] = e;
    else items.push({ kind: item.kind, description, quantity, unit, unit_price: price, sort_order: i });
  });
  if (form.items.length === 0) errors.items = 'En az bir kalem ekle.';
  if (Object.keys(itemErrors).length > 0) {
    errors.item = itemErrors;
    errors.items = 'Kırmızı işaretli kalemleri düzelt.';
  }

  if (Object.keys(errors).length > 0) return { errors };
  return {
    quote: {
      title,
      customer_name: form.customerName.trim().slice(0, 120),
      customer_contact: form.customerContact.trim().slice(0, 120),
      notes: form.notes.trim().slice(0, 2000),
      vat_rate: vat,
      discount,
      valid_until: addDays(today, Number(form.validity)),
    },
    items,
  };
}

/** Starting lines for a quote on a shared project: labour by painted area, then the homeowner's material list. */
export function itemsFromProject(paintableM2: number | null, materials: { name: string; quantity: number; unit: string }[]): ItemForm[] {
  const items: ItemForm[] = [];
  if (paintableM2 && paintableM2 > 0) {
    items.push({ ...emptyItem('labor'), description: 'Duvar ve tavan boya işçiliği', quantity: fmt(paintableM2), unit: 'm²' });
  }
  for (const m of materials) {
    items.push({ ...emptyItem('material'), description: m.name, quantity: fmt(m.quantity), unit: m.unit });
  }
  return items;
}
