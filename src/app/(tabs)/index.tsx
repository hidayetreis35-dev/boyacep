import { router, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { initials } from '@/features/account/initials';
import { useAccount, useSession } from '@/features/account/session';
import { useCity } from '@/features/market/city';
import { provinceByCode } from '@/features/market/provinces';
import { ContinueProject } from '@/features/projects/continue-card';
import { useProjects } from '@/features/projects/queries';
import { msg, t } from '@/i18n';
import { InspirationArt } from '@/ui/art';
import { AppText, Icon, type IconName } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { MAX_CONTENT_WIDTH, fonts, radius, shadowOf, space, useFeatureColour, usePalette, type FeatureKey } from '@/ui/theme';

interface Tile {
  key: string;
  title: string;
  subtitle: string;
  icon: IconName;
  feature: FeatureKey;
  /** Coloured tiles are the two headline features; the rest are white. */
  tinted?: boolean;
  href: Href;
  soon?: boolean;
}

const TILES: Tile[] = [
  { key: 'calculate', title: msg('Boya Hesapla'), subtitle: msg('İhtiyacını öğren'), icon: 'color-fill', feature: 'calculate', tinted: true, href: '/calculate' },
  { key: 'colour', title: msg('Renk Stüdyosu'), subtitle: msg('Renkleri keşfet'), icon: 'color-palette', feature: 'color', tinted: true, href: '/colour' },
  { key: 'services', title: msg('Usta Bul'), subtitle: msg('Hizmet al'), icon: 'person', feature: 'projects', href: '/services' },
  { key: 'renovation', title: msg('Tadilat & Yenileme'), subtitle: msg('Proje oluştur'), icon: 'hammer', feature: 'calculate', href: '/projects' },
  { key: 'budget', title: msg('Ev Bütçesi'), subtitle: msg('Harcamalarını yönet'), icon: 'wallet', feature: 'cost', href: '/budget' },
  { key: 'ai-design', title: msg('AI Tasarım'), subtitle: msg('Hayalindeki evi tasarla'), icon: 'sparkles', feature: 'inspect', href: { pathname: '/soon/[feature]', params: { feature: 'ai-design' } }, soon: true },
];

const TOOLS: { title: string; icon: IconName; href: Href }[] = [
  { title: msg('Maliyet Hesapla'), icon: 'calculator', href: '/cost' },
  { title: msg('Duvarını İncele'), icon: 'scan', href: '/inspect' },
  { title: msg('Boya Fiyatları'), icon: 'stats-chart', href: '/prices' },
  { title: msg('Ustaya Sor'), icon: 'chatbubbles', href: '/ask' },
];

function TopBar() {
  const p = usePalette();
  const { session } = useSession();
  const account = useAccount();
  return (
    <View style={styles.topBar}>
      <View style={[styles.logo, { backgroundColor: p.cta }]}>
        <Icon name="color-fill" size={16} color={p.onCta} />
      </View>
      <AppText variant="heading" style={{ color: p.onHero, fontFamily: fonts.extrabold, flex: 1 }}>
        BoyaCep
      </AppText>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('Bildirimler')}
        onPress={() => router.push({ pathname: '/soon/[feature]', params: { feature: 'notifications' } })}
        style={styles.iconButton}>
        <Icon name="notifications-outline" size={22} color={p.onHero} />
      </PressableScale>
      <PressableScale accessibilityRole="button" accessibilityLabel={t('Profil')} onPress={() => router.push('/profile')} style={[styles.avatar, { backgroundColor: p.onHeroMuted }]}>
        {session ? (
          <AppText variant="caption" style={{ color: p.heroFrom, fontFamily: fonts.bold }}>
            {initials(account.data?.profile.display_name, session.user.email)}
          </AppText>
        ) : (
          <Icon name="person" size={18} color={p.heroFrom} />
        )}
      </PressableScale>
    </View>
  );
}

function LocationChip() {
  const p = usePalette();
  const city = useCity();
  if (city.loading) return <View style={styles.chip} />;
  const name = city.province ? [provinceByCode(city.province)?.name, city.district].filter(Boolean).join(' / ') : t('Şehir seçilmedi');
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={city.province ? t('Konum: {city}. Değiştir', { city: name }) : t('Şehir seç')}
      onPress={() => router.push({ pathname: '/prices', params: { pick: '1' } })}
      style={[styles.chip, { backgroundColor: p.surface }]}>
      <Icon name="location-outline" size={16} color={p.text} />
      <AppText variant="small" style={{ flex: 1, fontFamily: fonts.semibold }} numberOfLines={1}>
        {name}
      </AppText>
      <AppText variant="small" style={{ fontFamily: fonts.bold }}>
        {city.province ? t('Değiştir') : t('Seç')}
      </AppText>
    </PressableScale>
  );
}

