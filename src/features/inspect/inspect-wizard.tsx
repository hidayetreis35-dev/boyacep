import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PickedPhoto } from '@/features/photos/picker';
import { PhotoSourceButtons } from '@/features/photos/photo-source';
import { msg, t } from '@/i18n';
import { IconBubble, OptionCard, OptionGrid, StepProgress, WizardNav } from '@/ui/brand';
import { AppText, Button, Card, Notice, useScrollToTop, type IconName } from '@/ui/components';
import { FadeIn } from '@/ui/motion';
import { Photo } from '@/ui/photos';
import { fonts, radius, space } from '@/ui/theme';

import { InspectResult } from './inspect-result';
import { PLACES, type Place } from './rules';
import { MAX_SPOTS, SpotPhoto, type Spot } from './spot-photo';

type Step = 'photo' | 'place' | 'look' | 'result';

const STEPS: { key: Exclude<Step, 'result'>; label: string }[] = [
  { key: 'photo', label: msg('Duvarın fotoğrafı') },
  { key: 'place', label: msg('İncelenecek yer') },
  { key: 'look', label: msg('Ne görüyorsun?') },
];

/** What the user sees, in plain words. A crack is split into thin or wide by a follow-up question. */
const OBSERVATIONS: { id: string; label: string; hint: string; icon: IconName }[] = [
  { id: 'blistering', label: msg('Kabarma'), hint: msg('Boya balon gibi şişmiş'), icon: 'ellipse' },
  { id: 'peeling', label: msg('Dökülme'), hint: msg('Boya pul pul kalkıyor'), icon: 'layers' },
  { id: 'crack', label: msg('Çatlak'), hint: msg('Sıvada ya da boyada yarık'), icon: 'flash' },
  { id: 'damp_stain', label: msg('Nem lekesi'), hint: msg('Sarı-kahve halka, ıslak görünüm'), icon: 'water' },
  { id: 'mould', label: msg('Küf'), hint: msg('Siyah ya da yeşil noktalar'), icon: 'leaf' },
  { id: 'patchy', label: msg('Rulo ya da fırça izi'), hint: msg('Alacalı, yamalı görünüm'), icon: 'brush' },
  { id: 'surface_damage', label: msg('Yüzey bozukluğu'), hint: msg('Delik, göçük, pürüz'), icon: 'hammer' },
  { id: 'efflorescence', label: msg('Beyaz tuzlanma'), hint: msg('Pudra gibi beyaz birikinti'), icon: 'snow' },
  { id: 'chalking', label: msg('Tozlanma'), hint: msg('Dokununca ele boya bulaşıyor'), icon: 'hand-left' },
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
      <StepProgress step={index + 1} total={STEPS.length} label={t(STEPS[index]?.label ?? '')} feature="inspect" />
      <FadeIn key={step} style={{ gap: space.lg }}>
        {step === 'photo' && (
          <>
            <Question title={t('Duvarın fotoğrafını ekle')} hint={t('Fotoğraf, incelerken yakından bakman ve işaretlemen içindir. Telefonunda kalır.')} />
            {photo ? (
              <>
                <SpotPhoto uri={photo.uri} aspect={aspect} spots={spots} marking={false} maxHeight={360} />
                <Button
                  label={t('Başka fotoğraf')}
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
                <View style={styles.example}>
                  <Photo name="wallProblem" style={StyleSheet.absoluteFill} />
                  <View style={styles.exampleTag}>
                    <AppText variant="caption" style={{ color: '#FFFFFF', fontFamily: fonts.semibold }}>
                      {t('Örnek: dökülen boya')}
                    </AppText>
                  </View>
                </View>
                <Card>
                  <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                    <IconBubble icon="camera" feature="inspect" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodyStrong">{t('İyi bir fotoğraf için')}</AppText>
                      <AppText variant="small" tone="muted">
                        {t('Gün ışığında, 1–2 metre uzaktan çek. Sorunlu yer fotoğrafın ortasında olsun.')}
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
                <Button label={t('Fotoğrafsız devam et')} variant="ghost" onPress={() => go('place')} />
              </>
            )}
          </>
        )}

        {step === 'place' && (
          <>
            <Question title={t('Bu duvar nerede?')} hint={t('Doğru boya ve astarı önerebilmemiz için.')} />
            <OptionGrid columns={1}>
              {PLACES.map((pl) => (
                <OptionCard
                  key={pl.value}
                  feature="inspect"
                  title={t(pl.label)}
                  subtitle={t(pl.hint)}
                  icon={PLACE_ICON[pl.value]}
                  selected={place === pl.value}
                  onPress={() => setPlace(pl.value)}
                />
              ))}
            </OptionGrid>
            {photo ? (
              <>
                <Question title={t('Sorunlu yerleri işaretle')} hint={t('İsteğe bağlı. Fotoğrafta dikkatini çeken yerlere dokun (en çok {max}).', { max: MAX_SPOTS })} />
                <SpotPhoto uri={photo.uri} aspect={aspect} spots={spots} marking onAddSpot={(s) => setSpots((list) => [...list, s])} maxHeight={420} />
                <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                  <Button label={t('Geri al')} icon="arrow-undo" variant="secondary" disabled={spots.length === 0} onPress={() => setSpots((l) => l.slice(0, -1))} />
                  <Button label={t('Temizle')} icon="close" variant="ghost" disabled={spots.length === 0} onPress={() => setSpots([])} />
                </View>
              </>
            ) : null}
          </>
        )}

        {step === 'look' && (
          <>
            <Question title={t('Duvarda ne görüyorsun?')} hint={t('Gördüğün her şeyi seç. Emin değilsen en yakın olanı seç.')} />
            {photo ? <SpotPhoto uri={photo.uri} aspect={aspect} spots={spots} marking={false} maxHeight={220} /> : null}
            <OptionGrid>
              {OBSERVATIONS.map((o) => (
                <OptionCard
                  key={o.id}
                  multiple
                  feature="inspect"
                  title={t(o.label)}
                  subtitle={t(o.hint)}
                  icon={o.icon}
                  selected={seen.includes(o.id)}
                  onPress={() => toggle(o.id)}
                />
              ))}
            </OptionGrid>
            {seen.includes('crack') ? (
              <>
                <Question title={t('Çatlak ne kadar geniş?')} />
                <OptionGrid columns={1}>
                  <OptionCard
                    feature="inspect"
                    title={t('İnce, saç teli gibi')}
                    subtitle={t('Yüzeyde, içine kâğıt bile girmiyor')}
                    icon="remove"
                    selected={crack === 'hairline_crack'}
                    onPress={() => setCrack('hairline_crack')}
                  />
                  <OptionCard
                    feature="inspect"
                    title={t('Geniş ya da büyüyor')}
                    subtitle={t('Bozuk para kenarı giriyor, çapraz ya da kapı-pencere köşesinden çıkıyor')}
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
              title={t('Hiçbiri, duvar iyi görünüyor')}
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
          nextLabel={step === 'look' ? t('Sonucu göster') : t('Devam')}
          nextIcon={step === 'look' ? 'search' : 'arrow-forward'}
        />
      )}

      {step === 'look' ? (
        <Notice icon="information-circle">
          {t('Fotoğraftan otomatik inceleme henüz yok; sonuç, senin seçtiğin belirtilere göre hazırlanır.')}
        </Notice>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  example: { height: 170, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', padding: space.sm },
  exampleTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(15,23,42,0.72)', borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 4 },
});
