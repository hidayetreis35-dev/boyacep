import { addDays, emptyItem, emptyQuoteForm, itemsFromProject, quoteToForm, validateQuoteForm } from '@/features/quotes/form';
import { formatDate, quoteHtml } from '@/features/quotes/pdf';
import type { QuoteItemRow, QuoteRow } from '@/lib/database.types';

const today = new Date(2026, 9, 25);

describe('validateQuoteForm', () => {
  it('builds the quote and its items', () => {
    const form = emptyQuoteForm('Salon boyası');
    form.items[0] = { ...form.items[0], description: 'Duvar işçiliği', quantity: '62,5', unitPrice: '120' };
    form.items.push({ ...emptyItem('material'), description: 'Boya 15 L', quantity: '2', unit: 'kutu', unitPrice: '1.850' });
    form.discount = '500';
    const result = validateQuoteForm(form, today);
    expect(result).toEqual({
      quote: {
        title: 'Salon boyası',
        customer_name: '',
        customer_contact: '',
        notes: '',
        vat_rate: 20,
        discount: 500,
        valid_until: '2026-11-09',
      },
      items: [
        { kind: 'labor', description: 'Duvar işçiliği', quantity: 62.5, unit: 'm²', unit_price: 120, sort_order: 0 },
        { kind: 'material', description: 'Boya 15 L', quantity: 2, unit: 'kutu', unit_price: 1850, sort_order: 1 },
      ],
    });
  });

  it('marks broken items by key', () => {
    const form = emptyQuoteForm('');
    form.items[0].quantity = '0';
    const result = validateQuoteForm(form, today);
    expect('errors' in result && result.errors).toEqual({
      title: 'Teklife bir başlık ver.',
      items: 'Kırmızı işaretli kalemleri düzelt.',
      item: { [form.items[0].key]: { description: 'Kalemi açıkla.', quantity: 'Bu miktarı anlayamadım. Sadece rakam yazar mısın?', unitPrice: 'Bu fiyatı anlayamadım. Sadece rakam yazar mısın?' } },
    });
  });

  it('needs at least one item and a sane VAT', () => {
    const form = { ...emptyQuoteForm('X'), items: [], vatRate: '80' };
    const result = validateQuoteForm(form, today);
    expect('errors' in result && result.errors).toEqual({ items: 'En az bir kalem ekle.', vatRate: 'KDV oranı 0 ile 50 arasında olmalı.' });
  });

  it('adds days across month ends', () => {
    expect(addDays(new Date(2026, 9, 25), 7)).toBe('2026-11-01');
  });
});

const quote: QuoteRow = {
  id: 'q1',
  pro_id: 'p1',
  project_id: null,
  number: 7,
  title: 'Salon <b>boyası</b>',
  customer_name: 'Ali & Ayşe',
  customer_contact: '',
  notes: 'Mobilyalar\nkorunacak',
  vat_rate: 20,
  discount: 0,
  currency: 'TRY',
  valid_until: '2026-11-09',
  status: 'draft',
  sent_at: null,
  responded_at: null,
  created_at: '2026-10-25T10:00:00Z',
  updated_at: '2026-10-25T10:00:00Z',
};
const items: QuoteItemRow[] = [
  { id: 'i1', quote_id: 'q1', kind: 'labor', description: 'İşçilik', quantity: 10, unit: 'm²', unit_price: 100, sort_order: 0, created_at: '' },
];

describe('quote PDF', () => {
  it('escapes user text and shows totals', () => {
    const html = quoteHtml({ quote, items, pro: { full_name: 'Mehmet Usta', business_name: null, phone: '0555', city: 'İstanbul' } });
    expect(html).toContain('Salon &lt;b&gt;boyası&lt;/b&gt;');
    expect(html).toContain('Ali &amp; Ayşe');
    expect(html).toContain('Mobilyalar<br>korunacak');
    expect(html).toContain('Teklif No: 7');
    expect(html).toContain('1.200,00 ₺');
    expect(html).not.toContain('<b>boyası</b>');
  });

  it('round-trips a saved quote into the form', () => {
    const form = quoteToForm(quote, items);
    expect(form.items[0]).toMatchObject({ key: 'i1', quantity: '10', unitPrice: '100' });
    expect(form.validity).toBe('15');
  });

  it('formats dates the Turkish way', () => {
    expect(formatDate('2026-11-09')).toBe('09.11.2026');
  });
});

describe('itemsFromProject', () => {
  it('starts with labour by area, then materials, prices left empty', () => {
    const items = itemsFromProject(62.43, [{ name: 'İç cephe boyası (15 L)', quantity: 2, unit: 'kutu' }]);
    expect(items.map(({ kind, description, quantity, unit, unitPrice }) => ({ kind, description, quantity, unit, unitPrice }))).toEqual([
      { kind: 'labor', description: 'Duvar ve tavan boya işçiliği', quantity: '62,43', unit: 'm²', unitPrice: '' },
      { kind: 'material', description: 'İç cephe boyası (15 L)', quantity: '2', unit: 'kutu', unitPrice: '' },
    ]);
    expect(itemsFromProject(null, [])).toEqual([]);
  });
});
