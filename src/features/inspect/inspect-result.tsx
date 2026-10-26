import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { Gradient, Segmented, SectionTitle } from '@/ui/brand';
import { AppText, Button, Card, Icon, Notice, type IconName } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { fonts, radius, space, useFeatureColour, usePalette } from '@/ui/theme';

import { SaveInspection } from '@/features/survey/save-inspection';

import { assess, SEVERITY_LABEL, workPlan, type Place, type Severity, type Symptom } from './rules';
import { SpotPhoto, type Spot } from './spot-photo';


export const VERDICT_SHADES = { indigo: '#4C5FD5', teal: '#0A7570' } as const;

type Verdict = { title: string; text: string; icon: IconName; from: string; to: string };

/**
 * The verdict banner always has white text, so its gradients use fixed deep
 * shades rather than theme tokens, which turn light in dark mode.
 */
function verdictOf(worst: Severity | null, blocked: boolean): Verdict {
  if (worst === 'expert' || blocked) {
    return {
      title: t('Önce bir uzmana göster'),
      text: t('İşaretlediklerinden en az biri boyayla çözülmez. Nedeni giderilmeden yapılan boya kısa sürede bozulur.'),
      icon: 'alert-circle',
      from: '#B42318',
      to: '#5E2B3A',
    };
  }
  if (worst === 'careful') {
    return {
      title: t('Hazırlık gerekiyor'),
      text: t('Önce nedeni çöz, sonra boyaya geç. Aşağıdaki sırayı izle.'),
      icon: 'warning',
      from: VERDICT_SHADES.indigo,
      to: '#2E3C9E',
    };
  }
  if (worst === 'diy') {
    return {
      title: t('Biraz hazırlıkla boyanır'),
      text: t('Aşağıdaki sırayı izlersen bu işi kendin yapabilirsin.'),
      icon: 'construct',
      from: VERDICT_SHADES.indigo,
      to: VERDICT_SHADES.teal,
    };
  }
  return {
    title: t('Boyaya hazır görünüyor'),
    text: t('İşaretlediğin bir sorun yok. Temel hazırlıkla boyayabilirsin.'),
    icon: 'checkmark-circle',
    from: VERDICT_SHADES.teal,
    to: '#0B5F6B',
  };
}

const SEVERITY_ICON: Record<Severity, IconName> = { expert: 'alert-circle', careful: 'warning', diy: 'checkmark-circle' };

function useSeverityColour(severity: Severity): string {
  const p = usePalette();
  return { expert: p.danger, careful: p.accent, diy: p.success }[severity];
}

