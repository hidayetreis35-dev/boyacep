/**
 * Translations. Turkish is the source language: UI text is written in Turkish
 * and wrapped in t(), and en.ts maps each Turkish text to English. A text with
 * no English entry falls back to Turkish, and the i18n tests list it.
 *
 *   t('Kaydet')                                   → "Save"
 *   t('{count} oda', { count: rooms.length })     → "1 room" / "3 rooms"
 *
 * Text that is defined outside a component (labels in constant lists) is
 * marked with msg() and translated where it is shown: t(SPACE.label).
 *
 * Text built elsewhere, such as the engine's messages and material names,
 * is translated by matching it against the templates in en.ts:
 * t('Kapı sayısı 0 veya pozitif tam sayı olmalı.') uses the entry for
 * '{label} sayısı 0 veya pozitif tam sayı olmalı.'
 */
import { en, type Translation } from './en';

export type Locale = 'tr' | 'en';

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
];

export function isLocale(value: unknown): value is Locale {
  return value === 'tr' || value === 'en';
}

let current: Locale = 'tr';

/** The language the app shows right now. */
export function getLocale(): Locale {
  return current;
}

/** Switches the language for every later t() call. The LocaleProvider re-renders the app. */
export function setCurrentLocale(locale: Locale): void {
  current = locale;
}

export type Vars = Record<string, string | number>;

function pick(entry: Translation, vars?: Vars): string {
  if (typeof entry === 'string') return entry;
  return Number(vars?.count) === 1 ? entry.one : entry.other;
}

function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

type Template = { pattern: RegExp; names: string[]; entry: Translation };
let templates: Template[] | null = null;

/**
 * The en.ts entries with {placeholders}, as patterns; the longest literal text
 * first. Templates with almost no fixed words ("{a} {b}") would match any text,
 * so they are left out.
 */
function compiledTemplates(): Template[] {
  templates ??= Object.entries(en)
    .map(([source, entry]) => ({ source, entry, literal: source.replace(/\{\w+\}/g, '') }))
    .filter(({ source, literal }) => source !== literal && /\p{L}{3}/u.test(literal))
    .sort((a, b) => b.literal.length - a.literal.length)
    .map(({ source, entry }) => {
      const names: string[] = [];
      const parts = source.split(/\{(\w+)\}/).map((part, i) => {
        if (i % 2 === 0) return part.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
        names.push(part);
        return '(.+?)';
      });
      return { pattern: new RegExp(`^${parts.join('')}$`), names, entry };
    });
  return templates;
}

/** Translates finished text by its template; each filled-in value is translated too. */
function fromTemplate(text: string): string | undefined {
  for (const { pattern, names, entry } of compiledTemplates()) {
    const match = pattern.exec(text);
    if (!match) continue;
    const vars = Object.fromEntries(names.map((name, i) => [name, t(match[i + 1])]));
    return fill(pick(entry, vars), vars);
  }
  return undefined;
}

/** Translates Turkish source text into the current language. */
export function t(source: string, vars?: Vars): string {
  if (current !== 'en') return fill(source, vars);
  const entry = en[source];
  if (entry !== undefined) return fill(pick(entry, vars), vars);
  return (vars ? undefined : fromTemplate(source)) ?? fill(source, vars);
}

/** Marks text for translation without translating it yet; pass it to t() where it is shown. */
export function msg(source: string): string {
  return source;
}

/** BCP 47 tag for dates and numbers. */
export function localeTag(locale: Locale = current): string {
  return locale === 'en' ? 'en-GB' : 'tr-TR';
}

/** Translates the label of each option in a constant list, for pickers. */
export function translateLabels<T extends { label: string }>(list: readonly T[]): T[] {
  return list.map((item) => ({ ...item, label: t(item.label) }));
}
