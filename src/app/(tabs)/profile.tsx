import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { initials } from '@/features/account/initials';
import { LanguagePicker } from '@/features/account/language-picker';
import { useAccount, useSession } from '@/features/account/session';
import { useCity } from '@/features/market/city';
import { provinceByCode } from '@/features/market/provinces';
import { LOCALES, t } from '@/i18n';
import { useLocale } from '@/i18n/provider';
import { AppText, Button, Icon, Screen, type IconName } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { fonts, radius, shadowOf, space, usePalette } from '@/ui/theme';

function MenuRow({ icon, label, value, onPress, testID }: { icon: IconName; label: string; value?: string; onPress: () => void; testID?: string }) {
  const p = usePalette();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={value ? `${label}, ${value}` : label} onPress={onPress} style={[styles.row, { borderColor: p.border }]} testID={testID}>
      <Icon name={icon} size={20} color={p.textMuted} />
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {value ? (
        <AppText variant="small" tone="muted" numberOfLines={1} style={{ maxWidth: 150 }}>
          {value}
        </AppText>
      ) : null}
      <Icon name="chevron-forward" size={18} color={p.textMuted} />
    </PressableScale>
  );
}

function Menu({ children }: { children: ReactNode }) {
  const p = usePalette();
  return <View style={[styles.menu, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>{children}</View>;
}

function Header() {
  const p = usePalette();
  const { db, session } = useSession();
  const account = useAccount();
  const name = account.data?.profile.display_name ?? null;
  const email = session?.user.email ?? null;
  return (
    <View style={{ gap: space.md, padding: space.lg }}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: p.surfaceMuted }]}>
          {session ? (
            <AppText variant="heading" style={{ color: p.textMuted, fontFamily: fonts.bold }}>
              {initials(name, email)}
            </AppText>
          ) : (
            <Icon name="person" size={28} color={p.textMuted} />
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" numberOfLines={1}>
            {session ? name || t('Adını ekle') : t('Misafir')}
          </AppText>
          <AppText variant="small" tone="muted" numberOfLines={session ? 1 : 2}>
            {session ? email : t('Projelerini kaydetmek için giriş yap.')}
          </AppText>
        </View>
      </View>
      {!session && db ? <Button label={t('Giriş yap')} icon="log-in" variant="secondary" onPress={() => router.push('/sign-in')} /> : null}
    </View>
  );
}

function PremiumCard() {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('BoyaCep Premium')}
      onPress={() => router.push('/plans')}
      style={[styles.premium, { backgroundColor: p.heroFrom }]}>
      <View style={[styles.premiumIcon, { backgroundColor: p.cta }]}>
        <Icon name="diamond" size={20} color={p.onCta} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" style={{ color: p.onHero, fontFamily: fonts.bold }}>
          {t('BoyaCep Premium')}
        </AppText>
        <AppText variant="small" style={{ color: p.onHeroMuted }}>
          {t('Daha fazla proje ve özellik. Ödeme henüz açılmadı.')}
        </AppText>
      </View>
      <View style={[styles.premiumGo, { backgroundColor: p.cta }]}>
        <AppText variant="caption" style={{ color: p.onCta, fontFamily: fonts.bold }}>
          {t('Keşfet')}
        </AppText>
      </View>
    </PressableScale>
  );
}

export default function ProfileScreen() {
  const { session } = useSession();
  const account = useAccount();
  const { locale } = useLocale();
  const city = useCity();
  const [language, setLanguage] = useState(false);
  const cityName = !city.loading && city.province ? [provinceByCode(city.province)?.name, city.district].filter(Boolean).join(' / ') : t('Seçilmedi');
  const roles = account.data?.roles ?? [];

  return (
    <Screen>
      <AppText variant="title">{t('Profilim')}</AppText>
      <Menu>
        <Header />
        <MenuRow icon="person-outline" label={t('Hesap Bilgileri')} onPress={() => router.push('/account')} testID="menu-account" />
        <MenuRow icon="location-outline" label={t('Konumum')} value={cityName} onPress={() => router.push({ pathname: '/prices', params: { pick: '1' } })} />
        <MenuRow icon="notifications-outline" label={t('Bildirim Ayarları')} onPress={() => router.push({ pathname: '/soon/[feature]', params: { feature: 'notifications' } })} />
        <MenuRow icon="globe-outline" label={t('Dil Seçimi')} value={LOCALES.find((l) => l.value === locale)?.label} onPress={() => setLanguage((v) => !v)} testID="menu-language" />
        {language ? (
          <View style={{ paddingHorizontal: space.md, paddingBottom: space.md }}>
            <LanguagePicker />
          </View>
        ) : null}
        <MenuRow icon="color-palette-outline" label={t('Ev Hafızası')} onPress={() => router.push('/home-log')} />
        <MenuRow icon="construct-outline" label={t('Usta Paneli')} onPress={() => router.push('/usta')} />
        <MenuRow icon="help-circle-outline" label={t('Yardım ve Destek')} onPress={() => router.push('/help')} />
        <MenuRow icon="shield-checkmark-outline" label={t('Gizlilik')} onPress={() => router.push('/privacy')} />
        {session && roles.includes('admin') ? <MenuRow icon="settings-outline" label={t('Yönetim paneli')} onPress={() => router.push('/admin')} /> : null}
      </Menu>
      <PremiumCard />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  menu: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 54, borderTopWidth: StyleSheet.hairlineWidth },
  premium: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
  premiumIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  premiumGo: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 8 },
});
