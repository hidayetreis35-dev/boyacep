import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/features/account/session';
import {
  emptyPrice,
  emptyQuickCost,
  EXTRA_OPTIONS,
  isInvalid,
  lineAmounts,
  quickCostSummary,
  WHO_OPTIONS,
  type ExtraKind,
  type Price,
  type QuickCostForm,
} from '@/features/cost/quick-cost';
import { useCity } from '@/features/market/city';
import { formatLira, formatLiraRange } from '@/features/market/format';
import { provinceByCode } from '@/features/market/provinces';
import { MATERIAL_PRICES } from '@/features/market/sources';
import type { CostSummary } from '@/engine';
import { t } from '@/i18n';
import { formatMoney, formatNumber, parseDecimal } from '@/lib/number';
import { Disclosure, Segmented } from '@/ui/brand';
import { AppText, Badge, Button, Card, FieldRow, Icon, Notice, NumberField, Screen, Toggle, type IconName } from '@/ui/components';
import { fonts, radius, space, usePalette } from '@/ui/theme';

/** A money field with a small "Kesin" switch for prices checked at a shop or with a painter. */
function PriceField({
  label,
  price,
  onChange,
  hint,
  testID,
  unit = '₺',
}: {
  label: string;
  price: Price;
  onChange: (p: Price) => void;
  hint?: string;
  testID?: string;
  unit?: string;
}) {
  const p = usePalette();
  const sure = price.source === 'store';
  return (
    <View style={{ gap: 6 }}>
      <NumberField
        label={label}
        unit={unit}
        value={price.amount}
        onChangeText={(value) => onChange({ ...price, amount: value })}
        error={isInvalid(price.amount) ? t('Tutarı sayı olarak yazın (örnek: 1250,50).') : undefined}
        hint={hint}
        testID={testID}
      />
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: sure }}
        accessibilityLabel={t('{label}: kesin fiyat', { label })}
        onPress={() => onChange({ ...price, source: sure ? 'estimate' : 'store' })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32 }}>
        <Icon name={sure ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={sure ? p.success : p.textMuted} />
        <AppText variant="caption" style={{ color: sure ? p.success : p.textMuted }}>
          {sure ? t('Kesin fiyat (mağaza/usta teyitli)') : t('Tahmini fiyat')}
        </AppText>
      </Pressable>
    </View>
  );
}

/** One line of the cost list: name and amount; tapping it opens the price fields. */
function CostItem({
  icon,
  label,
  amount,
  open,
  onToggle,
  first,
  children,
}: {
  icon: IconName;
  label: string;
  amount: number | null;
  open: boolean;
  onToggle: () => void;
  first?: boolean;
  children: ReactNode;
}) {
  const p = usePalette();
  return (
    <View style={!first && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.item}>
        <Icon name={icon} size={20} color={p.primary} />
        <AppText style={{ flex: 1 }}>{label}</AppText>
        {amount !== null ? (
          <AppText variant="bodyStrong">{formatMoney(amount)}</AppText>
        ) : (
          <AppText variant="small" style={{ color: p.accent, fontFamily: fonts.semibold }}>
            {t('Fiyat ekle')}
          </AppText>
        )}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={p.textMuted} />
      </Pressable>
      {open ? <View style={{ gap: space.md, paddingBottom: space.md }}>{children}</View> : null}
    </View>
  );
}

/** The total in one plain card, with how much of it is checked and how much is guessed. */
function TotalCard({ summary, empty }: { summary: CostSummary; empty: boolean }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }} accessibilityLiveRegion="polite">
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {t('Toplam Tahmini Maliyet')}
        </AppText>
        <AppText variant="title" style={{ fontFamily: fonts.extrabold }} testID="cost-total">
          {empty ? '–' : formatMoney(summary.total)}
        </AppText>
      </View>
      {empty ? (
        <AppText variant="small" tone="muted">
          {t('Kalemlere fiyat ekledikçe toplam burada oluşur.')}
        </AppText>
      ) : null}
      {summary.total > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Badge label={t('Kesin fiyat: {amount}', { amount: formatMoney(summary.store) })} tone="success" />
          <Badge label={t('Tahmini: {amount}', { amount: formatMoney(summary.estimate) })} tone="accent" />
        </View>
      ) : null}
      {summary.budgetLeft !== null ? (
        <AppText variant="bodyStrong" tone={summary.budgetLeft >= 0 ? 'success' : 'danger'}>
          {summary.budgetLeft >= 0 ? t('Bütçede kalan') : t('Bütçe aşımı')}: {formatMoney(Math.abs(summary.budgetLeft))}
        </AppText>
      ) : null}
    </Card>
  );
}