function Greeting() {
  const p = usePalette();
  const account = useAccount();
  const name = account.data?.profile.display_name?.trim().split(/\s+/)[0];
  return (
    <View style={{ gap: 4 }}>
      <AppText variant="title" style={{ color: p.onHero }}>
        {name ? t('Merhaba {name},', { name }) : t('Merhaba,')}
      </AppText>
      <AppText style={{ color: p.onHeroMuted }}>{t('Evin için bugün neler yapmak istersin?')}</AppText>
    </View>
  );
}

function TileCard({ tile }: { tile: Tile }) {
  const p = usePalette();
  const f = useFeatureColour(tile.feature);
  const bg = tile.tinted ? f.soft : p.surface;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={tile.soon ? t('{title}, yakında', { title: t(tile.title) }) : t(tile.title)}
      onPress={() => router.push(tile.href)}
      style={[styles.tile, { backgroundColor: bg }]}>
      <View style={[styles.tileIcon, { backgroundColor: tile.tinted ? f.base : f.soft }]}>
        <Icon name={tile.icon} size={22} color={tile.tinted ? '#FFFFFF' : f.ink} />
      </View>
      <AppText variant="bodyStrong" style={{ color: tile.tinted ? f.ink : p.text, fontFamily: fonts.bold }} numberOfLines={2}>
        {t(tile.title)}
      </AppText>
      <AppText variant="caption" tone="muted" numberOfLines={1}>
        {tile.soon ? t('Yakında') : t(tile.subtitle)}
      </AppText>
    </PressableScale>
  );
}

function Inspiration() {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('Evin için ilham verici fikirler ve rehberler')}
      onPress={() => router.push('/guide')}
      style={[styles.banner, { backgroundColor: p.surface }]}>
      <View style={{ flex: 1, gap: space.sm, padding: space.lg }}>
        <AppText variant="bodyStrong" style={{ fontFamily: fonts.bold }}>
          {t('Evin için ilham verici fikirler ve rehberler')}
        </AppText>
        <View style={[styles.go, { backgroundColor: p.cta }]}>
          <AppText variant="caption" style={{ color: p.onCta, fontFamily: fonts.bold }}>
            {t('Keşfet')}
          </AppText>
          <Icon name="arrow-forward" size={14} color={p.onCta} />
        </View>
      </View>
      <InspirationArt width={140} height={120} />
    </PressableScale>
  );
}

function Tools() {
  const p = usePalette();
  return (
    <View style={styles.tools}>
      {TOOLS.map((tool) => (
        <PressableScale
          key={tool.title}
          accessibilityRole="button"
          accessibilityLabel={t(tool.title)}
          onPress={() => router.push(tool.href)}
          style={[styles.tool, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
          <Icon name={tool.icon} size={18} color={p.onHero} />
          <AppText variant="small" style={{ color: p.onHero, fontFamily: fonts.semibold }}>
            {t(tool.title)}
          </AppText>
        </PressableScale>
      ))}
    </View>
  );
}

/** Returning users see their open project. */
function Continue() {
  const { session, db } = useSession();
  const projects = useProjects();
  if (!db || !session || !projects.isSuccess) return null;
  return <ContinueProject projects={projects.data} />;
}

export default function HomeScreen() {
  const p = usePalette();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.heroFrom }}>
      <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: p.heroFrom }}>
        <View style={styles.inner}>
          <TopBar />
          <LocationChip />
          <Greeting />
          <View style={styles.grid}>
            {TILES.map((tile) => (
              <View key={tile.key} style={styles.cell}>
                <TileCard tile={tile} />
              </View>
            ))}
          </View>
          <View style={shadowOf(p, 2)}>
            <Inspiration />
          </View>
          <Continue />
          <AppText variant="bodyStrong" style={{ color: p.onHero }}>
            {t('Diğer araçlar')}
          </AppText>
          <Tools />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: 'center', paddingBottom: space.xxl },
  inner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, padding: space.lg, gap: space.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  logo: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.pill, paddingHorizontal: space.md, minHeight: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -space.xs },
  cell: { width: '50%', padding: space.xs },
  tile: { borderRadius: radius.lg, padding: space.md, gap: 4, minHeight: 128 },
  tileIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  banner: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, overflow: 'hidden' },
  go: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: space.md, minHeight: 40 },
});
