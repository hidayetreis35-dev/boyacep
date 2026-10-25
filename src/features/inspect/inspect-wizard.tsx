import { useState } from 'react';
import { View } from 'react-native';

import type { PickedPhoto } from '@/features/photos/picker';
import { PhotoSourceButtons } from '@/features/photos/photo-source';
import { IconBubble, OptionCard, OptionGrid, StepProgress, WizardNav } from '@/ui/brand';
import { AppText, Button, Card, Notice, useScrollToTop, type IconName } from '@/ui/components';
import { FadeIn } from '@/ui/motion';
import { space } from '@/ui/theme';

import { InspectResult } from './inspect-result';
import { PLACES, type Place } from './rules';
import { MAX_SPOTS, SpotPhoto, type Spot } from './spot-photo';

type Step = 'photo' | 'place' | 'look' | 'result';

const STEPS: { key: Exclude<Step, 'result'>; label: string }[] = [
  { key: 'photo', label: 'Duvarın fotoğrafı' },
  { key: 'place', label: 'İncelenecek yer' },
  { key: 'look', label: 'Ne görüyorsun?' },
];

/** What the user sees, in plain words. A crack is split into thin or wide by a follow-up question. */
const OBSERVATIONS: { id: string; label: string; hint: string; icon: IconName }[] = [
  { id: 'blistering', label: 'Kabarma', hint: 'Boya balon gibi şişmiş', icon: 'ellipse' },
  { id: 'peeling', label: 'Dökülme', hint: 'Boya pul pul kalkıyor', icon: 'layers' },
  { id: 'crack', label: 'Çatlak', hint: 'Sıvada ya da boyada yarık', icon: 'flash' },
  { id: 'damp_stain', label: 'Nem lekesi', hint: 'Sarı-kahve halka, ıslak görünüm', icon: 'water' },
  { id: 'mould', label: 'Küf', hint: 'Siyah ya da yeşil noktalar', icon: 'leaf' },
  { id: 'patchy', label: 'Rulo ya da fırça izi', hint: 'Alacalı, yamalı görünüm', icon: 'brush' },
  { id: 'surface_damage', label: 'Yüzey bozukluğu', hint: 'Delik, göçük, pürüz', icon: 'hammer' },
  { id: 'efflorescence', label: 'Beyaz tuzlanma', hint: 'Pudra gibi beyaz birikinti', icon: 'snow' },
  { id: 'chalking', label: 'Tozlanma', hint: 'Dokununca ele boya bulaşıyor', icon: 'hand-left' },
];

const PLACE_ICON: Record<Place, IconName> = { room: 'bed', wet: 'water', exterior: 'business' };

function Question({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="title">{title}</AppText>
      {hint ? <AppText tone="muted">{hint}</AppText> : null}
    </View>
  );
}

