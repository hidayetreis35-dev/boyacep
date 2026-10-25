import { getLocale } from '@/i18n';

/**
 * Parses a number typed by a user: "2,5" and "2.5" both mean 2.5.
 * Returns NaN for empty or malformed input so validation can reject it.
 */
export function parseDecimal(text: string): number {
  const cleaned = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

/** Separators for the current language: Turkish 1.234,5 and English 1,234.5 */
function separators(): { group: string; decimal: string } {
  return getLocale() === 'en' ? { group: ',', decimal: '.' } : { group: '.', decimal: ',' };
}

const group = (int: string, sep: string) => int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);

/** Formats with the current language's separators, e.g. 1.234,5 (Turkish) or 1,234.5 (English) */
export function formatNumber(value: number, decimals = 1): string {
  const { group: g, decimal } = separators();
  const fixed = value.toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const grouped = group(int, g);
  if (!frac || /^0+$/.test(frac)) return grouped;
  return `${grouped}${decimal}${frac.replace(/0+$/, '')}`;
}

/** Turkish lira with two decimals, e.g. 1.850,50 ₺ (Turkish) or ₺1,850.50 (English) */
export function formatMoney(value: number): string {
  const { group: g, decimal } = separators();
  const [int, frac] = value.toFixed(2).split('.');
  const amount = `${group(int, g)}${decimal}${frac}`;
  return getLocale() === 'en' ? `₺${amount}` : `${amount} ₺`;
}
