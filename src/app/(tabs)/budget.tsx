import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EXPENSE_CATEGORY_LABEL, monthlySpending, summarizeHomeBudget, type HomeBudgetSummary } from '@/engine';
import { useSession } from '@/features/account/session';
import { SignInGate } from '@/features/account/sign-in-gate';
import { isNotEnabled, type HomeExpense } from '@/features/budget/api';
import { CategoryBreakdown, METER_ON_TRACK, METER_OVER, MonthlyBars, useCategoryColours } from '@/features/budget/charts';
import { useAllExpenses } from '@/features/budget/queries';
import { formatLira } from '@/features/market/format';
import { useProjects } from '@/features/projects/queries';
import { formatDate } from '@/features/quotes/pdf';
import { t } from '@/i18n';
import type { ProjectRow } from '@/lib/database.types';
import { formatNumber } from '@/lib/number';
import { SectionTitle } from '@/ui/brand';
import { AppText, Button, Card, EmptyState, ErrorState, Icon, ListItem, LoadingState, Screen } from '@/ui/components';
import { PressableScale } from '@/ui/motion';
import { HeroPanel } from '@/ui/showcase';
import { radius, space, usePalette } from '@/ui/theme';

const percent = (share: number) => `%${formatNumber(Math.round(share * 100), 0)}`;

