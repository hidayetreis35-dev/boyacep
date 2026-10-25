import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/features/account/session';
import { HOME_ACTIONS, type HomeAction } from '@/features/home/actions';
import { useProjects } from '@/features/projects/queries';
import { STATUS_LABEL } from '@/features/projects/mapping';
import { t } from '@/i18n';
import { Gradient, PaintDrops, RollerMark, SectionTitle, SwatchFan } from '@/ui/brand';
import { AppText, Badge, Button, Icon, Screen } from '@/ui/components';
import { FadeIn, PressableScale } from '@/ui/motion';
import { fonts, radius, shadowOf, space, useFeatureColour, usePalette } from '@/ui/theme';

function open(action: HomeAction) {
  if (action.href) router.push(action.href);
  else router.push({ pathname: '/soon/[feature]', params: { feature: action.key } });
}

function Hero() {
  const p = usePalette();
  return (
    <View style={[styles.hero, shadowOf(p, 2)]}>
      <Gradient from={p.heroFrom} to={p.heroTo} />
      <PaintDrops colours={['#FF6B2C', '#C2367A', '#D99A1E']} style={{ opacity: 0.9 }} />
      <View style={{ gap: space.sm, maxWidth: 420 }}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: p.cta }]}>
            <Icon name="color-fill" size={16} color={p.onCta} />
          </View>
          <AppText variant="overline" style={{ color: p.onHeroMuted }}>
            BoyaCep
          </AppText>
        </View>
        <AppText variant="display" style={{ color: p.onHero, paddingRight: 72 }}>
          {t('Evini boyamanın en kolay yolu')}
        </AppText>
        <AppText style={{ color: p.onHeroMuted }}>{t('Ne kadar boya, hangi renk, ne kadar tutar: hepsi tek yerde.')}</AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Button label={t('Hesaplamaya başla')} icon="arrow-forward" variant="cta" onPress={() => router.push('/calculate')} />
      </View>
    </View>
  );
}

/** The two headline features get a wide card with an illustration. */
function WideCard({ action, art }: { action: HomeAction; art: React.ReactNode }) {
  const f = useFeatureColour(action.feature);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t(action.title)}
      onPress={() => open(action)}
      style={[styles.wide, { backgroundColor: f.soft }]}>
      <View style={{ flex: 1, gap: space.xs }}>
        <View style={[styles.wideIcon, { backgroundColor: f.base }]}>
          <Icon name={action.icon} size={22} color="#FFFFFF" />
        </View>
        <AppText variant="heading" style={{ color: f.ink, fontFamily: fonts.extrabold }}>
          {t(action.title)}
        </AppText>
        <AppText variant="small" style={{ color: f.ink, opacity: 0.85 }}>
          {t(action.subtitle)}
        </AppText>
        <View style={[styles.go, { backgroundColor: f.base }]}>
          <AppText variant="caption" style={{ color: '#FFFFFF', fontFamily: fonts.bold }}>
            {t('Başla')}
          </AppText>
          <Icon name="arrow-forward" size={14} color="#FFFFFF" />
        </View>
      </View>
      <View style={{ justifyContent: 'center' }}>{art}</View>
    </PressableScale>
  );
}

