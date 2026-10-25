import { useState } from 'react';
import { View } from 'react-native';

import { calculateProject, HOUSE_TYPES, quickEstimate, type HouseType, type ProjectCalculation, type QuickEstimate } from '@/engine';
import { parseDecimal } from '@/lib/number';
import { Disclosure, OptionCard, OptionGrid, StepProgress, WizardNav } from '@/ui/brand';
import { AppText, ChoiceChips, FieldRow, Notice, NumberField, Stepper, useScrollToTop } from '@/ui/components';
import { FadeIn } from '@/ui/motion';
import { space } from '@/ui/theme';

import { EMPTY_ROOM_FORM, toRoomInput, type FormErrors, type RoomForm } from './form';
import { HomeResult, RoomResult } from './wizard-result';
import {
  applySurfaces,
  applyWallState,
  ROOM_STEPS,
  SPACES,
  stepErrors,
  surfacesOf,
  wallStateOf,
  WALL_STATES,
  type RoomStep,
  type SpaceKind,
} from './wizard';

type HomeForm = { houseType: HouseType; area: string; ceilings: boolean; coats: number };
const EMPTY_HOME: HomeForm = { houseType: '3+1', area: '', ceilings: true, coats: 2 };

type HomeStep = 'space' | 'home' | 'homeSurfaces' | 'homeCoats';
const HOME_STEPS: { key: HomeStep; label: string }[] = [
  { key: 'space', label: 'Hangi alanı boyayacaksın?' },
  { key: 'home', label: 'Evin bilgileri' },
  { key: 'homeSurfaces', label: 'Boyanacak yüzeyler' },
  { key: 'homeCoats', label: 'Kaç kat boya?' },
];

type Step = RoomStep | HomeStep | 'result';

function Question({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="title">{title}</AppText>
      {hint ? <AppText tone="muted">{hint}</AppText> : null}
    </View>
  );
}

function SurfacePicker({ value, onChange }: { value: 'walls' | 'ceiling' | 'both'; onChange: (v: 'walls' | 'ceiling' | 'both') => void }) {
  return (
    <OptionGrid columns={1}>
      <OptionCard title="Duvarlar ve tavan" subtitle="En sık yapılan seçim" icon="cube" selected={value === 'both'} onPress={() => onChange('both')} />
      <OptionCard title="Sadece duvarlar" icon="square" selected={value === 'walls'} onPress={() => onChange('walls')} />
      <OptionCard title="Sadece tavan" icon="arrow-up-circle" selected={value === 'ceiling'} onPress={() => onChange('ceiling')} />
    </OptionGrid>
  );
}

function CoatsPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <OptionGrid>
      <OptionCard title="1 kat" subtitle="Aynı rengi tazelemek" icon="remove" selected={value === 1} onPress={() => onChange(1)} />
      <OptionCard title="2 kat" subtitle="Önerilen, çoğu iş için" icon="layers" selected={value === 2} onPress={() => onChange(2)} />
      <OptionCard title="3 kat" subtitle="Koyu renk ya da renk değişimi" icon="layers" selected={value === 3} onPress={() => onChange(3)} />
      <OptionCard title="4 kat" subtitle="Çok koyu renkten açığa" icon="layers" selected={value === 4} onPress={() => onChange(4)} />
    </OptionGrid>
  );
}

