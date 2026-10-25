import { setCurrentLocale } from '@/i18n';
import { formatMoney, formatNumber, parseDecimal } from '@/lib/number';

describe('parseDecimal', () => {
  it.each([
    ['2,5', 2.5],
    ['2.5', 2.5],
    [' 4 ', 4],
    ['0,9', 0.9],
    [',5', 0.5],
    ['120', 120],
  ])('parses %s', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it.each(['', 'abc', '2,5,1', '-3', '1e3', '2..5'])('rejects %s', (input) => {
    expect(parseDecimal(input)).toBeNaN();
  });
});

describe('formatNumber', () => {
  it.each([
    [2.5, 1, '2,5'],
    [6, 1, '6'],
    [31.31, 2, '31,31'],
    [31.3, 2, '31,3'],
    [1234.5, 1, '1.234,5'],
    [0.04, 1, '0'],
  ])('formats %s with %s decimals as %s', (value, decimals, expected) => {
    expect(formatNumber(value, decimals)).toBe(expected);
  });
});

describe('formatMoney', () => {
  it.each([
    [0, '0,00 ₺'],
    [1850.5, '1.850,50 ₺'],
    [1234567.891, '1.234.567,89 ₺'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });
});

describe('in English', () => {
  beforeEach(() => setCurrentLocale('en'));
  afterEach(() => setCurrentLocale('tr'));

  it.each([
    [2.5, 1, '2.5'],
    [1234.5, 1, '1,234.5'],
    [6, 1, '6'],
  ])('formats %s with %s decimals as %s', (value, decimals, expected) => {
    expect(formatNumber(value, decimals)).toBe(expected);
  });

  it.each([
    [0, '₺0.00'],
    [1850.5, '₺1,850.50'],
    [1234567.891, '₺1,234,567.89'],
  ])('formats money %s as %s', (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });

  it('still reads both decimal marks', () => {
    expect(parseDecimal('2,5')).toBe(2.5);
    expect(parseDecimal('2.5')).toBe(2.5);
  });
});
