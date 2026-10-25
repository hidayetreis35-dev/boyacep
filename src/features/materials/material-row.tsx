import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { ProjectMaterialRow } from '@/lib/database.types';
import { formatMoney, formatNumber, parseDecimal } from '@/lib/number';
import { AppText, Button, ChoiceChips, FieldRow, Icon, NumberField, TextField } from '@/ui/components';
import { radius, space, usePalette } from '@/ui/theme';

import type { MaterialPatch } from './api';

export const PRICE_SOURCE_OPTIONS = [
  { value: 'estimate' as const, label: 'Tahmini' },
  { value: 'store' as const, label: 'Mağaza fiyatı' },
];

function moneyText(n: number | null): string {
  return n === null ? '' : formatNumber(n, 2);
}

/** Validates the row form; returns a patch or an error message. */
export function rowPatch(
  form: { quantity: string; price: string; source: 'estimate' | 'store'; store: string },
): { ok: true; patch: MaterialPatch } | { ok: false; error: string } {
  const quantity = parseDecimal(form.quantity);
  if (!Number.isFinite(quantity) || quantity > 100000) return { ok: false, error: 'Miktarı sayı olarak yazın.' };
  const price = form.price.trim() === '' ? null : parseDecimal(form.price);
  if (price !== null && !Number.isFinite(price)) return { ok: false, error: 'Fiyatı sayı olarak yazın.' };
  if (form.source === 'store' && price === null) return { ok: false, error: 'Mağaza fiyatı için tutar girin.' };
  return {
    ok: true,
    patch: {
      quantity,
      unit_price: price,
      price_source: form.source,
      store_name: form.source === 'store' ? form.store.trim() || null : null,
    },
  };
}

export function MaterialRow({
  item,
  onSave,
  onDelete,
  saving,
}: {
  item: ProjectMaterialRow;
  onSave: (patch: MaterialPatch) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const p = usePalette();
  const initial = {
    quantity: formatNumber(Number(item.quantity), 2),
    price: moneyText(item.unit_price === null ? null : Number(item.unit_price)),
    source: item.price_source,
    store: item.store_name ?? '',
  };
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const quantity = parseDecimal(form.quantity);
  const price = parseDecimal(form.price);
  const line = Number.isFinite(quantity) && Number.isFinite(price) ? quantity * price : null;

  return (
    <View style={{ gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderColor: p.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {item.name}
        </AppText>
        <AppText variant="bodyStrong">{line === null ? 'Fiyat yok' : formatMoney(line)}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.name} sil`}
          onPress={onDelete}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm }}>
          <Icon name="trash-outline" color={p.textMuted} size={20} />
        </Pressable>
      </View>
      <FieldRow>
        <NumberField label="Miktar" unit={item.unit} value={form.quantity} onChangeText={(t) => setForm({ ...form, quantity: t })} />
        <NumberField label={`Birim fiyat (${item.unit})`} unit="₺" value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} />
      </FieldRow>
      <ChoiceChips options={PRICE_SOURCE_OPTIONS} value={form.source} onChange={(v) => setForm({ ...form, source: v })} />
      {form.source === 'store' ? (
        <TextField label="Mağaza adı (isteğe bağlı)" value={form.store} onChangeText={(t) => setForm({ ...form, store: t })} maxLength={80} />
      ) : null}
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
      {dirty ? (
        <Button
          label="Kaydet"
          variant="secondary"
          loading={saving}
          onPress={() => {
            const r = rowPatch(form);
            if (!r.ok) return setError(r.error);
            setError(null);
            onSave(r.patch);
          }}
        />
      ) : null}
    </View>
  );
}