/** "Duvarını İncele": photo, where to look, what you see, then a plain-language plan. */
export function InspectWizard() {
  const scrollToTop = useScrollToTop();
  const [step, setStep] = useState<Step>('photo');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [place, setPlace] = useState<Place | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [nothing, setNothing] = useState(false);
  const [crack, setCrack] = useState<'hairline_crack' | 'wide_crack' | null>(null);

  const index = STEPS.findIndex((s) => s.key === step);
  const go = (next: Step) => {
    setStep(next);
    scrollToTop();
  };

  const toggle = (id: string) => {
    setNothing(false);
    setSeen((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    if (id === 'crack') setCrack(null);
  };

  const selected = seen.flatMap((id) => (id === 'crack' ? (crack ? [crack] : []) : [id]));
  const lookReady = (nothing || seen.length > 0) && (!seen.includes('crack') || crack !== null);

  const restart = () => {
    setPhoto(null);
    setSpots([]);
    setPlace(null);
    setSeen([]);
    setNothing(false);
    setCrack(null);
    go('photo');
  };

  if (step === 'result' && place) {
    return (
      <FadeIn key="result" style={{ gap: space.lg }}>
        <InspectResult selected={selected} place={place} photo={photo} spots={spots} onEdit={() => go('look')} onRestart={restart} />
      </FadeIn>
    );
  }

  const aspect = photo ? photo.width / photo.height : 1;

  return (
    <View style={{ gap: space.xl }}>
      <StepProgress step={index + 1} total={STEPS.length} label={STEPS[index]?.label ?? ''} feature="inspect" />
      <FadeIn key={step} style={{ gap: space.lg }}>
        {step === 'photo' && (
          <>
            <Question title="Duvarın fotoğrafını ekle" hint="Fotoğraf, incelerken yakından bakman ve işaretlemen içindir. Telefonunda kalır." />
            {photo ? (
              <>
                <SpotPhoto uri={photo.uri} aspect={aspect} spots={spots} marking={false} maxHeight={360} />
                <Button
                  label="Başka fotoğraf"
                  icon="images"
                  variant="ghost"
                  onPress={() => {
                    setPhoto(null);
                    setSpots([]);
                  }}
                />
              </>
            ) : (
              <>
                <Card>
                  <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                    <IconBubble icon="camera" feature="inspect" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodyStrong">İyi bir fotoğraf için</AppText>
                      <AppText variant="small" tone="muted">
                        Gün ışığında, 1–2 metre uzaktan çek. Sorunlu yer fotoğrafın ortasında olsun.
                      </AppText>
                    </View>
                  </View>
                </Card>
                <PhotoSourceButtons
                  onPicked={(picked) => {
                    setPhoto(picked);
                    setSpots([]);
                  }}
                />
                <Button label="Fotoğrafsız devam et" variant="ghost" onPress={() => go('place')} />
              </>
            )}
          </>
        )}

        {step === 'place' && (
          <>
            <Question title="Bu duvar nerede?" hint="Doğru boya ve astarı önerebilmemiz için." />
            <OptionGrid columns={1}>
              {PLACES.map((pl) => (
                <OptionCard
                  key={pl.value}
                  feature="inspect"
                  title={pl.label}
                  subtitle={pl.hint}
                  icon={PLACE_ICON[pl.value]}
                  selected={place === pl.value}
                  onPress={() => setPlace(pl.value)}
                />
              ))}
            </OptionGrid>
            {photo ? (
              <>
                <Question title="Sorunlu yerleri işaretle" hint={`İsteğe bağlı. Fotoğrafta dikkatini çeken yerlere dokun (en çok ${MAX_SPOTS}).`} />
                <SpotPhoto uri={photo.uri} aspect={aspect} spots={spots} marking onAddSpot={(s) => setSpots((list) => [...list, s])} maxHeight={420} />
                <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                  <Button label="Geri al" icon="arrow-undo" variant="secondary" disabled={spots.length === 0} onPress={() => setSpots((l) => l.slice(0, -1))} />
                  <Button label="Temizle" icon="close" variant="ghost" disabled={spots.length === 0} onPress={() => setSpots([])} />
                </View>
              </>
            ) : null}
          </>
        )}

        {step === 'look' && (
          <>
            <Question title="Duvarda ne görüyorsun?" hint="Gördüğün her şeyi seç. Emin değilsen en yakın olanı seç." />
            {photo ? <SpotPhoto uri={photo.uri} aspect={aspect} spots={spots} marking={false} maxHeight={220} /> : null}
            <OptionGrid>
              {OBSERVATIONS.map((o) => (
                <OptionCard
                  key={o.id}
                  multiple
                  feature="inspect"
                  title={o.label}
                  subtitle={o.hint}
                  icon={o.icon}
                  selected={seen.includes(o.id)}
                  onPress={() => toggle(o.id)}
                />
              ))}
            </OptionGrid>
            {seen.includes('crack') ? (
              <>
                <Question title="Çatlak ne kadar geniş?" />
                <OptionGrid columns={1}>
                  <OptionCard
                    feature="inspect"
                    title="İnce, saç teli gibi"
                    subtitle="Yüzeyde, içine kâğıt bile girmiyor"
                    icon="remove"
                    selected={crack === 'hairline_crack'}
                    onPress={() => setCrack('hairline_crack')}
                  />
                  <OptionCard
                    feature="inspect"
                    title="Geniş ya da büyüyor"
                    subtitle="Bozuk para kenarı giriyor, çapraz ya da kapı-pencere köşesinden çıkıyor"
                    icon="alert-circle"
                    selected={crack === 'wide_crack'}
                    onPress={() => setCrack('wide_crack')}
                  />
                </OptionGrid>
              </>
            ) : null}
            <OptionCard
              feature="inspect"
              multiple
              title="Hiçbiri, duvar iyi görünüyor"
              icon="checkmark-done"
              selected={nothing}
              onPress={() => {
                setNothing((v) => !v);
                setSeen([]);
                setCrack(null);
              }}
            />
          </>
        )}
      </FadeIn>

      {step === 'photo' && !photo ? null : (
        <WizardNav
          onBack={index > 0 ? () => go(STEPS[index - 1].key) : undefined}
          onNext={() => {
            if (step === 'photo') return go('place');
            if (step === 'place' && place) return go('look');
            if (step === 'look' && lookReady) return go('result');
          }}
          nextDisabled={(step === 'place' && !place) || (step === 'look' && !lookReady)}
          nextLabel={step === 'look' ? 'Sonucu göster' : 'Devam'}
          nextIcon={step === 'look' ? 'search' : 'arrow-forward'}
        />
      )}

      {step === 'look' ? (
        <Notice icon="information-circle">
          Fotoğraftan otomatik inceleme henüz yok; sonuç, senin seçtiğin belirtilere göre hazırlanır.
        </Notice>
      ) : null}
    </View>
  );
}
