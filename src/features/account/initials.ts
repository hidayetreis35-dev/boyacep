/** "Ahmet Kaya" → "AK"; without a name, the first letter of the e-mail address. */
export function initials(name: string | null | undefined, email: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length) return words.slice(0, 2).map((w) => w[0]!.toLocaleUpperCase('tr')).join('');
  return (email || '?')[0]!.toLocaleUpperCase('tr');
}
