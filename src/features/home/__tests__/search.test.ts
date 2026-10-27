import { setCurrentLocale } from '@/i18n';

import { searchApp } from '../search';

afterEach(() => setCurrentLocale('tr'));

const titles = (query: string, guides?: { slug: string; title: string }[]) => searchApp(query, guides).map((h) => h.title);

describe('searchApp', () => {
  it('needs at least two letters', () => {
    expect(searchApp('')).toEqual([]);
    expect(searchApp(' s ')).toEqual([]);
  });

  it('finds a room first and opens the calculator with it chosen', () => {
    const [first] = searchApp('salon');
    expect(first).toMatchObject({ kind: 'room', title: 'Salon', href: { pathname: '/calculate', params: { space: 'living' } } });
  });

  it('finds a colour by name, with or without Turkish letters, and opens it in the studio', () => {
    for (const q of ['adaçayı', 'adacayi']) {
      const hit = searchApp(q).find((h) => h.kind === 'colour');
      expect(hit).toMatchObject({ title: 'Adaçayı', swatch: '#A3B49A', href: { pathname: '/colour', params: { hex: '#A3B49A' } } });
    }
  });

  it('turns a wall problem into the wall check', () => {
    expect(titles('nem')[0]).toBe('Duvarını İncele');
    expect(titles('küf')).toContain('Duvarını İncele');
    expect(titles('çatlak')).toContain('Duvarını İncele');
  });

  it('ranks title matches above keyword matches', () => {
    expect(titles('boya').slice(0, 3)).toEqual(['Boya Hesapla', 'Boya Fiyatları', 'Boya Rehberi']);
  });

  it('searches guide titles only when they are already loaded', () => {
    const guides = [{ slug: 'tavan-boyama', title: 'Tavan nasıl boyanır?' }];
    expect(searchApp('tavan', guides).find((h) => h.kind === 'guide' && h.title === 'Tavan nasıl boyanır?')).toMatchObject({
      href: { pathname: '/guide/[slug]', params: { slug: 'tavan-boyama' } },
    });
    expect(titles('tavan', [])).not.toContain('Tavan nasıl boyanır?');
  });

  it('matches English names when the app is in English', () => {
    setCurrentLocale('en');
    expect(titles('kitchen')[0]).toBe('Kitchen');
    expect(titles('sage')).toContain('Sage');
  });

  it('returns at most eight results', () => {
    expect(searchApp('an').length).toBeLessThanOrEqual(8);
    expect(searchApp('ar').length).toBeLessThanOrEqual(8);
  });

  it('returns nothing for gibberish', () => {
    expect(searchApp('zzqx')).toEqual([]);
  });
});
