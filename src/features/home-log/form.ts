import { msg, t } from '@/i18n';
import type { HomeLogRow, PaintFinish, ProjectColourRow } from '@/lib/database.types';
import { dayText, parseDay, todayIso } from '@/lib/day';

import type { HomeLogDraft } from './api';

export const FINISH_OPTIONS: { value: PaintFinish; label: string }[] = [
  { value: 'matt', label: msg('Mat') },
  { value: 'eggshell', label: msg('İpek mat') },
  { value: 'satin', label: msg('Yarı parlak') },
  { value: 'gloss', label: msg('Parlak') },
];

export const FINISH_LABEL = Object.fromEntries(FINISH_OPTIONS.map((o) => [o.value, o.label])) as Record<PaintFinish, string>;

export interface HomeLogForm {
  place: string;
  colourName: string;
  colourHex: string;
  colourCode: string;
  product: string;
  finish: PaintFinish | null;
  date: string;
  painter: string;
  note: string;
}

export type HomeLogErrors = Partial<Record<'place' | 'colourHex' | 'date' | 'note', string>>;

export function emptyHomeLogForm(now = new Date()): HomeLogForm {
  return { place: '', colourName: '', colourHex: '', colourCode: '', product: '', finish: null, date: dayText(todayIso(now)), painter: '', note: '' };
}

/** "#f4f1ea", "F4F1EA" or "#fff" as #F4F1EA; null when it is not a colour code. */
export function normaliseHex(text: string): string | null {
  const s = text.trim().replace(/^#/, '');
  if (/^[0-9a-f]{6}$/i.test(s)) return `#${s.toUpperCase()}`;
  if (/^[0-9a-f]{3}$/i.test(s)) return `#${[...s].map((c) => c + c).join('').toUpperCase()}`;
  return null;
}

const orNull = (text: string, max: number) => text.trim().slice(0, max) || null;

export function toHomeLogDraft(
  form: HomeLogForm,
  { projectId = null, now = new Date() }: { projectId?: string | null; now?: Date } = {},
): { ok: true; draft: HomeLogDraft } | { ok: false; errors: HomeLogErrors } {
  const errors: HomeLogErrors = {};
  const place = form.place.trim();
  if (!place) errors.place = msg('Nereyi boyadığını yaz; örn. Salon duvarları.');
  else if (place.length > 80) errors.place = msg('En fazla 80 harf.');

  const hex = form.colourHex.trim() ? normaliseHex(form.colourHex) : null;
  if (form.colourHex.trim() && !hex) errors.colourHex = msg('Renk kodunu #F4F1EA gibi yaz ya da boş bırak.');

  const day = parseDay(form.date);
  if (!day) errors.date = msg('Tarihi GG.AA.YYYY olarak yaz.');
  else if (day > todayIso(now)) errors.date = msg('İleri bir tarih olamaz.');
  else if (day < '1950-01-01') errors.date = msg('Tarih 1950’den önce olamaz.');

  if (form.note.trim().length > 500) errors.note = msg('En fazla 500 harf.');

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    draft: {
      project_id: projectId,
      place,
      colour_name: orNull(form.colourName, 80),
      colour_hex: hex,
      colour_code: orNull(form.colourCode, 40),
      product: orNull(form.product, 120),
      finish: form.finish,
      painted_on: day!,
      painter: orNull(form.painter, 80),
      note: orNull(form.note, 500),
    },
  };
}

/** One entry per chosen project colour; the place is the surface the colour was chosen for. */
export function draftsFromProject(
  project: { id: string; title: string },
  colours: Pick<ProjectColourRow, 'name' | 'hex' | 'surface'>[],
  now = new Date(),
): HomeLogDraft[] {
  return colours.map((c) => ({
    project_id: project.id,
    place: (c.surface ? t(c.surface) : project.title).slice(0, 80),
    colour_name: t(c.name).slice(0, 80),
    colour_hex: normaliseHex(c.hex),
    colour_code: null,
    product: null,
    finish: null,
    painted_on: todayIso(now),
    painter: null,
    note: null,
  }));
}

/** Matches place, colour, code, product and painter, ignoring case the Turkish way. */
export function searchHomeLog(rows: HomeLogRow[], query: string): HomeLogRow[] {
  const q = query.trim().toLocaleLowerCase('tr');
  if (!q) return rows;
  return rows.filter((r) =>
    [r.place, r.colour_name, r.colour_code, r.product, r.painter, r.note].some((v) => v?.toLocaleLowerCase('tr').includes(q)),
  );
}
