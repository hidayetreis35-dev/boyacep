import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EXPENSE_CATEGORY_LABEL, summarizeHomeBudget, type ExpenseCategory, type HomeBudgetSummary } from '@/engine';
import { useSession } from '@/features/account/session';
import { SignInGate } from '@/features/account/sign-in-gate';
import { isNotEnabled } from '@/features/budget/api';
import { useAllExpenses } from '@/features/budget/queries';
import { formatLira } from '@/features/market/format';
import { useProjects } from '@/features/projects/queries';
import { t } from '@/i18n';
import type { ProjectRow } from '@/lib/database.types';
import { formatNumber } from '@/lib/number';
import { SectionTitle } from '@/ui/brand';
import { AppText, Button, Card, EmptyState, ErrorState, Icon, ListItem, LoadingState, Screen, type IconName } from '@/ui/components';
import { fonts, radius, space, useFeatureColour, usePalette } from '@/ui/theme';

const CATEGORY_ICON: Record<ExpenseCategory, IconName> = {
  paint: 'color-fill',
  material: 'construct',
  labor: 'person',
  other: 'ellipsis-horizontal',
};

const percent = (share: number) => `%${formatNumber(Math.round(share * 100), 0)}`;

function Overview({ s }: { s: HomeBudgetSummary }) {
  const p = usePalette();
  const f = useFeatureColour('cost');
  const over = s.left !== null && s.left < 0;
  return (
    <Card>
      <View style={styles.row}>
        <AppText variant="small" tone="muted" style={{ flex: 1 }}>
          {s.budget !== null ? t('Toplam Bütçe') : t('Toplam Harcama')}
        </AppText>
        {s.usedShare !== null ? (
          <AppText variant="small" tone="muted">
            {percent(s.usedShare)}
          </AppText>
        ) : null}
      </View>
      <AppText variant="title" style={{ fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36 }} testID="home-budget-total">
        {formatLira(s.budget ?? s.spent)}
      </AppText>
      {s.budget !== null ? (
        <>
          <View style={[styles.track, { backgroundColor: p.surfaceMuted }]}>
            <View
              style={[styles.fill, { width: `${Math.min(100, (s.usedShare ?? 0) * 100)}%`, backgroundColor: over ? p.danger : f.base }]}
            />
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="caption" tone="muted">
                {t('Harcama')}
              </AppText>
              <AppText variant="bodyStrong">{formatLira(s.spent)}</AppText>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <AppText variant="caption" tone="muted">
                {over ? t('Aşım') : t('Kalan')}
              </AppText>
              <AppText variant="bodyStrong" style={over ? { color: p.danger } : undefined}>
                {formatLira(Math.abs(s.left!))}
              </AppText>
            </View>
          </View>
        </>
      ) : (
        <AppText variant="small" tone="muted">
          {t('Projelerine bütçe yazınca ne kadar kaldığını burada görürsün.')}
        </AppText>
      )}
    </Card>
  );
}

function Categories({ s }: { s: HomeBudgetSummary }) {
  const p = usePalette();
  const f = useFeatureColour('cost');
  if (s.categories.length === 0) {
    return (
      <Card>
        <AppText tone="muted">{t('Henüz harcama yok. Boya, malzeme ya da usta ödemesi yaptıkça ekle; bütçen kendiliğinden güncellensin.')}</AppText>
      </Card>
    );
  }
  return (
    <Card>
      {s.categories.map((c, i) => (
        <View key={c.category} style={[styles.catRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }]}>
          <View style={[styles.catIcon, { backgroundColor: f.soft }]}>
            <Icon name={CATEGORY_ICON[c.category]} size={18} color={f.ink} />
          </View>
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {t(EXPENSE_CATEGORY_LABEL[c.category])}
          </AppText>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="bodyStrong">{formatLira(c.amount)}</AppText>
            <AppText variant="caption" tone="muted">
              {percent(c.share)}
            </AppText>
          </View>
        </View>
      ))}
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
    return <ErrorState message={t('Bütçe yüklenemedi. İnternet bağlantını kontrol et.')} onRetry={retry} />;
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
      <SectionTitle title={t('Harcamalarım')} />
      <Categories s={s} />
      <AddExpense projects={open.length ? open : projects.data} />
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
          feature="cost"
          icon="wallet"
          title={t('Ev Bütçem')}
          message={t('Giriş yapınca tüm projelerinin bütçesini ve harcamalarını tek yerde görürsün.')}
          benefits={[t('Toplam bütçe, harcanan ve kalan tutar.'), t('Boya, malzeme ve işçiliğe ne kadar gittiğini gör.'), t('Fişlerini harcamaya ekle.')]}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  catIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
