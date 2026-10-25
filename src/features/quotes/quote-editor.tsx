import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { QUOTE_KIND_LABEL, calculateProject, type QuoteItemKind } from '@/engine';
import { useSession } from '@/features/account/session';
import { roomToInput } from '@/features/projects/mapping';
import { getSharedProject } from '@/features/sharing/api';
import type { QuoteRow } from '@/lib/database.types';
import { parseDecimal } from '@/lib/number';
import { AppText, Button, Card, ChoiceChips, FieldRow, Icon, Notice, TextField } from '@/ui/components';
import { space, usePalette } from '@/ui/theme';

import {
  emptyItem,
  itemsFromProject,
  VALIDITY_OPTIONS,
  validateQuoteForm,
  type ItemForm,
  type ItemRecord,
  type QuoteForm,
  type QuoteFormErrors,
  type QuoteRecord,
} from './form';
import { QuoteTotalsCard } from './quote-view';

const KINDS = (['labor', 'material', 'other'] as QuoteItemKind[]).map((k) => ({ value: k, label: QUOTE_KIND_LABEL[k] }));

function ItemEditor({
  item,
  index,
  errors,
  onChange,
  onRemove,
}: {
  item: ItemForm;
  index: number;
  errors?: Partial<Record<'description' | 'quantity' | 'unit' | 'unitPrice', string>>;
  onChange: (item: ItemForm) => void;
  onRemove: () => void;
}) {
  const p = usePalette();
  const set = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) => onChange({ ...item, [key]: value });
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          Kalem {index + 1}
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={`Kalem ${index + 1} sil`} onPress={onRemove} style={{ padding: space.sm }}>
          <Icon name="trash-outline" size={20} color={p.textMuted} />
        </Pressable>
      </View>
      <ChoiceChips options={KINDS} value={item.kind} onChange={(k) => set('kind', k)} />
      <TextField label="Açıklama" value={item.description} maxLength={200} error={errors?.description} onChangeText={(v) => set('description', v)} />
      <FieldRow>
        <TextField label="Miktar" value={item.quantity} keyboardType="decimal-pad" inputMode="decimal" error={errors?.quantity} onChangeText={(v) => set('quantity', v)} />
        <TextField label="Birim" value={item.unit} maxLength={20} error={errors?.unit} onChangeText={(v) => set('unit', v)} />
      </FieldRow>
      <TextField
        label="Birim fiyat"
        unit="₺"
        value={item.unitPrice}
        keyboardType="decimal-pad"
        inputMode="decimal"
        error={errors?.unitPrice}
        onChangeText={(v) => set('unitPrice', v)}
      />
    </Card>
  );
}

const priceOf = (text: string) => {
  const t = text.trim();
  const n = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t) ? parseDecimal(t.replace(/\./g, '')) : parseDecimal(t);
  return Number.isFinite(n) ? n : 0;
};

