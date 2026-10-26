import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { SelectableRole } from '@/features/account/api';
import { writeLocalRoles } from '@/features/account/local-role';
import { useSession } from '@/features/account/session';
import { chooseCity, skipCity } from '@/features/market/city';
import { ProvincePicker } from '@/features/market/components';
import { DISTRICTS, PILOT_PROVINCES, provinceByCode, type ProvinceCode } from '@/features/market/provinces';
import { LOCALES, msg, t } from '@/i18n';
import { useLocale } from '@/i18n/provider';
import { CityArt } from '@/ui/art';
import { Gradient, PaintDrops } from '@/ui/brand';
import { AppText, Button, Card, Icon, Screen, type IconName } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { Photo } from '@/ui/photos';
import { MAX_CONTENT_WIDTH, fonts, radius, shadowOf, space, usePalette } from '@/ui/theme';

const ROLES: { role: SelectableRole; title: string; text: string; icon: IconName }[] = [
  { role: 'homeowner', title: msg('Ev sahibi'), text: msg('Evini boyamak, renk seçmek, bütçeni ve ustanı yönetmek için.'), icon: 'home' },
  { role: 'pro', title: msg('Usta / Profesyonel'), text: msg('Ev sahiplerinin paylaştığı projeleri görmek ve teklif hazırlamak için.'), icon: 'construct' },
];

