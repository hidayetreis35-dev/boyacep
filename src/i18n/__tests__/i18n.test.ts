import { calculateProject, COST_GROUP_LABEL, quickEstimate, QUOTE_KIND_LABEL, type RoomInput } from '@/engine';
import { COLOURS } from '@/features/colour/catalogue';
import { PLACES, SYMPTOMS, workPlan } from '@/features/inspect/rules';
import { getLocale, setCurrentLocale, t, toUpper } from '@/i18n';
import { en } from '@/i18n/en';
import { scan, TURKISH } from '@/i18n/scan';

const found = scan();

/** 4 x 3 m room, 2.5 m ceiling, one door, one window. */
function room(overrides: Partial<RoomInput> = {}): RoomInput {
  return {
    length: 4,
    width: 3,
    height: 2.5,
    doors: [{ width: 0.9, height: 2.1, count: 1 }],
    windows: [{ width: 1.5, height: 1.2, count: 1 }],
    paintWalls: true,
    paintCeiling: true,
    coats: 2,
    surfaceType: 'painted',
    surfaceCondition: 'good',
    ...overrides,
  };
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

afterEach(() => setCurrentLocale('tr'));

describe('source text', () => {
  it('wraps every Turkish UI text in t() or msg()', () => {
    expect(found.unwrapped).toEqual([]);
  });

  it('has an English entry for every t() and msg() text', () => {
    const missing = found.keys.filter((k) => en[k.text] === undefined);
    expect(missing).toEqual([]);
  });

  it('has an English name for every catalogue colour', () => {
    expect(COLOURS.filter((c) => en[c.name] === undefined).map((c) => c.name)).toEqual([]);
  });
});

describe('en.ts', () => {
  const entries = Object.entries(en);

  it('keeps the same placeholders as the Turkish text', () => {
    const wrong = entries.flatMap(([source, entry]) => {
      const texts = typeof entry === 'string' ? [entry] : [entry.one, entry.other];
      return texts.filter((text) => placeholders(text).join() !== placeholders(source).join()).map((text) => [source, text]);
    });
    expect(wrong).toEqual([]);
  });

  it('uses one/other only for text with a {count}', () => {
    const wrong = entries.filter(([source, entry]) => typeof entry !== 'string' && !source.includes('{count}'));
    expect(wrong.map(([source]) => source)).toEqual([]);
  });

  it('has no Turkish letters in the English text', () => {
    const wrong = entries.filter(([, entry]) =>
      (typeof entry === 'string' ? [entry] : [entry.one, entry.other]).some((text) => TURKISH.test(text)),
    );
    expect(wrong.map(([source]) => source)).toEqual([]);
  });
});

describe('t()', () => {
  it('returns the Turkish text with values filled in by default', () => {
    expect(getLocale()).toBe('tr');
    expect(t('Kaydet')).toBe('Kaydet');
    expect(t('{count} yüzey çizili', { count: 2 })).toBe('2 yüzey çizili');
  });

  it('translates to English and picks the plural by count', () => {
    setCurrentLocale('en');
    expect(t('Kaydet')).toBe('Save');
    expect(t('{count} yüzey çizili', { count: 1 })).toBe('1 surface marked');
    expect(t('{count} yüzey çizili', { count: 3 })).toBe('3 surfaces marked');
  });

  it('falls back to the Turkish text when there is no entry', () => {
    setCurrentLocale('en');
    expect(t('Salonun duvarları')).toBe('Salonun duvarları');
    expect(t('Ali Usta')).toBe('Ali Usta');
  });

  it('translates finished text by its template and translates the filled-in values', () => {
    setCurrentLocale('en');
    expect(t('Kapı sayısı 0 veya pozitif tam sayı olmalı.')).toBe('Door count must be 0 or a positive whole number.');
    expect(t('Koruyucu örtü (20 m²)')).toBe('Dust sheet (20 m²)');
    expect(t('%10 fire payı eklendi')).toBe('10% waste allowance added');
  });
  it('upper-cases with Turkish dotted and dotless i', () => {
    expect(toUpper('Piyasa referansı', 'tr')).toBe('PİYASA REFERANSI');
    expect(toUpper('Adım 1 / 6', 'tr')).toBe('ADIM 1 / 6');
    expect(toUpper('Market reference', 'en')).toBe('MARKET REFERENCE');
  });
});

describe('English engine and rules output', () => {
  const english = (text: string) => {
    const out = t(text);
    expect({ text, out, turkish: TURKISH.test(out) }).toEqual({ text, out, turkish: false });
    return out;
  };

  beforeEach(() => setCurrentLocale('en'));

  it('translates materials and assumptions of a full project', () => {
    const result = calculateProject([
      room({ surfaceType: 'concrete', surfaceCondition: 'poor' }),
      room({ surfaceType: 'new_plaster', surfaceCondition: 'minor_repair', length: 12, width: 10 }),
    ]);
    if (!result.ok) throw new Error('expected a calculation');
    const { materials, assumptions } = result.value;
    for (const m of materials) {
      expect(english(m.name)).not.toBe(m.name);
    }
    for (const a of assumptions) english(a.label);
  });

  it('translates every validation message', () => {
    const invalid = calculateProject([
      room({
        length: 0,
        width: 99,
        height: 0,
        coats: 9,
        paintWalls: false,
        paintCeiling: false,
        doors: [{ width: 0, height: 0, count: 1.5 }],
        windows: [{ width: 1, height: 9, count: 1 }],
        wallCoverage: { m2PerLitre: 99, source: 'user' },
      }),
      room({ doors: [{ width: 4, height: 2.4, count: 4 }] }),
    ]);
    const empty = calculateProject([]);
    const quick = quickEstimate({ houseType: '9+9' as never, floorArea: 1, includeCeilings: true, coats: 0 });
    const issues = [invalid, empty, quick].flatMap((r) => (r.ok ? [] : r.issues));
    expect(issues.length).toBeGreaterThan(10);
    for (const issue of issues) {
      expect(english(issue.message)).not.toBe(issue.message);
    }
  });

  it('translates cost groups and quote line kinds', () => {
    for (const label of [...Object.values(COST_GROUP_LABEL), ...Object.values(QUOTE_KIND_LABEL)]) {
      expect(english(label)).not.toBe(label);
    }
  });

  it('builds wall check plans in English', () => {
    for (const place of PLACES) {
      const plan = workPlan(SYMPTOMS.map((s) => s.id), place.value);
      for (const text of [...plan.steps.map((s) => s.text), ...plan.materials]) english(text);
    }
  });
});