function SmallCard({ action }: { action: HomeAction }) {
  const p = usePalette();
  const f = useFeatureColour(action.feature);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={action.href ? t(action.title) : t('{title}, yakında', { title: t(action.title) })}
      onPress={() => open(action)}
      style={[styles.small, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
      <View style={[styles.smallIcon, { backgroundColor: f.soft }]}>
        <Icon name={action.icon} size={22} color={f.ink} />
      </View>
      <AppText variant="bodyStrong" style={{ fontFamily: fonts.bold }}>
        {t(action.title)}
      </AppText>
      <AppText variant="caption" tone="muted">
        {t(action.subtitle)}
      </AppText>
      {!action.href && <Badge label={t('Yakında')} />}
    </PressableScale>
  );
}

function RecentProjects() {
  const p = usePalette();
  const { session, db } = useSession();
  const projects = useProjects();

  if (!db || !session) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('Projeni kaydet')}
        onPress={() => router.push(db ? '/sign-in' : '/projects')}
        style={[styles.saveCta, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
        <View style={[styles.smallIcon, { backgroundColor: p.primarySoft }]}>
          <Icon name="bookmark" size={22} color={p.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong" style={{ fontFamily: fonts.bold }}>
            {t('Projeni kaydet')}
          </AppText>
          <AppText variant="small" tone="muted">
            {t('Oda ölçülerin, malzeme listen ve renklerin bir arada dursun.')}
          </AppText>
        </View>
        <Icon name="chevron-forward" color={p.textMuted} />
      </PressableScale>
    );
  }

  const list = (projects.data ?? []).slice(0, 5);
  return (
    <View style={{ gap: space.md }}>
      <SectionTitle
        title={t('Son projelerin')}
        action={
          list.length > 0 ? (
            <Button label={t('Tümü')} variant="ghost" onPress={() => router.push('/projects')} />
          ) : undefined
        }
      />
      {list.length === 0 ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('İlk projeni oluştur')}
          onPress={() => router.push('/projects')}
          style={[styles.saveCta, { backgroundColor: p.accentSoft, borderColor: 'transparent' }]}>
          <View style={[styles.smallIcon, { backgroundColor: p.cta }]}>
            <Icon name="add" size={24} color={p.onCta} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyStrong" style={{ fontFamily: fonts.bold }}>
              {t('İlk projeni oluştur')}
            </AppText>
            <AppText variant="small" tone="muted">
              {t('Odalarını ekle, malzeme ve maliyet kendiliğinden çıksın.')}
            </AppText>
          </View>
        </PressableScale>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingVertical: 4 }}>
          {list.map((project) => (
            <PressableScale
              key={project.id}
              accessibilityRole="button"
              accessibilityLabel={project.title}
              onPress={() => router.push({ pathname: '/projects/[id]', params: { id: project.id } })}
              style={[styles.projectCard, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
              <View style={[styles.projectArt, { backgroundColor: p.primarySoft }]}>
                <RollerMark colour={p.primary} size={36} />
              </View>
              <AppText variant="bodyStrong" numberOfLines={1} style={{ fontFamily: fonts.bold }}>
                {project.title}
              </AppText>
              <Badge label={t(STATUS_LABEL[project.status])} tone="primary" />
            </PressableScale>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const [calculate, colour, ...rest] = HOME_ACTIONS;
  const c = useFeatureColour('calculate');
  return (
    <Screen>
      <FadeIn>
        <Hero />
      </FadeIn>
      <FadeIn delay={80} style={{ gap: space.md }}>
        <SectionTitle title={t('Ne yapmak istersin?')} />
        <WideCard action={calculate} art={<RollerMark colour={c.base} size={76} />} />
        <WideCard action={colour} art={<SwatchFan colours={['#2F5D6B', '#C2367A', '#D99A1E', '#A3B49A']} size={80} />} />
        <View style={styles.grid}>
          {rest.map((a) => (
            <View key={a.key} style={styles.cell}>
              <SmallCard action={a} />
            </View>
          ))}
        </View>
      </FadeIn>
      <FadeIn delay={160}>
        <RecentProjects />
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.lg, overflow: 'hidden' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  brandMark: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  wide: { flexDirection: 'row', borderRadius: radius.xl, padding: space.lg + 2, gap: space.md, overflow: 'hidden', minHeight: 150 },
  wideIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  go: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    marginTop: space.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -space.xs },
  cell: { width: '50%', padding: space.xs },
  small: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: 4,
    minHeight: 150,
    overflow: 'hidden',
  },
  smallIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  saveCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
  },
  projectCard: { width: 168, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.sm },
  projectArt: { height: 72, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
