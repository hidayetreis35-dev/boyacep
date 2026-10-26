import { parseInline, parseMarkdown } from '@/features/guide/markdown';

describe('parseInline', () => {
  it('splits bold runs', () => {
    expect(parseInline('Önce **temizle**, sonra boya.')).toEqual([
      { text: 'Önce ', bold: false },
      { text: 'temizle', bold: true },
      { text: ', sonra boya.', bold: false },
    ]);
  });

  it('keeps an unmatched marker as plain text', () => {
    expect(parseInline('2 ** 3')).toEqual([{ text: '2 ** 3', bold: false }]);
  });
});

describe('parseMarkdown', () => {
  it('parses headings, paragraphs, bullets and steps', () => {
    const blocks = parseMarkdown(
      'Giriş satırı\ndevamı.\n\n## Adımlar\n1. Birinci\n2. İkinci\n\n- madde\n- **önemli** madde\n',
    );
    expect(blocks).toEqual([
      { type: 'paragraph', inlines: [{ text: 'Giriş satırı devamı.', bold: false }] },
      { type: 'heading', text: 'Adımlar' },
      { type: 'steps', items: [[{ text: 'Birinci', bold: false }], [{ text: 'İkinci', bold: false }]] },
      {
        type: 'bullets',
        items: [
          [{ text: 'madde', bold: false }],
          [
            { text: 'önemli', bold: true },
            { text: ' madde', bold: false },
          ],
        ],
      },
    ]);
  });

  it('treats markup-looking text as plain text', () => {
    expect(parseMarkdown('<script>alert(1)</script>')).toEqual([
      { type: 'paragraph', inlines: [{ text: '<script>alert(1)</script>', bold: false }] },
    ]);
  });

  it('returns nothing for empty input', () => {
    expect(parseMarkdown('\n\n')).toEqual([]);
  });
});