/** One problem: name and severity, with cause and steps when opened. */
function Finding({ symptom, open, onToggle, first }: { symptom: Symptom; open: boolean; onToggle: () => void; first: boolean }) {
  const p = usePalette();
  const colour = useSeverityColour(symptom.severity);
  return (
    <View style={[!first && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${t(symptom.label)}, ${t(SEVERITY_LABEL[symptom.severity])}`}
        onPress={onToggle}
        style={styles.finding}>
        <View style={[styles.findingIcon, { backgroundColor: p.surfaceMuted }]}>
          <Icon name={SEVERITY_ICON[symptom.severity]} size={20} color={colour} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">{t(symptom.label)}</AppText>
          <AppText variant="small" style={{ color: colour, fontFamily: fonts.semibold }}>
            {t(SEVERITY_LABEL[symptom.severity])}
          </AppText>
        </View>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={p.textMuted} />
      </PressableScale>
      {open ? (
        <View style={{ gap: space.sm, paddingBottom: space.md }}>
          <AppText variant="bodyStrong">{t('Olası neden')}</AppText>
          <AppText>{t(symptom.cause)}</AppText>
          <AppText variant="bodyStrong">{t('Ne yapmalı?')}</AppText>
          {symptom.steps.map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
              <AppText variant="bodyStrong" tone="primary" style={{ minWidth: 20 }}>
                {i + 1}.
              </AppText>
              <AppText style={{ flex: 1 }}>{t(step)}</AppText>
            </View>
          ))}
          {symptom.callExpertIf ? (
            <Notice tone="accent" icon="warning">
              {t(symptom.callExpertIf)}
            </Notice>
          ) : null}
          {symptom.guideSlug ? (
            <Button
              label={t('İlgili rehberi oku')}
              icon="book"
              variant="secondary"
              onPress={() => router.push({ pathname: '/guide/[slug]', params: { slug: symptom.guideSlug! } })}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function InspectResult({
  selected,
  place,
  photo,
  spots,
  onEdit,
  onRestart,
}: {
  selected: string[];
  place: Place;
  photo: { uri: string; width: number; height: number } | null;
  spots: Spot[];
  onEdit: () => void;
  onRestart: () => void;
}) {
  const p = usePalette();
  const f = useFeatureColour('inspect');
  const { symptoms, worst } = assess(selected);
  const plan = workPlan(selected, place);
  const verdict = verdictOf(worst, plan.blocked);

  const [view, setView] = useState<'result' | 'photo'>('result');
  const [opened, setOpened] = useState<string[]>([]);
  const allOpen = symptoms.length > 0 && symptoms.every((s) => opened.includes(s.id));
  const toggle = (id: string) => setOpened((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <View style={{ gap: space.lg }} testID="inspect-result">
      {photo ? (
        <Segmented
          options={[
            { value: 'result', label: t('Analiz Sonucu'), icon: 'clipboard' },
            { value: 'photo', label: t('Fotoğraf'), icon: 'image' },
          ]}
          value={view}
          onChange={setView}
        />
      ) : null}

      {photo && view === 'photo' ? (
        <View style={{ gap: space.sm }}>
          <SpotPhoto uri={photo.uri} aspect={photo.width / photo.height} spots={spots} marking={false} maxHeight={420} />
          <AppText variant="small" tone="muted">
            {spots.length > 0 ? t('İşaretlediğin yerler numarayla gösteriliyor.') : t('Fotoğrafta bir yer işaretlemedin.')}
          </AppText>
        </View>
      ) : (
        <>
          {photo ? (
            <View testID="inspect-photo-header">
              <SpotPhoto uri={photo.uri} aspect={photo.width / photo.height} spots={spots} marking={false} maxHeight={200} />
            </View>
          ) : null}
          <View style={styles.hero}>
            <Gradient from={verdict.from} to={verdict.to} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon name={verdict.icon} size={22} color="#FFFFFF" />
              <AppText variant="overline" style={{ color: '#FFFFFF', opacity: 0.9 }}>
                {symptoms.length > 0 ? t('{count} bulgu', { count: symptoms.length }) : t('Sorun işaretlenmedi')}
              </AppText>
            </View>
            <AppText variant="title" style={{ color: '#FFFFFF', fontSize: 26, lineHeight: 32 }} testID="inspect-verdict">
              {verdict.title}
            </AppText>
            <AppText style={{ color: '#FFFFFF', opacity: 0.92 }}>{verdict.text}</AppText>
          </View>

          {symptoms.length > 0 ? (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Icon name="warning" size={20} color={p.danger} />
                <AppText variant="heading" style={{ color: p.danger, flex: 1 }}>
                  {t('Tespit Edilen Sorunlar')}
                </AppText>
              </View>
              <View>
                {symptoms.map((s, i) => (
                  <Finding key={s.id} symptom={s} first={i === 0} open={opened.includes(s.id)} onToggle={() => toggle(s.id)} />
                ))}
              </View>
            </Card>
          ) : null}

          <SectionTitle title={t('Öneriler')} />
          <Card>
            {plan.steps.map((s) => {
              const urgent = s.key === 'expert' || s.key === 'water';
              return (
                <View key={s.key} style={styles.step}>
                  <Icon name={urgent ? 'alert-circle' : 'checkmark-circle'} size={22} color={urgent ? p.danger : f.base} />
                  <AppText style={{ flex: 1 }}>{s.text}</AppText>
                </View>
              );
            })}
          </Card>

          <SectionTitle title={t('Gerekecekler')} />
          <View style={styles.chips}>
            {plan.materials.map((m) => (
              <View key={m} style={[styles.chip, { backgroundColor: p.surfaceMuted }]}>
                <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
                  {m}
                </AppText>
              </View>
            ))}
          </View>

          {symptoms.length > 0 ? (
            <Button
              label={allOpen ? t('Raporu kısalt') : t('Detaylı Rapor')}
              icon={allOpen ? 'chevron-up' : 'document-text'}
              variant="cta"
              size="lg"
              onPress={() => setOpened(allOpen ? [] : symptoms.map((s) => s.id))}
            />
          ) : null}
        </>
      )}

      <View style={{ gap: space.sm }}>
        <SaveInspection symptoms={symptoms.map((s) => s.id)} place={place} />
        <Button label={t('Ne kadar boya gerekir?')} icon="color-fill" variant="secondary" onPress={() => router.push('/calculate')} />
        <Button label={t('Bir ustaya sor')} icon="chatbubbles" variant="secondary" onPress={() => router.push('/ask')} />
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button label={t('Cevapları düzenle')} icon="create" variant="ghost" onPress={onEdit} />
          <Button label={t('Yeniden incele')} icon="refresh" variant="ghost" onPress={onRestart} />
        </View>
      </View>

      <Notice icon="information-circle">
        {t('Bu bir teşhis değildir. BoyaCep fotoğrafını otomatik olarak incelemez; senin işaretlediğin belirtilere göre genel bilgi verir. Emin olmadığın durumlarda bir ustaya göster.')}
      </Notice>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.sm, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.xs },
  finding: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm },
  findingIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
