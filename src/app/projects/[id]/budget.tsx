import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import { EXPENSE_CATEGORY_LABEL, EXPENSE_CATEGORY_ORDER, summarizeBudget, type BudgetSummary, type ExpenseCategory } from '@/engine';
import { isNotEnabled, type ExpenseWithReceipt } from '@/features/budget/api';
import { BudgetField } from '@/features/budget/budget-field';
import { emptyExpenseForm, toExpenseDraft, type ExpenseErrors, type ExpenseForm } from '@/features/budget/form';
import { costSummaryFromRows } from '@/features/budget/plan';
import { useExpenseActions, useExpenses } from '@/features/budget/queries';
import { useCosts, useMaterials } from '@/features/materials/queries';
import { PhotoSourceButtons } from '@/features/photos/photo-source';
import type { PickedPhoto } from '@/features/photos/picker';
import { useProject } from '@/features/projects/queries';
import { formatDate } from '@/features/quotes/pdf';
import { t } from '@/i18n';
import { formatMoney } from '@/lib/number';
import { AppText, Button, Card, ChoiceChips, EmptyState, ErrorState, FieldRow, Icon, LoadingState, Notice, NumberField, Screen, TextField } from '@/ui/components';
import { SectionTitle } from '@/ui/brand';
import { fonts, radius, space, useFeatureColour, usePalette } from '@/ui/theme';

const CATEGORY_OPTIONS = EXPENSE_CATEGORY_ORDER.map((value) => ({ value, label: EXPENSE_CATEGORY_LABEL[value] }));