/** Edits a draft quote. Saving and sending are done by the caller. */
export function QuoteEditor({
  quote,
  initial,
  busy,
  error,
  onSave,
  onPdf,
  onDelete,
}: {
  quote: QuoteRow;
  initial: QuoteForm;
  busy: boolean;
  error: string | null;
  onSave: (data: { quote: QuoteRecord; items: ItemRecord[] }, then: 'stay' | 'send') => void;
  onPdf: (data: { quote: QuoteRecord; items: ItemRecord[] }) => void;
  onDelete: () => void;
}) {
  const { db } = useSession();
  const [form, setForm] = useState<QuoteForm>(initial);
  const [errors, setErrors] = useState<QuoteFormErrors>({});
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof QuoteForm>(key: K, value: QuoteForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setItem = (key: string, item: ItemForm) => setForm((f) => ({ ...f, items: f.items.map((i) => (i.key === key ? item : i)) }));

  const validated = (action: (data: { quote: QuoteRecord; items: ItemRecord[] }) => void) => () => {
    const result = validateQuoteForm(form);
    if ('errors' in result) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    action(result);
  };

  const importFromProject = async () => {
    if (!db || !quote.project_id) return;
    setImporting(true);
    setImportError(null);
    try {
      const shared = await getSharedProject(db, quote.project_id);
      const calc = shared.rooms.length > 0 ? calculateProject(shared.rooms.map(roomToInput)) : null;
      const items = itemsFromProject(
        calc?.ok ? calc.value.totals.totalPaintable : null,
        shared.materials.map((m) => ({ name: m.name, quantity: Number(m.quantity), unit: m.unit })),
      );
      if (items.length === 0) setImportError('Projede henüz oda ya da malzeme yok.');
      else setForm((f) => ({ ...f, items: [...f.items.filter((i) => i.description.trim() !== ''), ...items] }));
    } catch {
      setImportError('Proje bilgileri alınamadı.');
    } finally {
      setImporting(false);
    }
  };

  const liveItems = form.items.map((i) => ({ kind: i.kind, quantity: parseDecimal(i.quantity) || 0, unitPrice: priceOf(i.unitPrice) }));

  return (
    <>
      <TextField label="Teklif başlığı" value={form.title} maxLength={120} error={errors.title} onChangeText={(v) => set('title', v)} testID="quote-title" />
      <TextField label="Müşteri adı (isteğe bağlı)" value={form.customerName} maxLength={120} autoCapitalize="words" onChangeText={(v) => set('customerName', v)} />
      <TextField label="Müşteri telefonu veya adresi (isteğe bağlı)" value={form.customerContact} maxLength={120} onChangeText={(v) => set('customerContact', v)} />

      <AppText variant="heading">Kalemler</AppText>
      {quote.project_id ? (
        <Button label="Projeden ölçü ve malzemeleri getir" icon="download" variant="secondary" loading={importing} onPress={importFromProject} />
      ) : null}
      {importError ? <Notice icon="information-circle">{importError}</Notice> : null}
      {form.items.map((item, i) => (
        <ItemEditor
          key={item.key}
          item={item}
          index={i}
          errors={errors.item?.[item.key]}
          onChange={(next) => setItem(item.key, next)}
          onRemove={() => setForm((f) => ({ ...f, items: f.items.filter((x) => x.key !== item.key) }))}
        />
      ))}
      {errors.items ? (
        <Notice tone="danger" icon="alert-circle">
          {errors.items}
        </Notice>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Button label="İşçilik ekle" icon="add" variant="ghost" onPress={() => set('items', [...form.items, emptyItem('labor')])} />
        <Button label="Malzeme ekle" icon="add" variant="ghost" onPress={() => set('items', [...form.items, emptyItem('material')])} />
      </View>

      <FieldRow>
        <TextField label="KDV oranı" unit="%" value={form.vatRate} keyboardType="decimal-pad" inputMode="decimal" error={errors.vatRate} onChangeText={(v) => set('vatRate', v)} />
        <TextField label="İndirim" unit="₺" value={form.discount} keyboardType="decimal-pad" inputMode="decimal" error={errors.discount} onChangeText={(v) => set('discount', v)} />
      </FieldRow>
      <ChoiceChips label="Teklif geçerlilik süresi" options={[...VALIDITY_OPTIONS]} value={form.validity} onChange={(v) => set('validity', v)} />
      <TextField label="Notlar (isteğe bağlı)" multiline value={form.notes} maxLength={2000} placeholder="Ödeme şekli, iş süresi, malzemeyi kimin alacağı…" onChangeText={(v) => set('notes', v)} />

      <QuoteTotalsCard items={liveItems} vatRate={parseDecimal(form.vatRate) || 0} discount={priceOf(form.discount)} />

      {error ? (
        <Notice tone="danger" icon="alert-circle">
          {error}
        </Notice>
      ) : null}
      <Button
        label={quote.project_id ? 'Kaydet ve müşteriye gönder' : 'Kaydet ve gönderildi olarak işaretle'}
        icon="send"
        loading={busy}
        onPress={validated((d) => onSave(d, 'send'))}
      />
      {quote.project_id ? null : (
        <AppText variant="caption" tone="muted">
          Bu teklif bir projeye bağlı değil. PDF’i oluşturup müşterine kendin gönderebilirsin.
        </AppText>
      )}
      <Button label="Taslağı kaydet" icon="save" variant="secondary" disabled={busy} onPress={validated((d) => onSave(d, 'stay'))} />
      <Button label="PDF önizle ve paylaş" icon="document" variant="secondary" disabled={busy} onPress={validated(onPdf)} />
      {confirmDelete ? (
        <Card>
          <AppText variant="bodyStrong">Taslak silinsin mi?</AppText>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button label="Vazgeç" variant="secondary" onPress={() => setConfirmDelete(false)} />
            <Button label="Evet, sil" icon="trash" variant="ghost" onPress={onDelete} />
          </View>
        </Card>
      ) : (
        <Button label="Taslağı sil" icon="trash-outline" variant="ghost" disabled={busy} onPress={() => setConfirmDelete(true)} />
      )}
    </>
  );
}
