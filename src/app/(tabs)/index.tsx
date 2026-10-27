import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { initials } from '@/features/account/initials';
import { useAccount, useSession } from '@/features/account/session';
import type { SpaceKind } from '@/features/calculator/wizard';
import { CityPriceCard } from '@/features/home/city-price-card';
import { SearchBox } from '@/features/home/search-box';
import { useCity } from '@/features/market/city';
import { provinceByCode } from '@/features/market/provinces';
import { ContinueProject } from '@/features/projects/continue-card';
import { useProjects } from '@/features/projects/queries';
import { msg, t } from '@/i18n';
import { AppText, Icon, useWide, type IconName } from '@/ui/components';
import { FadeIn, PressableScale } from '@/ui/motion';
import type { PhotoName } from '@/ui/photos';
import { IconLink, PhotoHero, QuickAction, RoomStrip, SectionHeader, SkeletonCard, type RoomItem } from '@/ui/showcase';
import { MAX_CONTENT_WIDTH, MAX_WIDE_WIDTH, fonts, radius, space, usePalette, type FeatureKey } from '@/ui/theme';

const QUICK: { key: string; title: string; hint: string; icon: IconName; feature: FeatureKey; href: Href }[] = [
  { key: 'calculate', title: msg('Boya Hesapla'), hint: msg('Kaç litre lazım?'), icon: 'color-fill', feature: 'calculate', href: '/calculate' },
  { key: 'colour', title: msg('Renkleri Dene'), hint: msg('Odanda gör'), icon: 'color-palette', feature: 'color', href: '/colour' },
  { key: 'inspect', title: msg('Duvarını İncele'), hint: msg('Çatlak, nem, kabarma'), icon: 'scan', feature: 'inspect', href: '/inspect' },
  { key: 'cost', title: msg('Maliyetini Hesapla'), hint: msg('Boya, malzeme, işçilik'), icon: 'calculator', feature: 'cost', href: '/cost' },
];

const space_ = (s: SpaceKind): Href => ({ pathname: '/calculate', params: { space: s } });

/** Rooms open the calculator with that room chosen; renovation and decoration open their own screens. */
const ROOMS: { key: string; title: string; photo?: PhotoName; icon?: IconName; href: Href }[] = [
  { key: 'living', title: msg('Salon'), photo: 'inspiration', href: space_('living') },
  { key: 'bedroom', title: msg('Yatak odası'), photo: 'bedroom', href: space_('room') },
  { key: 'kitchen', title: msg('Mutfak'), photo: 'kitchen', href: space_('kitchen') },
  { key: 'bathroom', title: msg('Banyo'), photo: 'bathroom', href: space_('bathroom') },
  { key: 'home', title: msg('Tüm ev'), icon: 'home', href: space_('home') },
  { key: 'renovation', title: msg('Tadilat'), photo: 'wallProblem', href: '/projects' },
  { key: 'decoration', title: msg('Dekorasyon'), photo: 'colourRoom', href: '/colour' },
];

const MORE: { key: string; title: string; icon: IconName; feature: FeatureKey; href: Href; soon?: boolean }[] = [
  { key: 'pros', title: msg('Usta Bul'), icon: 'person', feature: 'ask', href: '/services' },
  { key: 'budget', title: msg('Ev Bütçesi'), icon: 'wallet', feature: 'budget', href: '/budget' },
  { key: 'projects', title: msg('Projelerim'), icon: 'briefcase', feature: 'projects', href: '/projects' },
  { key: 'ai-design', title: msg('AI Ev Tasarımı'), icon: 'sparkles', feature: 'color', href: { pathname: '/soon/[feature]', params: { feature: 'ai-design' } }, soon: true },
  { key: 'prices', title: msg('Boya Fiyatları'), icon: 'stats-chart', feature: 'cost', href: '/prices' },
  { key: 'ask', title: msg('Ustaya Sor'), icon: 'chatbubbles', feature: 'ask', href: '/ask' },
  { key: 'guide', title: msg('Boya Rehberi'), icon: 'book', feature: 'guide', href: '/guide' },
  { key: 'home-log', title: msg('Ev Hafızası'), icon: 'time', feature: 'projects', href: '/home-log' },
];

const STEPS = [msg('Duvarını ölç, boyanı hesapla'), msg('Rengini odanda dene'), msg('Fiyatı gör, ustanı bul')];

