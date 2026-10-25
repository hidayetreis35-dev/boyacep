import type { Locale } from './index';

/** The phone's language: Turkish phones start in Turkish, every other language in English. */
export function deviceLocale(): Locale {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    return tag.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'tr';
  }
}
