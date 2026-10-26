import type { PriceQuality, RangeEstimate } from '@/engine';
import { getLocale, msg, t } from '@/i18n';
import { formatNumber } from '@/lib/number';

/** Whole lira: 12.500 ₺ (Turkish) or ₺12,500 (English). Türkiye prices stay in lira in every language. */
export function formatLira(value: number): string {
  const amount = formatNumber(value, 0);
  return getLocale() === 'en' ? `₺${amount}` : `${amount} ₺`;
}

/** "100–150 ₺" or "₺100–150" */
export function formatLiraRange(range: RangeEstimate): string {
  if (range.low === range.high) return formatLira(range.low);
  const low = formatNumber(range.low, 0);
  const high = formatNumber(range.high, 0);
  return getLocale() === 'en' ? `₺${low}–${high}` : `${low}–${high} ₺`;
}

/** "2026-10-20" → "20.10.2026"; "2026-10" → "10.2026" (Turkish) or "20/10/2026", "10/2026" (English) */
export function formatResearchDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const sep = getLocale() === 'en' ? '/' : '.';
  return d ? [d, m, y].join(sep) : [m, y].join(sep);
}

export const QUALITY_LABEL: Record<PriceQuality, string> = {
  strong: msg('Güçlü veri'),
  medium: msg('Orta düzey veri'),
  limited: msg('Sınırlı veri'),
  insufficient: msg('Yetersiz veri'),
};

export const QUALITY_TONE: Record<PriceQuality, 'success' | 'primary' | 'accent' | 'muted'> = {
  strong: 'success',
  medium: 'primary',
  limited: 'accent',
  insufficient: 'muted',
};

export const QUALITY_HELP: Record<PriceQuality, string> = {
  strong: msg('En az 30 kayıt, 3 bağımsız kaynak, en yenisi son 3 ayda.'),
  medium: msg('En az 10 kayıt, 2 bağımsız kaynak, en yenisi son 6 ayda.'),
  limited: msg('En az 5 kayıt, en yenisi son 1 yılda. Yön gösterir, kesin değildir.'),
  insufficient: msg('Güvenilir bir aralık için kayıt yok ya da çok az.'),
};

export function qualityLabel(quality: PriceQuality): string {
  return t(QUALITY_LABEL[quality]);
}