function Header() {
  const p = usePalette();
  const { session } = useSession();
  const account = useAccount();
  const city = useCity();
  const name = account.data?.profile.display_name?.trim().split(/\s+/)[0];
  const place = !city.loading && city.province ? [provinceByCode(city.province)?.name, city.district].filter(Boolean).join(' / ') : null;
  return (
    <View style={styles.header}>
      <PressableScale accessibilityRole="button" accessibilityLabel={t('Profil')} onPress={() => router.push('/profile')} style={[styles.avatar, { backgroundColor: p.primary }]}>
        {session ? (
          <AppText variant="small" style={{ color: p.onPrimary, fontFamily: fonts.extrabold }}>
            {initials(account.data?.profile.display_name, session.user.email)}
          </AppText>
        ) : (
          <Icon name="person" size={20} color={p.onPrimary} />
        )}
      </PressableScale>
      <View style={{ flex: 1, gap: 1 }}>
        <AppText variant="cardTitle" style={{ fontFamily: fonts.extrabold }} numberOfLines={1}>
          {name ? t('Merhaba {name}', { name }) : t('Merhaba')}
        </AppText>
        {city.loading ? null : (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={place ? t('Konum: {city}. Değiştir', { city: place }) : t('Şehir seç')}
            onPress={() => router.push({ pathname: '/prices', params: { pick: '1' } })}
            hitSlop={6}
            style={styles.city}>
            <Icon name="location-outline" size={14} color={p.textMuted} />
            <AppText variant="small" tone="muted" numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.semibold }}>
              {place ?? t('Şehir seçilmedi')}
            </AppText>
            <AppText variant="small" style={{ color: p.primary, fontFamily: fonts.bold }}>
              {place ? t('Değiştir') : t('Seç')}
            </AppText>
          </PressableScale>
        )}
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('Bildirimler')}
        onPress={() => router.push({ pathname: '/soon/[feature]', params: { feature: 'notifications' } })}
        style={[styles.iconButton, { backgroundColor: p.surface, borderColor: p.border }]}>
        <Icon name="notifications-outline" size={20} color={p.primary} />
      </PressableScale>
    </View>
  );
}

function QuickActions({ wide }: { wide: boolean }) {
  return (
    <View style={styles.grid}>
      {QUICK.map((q) => (
        <View key={q.key} style={[styles.cell, { width: wide ? '25%' : '50%' }]}>
          <QuickAction title={t(q.title)} hint={t(q.hint)} icon={q.icon} feature={q.feature} onPress={() => router.push(q.href)} />
        </View>
      ))}
    </View>
  );
}

/** Rule-based, from the user's own data only: their open project and their city's prices. */
function ForYou({ wide }: { wide: boolean }) {
  const { session, db } = useSession();
  const projects = useProjects();
  let project: ReactNode = null;
  if (db && session && projects.isSuccess) project = <ContinueProject projects={projects.data} />;
  else if (db && session && projects.isPending) project = <SkeletonCard />;
  return (
    <View style={wide ? styles.twoCols : { gap: space.md }}>
      {project ? <View style={wide ? { flex: 1 } : null}>{project}</View> : null}
      <View style={wide ? { flex: 1 } : null}>
        <CityPriceCard />
      </View>
    </View>
  );
}

function MoreServices({ wide }: { wide: boolean }) {
  return (
    <View style={styles.more}>
      {MORE.map((m) => (
        <View key={m.key} style={{ width: wide ? '12.5%' : '25%', paddingVertical: space.sm }}>
          <IconLink title={t(m.title)} icon={m.icon} feature={m.feature} soon={m.soon} onPress={() => router.push(m.href)} />
        </View>
      ))}
    </View>
  );
}

/** Shown until the user has a project. */
function HowItWorks() {
  const p = usePalette();
  const { session, db } = useSession();
  const projects = useProjects();
  if (db && session && (!projects.isSuccess || projects.data.length > 0)) return null;
  return (
    <View style={[styles.how, { backgroundColor: p.heroFrom }]}>
      <AppText variant="cardTitle" style={{ color: p.onHero }}>
        {t('BoyaCep nasıl çalışır?')}
      </AppText>
      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View key={step} style={styles.step}>
            <View style={[styles.stepNo, { backgroundColor: p.cta }]}>
              <AppText variant="caption" style={{ color: p.onCta, fontFamily: fonts.extrabold }}>
                {String(i + 1)}
              </AppText>
            </View>
            <AppText variant="small" style={{ color: p.onHero, flex: 1 }}>
              {t(step)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const p = usePalette();
  const wide = useWide();
  const [searching, setSearching] = useState(false);
  const rooms: RoomItem[] = ROOMS.map((r) => ({ key: r.key, title: t(r.title), photo: r.photo, icon: r.icon, onPress: () => router.push(r.href) }));
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.background }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.inner, { maxWidth: wide ? MAX_WIDE_WIDTH : MAX_CONTENT_WIDTH, paddingHorizontal: wide ? space.xxl : space.lg }]}>
          <Header />
          <SearchBox onActiveChange={setSearching} />
          {searching ? null : (
            <>
              <FadeIn>
                <PhotoHero
                  photo="welcome"
                  title={t('Evin için güzel fikirler burada başlıyor.')}
                  body={t('Boyamadan yenilemeye, bütçeden usta bulmaya kadar her şey elinin altında.')}
                  action={t('Hemen başla')}
                  onAction={() => router.push('/calculate')}
                  minHeight={wide ? 380 : 320}
                  testID="home-hero"
                />
              </FadeIn>
              <QuickActions wide={wide} />
              <SectionHeader title={t('Evini yenile')} />
              <RoomStrip items={rooms} wide={wide} />
              <SectionHeader title={t('Sana özel')} />
              <ForYou wide={wide} />
              <SectionHeader title={t('Diğer hizmetler')} />
              <MoreServices wide={wide} />
              <HowItWorks />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: 'center', paddingBottom: space.xxl },
  inner: { width: '100%', paddingTop: space.md, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  city: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 24 },
  iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -space.xs - 1 },
  cell: { padding: space.xs + 1 },
  twoCols: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' },
  more: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs },
  how: { borderRadius: radius.lg + 2, padding: space.lg, gap: space.md },
  steps: { gap: space.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, padding: space.md },
  stepNo: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
