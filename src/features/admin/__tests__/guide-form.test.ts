import { EMPTY_GUIDE_FORM, slugify, validateGuideForm } from '@/features/admin/api';

describe('slugify', () => {
  it('turns Turkish titles into url-safe slugs', () => {
    expect(slugify('Tavan Boyama İpuçları')).toBe('tavan-boyama-ipuclari');
    expect(slugify('  Şömine çevresi: ısı & boya!  ')).toBe('somine-cevresi-isi-boya');
  });

  it('never ends with a dash when cut to 80 characters', () => {
    const slug = slugify('a'.repeat(79) + ' bb');
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('validateGuideForm', () => {
  const valid = { ...EMPTY_GUIDE_FORM, slug: 'duvar-boyama', title: ' Duvar boyama ', body: 'Metin', readingMinutes: '4' };

  it('builds a trimmed record', () => {
    expect(validateGuideForm(valid)).toEqual({
      record: {
        slug: 'duvar-boyama',
        category: 'walls',
        title: 'Duvar boyama',
        summary: '',
        body: 'Metin',
        reading_minutes: 4,
        status: 'draft',
      },
    });
  });

  it('marks published guides', () => {
    const result = validateGuideForm({ ...valid, published: true });
    expect('record' in result && result.record.status).toBe('published');
  });

  it('explains every problem at once', () => {
    const result = validateGuideForm({ ...EMPTY_GUIDE_FORM, slug: 'Kötü Adres', readingMinutes: '0', published: true });
    expect(result).toEqual({
      errors: {
        slug: expect.any(String),
        title: 'Yazıya bir başlık ver.',
        body: 'Boş bir yazı yayınlanamaz.',
        readingMinutes: '1 ile 60 arasında bir sayı gir.',
      },
    });
  });

  it('rejects fractional reading time', () => {
    expect('errors' in validateGuideForm({ ...valid, readingMinutes: '2,5' })).toBe(true);
  });
});