function Bar({ share, tone }: { share: number; tone: 'ok' | 'warn' | 'over' }) {
  const p = usePalette();
  const f = useFeatureColour('cost');
  const colour = tone === 'over' ? p.danger : tone === 'warn' ? p.accent : f.base;
  return (
    <View style={[styles.track, { backgroundColor: p.surfaceMuted }]}>
      <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, share * 100))}%`, backgroundColor: colour }]} />
    </View>
  );
}

function Overview({ s }: { s: BudgetSummary }) {
  const p = usePalette();
  const tone = s.status === 'over' ? 'over' : s.status === 'near-limit' || s.forecastOver ? 'warn' : 'ok';
  return (
    <Card>
      <AppText variant="overline" tone="muted">
        {t('Harcanan')}
      </AppText>
      <AppText variant="title" style={{ fontFamily: fonts.extrabold }} testID="budget-spent">
        {formatMoney(s.spent)}
      </AppText>
      {s.budget !== null ? (
        <>
          <AppText tone="muted">{t('Bütçe: {budget}', { budget: formatMoney(s.budget) })}</AppText>
          <Bar share={s.usedShare ?? 0} tone={tone} />
          <AppText variant="bodyStrong" style={{ color: s.left! < 0 ? p.danger : p.text }}>
            {s.left! >= 0 ? t('Kalan: {amount}', { amount: formatMoney(s.left!) }) : t('Bütçe aşımı: {amount}', { amount: formatMoney(-s.left!) })}
          </AppText>
        </>
      ) : null}
      <View style={styles.statRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" tone="muted">
            {t('Planlanan')}
          </AppText>
          <AppText variant="bodyStrong">{formatMoney(s.planned)}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" tone="muted">
            {t('Tahmini son tutar')}
          </AppText>
          <AppText variant="bodyStrong">{formatMoney(s.forecast)}</AppText>
        </View>
      </View>
      {s.status === 'over' ? (
        <Notice tone="danger" icon="alert-circle">
          {t('Bütçeyi aştın. Kalan işler için ustadan ve mağazadan yeniden fiyat almayı düşün.')}
        </Notice>
      ) : s.forecastOver ? (
        <Notice tone="accent" icon="trending-up">
          {t('Bu gidişle bütçeyi yaklaşık {amount} aşabilirsin.', { amount: formatMoney(s.forecast - s.budget!) })}
        </Notice>
      ) : s.status === 'near-limit' ? (
        <Notice tone="accent" icon="alert-circle">
          {t('Bütçenin %90’ını harcadın.')}
        </Notice>
      ) : null}
      {s.missingPrices > 0 ? (
        <AppText variant="caption" tone="muted">
          {t('Malzeme listesinde {count} kalemin fiyatı yok; planlanan tutar eksik olabilir.', { count: s.missingPrices })}
        </AppText>
      ) : null}
      <AppText variant="caption" tone="muted">
        {t('Tahmini son tutar: her kalemde harcanan ya da planlanan tutardan büyük olanı.')}
      </AppText>
    </Card>
  );
}

function Categories({ s }: { s: BudgetSummary }) {
  return (
    <Card>
      <AppText variant="heading">{t('Kaleme göre')}</AppText>
      {s.lines.map((line) => {
        const over = line.planned > 0 && line.spent > line.planned;
        return (
          <View key={line.category} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
              <AppText variant="bodyStrong">{t(EXPENSE_CATEGORY_LABEL[line.category])}</AppText>
              <AppText variant="small" tone={over ? 'danger' : 'muted'}>
                {t('{spent} / plan {planned}', { spent: formatMoney(line.spent), planned: formatMoney(line.planned) })}
              </AppText>
            </View>
            <Bar share={line.planned > 0 ? line.spent / line.planned : line.spent > 0 ? 1 : 0} tone={over ? 'over' : 'ok'} />
          </View>
        );
      })}
    </Card>
  );
}

function AddExpense({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(() => emptyExpenseForm());
  const [errors, setErrors] = useState<ExpenseErrors>({});
  const [receipt, setReceipt] = useState<PickedPhoto | null>(null);
  const { add } = useExpenseActions(projectId);
  const set = <K extends keyof ExpenseForm>(key: K, value: ExpenseForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  if (!open) return <Button label={t('Harcama ekle')} icon="add" variant="cta" size="lg" onPress={() => setOpen(true)} />;

  const submit = () => {
    const parsed = toExpenseDraft(form);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    add.mutate(
      { draft: parsed.draft, receipt },
      {
        onSuccess: () => {
          setForm(emptyExpenseForm(form.category));
          setReceipt(null);
          setOpen(false);
        },
      },
    );
  };

  return (
    <Card>
      <AppText variant="heading">{t('Yeni harcama')}</AppText>
      <ChoiceChips label={t('Kalem')} options={CATEGORY_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} value={form.category} onChange={(c: ExpenseCategory) => set('category', c)} />
      <TextField label={t('Ne aldın ya da ödedin?')} placeholder={t('Örn. İç cephe boyası 15 L')} value={form.label} onChangeText={(v) => set('label', v)} error={errors.label && t(errors.label)} maxLength={120} testID="expense-label" />
      <FieldRow>
        <NumberField label={t('Tutar')} unit="₺" value={form.amount} onChangeText={(v) => set('amount', v)} error={errors.amount && t(errors.amount)} testID="expense-amount" />
        <TextField label={t('Tarih')} value={form.date} onChangeText={(v) => set('date', v)} error={errors.date && t(errors.date)} keyboardType="numbers-and-punctuation" testID="expense-date" />
      </FieldRow>
      <TextField label={t('Mağaza veya usta (isteğe bağlı)')} value={form.store} onChangeText={(v) => set('store', v)} error={errors.store && t(errors.store)} maxLength={80} testID="expense-store" />
      <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
        {t('Fiş fotoğrafı (isteğe bağlı)')}
      </AppText>
      {receipt ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Image source={{ uri: receipt.uri }} style={styles.thumb} accessibilityLabel={t('Fiş fotoğrafı')} />
          <Button label={t('Fişi kaldır')} icon="close" variant="ghost" onPress={() => setReceipt(null)} />
        </View>
      ) : (
        <PhotoSourceButtons onPicked={setReceipt} />
      )}
      {add.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {add.error.message}
        </Notice>
      ) : null}
      <FieldRow>
        <Button label={t('Vazgeç')} variant="secondary" onPress={() => setOpen(false)} />
        <Button label={t('Kaydet')} icon="checkmark" loading={add.isPending} onPress={submit} />
      </FieldRow>
    </Card>
  );
}

function ExpenseRow({ expense, onDelete }: { expense: ExpenseWithReceipt; onDelete: () => void }) {
  const p = usePalette();
  const meta = [t(EXPENSE_CATEGORY_LABEL[expense.category]), formatDate(expense.spent_on), expense.store_name].filter(Boolean).join(' · ');
  return (
    <View style={styles.row}>
      {expense.receiptUrl ? (
        <Pressable accessibilityRole="link" accessibilityLabel={t('Fişi aç')} onPress={() => Linking.openURL(expense.receiptUrl!)}>
          <Image source={{ uri: expense.receiptUrl }} style={styles.thumbSmall} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{expense.label}</AppText>
        <AppText variant="caption" tone="muted">
          {meta}
        </AppText>
      </View>
      <AppText variant="bodyStrong">{formatMoney(Number(expense.amount))}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('{label} harcamasını sil', { label: expense.label })}
        onPress={onDelete}
        style={styles.iconButton}>
        <Icon name="trash-outline" color={p.textMuted} size={20} />
      </Pressable>
    </View>
  );
}

export default function BudgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const materials = useMaterials(id);
  const costs = useCosts(id);
  const expenses = useExpenses(id);
  const { remove } = useExpenseActions(id);

  const queries = [project, materials, costs, expenses];
  if (queries.some((q) => q.isPending)) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (expenses.isError && isNotEnabled(expenses.error.message)) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="time"
          title={t('Yakında')}
          message={t('Akıllı Bütçe hazır ama sunucuda henüz açılmadı. Açılınca harcamalarını ve fişlerini buraya kaydedebileceksin.')}
        />
      </Screen>
    );
  }
  if (project.isError || materials.isError || costs.isError || expenses.isError) {
    return (
      <Screen edges={['bottom']}>
        <ErrorState message={t('Bütçe bilgileri yüklenemedi.')} onRetry={() => queries.forEach((q) => q.refetch())} />
      </Screen>
    );
  }

  const budget = project.data!.project.budget === null ? null : Number(project.data!.project.budget);
  const plan = costSummaryFromRows(materials.data!, costs.data!, budget);
  const list = expenses.data!;
  const summary = summarizeBudget(plan, list.map((e) => ({ category: e.category, amount: Number(e.amount) })), budget);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('Akıllı Bütçe') }} />
      <Overview s={summary} />
      {summary.budget === null ? <BudgetField key="none" projectId={id} budget={null} /> : null}
      <AddExpense projectId={id} />
      <View style={{ gap: space.sm }}>
        <SectionTitle title={t('Harcamalar')} />
        {list.length === 0 ? (
          <EmptyState icon="receipt" title={t('Henüz harcama yok')} message={t('Boya, malzeme ya da usta için ödediğin her tutarı ekle; plana göre nerede olduğunu gör.')} />
        ) : (
          <Card>
            {list.map((e) => (
              <ExpenseRow key={e.id} expense={e} onDelete={() => remove.mutate(e)} />
            ))}
          </Card>
        )}
        {remove.isError ? (
          <Notice tone="danger" icon="alert-circle">
            {remove.error.message}
          </Notice>
        ) : null}
      </View>
      <Categories s={summary} />
      {summary.budget !== null ? <BudgetField key={String(summary.budget)} projectId={id} budget={summary.budget} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  statRow: { flexDirection: 'row', gap: space.md, marginTop: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  thumbSmall: { width: 40, height: 40, borderRadius: radius.sm },
});
