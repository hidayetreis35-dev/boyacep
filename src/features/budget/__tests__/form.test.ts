import { dayText, emptyExpenseForm, parseAmount, parseDay, todayIso, toExpenseDraft } from '../form';

const now = new Date(2026, 9, 26, 15, 0);

describe('expense form', () => {
  it('uses the local day', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(emptyExpenseForm('labor', now)).toEqual({ category: 'labor', label: '', amount: '', date: '26.10.2026', store: '' });
    expect(dayText('2026-10-26', 'en')).toBe('26/10/2026');
  });

  it.each([
    ['20.10.2026', '2026-10-20'],
    ['5.3.2026', '2026-03-05'],
    ['20/10/2026', '2026-10-20'],
    ['2026-10-20', '2026-10-20'],
    ['31.02.2026', null],
    ['2026', null],
    ['', null],
  ])('reads %s as %s', (text, iso) => {
    expect(parseDay(text)).toBe(iso);
  });

  it('builds a draft', () => {
    const r = toExpenseDraft({ category: 'paint', label: ' İç cephe 15 L ', amount: '1.850,50', date: '20.10.2026', store: ' Yapı market ' }, now);
    expect(r).toEqual({
      ok: true,
      draft: { category: 'paint', label: 'İç cephe 15 L', amount: 1850.5, spent_on: '2026-10-20', store_name: 'Yapı market' },
    });
  });

  it('accepts plain and decimal amounts', () => {
    const base = { category: 'other' as const, label: 'Bant', date: '26.10.2026', store: '' };
    expect(toExpenseDraft({ ...base, amount: '45' }, now)).toMatchObject({ ok: true, draft: { amount: 45, store_name: null } });
    expect(toExpenseDraft({ ...base, amount: '45,75' }, now)).toMatchObject({ ok: true, draft: { amount: 45.75 } });
    expect(toExpenseDraft({ ...base, amount: 'on iki' }, now)).toMatchObject({ ok: false });
  });

  it.each([
    ['1850,50', 1850.5],
    ['1.850,50', 1850.5],
    ['12.000', 12000],
    ['1.250.000', 1250000],
    ['1,850.50', 1850.5],
    ['12.5', 12.5],
    ['2 500 ₺', 2500],
  ])('reads the amount %s as %d', (text, value) => {
    expect(parseAmount(text)).toBe(value);
  });

  it('explains every problem', () => {
    const r = toExpenseDraft({ category: 'paint', label: '', amount: '0', date: '27.10.2026', store: 'x'.repeat(81) }, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['amount', 'date', 'label', 'store']);
  });
});
