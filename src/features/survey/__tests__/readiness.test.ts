import type { RoomWithOpenings } from '@/features/projects/mapping';
import { buildSurvey } from '@/features/survey/model';
import { isReadyForQuote, surveyGaps, surveyText } from '@/features/survey/readiness';
import type { InspectionResultRow } from '@/lib/database.types';

const salon: RoomWithOpenings = {
  id: 'r1',
  project_id: 'p1',
  name: 'Salon',
  length_m: 4,
  width_m: 3.5,
  height_m: 2.6,
  paint_walls: true,
  paint_ceiling: true,
  coats: 2,
  surface_type: 'painted',
  surface_condition: 'good',
  coverage_m2_per_l: null,
  coverage_source: null,
  sort_order: 0,
  created_at: '',
  updated_at: '',
  openings: [{ id: 'o1', room_id: 'r1', kind: 'door', width_m: 0.9, height_m: 2.1, count: 1, created_at: '' }],
};

const damp: InspectionResultRow = { id: 'i1', project_id: 'p1', place: 'room', symptoms: ['damp_stain'], location: 'Salon tavanı', created_at: '2026-10-25T10:00:00Z' };

const survey = (over: Partial<Parameters<typeof buildSurvey>[0]> = {}) =>
  buildSurvey({ title: 'Ev', rooms: [salon], colours: [], inspections: [], photoCount: 0, today: new Date('2026-10-26'), ...over });

describe('survey gaps', () => {
  it('asks for rooms and photos before a quote', () => {
    const gaps = surveyGaps(survey({ rooms: [] }), { hasCity: true });
    expect(gaps.filter((g) => g.level === 'missing').map((g) => g.id)).toEqual(['rooms', 'photos']);
    expect(isReadyForQuote(gaps)).toBe(false);
  });

  it('is ready with rooms and photos, and still gives tips', () => {
    const gaps = surveyGaps(survey({ photoCount: 1 }), { hasCity: false });
    expect(isReadyForQuote(gaps)).toBe(true);
    expect(gaps.map((g) => g.id)).toEqual(['colours', 'inspection', 'city']);
  });

  it('suggests a photo per room', () => {
    const gaps = surveyGaps(survey({ rooms: [salon, { ...salon, id: 'r2', name: 'Oda' }], photoCount: 1 }), { hasCity: true });
    expect(gaps.find((g) => g.id === 'photos_per_room')?.text).toBe('Her oda için en az bir fotoğraf ekle; 2 odaya 1 fotoğraf var.');
  });

  it('has nothing to add when everything is there', () => {
    const full = survey({ photoCount: 2, colours: [{ name: 'Kırık beyaz', hex: '#F4F1EA', surface: 'Duvarlar' }], inspections: [damp] });
    expect(surveyGaps(full, { hasCity: true })).toEqual([]);
  });

  it('blocks on a broken measurement', () => {
    const gaps = surveyGaps(survey({ rooms: [{ ...salon, length_m: 0 }], photoCount: 1 }), { hasCity: true });
    expect(gaps[0]).toMatchObject({ id: 'calculation', level: 'missing' });
  });
});

describe('survey text', () => {
  it('summarises rooms, quantities, colours and findings', () => {
    const text = surveyText(survey({ photoCount: 3, colours: [{ name: 'Kırık beyaz', hex: '#F4F1EA', surface: null }], inspections: [damp] }));
    expect(text).toContain('BoyaCep keşif dosyası: Ev');
    expect(text).toContain('• Salon: 4 × 3,5 m, tavan 2,6 m; duvar');
    expect(text).toMatch(/Toplam boyanacak alan: \d+,\d m²/);
    expect(text).toMatch(/• İç cephe boyası: \d × /);
    expect(text).toContain('Renkler: Kırık beyaz');
    expect(text).toContain('• Salon tavanı: Nem lekesi (Uzmana danış)');
    expect(text).toContain('3 fotoğraf var');
    expect(text.endsWith('miktarlar BoyaCep tahminidir.')).toBe(true);
  });

  it('works for an empty file', () => {
    expect(surveyText(survey({ rooms: [] }))).toContain('BoyaCep keşif dosyası: Ev');
  });
});
