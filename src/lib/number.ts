/**
 * Parses a number typed by a Turkish user: "2,5" and "2.5" both mean 2.5.
 * Returns NaN for empty or malformed input so validation can reject it.
 */
export function parseDecimal(text: string): number {
  const cleaned = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

/** Formats with a decimal comma and dot thousands separators, e.g. 1.234,5 */
export function formatNumber(value: number, decimals = 1): string {
  const fixed = value.toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (!frac || /^0+$/.test(frac)) return grouped;
  return `${grouped},${frac.replace(/0+$/, '')}`;
}