/** Where to check the prices the user typed against their city's market references. */
function RegionNote() {
  const city = useCity();
  if (city.loading) return null;
  const place = city.province ? [provinceByCode(city.province)?.name, city.district].filter(Boolean).join(' / ') : null;
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="small" tone="muted">
        {place
          ? t('{place} için usta ve boya fiyat aralıklarını, kaynağı ve tarihiyle karşılaştır.', { place })
          : t('Şehrini seçersen usta ve boya fiyat aralıklarını, kaynağı ve tarihiyle karşılaştırabilirsin.')}
      </AppText>
      <Button label={t('Fiyat Detaylarını Gör')} variant="secondary" onPress={() => router.push('/prices')} />
    </View>
  );
}

/** Middle of the shop range for interior paint, offered as a one-tap estimate, never filled in silently. */
const SHOP_PAINT_MID = Math.round((MATERIAL_PRICES.interior_paint.low + MATERIAL_PRICES.interior_paint.high) / 2 / 5) * 5;

const EXTRA_ICON: Record<ExtraKind, IconName> = { transport: 'car-outline', protection: 'shield-checkmark-outline', cleaning: 'sparkles-outline' };

type Line = 'paint' | 'primer' | 'filler' | 'supplies' | 'labour' | ExtraKind;

/** Quick cost estimate without an account. Prices are always the user's own: we never invent market prices. */
export default function QuickCostScreen() {
  const p = usePalette();
  const params = useLocalSearchParams<{ paint?: string; primer?: string }>();
  const { session } = useSession();
  const fromWizard = !!params.paint;
  const [form, setForm] = useState<QuickCostForm>(() =>
    emptyQuickCost(
      params.paint ? formatNumber(Number(params.paint)) : '',
      params.primer && Number(params.primer) > 0 ? formatNumber(Number(params.primer)) : '',
    ),
  );
  // Litres from the calculator only need a price, so that line starts open.
  const [open, setOpen] = useState<Line | null>(fromWizard ? 'paint' : null);
  const set = <K extends keyof QuickCostForm>(key: K, value: QuickCostForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const summary = quickCostSummary(form);
  const lines = lineAmounts(form);
  const litres = parseDecimal(form.paintLitres);
  const hasLitres = Number.isFinite(litres);
  const item = (line: Line) => ({ open: open === line, onToggle: () => setOpen((o) => (o === line ? null : line)) });

  const toggleExtra = (kind: ExtraKind, on: boolean) => {
    setForm((f) => {
      const extras = { ...f.extras };
      if (on) extras[kind] = emptyPrice();
      else delete extras[kind];
      return { ...f, extras };
    });
    if (on) setOpen(kind);
  };

  return (
    <Screen edges={['bottom']}>
      <Segmented options={WHO_OPTIONS} value={form.who} onChange={(who) => set('who', who)} />

      <Card>
        <AppText variant="heading">{t('Maliyet Kalemleri')}</AppText>
        <View>
          <CostItem first icon="color-palette-outline" label={t('Boya')} amount={lines.paint} {...item('paint')}>
            {fromWizard ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: p.surfaceMuted }}>
                <Icon name="color-fill" color={p.cta} />
                <AppText variant="bodyStrong" style={{ flex: 1 }}>
                  {form.primerLitres
                    ? t('Hesaplanan: {paint} L boya, {primer} L astar', { paint: form.paintLitres, primer: form.primerLitres })
                    : t('Hesaplanan: {paint} L boya', { paint: form.paintLitres })}
                </AppText>
              </View>
            ) : (
              <NumberField
                label={t('Kaç litre boya?')}
                unit="L"
                value={form.paintLitres}
                onChangeText={(value) => set('paintLitres', value)}
                error={isInvalid(form.paintLitres) ? t('Litreyi sayı olarak yazın.') : undefined}
                hint={t('Bilmiyorsan boş bırak ve aşağıya boyanın toplam fiyatını yaz.')}
                testID="paint-litres"
              />
            )}
            <PriceField
              label={hasLitres ? t('1 litre boya fiyatı') : t('Boyanın toplam fiyatı')}
              unit={hasLitres ? '₺/L' : '₺'}
              price={form.paintPrice}
              onChange={(v) => set('paintPrice', v)}
              hint={
                hasLitres
                  ? t('15 L kutu fiyatını 15’e bölerek bulabilirsin. Mağazalarda iç cephe boyası yaklaşık {range}/L.', {
                      range: formatLiraRange(MATERIAL_PRICES.interior_paint),
                    })
                  : undefined
              }
              testID="cost-paint"
            />
            {hasLitres && !form.paintPrice.amount ? (
              <Button
                label={t('Yaklaşık mağaza fiyatını yaz: {price}/L', { price: formatLira(SHOP_PAINT_MID) })}
                icon="pricetag"
                variant="ghost"
                onPress={() => set('paintPrice', { amount: String(SHOP_PAINT_MID), source: 'estimate' })}
              />
            ) : null}
            {!fromWizard ? (
              <Button label={t('Litreyi bilmiyorum, hesapla')} icon="color-fill" variant="ghost" onPress={() => router.push('/calculate')} />
            ) : null}
          </CostItem>
          {form.primerLitres || !fromWizard ? (
            <CostItem icon="water-outline" label={t('Astar')} amount={lines.primer} {...item('primer')}>
              <FieldRow>
                {!fromWizard ? (
                  <NumberField label={t('Astar')} unit="L" value={form.primerLitres} onChangeText={(value) => set('primerLitres', value)} testID="primer-litres" />
                ) : null}
                <PriceField label={t('1 litre astar fiyatı')} unit="₺/L" price={form.primerPrice} onChange={(v) => set('primerPrice', v)} testID="cost-primer" />
              </FieldRow>
            </CostItem>
          ) : null}
          <CostItem icon="construct-outline" label={t('Macun + Zımpara')} amount={lines.filler} {...item('filler')}>
            <PriceField label={t('Macun ve zımpara (toplam)')} price={form.filler} onChange={(v) => set('filler', v)} testID="cost-filler" />
          </CostItem>
          <CostItem icon="brush-outline" label={t('Malzeme (rulo, fırça vb.)')} amount={lines.supplies} {...item('supplies')}>
            <PriceField
              label={t('Yardımcı malzemeler (toplam)')}
              price={form.supplies}
              onChange={(v) => set('supplies', v)}
              hint={t('Rulo, fırça, bant, örtü')}
              testID="cost-supplies"
            />
          </CostItem>
          {form.who === 'pro' ? (
            <CostItem icon="person-outline" label={t('İşçilik')} amount={lines.labour} {...item('labour')}>
              <PriceField label={t('Ustanın işçilik ücreti (toplam)')} price={form.labour} onChange={(v) => set('labour', v)} testID="cost-labor" />
              <Button label={t('Şehrindeki usta fiyatlarını gör')} icon="stats-chart" variant="ghost" onPress={() => router.push('/prices')} />
            </CostItem>
          ) : null}
          {EXTRA_OPTIONS.filter((o) => form.extras[o.value]).map((o) => (
            <CostItem key={o.value} icon={EXTRA_ICON[o.value]} label={t(o.label)} amount={lines.extras[o.value] ?? null} {...item(o.value)}>
              <PriceField
                label={t(o.label)}
                price={form.extras[o.value]!}
                onChange={(v) => setForm((f) => ({ ...f, extras: { ...f.extras, [o.value]: v } }))}
                testID={`cost-extra-${o.value}`}
              />
            </CostItem>
          ))}
        </View>
      </Card>

      <TotalCard summary={summary} empty={[lines.paint, lines.primer, lines.filler, lines.supplies, lines.labour, ...Object.values(lines.extras)].every((v) => v === null)} />

      <Disclosure title={t('Ek masraflar ve bütçe')}>
        <View style={{ gap: space.sm }}>
          {EXTRA_OPTIONS.map((o) => (
            <View key={o.value} style={{ flexDirection: 'row' }}>
              <Toggle label={t(o.label)} value={!!form.extras[o.value]} onChange={(on) => toggleExtra(o.value, on)} />
            </View>
          ))}
        </View>
        <NumberField label={t('Bütçen (isteğe bağlı)')} unit="₺" value={form.budget} onChangeText={(value) => set('budget', value)} testID="quick-budget" />
      </Disclosure>

      <RegionNote />

      <Notice>
        {t('Tutarlar senin yazdığın fiyatlarla hesaplanır. BoyaCep piyasa fiyatı uydurmaz; mağazadan ya da ustadan teyit ettiğin fiyatları “Kesin” olarak işaretle.')}
      </Notice>

      {session ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="small" tone="muted" style={{ fontFamily: fonts.medium }}>
            {t('Projelerim’de malzeme listesi fiyatlarla birlikte otomatik hesaplanır ve saklanır.')}
          </AppText>
          <Button label={t('Projelerime git')} variant="secondary" icon="albums" onPress={() => router.push('/projects')} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingVertical: space.sm },
});
