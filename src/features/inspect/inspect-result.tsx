import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Disclosure, Gradient, SectionTitle } from '@/ui/brand';
import { AppText, Badge, Button, Card, Icon, Notice, type IconName } from '@/ui/components';
import { fonts, radius, space, useFeatureColour, usePalette } from '@/ui/theme';

import { SaveInspection } from '@/features/survey/save-inspection';

import { assess, SEVERITY_LABEL, workPlan, type Place, type Severity, type Symptom } from './rules';
import { SpotPhoto, type Spot } from './spot-photo';

const SEVERITY_TONE: Record<Severity, 'success' | 'accent' | 'primary'> = { diy: 'success', careful: 'accent', expert: 'primary' };

export const VERDICT_SHADES = { indigo: '#4C5FD5', teal: '#0A7570' } as const;

type Verdict = { title: string; text: string; icon: IconName; from: string; to: string };

/**
 * The verdict banner always has white text, so its gradients use fixed deep
 * shades rather than theme tokens, which turn light in dark mode.
 */
function verdictOf(worst: Severity | null, blocked: boolean): Verdict {
  if (worst === 'expert' || blocked) {
    return {
      title: 'Önce bir uzmana göster',
      text: 'İşaretlediklerinden en az biri boyayla çözülmez. Nedeni giderilmeden yapılan boya kısa sürede bozulur.',
      icon: 'alert-circle',
      from: '#B42318',
      to: '#5E2B3A',
    };
  }
  if (worst === 'careful') {
    return {
      title: 'Hazırlık gerekiyor',
      text: 'Önce nedeni çöz, sonra boyaya geç. Aşağıdaki sırayı izle.',
      icon: 'warning',
      from: VERDICT_SHADES.indigo,
      to: '#2E3C9E',
    };
  }
  if (worst === 'diy') {
    return {
      title: 'Biraz hazırlıkla boyanır',
      text: 'Aşağıdaki sırayı izlersen bu işi kendin yapabilirsin.',
      icon: 'construct',
      from: VERDICT_SHADES.indigo,
      to: VERDICT_SHADES.teal,
    };
  }
  return {
    title: 'Boyaya hazır görünüyor',
    text: 'İşaretlediğin bir sorun yok. Temel hazırlıkla boyayabilirsin.',
    icon: 'checkmark-circle',
    from: VERDICT_SHADES.teal,
    to: '#0B5F6B',
  };
}

function Finding({ symptom }: { symptom: Symptom }) {
  return (
    <Disclosure title={symptom.label}>
      <View style={{ gap: space.sm }}>
        <Badge label={SEVERITY_LABEL[symptom.severity]} tone={SEVERITY_TONE[symptom.severity]} />
        <AppText variant="bodyStrong">Olası neden</AppText>
        <AppText>{symptom.cause}</AppText>
        <AppText variant="bodyStrong">Ne yapmalı?</AppText>
        {symptom.steps.map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
            <AppText variant="bodyStrong" tone="primary" style={{ minWidth: 20 }}>
              {i + 1}.
            </AppText>
            <AppText style={{ flex: 1 }}>{step}</AppText>
          </View>
        ))}
        {symptom.callExpertIf ? (
          <Notice tone="accent" icon="warning">
            {symptom.callExpertIf}
          </Notice>
        ) : null}
        {symptom.guideSlug ? (
          <Button
            label="İlgili rehberi oku"
            icon="book"
            variant="secondary"
            onPress={() => router.push({ pathname: '/guide/[slug]', params: { slug: symptom.guideSlug! } })}
          />
        ) : null}
      </View>
    </Disclosure>
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

  return (
    <View style={{ gap: space.lg }} testID="inspect-result">
      <View style={styles.hero}>
        <Gradient from={verdict.from} to={verdict.to} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name={verdict.icon} size={22} color="#FFFFFF" />
          <AppText variant="overline" style={{ color: '#FFFFFF', opacity: 0.9 }}>
            {symptoms.length > 0 ? `${symptoms.length} bulgu` : 'Sorun işaretlenmedi'}
          </AppText>
        </View>
        <AppText variant="title" style={{ color: '#FFFFFF', fontSize: 26, lineHeight: 32 }} testID="inspect-verdict">
          {verdict.title}
        </AppText>
        <AppText style={{ color: '#FFFFFF', opacity: 0.92 }}>{verdict.text}</AppText>
        {symptoms.length > 0 ? (
          <View style={styles.chips}>
            {symptoms.map((s) => (
              <View key={s.id} style={[styles.chip, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <AppText variant="small" style={{ color: '#FFFFFF', fontFamily: fonts.semibold }}>
                  {s.label}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {photo && spots.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionTitle title="İşaretlediğin yerler" />
          <SpotPhoto uri={photo.uri} aspect={photo.width / photo.height} spots={spots} marking={false} maxHeight={240} />
        </View>
      ) : null}

      <SectionTitle title="İş sırası" />
      <Card>
        {plan.steps.map((s, i) => (
          <View key={s.key} style={styles.step}>
            <View style={[styles.stepNo, { backgroundColor: s.key === 'expert' || s.key === 'water' ? p.dangerSoft : f.soft }]}>
              <AppText variant="small" style={{ color: s.key === 'expert' || s.key === 'water' ? p.danger : f.ink, fontFamily: fonts.bold }}>
                {i + 1}
              </AppText>
            </View>
            <AppText style={{ flex: 1 }}>{s.text}</AppText>
          </View>
        ))}
      </Card>

      <SectionTitle title="Gerekecekler" />
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
        <View style={{ gap: space.sm }}>
          <SectionTitle title="Bulgular ve nedenleri" />
          {symptoms.map((s) => (
            <Finding key={s.id} symptom={s} />
          ))}
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <SaveInspection symptoms={symptoms.map((s) => s.id)} place={place} />
        <Button label="Ne kadar boya gerekir?" icon="color-fill" variant="cta" size="lg" onPress={() => router.push('/calculate')} />
        <Button label="Bir ustaya sor" icon="chatbubbles" variant="secondary" onPress={() => router.push('/ask')} />
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button label="Cevapları düzenle" icon="create" variant="ghost" onPress={onEdit} />
          <Button label="Yeniden incele" icon="refresh" variant="ghost" onPress={onRestart} />
        </View>
      </View>

      <Notice icon="information-circle">
        Bu bir teşhis değildir. BoyaCep fotoğrafını otomatik olarak incelemez; senin işaretlediğin belirtilere göre genel bilgi verir. Emin olmadığın
        durumlarda bir ustaya göster.
      </Notice>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.sm, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.xs },
  stepNo: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
