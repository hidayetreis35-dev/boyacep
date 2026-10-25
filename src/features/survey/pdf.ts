import { ENGINE_VERSION } from '@/engine';
import { packageText, SOURCE_LABEL } from '@/features/calculator/labels';
import { SEVERITY_LABEL } from '@/features/inspect/rules';
import { formatDate } from '@/features/quotes/pdf';
import { escapeHtml } from '@/lib/html';
import { formatNumber } from '@/lib/number';

import type { SurveyModel } from './model';

const m2 = (value: number) => `${formatNumber(value, 1)} m²`;
const litres = (value: number) => `${formatNumber(value, 1)} L`;

/** A printable A4 survey file. Every value from users is escaped. */
export function surveyHtml(model: SurveyModel): string {
  const t = model.totals;
  const summary = t
    ? `<div class="stats">
        <div><b>${model.rooms.length}</b><span>oda</span></div>
        <div><b>${m2(t.totalPaintable)}</b><span>boyanacak alan</span></div>
        <div><b>${litres(t.wallLitres + t.ceilingLitres)}</b><span>son kat boya</span></div>
        ${t.primerLitres > 0 ? `<div><b>${litres(t.primerLitres)}</b><span>astar</span></div>` : ''}
      </div>`
    : '';

  const rooms = model.rooms.length
    ? `<h2>Odalar</h2>
      <table>
        <thead><tr><th>Oda</th><th>Ölçü (U × G × Y)</th><th class="num">Kapı / pencere</th><th class="num">Duvar</th><th class="num">Tavan</th><th class="num">Boya</th></tr></thead>
        <tbody>${model.rooms
          .map(
            (r) => `<tr>
              <td>${escapeHtml(r.name)}</td>
              <td>${formatNumber(r.length, 2)} × ${formatNumber(r.width, 2)} × ${formatNumber(r.height, 2)} m</td>
              <td class="num">${r.doors} / ${r.windows}</td>
              <td class="num">${m2(r.wallArea)}</td>
              <td class="num">${r.ceilingArea > 0 ? m2(r.ceilingArea) : '—'}</td>
              <td class="num">${litres(r.litres)}</td>
            </tr>`,
          )
          .join('')}</tbody>
      </table>`
    : '';

  const calcError = model.calculationError
    ? `<p class="warn">Hesap yapılamadı: ${escapeHtml(model.calculationError)}</p>`
    : '';

  const materials = model.materials.length
    ? `<h2>Malzeme ihtiyacı</h2>
      <table>
        <thead><tr><th>Malzeme</th><th class="num">Miktar</th><th>Kaynak</th></tr></thead>
        <tbody>${model.materials
          .map(
            (m) => `<tr>
              <td>${escapeHtml(m.name)}</td>
              <td class="num">${m.packages ? packageText(m.packages) : `${formatNumber(m.quantity)} ${m.unit}`}</td>
              <td>${SOURCE_LABEL[m.source].label}</td>
            </tr>`,
          )
          .join('')}</tbody>
      </table>`
    : '';

  const colours = model.colours.length
    ? `<h2>Seçilen renkler</h2>
      <div class="colours">${model.colours
        .map(
          (c) => `<div class="colour"><i style="background:${/^#[0-9A-F]{6}$/i.test(c.hex) ? c.hex : '#FFFFFF'}"></i>
            <b>${escapeHtml(c.name)}</b><br><span class="muted">${escapeHtml(c.surface ?? c.hex)}</span></div>`,
        )
        .join('')}</div>
      <p class="muted small">Renk adları genel tonlardır, marka ürün kodu değildir. Boyayı almadan önce mağazada renk kartından kontrol edin.</p>`
    : '';

  const findings = model.findings.length
    ? `<h2>Duvar incelemeleri</h2>
      ${model.findings
        .map(
          (f) => `<div class="finding${f.blocked ? ' blocked' : ''}">
            <b>${escapeHtml(f.title)}</b> <span class="muted">· ${escapeHtml(f.placeLabel)} · ${formatDate(f.createdAt)}</span><br>
            ${
              f.symptoms.length
                ? f.symptoms.map((s) => `${escapeHtml(s.label)} <span class="muted">(${SEVERITY_LABEL[s.severity]})</span>`).join(', ')
                : 'Sorun işaretlenmedi.'
            }
            ${f.blocked ? '<p class="warn">Boyadan önce nedeni giderilmeli (nem, su ya da yapısal sorun).</p>' : ''}
            <ol>${f.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
          </div>`,
        )
        .join('')}
      <p class="muted small">İncelemeler ev sahibinin işaretlediği belirtilere göre hazırlanmış genel bilgidir, teşhis değildir.</p>`
    : '';

  const photos =
    model.photoCount > 0
      ? `<p>Projede ${model.photoCount} fotoğraf var. Projeye katılan ustalar fotoğrafları BoyaCep uygulamasında görür.</p>`
      : '';

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>Keşif dosyası - ${escapeHtml(model.title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1B1F1E; font-size: 12px; }
  h1 { font-size: 22px; margin: 0; color: #12665F; }
  h2 { font-size: 15px; margin: 22px 0 8px; color: #12665F; }
  .muted { color: #5C6664; }
  .small { font-size: 10px; }
  .head { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 12px; }
  .stats { display: flex; gap: 12px; margin: 12px 0; }
  .stats div { flex: 1; padding: 10px; border: 1px solid #E3E1DC; border-radius: 8px; }
  .stats b { display: block; font-size: 16px; }
  .stats span { color: #5C6664; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 6px 4px; border-bottom: 1px solid #E3E1DC; text-align: left; vertical-align: top; }
  th { font-size: 11px; color: #5C6664; }
  .num { text-align: right; white-space: nowrap; }
  .colours { display: flex; flex-wrap: wrap; gap: 10px; }
  .colour { width: 120px; }
  .colour i { display: block; height: 40px; border-radius: 6px; border: 1px solid #E3E1DC; margin-bottom: 4px; }
  .finding { padding: 10px; border: 1px solid #E3E1DC; border-radius: 8px; margin-bottom: 8px; page-break-inside: avoid; }
  .finding.blocked { border-color: #B42318; }
  .finding ol { margin: 6px 0 0; padding-left: 18px; }
  .warn { color: #B42318; font-weight: 600; margin: 6px 0; }
  footer { margin-top: 28px; font-size: 10px; color: #5C6664; }
</style></head>
<body>
  <div class="head">
    <div><h1>Keşif dosyası</h1><div style="font-size:15px;font-weight:600">${escapeHtml(model.title)}</div>${
      model.ownerName ? `<div class="muted">${escapeHtml(model.ownerName)}</div>` : ''
    }</div>
    <div class="muted" style="text-align:right">Tarih: ${formatDate(model.preparedOn)}</div>
  </div>
  ${summary}
  ${calcError}
  ${rooms}
  ${materials}
  ${colours}
  ${findings}
  ${photos}
  <footer>BoyaCep ile hazırlandı. Alan ve miktarlar ev sahibinin girdiği ölçülerden hesaplanan tahminlerdir; teklif vermeden önce ölçüleri yerinde kontrol edin. Hesap sürümü ${ENGINE_VERSION}.</footer>
</body></html>`;
}
