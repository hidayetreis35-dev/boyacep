import { topicLabel, validateQuestion } from '@/features/ask/api';

describe('validateQuestion', () => {
  it('accepts a clear question', () => {
    expect(validateQuestion('Banyo tavanı', 'Tavan boyası kabardı, ne yapmalıyım?')).toEqual({});
  });

  it('asks for more detail', () => {
    expect(validateQuestion(' a ', 'kısa')).toEqual({
      subject: 'Kısaca konuyu yaz (en az 3 harf).',
      body: 'Sorunu biraz daha anlat (en az 10 harf).',
    });
  });

  it('labels topics in Turkish', () => {
    expect(topicLabel('paint_choice')).toBe('Boya seçimi');
  });
});