/** "Ne Kadar Boya?": one question per screen, then a result screen. The maths is the unchanged engine. */
export function PaintWizard() {
  const scrollToTop = useScrollToTop();
  const [space_, setSpace] = useState<SpaceKind | null>(null);
  const [step, setStep] = useState<Step>('space');
  const [form, setForm] = useState<RoomForm>(EMPTY_ROOM_FORM);
  const [home, setHome] = useState<HomeForm>(EMPTY_HOME);
  const [errors, setErrors] = useState<FormErrors>({});
  const [homeError, setHomeError] = useState<string | undefined>();
  const [roomResult, setRoomResult] = useState<ProjectCalculation | null>(null);
  const [homeResult, setHomeResult] = useState<QuickEstimate | null>(null);

  const isHome = space_ === 'home';
  const steps: { key: Step; label: string }[] = isHome ? HOME_STEPS : ROOM_STEPS;
  const index = steps.findIndex((s) => s.key === step);

  const set = <K extends keyof RoomForm>(key: K, value: RoomForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const patch = (p: Partial<RoomForm>) => setForm((f) => ({ ...f, ...p }));

  const go = (next: Step) => {
    setErrors({});
    setStep(next);
    scrollToTop();
  };

  const back = () => {
    if (step === 'result') return go(steps[steps.length - 1].key);
    if (index > 0) go(steps[index - 1].key);
  };

  const next = () => {
    if (step === 'space') {
      if (!space_) return;
      return go(steps[1].key);
    }
    if (isHome) {
      if (step === 'home') {
        const r = quickEstimate({ houseType: home.houseType, floorArea: parseDecimal(home.area), includeCeilings: home.ceilings, coats: home.coats });
        if (!r.ok && r.issues.some((i) => i.field === 'floorArea')) {
          setHomeError(r.issues.find((i) => i.field === 'floorArea')!.message);
          return;
        }
        setHomeError(undefined);
      }
      if (step === 'homeCoats') {
        const r = quickEstimate({ houseType: home.houseType, floorArea: parseDecimal(home.area), includeCeilings: home.ceilings, coats: home.coats });
        if (!r.ok) {
          setHomeError(r.issues[0]?.message);
          return go('home');
        }
        setHomeResult(r.value);
        return go('result');
      }
      return go(steps[index + 1].key);
    }

    const found = stepErrors(form, step as RoomStep);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    if (step === 'coats') {
      const parsed = toRoomInput(form);
      if (!parsed.ok) {
        setErrors(parsed.errors);
        return;
      }
      const calc = calculateProject([parsed.input]);
      if (!calc.ok) {
        setErrors({ form: calc.issues[0]?.message });
        return;
      }
      setRoomResult(calc.value);
      return go('result');
    }
    go(steps[index + 1].key);
  };

  const restart = () => {
    setSpace(null);
    setForm(EMPTY_ROOM_FORM);
    setHome(EMPTY_HOME);
    setRoomResult(null);
    setHomeResult(null);
    go('space');
  };

  if (step === 'result') {
    return (
      <FadeIn key="result" style={{ gap: space.lg }}>
        {isHome && homeResult ? (
          <HomeResult result={homeResult} home={home} onEdit={back} onRestart={restart} />
        ) : roomResult && space_ ? (
          <RoomResult result={roomResult} space={space_} form={form} onEdit={back} onRestart={restart} />
        ) : null}
      </FadeIn>
    );
  }

  const label = steps[index]?.label ?? '';
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <View style={{ gap: space.xl }}>
      <StepProgress step={index + 1} total={steps.length} label={label} />
      <FadeIn key={step} style={{ gap: space.lg }}>
        {step === 'space' && (
          <>
            <Question title="Hangi alanı boyayacaksın?" hint="Seç, sana sadece gereken soruları soralım." />
            <OptionGrid>
              {SPACES.map((s) => (
                <OptionCard
                  key={s.value}
                  testID={`space-${s.value}`}
                  title={s.label}
                  subtitle={s.hint}
                  icon={s.icon}
                  badge={s.ready ? undefined : 'Yakında'}
                  disabled={!s.ready}
                  selected={space_ === s.value}
                  onPress={() => setSpace(s.value)}
                />
              ))}
            </OptionGrid>
          </>
        )}

        {step === 'size' && (
          <>
            <Question title="Alanın ölçüleri" hint="Metreyle zeminin iki kenarını ve tavan yüksekliğini ölç. “3,5” gibi virgüllü yazabilirsin." />
            <FieldRow>
              <NumberField label="En" unit="m" value={form.width} onChangeText={(t) => set('width', t)} error={errors.width} testID="width" />
              <NumberField label="Boy" unit="m" value={form.length} onChangeText={(t) => set('length', t)} error={errors.length} testID="length" />
            </FieldRow>
            <NumberField
              label="Tavan yüksekliği"
              unit="m"
              value={form.height}
              onChangeText={(t) => set('height', t)}
              error={errors.height}
              hint="Çoğu evde 2,5 ile 2,8 m arasıdır."
              testID="height"
            />
          </>
        )}

        {step === 'surfaces' && (
          <>
            <Question title="Neresi boyanacak?" />
            <SurfacePicker value={surfacesOf(form)} onChange={(s) => patch(applySurfaces(s))} />
          </>
        )}

        {step === 'openings' && (
          <>
            <Question title="Kapı ve pencereler" hint="Bu alanlar boyanmaz, hesaptan düşeriz. Standart ölçüleri hazır girdik." />
            <View style={{ gap: space.md }}>
              <Stepper label="Kapı" value={form.doorCount} min={0} max={10} onChange={(v) => set('doorCount', v)} />
              <Stepper label="Pencere" value={form.windowCount} min={0} max={20} onChange={(v) => set('windowCount', v)} />
            </View>
            <Disclosure title="Ölçüleri değiştir" initiallyOpen={!!(errors.doorHeight || errors.windowHeight)}>
              {form.doorCount > 0 && (
                <FieldRow>
                  <NumberField label="Kapı eni" unit="m" value={form.doorWidth} onChangeText={(t) => set('doorWidth', t)} />
                  <NumberField label="Kapı boyu" unit="m" value={form.doorHeight} onChangeText={(t) => set('doorHeight', t)} error={errors.doorHeight ?? errors.doorCount} />
                </FieldRow>
              )}
              {form.windowCount > 0 && (
                <FieldRow>
                  <NumberField label="Pencere eni" unit="m" value={form.windowWidth} onChangeText={(t) => set('windowWidth', t)} />
                  <NumberField label="Pencere boyu" unit="m" value={form.windowHeight} onChangeText={(t) => set('windowHeight', t)} error={errors.windowHeight ?? errors.windowCount} />
                </FieldRow>
              )}
              {form.doorCount === 0 && form.windowCount === 0 ? <AppText tone="muted">Kapı ya da pencere yok.</AppText> : null}
            </Disclosure>
          </>
        )}

        {step === 'condition' && (
          <>
            <Question title="Duvarın şu anki durumu" hint="Astar ve macun ihtiyacını buna göre çıkarıyoruz." />
            <OptionGrid>
              {WALL_STATES.map((w) => (
                <OptionCard
                  key={w.value}
                  title={w.label}
                  subtitle={w.hint}
                  icon={w.icon}
                  selected={wallStateOf(form) === w.value}
                  onPress={() => patch(applyWallState(w.value))}
                />
              ))}
            </OptionGrid>
          </>
        )}

        {step === 'coats' && (
          <>
            <Question title="Kaç kat boya uygulanacak?" hint="Boyanın kutusunda öneri yazar. Emin değilsen 2 kat seç." />
            <CoatsPicker value={form.coats} onChange={(v) => set('coats', v)} />
            <Disclosure title="Boyamın sarfiyatını biliyorum" initiallyOpen={!!errors.coverage}>
              <NumberField
                label="1 litre kaç m² boyar? (tek kat)"
                unit="m²/L"
                value={form.coverage}
                onChangeText={(t) => set('coverage', t)}
                error={errors.coverage}
                hint="Boş bırakırsan genel tahmin (10 m²/L) kullanılır. Değer kutunun üstünde ya da teknik föyde yazar."
                testID="coverage"
              />
              {form.coverage.trim() !== '' && (
                <ChoiceChips
                  label="Bu değer nereden?"
                  options={[
                    { value: 'manufacturer', label: 'Teknik föy / kutu' },
                    { value: 'user', label: 'Kendi tecrübem' },
                  ]}
                  value={form.coverageSource}
                  onChange={(v) => set('coverageSource', v)}
                />
              )}
            </Disclosure>
          </>
        )}

        {step === 'home' && (
          <>
            <Question title="Evin bilgileri" hint="Tapuda ya da kira sözleşmesinde yazan net metrekareyi kullan." />
            <ChoiceChips label="Ev tipi" options={HOUSE_TYPES.map((h) => ({ value: h, label: h }))} value={home.houseType} onChange={(v) => setHome((h) => ({ ...h, houseType: v }))} />
            <NumberField
              label="Net kullanım alanı"
              unit="m²"
              value={home.area}
              onChangeText={(t) => setHome((h) => ({ ...h, area: t }))}
              error={homeError}
              testID="floor-area"
            />
          </>
        )}

        {step === 'homeSurfaces' && (
          <>
            <Question title="Neresi boyanacak?" />
            <OptionGrid columns={1}>
              <OptionCard title="Duvarlar ve tavanlar" icon="cube" selected={home.ceilings} onPress={() => setHome((h) => ({ ...h, ceilings: true }))} />
              <OptionCard title="Sadece duvarlar" icon="square" selected={!home.ceilings} onPress={() => setHome((h) => ({ ...h, ceilings: false }))} />
            </OptionGrid>
          </>
        )}

        {step === 'homeCoats' && (
          <>
            <Question title="Kaç kat boya uygulanacak?" hint="Emin değilsen 2 kat seç." />
            <CoatsPicker value={home.coats} onChange={(v) => setHome((h) => ({ ...h, coats: v }))} />
          </>
        )}

        {errors.form ? (
          <Notice tone="danger" icon="alert-circle">
            {errors.form}
          </Notice>
        ) : hasErrors ? (
          <Notice tone="danger" icon="alert-circle">
            Lütfen kırmızı işaretli alanları düzeltin.
          </Notice>
        ) : null}
      </FadeIn>

      <WizardNav
        onBack={index > 0 ? back : undefined}
        onNext={next}
        nextDisabled={step === 'space' && !space_}
        nextLabel={step === 'coats' || step === 'homeCoats' ? 'Sonucu göster' : 'Devam'}
        nextIcon={step === 'coats' || step === 'homeCoats' ? 'sparkles' : 'arrow-forward'}
      />
    </View>
  );
}
