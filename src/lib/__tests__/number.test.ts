import { formatNumber, parseDecimal } from '@/lib/number';

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
