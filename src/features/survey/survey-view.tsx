import { StyleSheet, View } from 'react-native';

import { AssumptionList } from '@/features/calculator/results';
import { packageText, quantityText, SOURCE_LABEL } from '@/features/calculator/labels';
import { SEVERITY_LABEL, type Severity } from '@/features/inspect/rules';
import { formatDate } from '@/features/quotes/pdf';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/number';
import { Disclosure, Gradient, SectionTitle } from '@/ui/brand';
import { AppText, Badge, Button, Card, Notice, Row } from '@/ui/components';
import { fonts, radius, shadowOf, space, usePalette } from '@/ui/theme';

import type { SurveyFinding, SurveyModel } from './model';

const SEVERITY_TONE: Record<Severity, 'success' | 'accent' | 'primary'> = { diy: 'success', careful: 'accent', expert: 'primary' };

function Stat({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="heading" style={{ color: p.onHero, fontFamily: fonts.extrabold }}>
        {value}
      </AppText>
      <AppText variant="caption" style={{ color: p.onHeroMuted }}>
        {label}
      </AppText>
    </View>
  );
}

function Finding({ finding, onRemove, removing }: { finding: SurveyFinding; onRemove?: () => void; removing?: boolean }) {
  const p = usePalette();
  return (
    <Card style={finding.blocked ? { borderColor: p.danger } : undefined}>
      <View style={{ gap: 2 }}>
        <AppText variant="bodyStrong">{finding.title}</AppText>
        <AppText variant="small" tone="muted">
          {finding.placeLabel} · {formatDate(finding.createdAt)}
        </AppText>
      </View>
      {finding.symptoms.length === 0 ? (
        <AppText tone="muted">{t('Sorun işaretlenmedi.')}</AppText>
      ) : (
        <View style={styles.chips}>
          {finding.symptoms.map((s) => (
            <Badge key={s.id} label={`${s.label} · ${t(SEVERITY_LABEL[s.severity])}`} tone={SEVERITY_TONE[s.severity]} />
          ))}
        </View>
      )}
      {finding.blocked ? (
        <Notice tone="danger" icon="alert-circle">
          {t('Boyadan önce nedeni giderilmeli (nem, su ya da yapısal sorun).')}
        </Notice>
      ) : null}
      <Disclosure title={t('İş sırası')}>
        {finding.steps.map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
            <AppText variant="bodyStrong" tone="primary" style={{ minWidth: 20 }}>
              {i + 1}.
            </AppText>
            <AppText style={{ flex: 1 }}>{step}</AppText>
          </View>
        ))}
      </Disclosure>
      {onRemove ? <Button label={t('İncelemeyi sil')} icon="trash-outline" variant="ghost" loading={removing} onPress={onRemove} /> : null}
    </Card>
  );
}

