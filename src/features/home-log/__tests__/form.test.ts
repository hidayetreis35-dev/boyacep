import type { HomeLogRow } from '@/lib/database.types';

import { draftsFromProject, emptyHomeLogForm, normaliseHex, searchHomeLog, toHomeLogDraft } from '../form';

const now = new Date(2026, 9, 26, 12);

describe('home log form', () => {
  it.each([
    ['#f4f1ea', '#F4F1EA'],
    ['F4F1EA', '#F4F1EA'],
    ['#fff', '#FFFFFF'],
    ['kırmızı', null],
    ['#12345', null],
  ])('reads the colour code %s as %s', (text, hex) => {
    expect(normaliseHex(text)).toBe(hex);
  });

  it('builds a draft and leaves empty fields out', () => {
    const r = toHomeLogDraft({ ...emptyHomeLogForm(now), place: ' Salon duvarları ', colourHex: 'f4f1ea', colourCode: ' 7035 ', finish: 'matt' }, { now });
    expect(r).toEqual({
      ok: true,
      draft: {
        project_id: null,
        place: 'Salon duvarları',
        colour_name: null,
        colour_hex: '#F4F1EA',
        colour_code: '7035',
        product: null,
        finish: 'matt',
        painted_on: '2026-10-26',
        painter: null,
        note: null,
      },
    });
  });

  it('explains problems', () => {
    const r = toHomeLogDraft({ ...emptyHomeLogForm(now), colourHex: 'mavi', date: '01.01.1900', note: 'x'.repeat(501) }, { now });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['colourHex', 'date', 'note', 'place']);
  });

  it('makes one entry per project colour', () => {
    const drafts = draftsFromProject(
      { id: 'p1', title: 'Salon boyası' },
      [
        { name: 'Kırık beyaz', hex: '#f4f1ea', surface: 'Duvarlar' },
        { name: 'Antrasit', hex: '#3A3D40', surface: null },
      ],
      now,
    );
    expect(drafts.map((d) => [d.place, d.colour_name, d.colour_hex, d.painted_on, d.project_id])).toEqual([
      ['Duvarlar', 'Kırık beyaz', '#F4F1EA', '2026-10-26', 'p1'],
      ['Salon boyası', 'Antrasit', '#3A3D40', '2026-10-26', 'p1'],
    ]);
  });

  it('searches the Turkish way', () => {
    const row = (place: string, extra: Partial<HomeLogRow> = {}): HomeLogRow => ({
      id: place, owner_id: 'u', project_id: null, place, colour_name: null, colour_hex: null, colour_code: null, product: null,
      finish: null, painted_on: '2026-01-01', painter: null, note: null, created_at: '', updated_at: '', ...extra,
    });
    const rows = [row('Salon'), row('İç oda', { colour_code: 'RAL 7035' }), row('Banyo', { painter: 'Işık usta' })];
    expect(searchHomeLog(rows, 'iç').map((r) => r.id)).toEqual(['İç oda']);
    expect(searchHomeLog(rows, 'ışık').map((r) => r.id)).toEqual(['Banyo']);
    expect(searchHomeLog(rows, '7035').map((r) => r.id)).toEqual(['İç oda']);
    expect(searchHomeLog(rows, ' ')).toHaveLength(3);
  });
});
