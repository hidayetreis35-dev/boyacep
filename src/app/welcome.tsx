import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { SelectableRole } from '@/features/account/api';
import { LanguagePicker } from '@/features/account/language-picker';
import { writeLocalRoles } from '@/features/account/local-role';
import { RolePicker } from '@/features/account/role-picker';
import { chooseCity, skipCity } from '@/features/market/city';
import { ProvincePicker } from '@/features/market/components';
import { PILOT_PROVINCES, provinceByCode, type ProvinceCode } from '@/features/market/provinces';
import { msg, t } from '@/i18n';
import { Gradient, PaintDrops, SectionTitle } from '@/ui/brand';
import { AppText, Button, FieldRow, Icon, Notice, Screen, useScrollToTop, type IconName } from '@/ui/components';
import { radius, shadowOf, space, usePalette } from '@/ui/theme';

const PROMISES: { icon: IconName; text: string }[] = [
  { icon: 'calculator', text: msg('Ne kadar boya ve malzeme gerektiğini adım adım hesapla') },
  { icon: 'color-palette', text: msg('Renkleri keşfet, odanın fotoğrafında dene') },
  { icon: 'construct', text: msg('Duvarındaki sorunu anla, doğru iş sırasını öğren') },
];

const STEPS = 3;

function StepDots({ step }: { step: number }) {
  const p = usePalette();
  return (
    <View style={styles.dots} accessibilityLabel={t('Adım {step} / {total}', { step: step + 1, total: STEPS })}>
      {Array.from({ length: STEPS }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i <= step ? p.cta : p.border, width: i === step ? 24 : 8 }]} />
      ))}
    </View>
  );
}

function Intro() {
  const p = usePalette();
  return (
    <View style={[styles.hero, shadowOf(p, 2)]}>
      <Gradient from={p.heroFrom} to={p.heroTo} />
      <PaintDrops colours={['#FF6B2C', '#C2367A', '#D99A1E']} style={{ opacity: 0.9 }} />
      <View style={styles.brandRow}>
        <View style={[styles.brandMark, { backgroundColor: p.cta }]}>
          <Icon name="color-fill" size={16} color={p.onCta} />
        </View>
        <AppText variant="overline" style={{ color: p.onHeroMuted }}>
          BoyaCep
        </AppText>
      </View>
      <AppText variant="display" style={{ color: p.onHero, paddingRight: 72 }}>
        {t('BoyaCep’e hoş geldin')}
      </AppText>
      <View style={{ gap: space.sm, marginTop: space.xs }}>
        {PROMISES.map((item) => (
          <View key={item.icon} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <View style={[styles.promiseIcon, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
              <Icon name={item.icon} size={16} color={p.onHero} />
            </View>
            <AppText variant="small" style={{ color: p.onHero, flex: 1 }}>
              {t(item.text)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Optional city for regional prices; no location permission. */
function CityStep({ city, onPick }: { city: ProvinceCode | null; onPick: (code: ProvinceCode | null) => void }) {
  const [searching, setSearching] = useState(false);
  const name = city ? provinceByCode(city)?.name : undefined;
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <SectionTitle title={t('Hangi ildesin?')} />
        <AppText tone="muted">
          {t('Usta ve boya fiyatlarını şehrine göre gösteririz. Konum izni istemiyoruz; seçmek zorunda değilsin, sonra Profil’den değiştirebilirsin.')}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {PILOT_PROVINCES.map((code) => (
          <Button
            key={code}
            label={provinceByCode(code)?.name ?? code}
            icon={city === code ? 'checkmark-circle' : 'location-outline'}
            variant={city === code ? 'primary' : 'secondary'}
            onPress={() => onPick(city === code ? null : code)}
          />
        ))}
        <Button label={t('Başka il')} icon="search" variant="ghost" onPress={() => setSearching((s) => !s)} />
      </View>
      {name && !PILOT_PROVINCES.includes(city as ProvinceCode) ? (
        <Notice tone="success" icon="checkmark-circle">
          {t('Seçilen il: {city}', { city: name })}
        </Notice>
      ) : null}
      {searching ? (
        <ProvincePicker
          onPick={(code) => {
            onPick(code);
            setSearching(false);
          }}
        />
      ) : null}
    </View>
  );
}

function Steps() {
  const scrollToTop = useScrollToTop();
  const [step, setStep] = useState(0);
  const [roles, setRoles] = useState<SelectableRole[]>([]);
  const [city, setCity] = useState<ProvinceCode | null>(null);
  const [saving, setSaving] = useState(false);

  const goTo = (next: number) => {
    setStep(next);
    scrollToTop();
  };
  const toggle = (role: SelectableRole) =>
    setRoles((current) => (current.includes(role) ? current.filter((r) => r !== role) : [...current, role]));

  const start = async () => {
    setSaving(true);
    // A skipped city is remembered too, so the home screen does not ask again.
    await (city ? chooseCity(city) : skipCity());
    await writeLocalRoles(roles);
    router.replace('/');
  };

  return (
    <>
      <StepDots step={step} />
      {step === 0 ? (
        <>
          <Intro />
          <LanguagePicker />
          <Button label={t('Devam')} icon="arrow-forward" variant="cta" size="lg" onPress={() => goTo(1)} />
        </>
      ) : step === 1 ? (
        <>
          <View style={{ gap: space.xs }}>
            <SectionTitle title={t('Seni tanıyalım')} />
            <AppText tone="muted">{t('Sana uygun ekranları gösterebilmemiz için seç. İkisini birden de seçebilirsin; sonra profilinden değiştirebilirsin.')}</AppText>
          </View>
          <RolePicker selected={roles} onToggle={toggle} />
          <FieldRow>
            <Button label={t('Geri')} icon="arrow-back" variant="secondary" onPress={() => goTo(0)} />
            <Button label={t('Devam')} icon="arrow-forward" variant="cta" onPress={() => goTo(2)} disabled={roles.length === 0} />
          </FieldRow>
        </>
      ) : (
        <>
          <CityStep city={city} onPick={setCity} />
          <Button
            label={city ? t('Başla') : t('Şehir seçmeden başla')}
            icon="arrow-forward"
            variant="cta"
            size="lg"
            onPress={start}
            loading={saving}
          />
          <Button label={t('Geri')} icon="arrow-back" variant="ghost" onPress={() => goTo(1)} />
        </>
      )}
    </>
  );
}

export default function WelcomeScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <Steps />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.sm, overflow: 'hidden' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  brandMark: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  promiseIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, alignSelf: 'center', paddingVertical: space.xs },
  dot: { height: 8, borderRadius: radius.pill },
});