/** The survey file as a screen. The same model is printed by surveyHtml. */
export function SurveyView({
  model,
  onRemoveFinding,
  removingId,
}: {
  model: SurveyModel;
  /** Homeowners can delete their inspections; painters only read. */
  onRemoveFinding?: (id: string) => void;
  removingId?: string | null;
}) {
  const p = usePalette();
  const totals = model.totals;
  return (
    <View style={{ gap: space.lg }} testID="survey-file">
      <View style={[styles.hero, shadowOf(p, 2)]}>
        <Gradient from={p.heroFrom} to={p.heroTo} />
        <AppText variant="overline" style={{ color: p.onHeroMuted }}>
          {t('Keşif dosyası · {date}', { date: formatDate(model.preparedOn) })}
        </AppText>
        <AppText variant="title" style={{ color: p.onHero }}>
          {model.title}
        </AppText>
        {model.ownerName ? <AppText style={{ color: p.onHeroMuted }}>{model.ownerName}</AppText> : null}
        <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap', marginTop: space.xs }}>
          <Stat label={t('Oda')} value={String(model.rooms.length)} />
          {totals ? <Stat label={t('Boyanacak alan')} value={`${formatNumber(totals.totalPaintable, 1)} m²`} /> : null}
          {totals ? <Stat label={t('Son kat boya')} value={`${formatNumber(totals.wallLitres + totals.ceilingLitres)} L`} /> : null}
          <Stat label={t('İnceleme')} value={String(model.findings.length)} />
        </View>
      </View>

      {model.calculationError ? (
        <Notice tone="danger" icon="alert-circle">
          {t('Hesap yapılamadı: {calculationError}', { calculationError: model.calculationError })}
        </Notice>
      ) : null}

      <View style={{ gap: space.sm }}>
        <SectionTitle title={t('Odalar')} />
        {model.rooms.length === 0 ? (
          <AppText tone="muted">{t('Henüz oda yok.')}</AppText>
        ) : (
          model.rooms.map((r, i) => (
            <Card key={`${r.name}-${i}`}>
              <AppText variant="bodyStrong">{r.name}</AppText>
              <AppText variant="small" tone="muted">
                {t('{length} × {width} m, tavan {height} m · {doors} kapı, {windows} pencere', {
                  length: formatNumber(r.length, 2),
                  width: formatNumber(r.width, 2),
                  height: formatNumber(r.height, 2),
                  doors: r.doors,
                  windows: r.windows,
                })}
              </AppText>
              <Row label={t('Duvar')} value={`${formatNumber(r.wallArea, 1)} m²`} />
              {r.ceilingArea > 0 ? <Row label={t('Tavan')} value={`${formatNumber(r.ceilingArea, 1)} m²`} /> : null}
              <Row label={t('Son kat boya')} value={`${formatNumber(r.litres, 1)} L`} strong />
            </Card>
          ))
        )}
      </View>

      {model.materials.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionTitle title={t('Malzeme ihtiyacı')} />
          <Card>
            {model.materials.map((m) => (
              <View key={m.category} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                <AppText style={{ flex: 1 }}>{t(m.name)}</AppText>
                <AppText variant="bodyStrong">{m.packages ? packageText(m.packages) : quantityText(m.quantity, m.unit)}</AppText>
                <Badge label={t(SOURCE_LABEL[m.source].label)} tone={SOURCE_LABEL[m.source].tone} />
              </View>
            ))}
          </Card>
          <Disclosure title={t('Hesapta kullanılan değerler')}>
            <AssumptionList assumptions={model.assumptions} />
          </Disclosure>
        </View>
      ) : null}

      {model.colours.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionTitle title={t('Seçilen renkler')} />
          <View style={styles.chips}>
            {model.colours.map((c) => (
              <View key={c.hex} style={[styles.colour, { backgroundColor: p.surface, borderColor: p.border }]} accessibilityLabel={c.surface ? `${t(c.name)}, ${t(c.surface)}` : t(c.name)}>
                <View style={{ height: 44, backgroundColor: c.hex }} />
                <View style={{ padding: space.sm, gap: 2 }}>
                  <AppText variant="caption" style={{ fontFamily: fonts.bold }} numberOfLines={1}>
                    {t(c.name)}
                  </AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 11 }}>
                    {c.surface ? t(c.surface) : c.hex}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
          <AppText variant="caption" tone="muted">
            {t('Renk adları genel tonlardır, marka ürün kodu değildir.')}
          </AppText>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <SectionTitle title={t('Duvar incelemeleri')} />
        {model.findings.length === 0 ? (
          <AppText tone="muted">{t('Kayıtlı inceleme yok.')}</AppText>
        ) : (
          model.findings.map((f) => (
            <Finding
              key={f.id}
              finding={f}
              onRemove={onRemoveFinding ? () => onRemoveFinding(f.id) : undefined}
              removing={removingId === f.id}
            />
          ))
        )}
      </View>

      {model.photoCount > 0 ? (
        <AppText tone="muted">{t('Projede {count} fotoğraf var; projeye katılan ustalar uygulamada görür.', { count: model.photoCount })}</AppText>
      ) : null}

      <Notice icon="information-circle">
        {t('Alan ve miktarlar girilen ölçülerden hesaplanan tahminlerdir. İncelemeler işaretlenen belirtilere göre genel bilgidir, teşhis değildir.')}
      </Notice>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.xs, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  colour: { width: 104, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
