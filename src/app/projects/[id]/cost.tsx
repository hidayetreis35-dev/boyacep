import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { calculateProject, summarizeCost } from '@/engine';
import { CostSummaryCard } from '@/features/materials/cost-summary';
import { materialsToDrafts } from '@/features/materials/from-calculation';
import { MaterialRow } from '@/features/materials/material-row';
import {
  useAddCost,
  useAddMaterial,
  useCosts,
  useDeleteCost,
  useDeleteMaterial,
  useMaterials,
  useSetBudget,
  useSyncMaterials,
  useUpdateMaterial,
} from '@/features/materials/queries';
import { roomToInput } from '@/features/projects/mapping';
import { useProject } from '@/features/projects/queries';
import type { ProjectCostRow } from '@/lib/database.types';
import { formatMoney, formatNumber, parseDecimal } from '@/lib/number';
import {
  AppText,
  Button,
  Card,
  ChoiceChips,
  EmptyState,
  ErrorState,
  FieldRow,
  Icon,
  LoadingState,
  Notice,
  NumberField,
  Screen,
  TextField,
} from '@/ui/components';
import { space, usePalette } from '@/ui/theme';

const COST_KIND_OPTIONS: { value: ProjectCostRow['kind']; label: string }[] = [
  { value: 'labor', label: 'İşçilik' },
  { value: 'transport', label: 'Ulaşım' },
  { value: 'other', label: 'Diğer' },
];

