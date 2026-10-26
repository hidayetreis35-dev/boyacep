import { packageText, quantityText } from '@/features/calculator/labels';
import { SEVERITY_LABEL } from '@/features/inspect/rules';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/number';

import type { SurveyModel } from './model';

/**
 * "Teklif için eksik bilgi": what a painter would ask before quoting.
 * `missing` blocks a fair quote; `tip` makes the quote more accurate.
 */
export type SurveyGap = {
  id: 'rooms' | 'calculation' | 'photos' | 'photos_per_room' | 'colours' | 'inspection' | 'city';
  level: 'missing' | 'tip';
  text: string;
  /** Where the user fixes it. */
  action: 'room' | 'photos' | 'colour' | 'inspect' | 'city';
};

export function surveyGaps(model: SurveyModel, { hasCity }: { hasCity: boolean }): SurveyGap[] {
  const gaps: SurveyGap[] = [];
  if (model.rooms.length === 0) {
    gaps.push({ id: 'rooms', level: 'missing', text: t('Oda ölçüsü yok. Usta boyanacak alanı bilmeden fiyat veremez.'), action: 'room' });
  }
  if (model.calculationError) {
    gaps.push({ id: 'calculation', level: 'missing', text: t('Bir odanın ölçüleri hatalı: {message}', { message: model.calculationError }), action: 'room' });
  }
  if (model.photoCount === 0) {
    gaps.push({ id: 'photos', level: 'missing', text: t('Duvar fotoğrafı yok. Usta duvarın durumunu görmeden işçiliği tahmin edemez.'), action: 'photos' });
  } else if (model.photoCount < model.rooms.length) {
    gaps.push({ id: 'photos_per_room', level: 'tip', text: t('Her oda için en az bir fotoğraf ekle; {count} odaya {photos} fotoğraf var.', { count: model.rooms.length, photos: model.photoCount }), action: 'photos' });
  }
  if (model.colours.length === 0) {
    gaps.push({ id: 'colours', level: 'tip', text: t('Renk seçilmedi. Koyu renk ya da çok renk, kat sayısını ve işçiliği değiştirir.'), action: 'colour' });
  }
  if (model.findings.length === 0) {
    gaps.push({ id: 'inspection', level: 'tip', text: t('Duvar incelemesi yok. Nem, küf ya da çatlak varsa usta önceden bilmeli.'), action: 'inspect' });
  }
  if (!hasCity) {
    gaps.push({ id: 'city', level: 'tip', text: t('Şehrini seç; dosyada şehrindeki piyasa aralığını görürsün.'), action: 'city' });
  }
  return gaps;
}

export const isReadyForQuote = (gaps: SurveyGap[]) => !gaps.some((g) => g.level === 'missing');

/** A short plain-text summary for WhatsApp; the PDF carries the details. */
export function surveyText(model: SurveyModel): string {
  const lines = [t('BoyaCep keşif dosyası: {title}', { title: model.title }), ''];
  if (model.rooms.length > 0) {
    lines.push(t('Odalar:'));
    for (const r of model.rooms) {
      lines.push(
        t('• {name}: {length} × {width} m, tavan {height} m; duvar {wall} m², tavan {ceiling} m²', {
          name: r.name,
          length: formatNumber(r.length, 2),
          width: formatNumber(r.width, 2),
          height: formatNumber(r.height, 2),
          wall: formatNumber(r.wallArea, 1),
          ceiling: formatNumber(r.ceilingArea, 1),
        }),
      );
    }
  }
  if (model.totals) {
    lines.push('', t('Toplam boyanacak alan: {area} m²', { area: formatNumber(model.totals.totalPaintable, 1) }));
    const paint = model.materials.filter((m) => m.packages);
    for (const m of paint) lines.push(`• ${t(m.name)}: ${packageText(m.packages!)}`);
    const other = model.materials.filter((m) => !m.packages && m.quantity > 0);
    for (const m of other) lines.push(`• ${t(m.name)}: ${quantityText(m.quantity, m.unit)}`);
  }
  if (model.colours.length > 0) {
    lines.push('', t('Renkler: {colours}', { colours: model.colours.map((c) => (c.surface ? `${t(c.name)} (${t(c.surface)})` : t(c.name))).join(', ') }));
  }
  if (model.findings.length > 0) {
    lines.push('', t('Duvar durumu:'));
    for (const f of model.findings) {
      const symptoms = f.symptoms.map((s) => `${s.label} (${t(SEVERITY_LABEL[s.severity])})`).join(', ') || t('Sorun işaretlenmedi.');
      lines.push(`• ${f.title}: ${symptoms}`);
    }
  }
  if (model.photoCount > 0) lines.push('', t('{count} fotoğraf var; PDF dosyasında ve uygulamada görebilirsin.', { count: model.photoCount }));
  lines.push('', t('Ölçüler ev sahibinin girdiği değerlerdir; miktarlar BoyaCep tahminidir.'));
  return lines.join('\n');
}