function Overview({ s, sample }: { s: HomeBudgetSummary; sample?: boolean }) {
  const p = usePalette();
  const over = s.left !== null && s.left < 0;
  return (
    <HeroPanel>
      <View style={styles.row}>
        <AppText variant="overline" style={{ flex: 1, color: p.onHeroMuted }}>
          {s.budget !== null ? t('Toplam Bütçe') : t('Toplam Harcama')}
        </AppText>
        {s.usedShare !== null ? (
          <AppText variant="small" style={{ color: p.onHeroMuted }}>
            {t('{share} kullanıldı', { share: percent(s.usedShare) })}
          </AppText>
        ) : null}
      </View>
      <AppText variant="display" style={{ color: p.onHero, fontSize: 38, lineHeight: 44 }} testID={sample ? undefined : 'home-budget-total'}>
        {formatLira(s.budget ?? s.spent)}
      </AppText>
      {s.budget !== null ? (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, (s.usedShare ?? 0) * 100)}%`, backgroundColor: over ? METER_OVER : METER_ON_TRACK }]} />
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="caption" style={{ color: p.onHeroMuted }}>
                {t('Harcanan')}
              </AppText>
              <AppText variant="bodyStrong" style={{ color: p.onHero }}>
                {formatLira(s.spent)}
              </AppText>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <View style={styles.row}>
                {over ? <Icon name="alert-circle" size={16} color={METER_OVER} /> : null}
                <AppText variant="caption" style={{ color: p.onHeroMuted }}>
                  {over ? t('Aşım') : t('Kalan')}
                </AppText>
              </View>
              <AppText variant="bodyStrong" style={{ color: p.onHero }}>
                {formatLira(Math.abs(s.left!))}
              </AppText>
            </View>
          </View>
        </>
      ) : (
        <AppText variant="small" style={{ color: p.onHeroMuted }}>
          {t('Projelerine bütçe yazınca ne kadar kaldığını burada görürsün.')}
        </AppText>
      )}
    </HeroPanel>
  );
}

function Categories({ s }: { s: HomeBudgetSummary }) {
  if (s.categories.length === 0) {
    return (
      <Card>
        <AppText tone="muted">{t('Henüz harcama yok. Boya, malzeme ya da usta ödemesi yaptıkça ekle; bütçen kendiliğinden güncellensin.')}</AppText>
      </Card>
    );
  }
  return (
    <Card>
      <CategoryBreakdown s={s} />
    </Card>
  );
}

/** Today as YYYY-MM-DD in the phone's own time zone. */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Months({ expenses }: { expenses: HomeExpense[] }) {
  const months = monthlySpending(
    expenses.map((e) => ({ spentOn: e.spent_on, amount: Number(e.amount) })),
    localToday(),
  );
  const [selected, setSelected] = useState(months[months.length - 1].month);
  return (
    <Card>
      <MonthlyBars months={months} selected={selected} onSelect={setSelected} />
    </Card>
  );
}

const RECENT = 5;

function Recent({ expenses, projects }: { expenses: HomeExpense[]; projects: ProjectRow[] }) {
  const p = usePalette();
  const colours = useCategoryColours();
  const titles = new Map(projects.map((project) => [project.id, project.title]));
  return (
    <Card>
      {expenses.slice(0, RECENT).map((e, i) => {
        const meta = [titles.get(e.project_id), formatDate(e.spent_on)].filter(Boolean).join(' · ');
        return (
          <PressableScale
            key={e.id}
            accessibilityRole="button"
            accessibilityLabel={`${e.label}, ${formatLira(Number(e.amount))}, ${meta}`}
            onPress={() => router.push({ pathname: '/projects/[id]/budget', params: { id: e.project_id } })}
            style={[styles.recentRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }]}>
            <View style={[styles.key, { backgroundColor: colours[e.category] }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {e.label}
              </AppText>
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {t(EXPENSE_CATEGORY_LABEL[e.category])} · {meta}
              </AppText>
            </View>
            <AppText variant="bodyStrong">{formatLira(Number(e.amount))}</AppText>
          </PressableScale>
        );
      })}
    </Card>
  );
}

function AddExpense({ projects }: { projects: ProjectRow[] }) {
  const [choosing, setChoosing] = useState(false);
  const open = (id: string) => router.push({ pathname: '/projects/[id]/budget', params: { id } });
  if (choosing) {
    return (
      <Card>
        <AppText variant="heading">{t('Hangi projeye?')}</AppText>
        {projects.map((project) => (
          <Button key={project.id} label={project.title} variant="secondary" onPress={() => open(project.id)} />
        ))}
        <Button label={t('Vazgeç')} variant="ghost" onPress={() => setChoosing(false)} />
      </Card>
    );
  }
  return (
    <Button
      label={t('Yeni Harcama Ekle')}
      icon="add"
      variant="cta"
      size="lg"
      onPress={() => (projects.length === 1 ? open(projects[0].id) : setChoosing(true))}
    />
  );
}

function HomeBudget() {
  const projects = useProjects();
  const expenses = useAllExpenses();

  if (projects.isPending || expenses.isPending) return <LoadingState />;
  if (expenses.isError && isNotEnabled(expenses.error.message)) {
    return <EmptyState icon="time" title={t('Yakında')} message={t('Ev Bütçem hazır ama sunucuda henüz açılmadı.')} />;
  }
  if (projects.isError || expenses.isError) {
    const retry = () => {
      projects.refetch();
      expenses.refetch();
    };
    return <ErrorState message={t('Bütçeni yükleyemedik. İnternet bağlantını kontrol eder misin?')} onRetry={retry} />;
  }
  if (projects.data.length === 0) {
    return (
      <EmptyState
        icon="wallet"
        title={t('Henüz proje yok')}
        message={t('Bir proje oluştur, bütçeni yaz; harcamalarını ekledikçe ne kadar kaldığını burada gör.')}
        action={<Button label={t('Proje oluştur')} icon="add" onPress={() => router.push('/projects')} />}
      />
    );
  }

  const s = summarizeHomeBudget(
    projects.data.map((p) => ({ id: p.id, budget: p.budget })),
    expenses.data.map((e) => ({ projectId: e.project_id, category: e.category, amount: Number(e.amount) })),
  );
  const open = projects.data.filter((p) => p.status !== 'completed' && p.status !== 'cancelled');
  const spentOf = new Map(s.projects.map((r) => [r.id, r]));

  return (
    <>
      <Overview s={s} />
      <AddExpense projects={open.length ? open : projects.data} />
      <SectionTitle title={t('Harcamalarım')} />
      <Categories s={s} />
      {expenses.data.length > 0 ? (
        <>
          <SectionTitle title={t('Aylara göre')} />
          <Months expenses={expenses.data} />
          <SectionTitle title={t('Son harcamalar')} />
          <Recent expenses={expenses.data} projects={projects.data} />
        </>
      ) : null}
      <SectionTitle title={t('Projelere göre')} />
      {projects.data.map((project) => {
        const row = spentOf.get(project.id)!;
        return (
          <ListItem
            key={project.id}
            title={project.title}
            subtitle={
              row.budget !== null
                ? t('{spent} / {budget}', { spent: formatLira(row.spent), budget: formatLira(row.budget) })
                : t('{spent} harcandı, bütçe yazılmadı', { spent: formatLira(row.spent) })
            }
            onPress={() => router.push({ pathname: '/projects/[id]/budget', params: { id: project.id } })}
          />
        );
      })}
    </>
  );
}

/** A made-up home budget for guests, always inside an "Örnek" preview: 25.000 ₺ budget, 14.500 ₺ spent. */
const SAMPLE_BUDGET = summarizeHomeBudget(
  [{ id: 'sample', budget: 25000 }],
  [
    { projectId: 'sample', category: 'labor', amount: 7000 },
    { projectId: 'sample', category: 'paint', amount: 6000 },
    { projectId: 'sample', category: 'material', amount: 1500 },
  ],
);

export default function BudgetScreen() {
  const { db, session, loading } = useSession();
  return (
    <Screen>
      <AppText variant="title">{t('Ev Bütçem')}</AppText>
      {loading ? (
        <LoadingState />
      ) : session && db ? (
        <HomeBudget />
      ) : (
        <SignInGate
          feature="budget"
          icon="wallet"
          title={t('Ev Bütçem')}
          preview={{
            caption: t('Bütçen burada böyle görünecek.'),
            content: (
              <>
                <Overview s={SAMPLE_BUDGET} sample />
                <Categories s={SAMPLE_BUDGET} />
              </>
            ),
          }}
          message={t('Giriş yapınca tüm projelerinin bütçesini ve harcamalarını tek yerde görürsün.')}
          benefits={[t('Toplam bütçe, harcanan ve kalan tutar.'), t('Boya, malzeme ve işçiliğe ne kadar gittiğini gör.'), t('Fişlerini harcamaya ekle.')]}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.18)' },
  fill: { height: '100%', borderRadius: radius.pill },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, minHeight: 52 },
  key: { width: 14, height: 14, borderRadius: 4 },
});