function AddMaterial({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const add = useAddMaterial(projectId);
  if (!open) return <Button label="Kalem ekle" icon="add" variant="ghost" onPress={() => setOpen(true)} />;
  const q = parseDecimal(quantity);
  const valid = name.trim().length > 0 && Number.isFinite(q);
  return (
    <View style={{ gap: space.sm }}>
      <TextField label="Malzeme adı" placeholder="Örn. Silikon" value={name} onChangeText={setName} maxLength={120} />
      <NumberField label="Miktar" unit="adet" value={quantity} onChangeText={setQuantity} />
      {add.isError ? <Notice tone="danger" icon="alert-circle">Eklenemedi: {add.error.message}</Notice> : null}
      <Button
        label="Ekle"
        disabled={!valid}
        loading={add.isPending}
        onPress={() =>
          add.mutate(
            { category: 'other', name: name.trim(), quantity: q, unit: 'adet' },
            {
              onSuccess: () => {
                setOpen(false);
                setName('');
                setQuantity('1');
              },
            },
          )
        }
      />
    </View>
  );
}

function AddCost({ projectId }: { projectId: string }) {
  const [kind, setKind] = useState<ProjectCostRow['kind']>('labor');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<'estimate' | 'store'>('estimate');
  const add = useAddCost(projectId);
  const value = parseDecimal(amount);
  const fallbackLabel = COST_KIND_OPTIONS.find((o) => o.value === kind)!.label;
  return (
    <View style={{ gap: space.sm }}>
      <ChoiceChips label="Gider türü" options={COST_KIND_OPTIONS} value={kind} onChange={setKind} />
      <FieldRow>
        <TextField label="Açıklama" placeholder={fallbackLabel} value={label} onChangeText={setLabel} maxLength={120} />
        <NumberField label="Tutar" unit="₺" value={amount} onChangeText={setAmount} testID="cost-amount" />
      </FieldRow>
      <ChoiceChips
        options={[
          { value: 'estimate' as const, label: 'Tahmini' },
          { value: 'store' as const, label: 'Kesin (teklif / fatura)' },
        ]}
        value={source}
        onChange={setSource}
      />
      {add.isError ? <Notice tone="danger" icon="alert-circle">Eklenemedi: {add.error.message}</Notice> : null}
      <Button
        label="Gider ekle"
        icon="add"
        variant="secondary"
        disabled={!Number.isFinite(value)}
        loading={add.isPending}
        onPress={() =>
          add.mutate(
            { kind, label: label.trim() || fallbackLabel, amount: value, price_source: source },
            {
              onSuccess: () => {
                setLabel('');
                setAmount('');
              },
            },
          )
        }
      />
    </View>
  );
}

function Budget({ projectId, budget }: { projectId: string; budget: number | null }) {
  const initial = budget === null ? '' : formatNumber(budget, 2);
  const [text, setText] = useState(initial);
  const save = useSetBudget(projectId);
  const value = text.trim() === '' ? null : parseDecimal(text);
  const invalid = value !== null && !Number.isFinite(value);
  return (
    <Card>
      <AppText variant="heading">Bütçe</AppText>
      <NumberField
        label="Bu iş için ayırdığın tutar"
        unit="₺"
        value={text}
        onChangeText={setText}
        error={invalid ? 'Tutarı sayı olarak yazın.' : undefined}
        testID="budget"
      />
      {text !== initial ? (
        <Button label="Bütçeyi kaydet" variant="secondary" disabled={invalid} loading={save.isPending} onPress={() => save.mutate(value)} />
      ) : null}
    </Card>
  );
}

export default function CostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const project = useProject(id);
  const materials = useMaterials(id);
  const costs = useCosts(id);
  const sync = useSyncMaterials(id);
  const update = useUpdateMaterial(id);
  const removeMaterial = useDeleteMaterial(id);
  const removeCost = useDeleteCost(id);

  if (project.isPending || materials.isPending || costs.isPending) {
    return <Screen edges={['bottom']}><LoadingState /></Screen>;
  }
  if (project.isError || materials.isError || costs.isError) {
    const retry = () => {
      project.refetch();
      materials.refetch();
      costs.refetch();
    };
    return <Screen edges={['bottom']}><ErrorState message="Malzeme ve maliyet bilgileri yüklenemedi." onRetry={retry} /></Screen>;
  }

  const { rooms } = project.data;
  const budget = project.data.project.budget === null ? null : Number(project.data.project.budget);
  const summary = summarizeCost(
    materials.data.map((m) => ({
      category: m.category,
      quantity: Number(m.quantity),
      unitPrice: m.unit_price === null ? null : Number(m.unit_price),
      priceSource: m.price_source,
    })),
    costs.data.map((c) => ({ kind: c.kind, amount: Number(c.amount), priceSource: c.price_source })),
    budget,
  );

  const regenerate = () => {
    const calc = calculateProject(rooms.map(roomToInput));
    if (calc.ok) sync.mutate(materialsToDrafts(calc.value.materials));
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Malzeme ve maliyet' }} />
      <CostSummaryCard summary={summary} />

      <Card>
        <AppText variant="heading">Malzeme listesi</AppText>
        {rooms.length === 0 ? (
          <Notice icon="cube">Önce projeye oda ekle; malzeme listesi ölçülerden otomatik çıkar.</Notice>
        ) : (
          <Button
            label={materials.data.some((m) => m.from_calculation) ? 'Ölçülerden yeniden oluştur' : 'Ölçülerden oluştur'}
            icon="refresh"
            variant="secondary"
            loading={sync.isPending}
            onPress={regenerate}
          />
        )}
        {sync.isError ? <Notice tone="danger" icon="alert-circle">Liste oluşturulamadı: {sync.error.message}</Notice> : null}
        {materials.data.length === 0 ? (
          <EmptyState icon="list" title="Liste boş" message="Ölçülerden oluşturabilir veya kendin kalem ekleyebilirsin." />
        ) : (
          materials.data.map((m) => (
            <MaterialRow
              key={`${m.id}-${m.updated_at}`}
              item={m}
              saving={update.isPending && update.variables?.id === m.id}
              onSave={(patch) => update.mutate({ id: m.id, patch })}
              onDelete={() => removeMaterial.mutate(m.id)}
            />
          ))
        )}
        {update.isError ? <Notice tone="danger" icon="alert-circle">Kaydedilemedi: {update.error.message}</Notice> : null}
        <AddMaterial projectId={id} />
        <AppText variant="caption" tone="muted">
          Ölçülerden yeniden oluşturunca hesapla gelen kalemler güncellenir; girdiğin fiyatlar ve kendi eklediğin kalemler korunur.
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">İşçilik ve diğer giderler</AppText>
        {costs.data.map((c) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{c.label}</AppText>
              <AppText variant="caption" tone="muted">
                {COST_KIND_OPTIONS.find((o) => o.value === c.kind)?.label} · {c.price_source === 'store' ? 'Kesin' : 'Tahmini'}
              </AppText>
            </View>
            <AppText variant="bodyStrong">{formatMoney(Number(c.amount))}</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${c.label} sil`}
              onPress={() => removeCost.mutate(c.id)}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trash-outline" color={p.textMuted} size={20} />
            </Pressable>
          </View>
        ))}
        <AddCost projectId={id} />
      </Card>

      <Budget key={String(budget)} projectId={id} budget={budget} />
      <Notice>
        “Tahmini” tutarlar senin ya da uygulamanın varsayımıdır. “Mağaza fiyatı” ve “Kesin” sadece senin kontrol ettiğin fiyatlardır.
      </Notice>
    </Screen>
  );
}
