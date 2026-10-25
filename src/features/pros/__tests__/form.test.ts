import { EMPTY_PRO_FORM, validateProForm } from '@/features/pros/form';

describe('validateProForm', () => {
  const valid = { ...EMPTY_PRO_FORM, fullName: ' Mehmet Yılmaz ', city: 'İstanbul', specialties: ['interior' as const] };

  it('builds a trimmed record with optional fields as null', () => {
    expect(validateProForm(valid)).toEqual({
      record: {
        full_name: 'Mehmet Yılmaz',
        business_name: null,
        phone: null,
        show_phone: false,
        city: 'İstanbul',
        districts: '',
        specialties: ['interior'],
        years_experience: null,
        bio: '',
      },
    });
  });

  it('keeps phone and experience', () => {
    const result = validateProForm({ ...valid, phone: '0555 123 45 67', showPhone: true, yearsExperience: '12' });
    expect('record' in result && result.record).toMatchObject({ phone: '0555 123 45 67', show_phone: true, years_experience: 12 });
  });

  it('explains every problem', () => {
    expect(validateProForm({ ...EMPTY_PRO_FORM, showPhone: true, yearsExperience: '-1' })).toEqual({
      errors: {
        fullName: 'Adını ve soyadını yaz.',
        phone: 'Telefonunu göstermek için numaranı yaz.',
        city: 'Çalıştığın ili yaz.',
        specialties: 'En az bir uzmanlık seç.',
        yearsExperience: '0 ile 70 arasında bir sayı gir.',
      },
    });
    expect('errors' in validateProForm({ ...valid, phone: 'abc' })).toBe(true);
  });
});