/** Language switch that sits on the navy hero. */
function HeroLanguage() {
  const p = usePalette();
  const { locale, setLocale } = useLocale();
  return (
    <View style={[styles.lang, { backgroundColor: 'rgba(255,255,255,0.12)' }]} accessibilityRole="tablist">
      {LOCALES.map((l) => {
        const active = l.value === locale;
        return (
          <PressableScale
            key={l.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={l.label}
            onPress={() => setLocale(l.value, '/welcome')}
            style={[styles.langItem, active && { backgroundColor: p.surface }]}>
            <AppText variant="caption" style={{ color: active ? p.heroFrom : p.onHero, fontFamily: fonts.bold }}>
              {l.value.toUpperCase()}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  const p = usePalette();
  const { db } = useSession();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: p.heroFrom }}>
      <ScrollView contentContainerStyle={styles.heroScroll} style={{ backgroundColor: p.heroFrom }}>
        <PaintDrops colours={['#FF6B2C', '#C2367A', '#D99A1E']} style={{ opacity: 0.85, right: -70, top: -50 }} />
        <View style={styles.heroInner}>
          <View style={styles.brandRow}>
            <View style={[styles.brandMark, { backgroundColor: p.cta }]}>
              <Icon name="color-fill" size={18} color={p.onCta} />
            </View>
            <AppText variant="heading" style={{ color: p.onHero, fontFamily: fonts.extrabold, flex: 1 }}>
              BoyaCep
            </AppText>
            <HeroLanguage />
          </View>
          <AppText variant="display" style={{ color: p.onHero, marginTop: space.lg }}>
            {t('Evin için ihtiyacın olan her şey, tek platformda.')}
          </AppText>
          <AppText style={{ color: p.onHeroMuted }}>{t('Boya • Renk • Tadilat planı • Ev bütçesi')}</AppText>
          <View style={styles.heroPhoto}>
            <Photo name="welcome" style={StyleSheet.absoluteFill} />
            <Gradient vertical from={p.heroFrom} to={p.heroFrom} fromOpacity={1} toOpacity={0} style={{ height: '45%' }} />
          </View>
          <View style={{ flexGrow: 1 }} />
          <Button label={t('Başlayalım')} icon="arrow-forward" variant="cta" size="lg" onPress={onStart} />
          {db ? (
            <PressableScale accessibilityRole="link" accessibilityLabel={t('Giriş yap')} onPress={() => router.push('/sign-in')} style={styles.signIn}>
              <AppText variant="small" style={{ color: p.onHeroMuted }}>
                {t('Zaten hesabın var mı?')}{' '}
                <AppText variant="small" style={{ color: p.onHero, fontFamily: fonts.bold, textDecorationLine: 'underline' }}>
                  {t('Giriş yap')}
                </AppText>
              </AppText>
            </PressableScale>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.stepHeader}>
      <PressableScale accessibilityRole="button" accessibilityLabel={t('Geri')} onPress={onBack} style={styles.back}>
        <Icon name="arrow-back" size={22} />
      </PressableScale>
      <AppText variant="heading" style={{ flex: 1 }}>
        {title}
      </AppText>
    </View>
  );
}

function RoleStep({ onPick, onBack }: { onPick: (role: SelectableRole) => void; onBack: () => void }) {
  const p = usePalette();
  return (
    <>
      <StepHeader title="BoyaCep" onBack={onBack} />
      <View style={{ gap: space.xs }}>
        <AppText variant="title">{t('Hesabını nasıl kullanmak istersin?')}</AppText>
        <AppText tone="muted">{t('Sana en uygun seçeneği seç.')}</AppText>
      </View>
      {ROLES.map((r) => (
        <PressableScale
          key={r.role}
          accessibilityRole="button"
          accessibilityLabel={t(r.title)}
          onPress={() => onPick(r.role)}
          style={[styles.roleCard, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
          <View style={[styles.roleIcon, { backgroundColor: p.heroFrom }]}>
            <Icon name={r.icon} size={28} color={p.onHero} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="bodyStrong" style={{ fontFamily: fonts.bold }}>
              {t(r.title)}
            </AppText>
            <AppText variant="small" tone="muted">
              {t(r.text)}
            </AppText>
          </View>
          <Icon name="chevron-forward" color={p.textMuted} />
        </PressableScale>
      ))}
      <AppText variant="small" tone="muted" style={{ textAlign: 'center' }}>
        {t('Daha sonra Profil’den değiştirebilir, ikisini birden de seçebilirsin.')}
      </AppText>
    </>
  );
}

/** A field that looks like a dropdown and opens its options in place. */
function SelectBox({
  icon,
  label,
  value,
  placeholder,
  open,
  onToggle,
  disabled,
  testID,
}: {
  icon: IconName;
  label: string;
  value: string | null;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ expanded: open, disabled }}
      accessibilityLabel={`${label}: ${value ?? placeholder}`}
      disabled={disabled}
      onPress={onToggle}
      testID={testID}
      style={[styles.select, { backgroundColor: p.surface, borderColor: open ? p.primary : p.border, opacity: disabled ? 0.55 : 1 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={icon} size={14} color={p.textMuted} />
          <AppText variant="caption" tone="muted">
            {label}
          </AppText>
        </View>
        <AppText variant="bodyStrong" style={{ color: value ? p.text : p.textMuted }}>
          {value ?? placeholder}
        </AppText>
      </View>
      <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={p.textMuted} />
    </PressableScale>
  );
}

/** Optional city and district for regional prices; no location permission. */
function CityStep({ onDone, onBack }: { onDone: (province: ProvinceCode | null, district: string | null) => Promise<void>; onBack: () => void }) {
  const p = usePalette();
  const [province, setProvince] = useState<ProvinceCode | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [open, setOpen] = useState<'province' | 'district' | null>(null);
  const [saving, setSaving] = useState(false);
  const districts = province ? (DISTRICTS[province] ?? []) : [];

  const pickProvince = (code: ProvinceCode) => {
    setProvince(code);
    setDistrict(null);
    setOpen(null);
  };
  const done = async () => {
    setSaving(true);
    await onDone(province, district);
  };

  return (
    <>
      <StepHeader title={t('Konum Seçimi')} onBack={onBack} />
      <AppText tone="muted">
        {t('Usta ve boya fiyatlarını şehrine göre gösteririz. Konum izni istemiyoruz; il ve ilçeni kendin seç. (İsteğe bağlı)')}
      </AppText>
      <SelectBox
        icon="location-outline"
        label={t('Şehir seçin')}
        value={province ? (provinceByCode(province)?.name ?? null) : null}
        placeholder={t('Seçilmedi')}
        open={open === 'province'}
        onToggle={() => setOpen(open === 'province' ? null : 'province')}
        testID="select-province"
      />
      {open === 'province' ? (
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {PILOT_PROVINCES.map((code) => (
              <Button key={code} label={provinceByCode(code)?.name ?? code} icon="location-outline" variant="secondary" onPress={() => pickProvince(code)} />
            ))}
          </View>
          <ProvincePicker onPick={pickProvince} />
        </Card>
      ) : null}
      <SelectBox
        icon="map-outline"
        label={t('İlçe seçin')}
        value={district}
        placeholder={province && districts.length === 0 ? t('Bu il için ilçe listesi henüz yok') : t('Seçilmedi')}
        open={open === 'district'}
        onToggle={() => setOpen(open === 'district' ? null : 'district')}
        disabled={districts.length === 0}
        testID="select-district"
      />
      {open === 'district' ? (
        <Card>
          {districts.map((d) => (
            <PressableScale
              key={d}
              accessibilityRole="button"
              accessibilityLabel={d}
              onPress={() => {
                setDistrict(d);
                setOpen(null);
              }}
              style={[styles.option, d === district && { backgroundColor: p.primarySoft }]}>
              <AppText style={{ flex: 1 }}>{d}</AppText>
              {d === district ? <Icon name="checkmark" size={18} color={p.primary} /> : null}
            </PressableScale>
          ))}
        </Card>
      ) : null}
      <Button
        label={province ? t('Devam Et') : t('Şehir seçmeden devam et')}
        icon="arrow-forward"
        variant="cta"
        size="lg"
        onPress={done}
        loading={saving}
      />
      <View style={styles.city}>
        <CityArt width={340} height={110} />
      </View>
    </>
  );
}

export default function WelcomeScreen() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<SelectableRole | null>(null);

  const finish = async (province: ProvinceCode | null, district: string | null) => {
    // A skipped city is remembered too, so nobody is asked again.
    await (province ? chooseCity(province, district) : skipCity());
    await writeLocalRoles(role ? [role] : ['homeowner']);
    router.replace('/');
  };

  if (step === 0) return <Hero onStart={() => setStep(1)} />;
  return (
    // A new key per step starts each step at the top.
    <Screen key={step} edges={['top', 'bottom']}>
      {step === 1 ? (
        <RoleStep
          onBack={() => setStep(0)}
          onPick={(picked) => {
            setRole(picked);
            setStep(2);
          }}
        />
      ) : (
        <CityStep onBack={() => setStep(1)} onDone={finish} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroScroll: { flexGrow: 1, alignItems: 'center', overflow: 'hidden' },
  heroInner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, padding: space.xl, gap: space.md, flexGrow: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, zIndex: 1 },
  brandMark: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  lang: { flexDirection: 'row', borderRadius: radius.pill, padding: 3 },
  langItem: { borderRadius: radius.pill, paddingHorizontal: 12, minHeight: 32, justifyContent: 'center' },
  heroPhoto: {
    height: 250,
    marginHorizontal: -space.xl,
    marginVertical: space.sm,
    overflow: 'hidden',
    borderBottomLeftRadius: 160,
    borderBottomRightRadius: 160,
  },
  signIn: { alignSelf: 'center', paddingVertical: space.sm, minHeight: 44, justifyContent: 'center' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: { width: 44, height: 44, marginLeft: -space.sm, alignItems: 'center', justifyContent: 'center' },
  roleCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  roleIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  select: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1.5 },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: space.sm, borderRadius: radius.sm },
  city: { alignItems: 'center', marginTop: space.lg },
});
