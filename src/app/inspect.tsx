import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { assess, SEVERITY_LABEL, SYMPTOMS, type Severity, type Symptom } from '@/features/inspect/rules';
import { AppText, Badge, Button, Card, Notice, Screen, Toggle } from '@/ui/components';
import { space } from '@/ui/theme';

const SEVERITY_TONE: Record<Severity, 'success' | 'accent' | 'primary'> = { diy: 'success', careful: 'accent', expert: 'primary' };

function SymptomResult({ symptom }: { symptom: Symptom }) {
  return (
    <Card>
      <View style={{ gap: space.xs }}>
        <Badge label={SEVERITY_LABEL[symptom.severity]} tone={SEVERITY_TONE[symptom.severity]} />
        <AppText variant="heading">{symptom.label}</AppText>
      </View>
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
      {symptom.callExpertIf ? <Notice icon="warning">{symptom.callExpertIf}</Notice> : null}
      {symptom.guideSlug ? (
        <Button
          label="İlgili rehberi oku"
          icon="book"
          variant="secondary"
          onPress={() => router.push({ pathname: '/guide/[slug]', params: { slug: symptom.guideSlug! } })}
        />
      ) : null}
    </Card>
  );
}

export default function InspectScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const result = assess(selected);

  const toggle = (id: string) => {
    setShowResult(false);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Duvarını İncele' }} />
      <AppText variant="heading">Duvarında ne görüyorsun?</AppText>
      <AppText tone="muted">Gördüğün her şeyi işaretle. Sana olası nedeni ve doğru iş sırasını gösterelim.</AppText>

      {SYMPTOMS.map((s) => (
        <View key={s.id} style={{ gap: space.xs }}>
          <Toggle label={s.label} value={selected.includes(s.id)} onChange={() => toggle(s.id)} />
          <AppText variant="caption" tone="muted" style={{ paddingHorizontal: space.sm }}>
            {s.hint}
          </AppText>
        </View>
      ))}

      <Button label="Sonucu göster" icon="search" disabled={selected.length === 0} onPress={() => setShowResult(true)} />

      {showResult && result.symptoms.length > 0 ? (
        <View style={{ gap: space.md }} testID="inspect-result">
          {result.worst === 'expert' ? (
            <Notice tone="danger" icon="alert-circle">
              Seçtiklerinden en az biri bir uzmanın görmesi gereken bir sorun olabilir. Boyaya başlamadan önce o sorunu çözdür.
            </Notice>
          ) : null}
          {result.symptoms.map((s) => (
            <SymptomResult key={s.id} symptom={s} />
          ))}
        </View>
      ) : null}

      <Notice icon="information-circle">
        Bu sonuçlar fotoğrafı görmeden verilen genel bilgilerdir. Fotoğraftan yapay zekâ ile inceleme ileride eklenecek.
      </Notice>
    </Screen>
  );
}
