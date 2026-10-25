import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useSession } from '@/features/account/session';
import {
  emptyPrice,
  emptyQuickCost,
  EXTRA_OPTIONS,
  isInvalid,
  quickCostSummary,
  WHO_OPTIONS,
  type ExtraKind,
  type Price,
  type QuickCostForm,
} from '@/features/cost/quick-cost';
import { CostSummaryCard } from '@/features/materials/cost-summary';
import { formatNumber, parseDecimal } from '@/lib/number';
import { Disclosure, FeatureHeader, OptionCard, OptionGrid, SectionTitle } from '@/ui/brand';
import { AppText, Button, Card, FieldRow, Icon, Notice, NumberField, Screen, Toggle } from '@/ui/components';
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
        onChangeText={(t) => onChange({ ...price, amount: t })}
        error={isInvalid(price.amount) ? 'Tutarı sayı olarak yazın (örnek: 1250,50).' : undefined}
        hint={hint}
        testID={testID}
      />
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: sure }}
        accessibilityLabel={`${label}: kesin fiyat`}
        onPress={() => onChange({ ...price, source: sure ? 'estimate' : 'store' })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32 }}>
        <Icon name={sure ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={sure ? p.success : p.textMuted} />
        <AppText variant="caption" style={{ color: sure ? p.success : p.textMuted }}>
          {sure ? 'Kesin fiyat (mağaza/usta teyitli)' : 'Tahmini fiyat'}
        </AppText>
      </Pressable>
    </View>
  );
}

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
  const set = <K extends keyof QuickCostForm>(key: K, value: QuickCostForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const summary = quickCostSummary(form);
  const litres = parseDecimal(form.paintLitres);
  const hasLitres = Number.isFinite(litres);

  const toggleExtra = (kind: ExtraKind, on: boolean) =>
    setForm((f) => {
      const extras = { ...f.extras };
      if (on) extras[kind] = emptyPrice();
      else delete extras[kind];
      return { ...f, extras };
    });

  return (
    <Screen edges={['bottom']}>
      <FeatureHeader feature="cost" icon="wallet" title="Ne kadar tutar?" subtitle="Fiyatları yaz, toplamı anında gör." />

      <SectionTitle title="Kim boyayacak?" />
      <OptionGrid>
        {WHO_OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            feature="cost"
            title={o.label}
            subtitle={o.hint}
            icon={o.value === 'self' ? 'hand-left' : 'person'}
            selected={form.who === o.value}
            onPress={() => set('who', o.value)}
          />
        ))}
      </OptionGrid>

      <SectionTitle title="Boya" />
      <Card>
        {fromWizard ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: p.surfaceMuted }}>
            <Icon name="color-fill" color={p.cta} />
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              Hesaplanan: {form.paintLitres} L boya{form.primerLitres ? `, ${form.primerLitres} L astar` : ''}
            </AppText>
          </View>
        ) : (
          <NumberField
            label="Kaç litre boya?"
            unit="L"
            value={form.paintLitres}
            onChangeText={(t) => set('paintLitres', t)}
            error={isInvalid(form.paintLitres) ? 'Litreyi sayı olarak yazın.' : undefined}
            hint="Bilmiyorsan boş bırak ve aşağıya boyanın toplam fiyatını yaz."
            testID="paint-litres"
          />
        )}
        <PriceField
          label={hasLitres ? '1 litre boya fiyatı' : 'Boyanın toplam fiyatı'}
          unit={hasLitres ? '₺/L' : '₺'}
          price={form.paintPrice}
          onChange={(v) => set('paintPrice', v)}
          hint={hasLitres ? '15 L kutu fiyatını 15’e bölerek bulabilirsin.' : undefined}
          testID="cost-paint"
        />
        {!fromWizard ? (
          <Button label="Litreyi bilmiyorum, hesapla" icon="color-fill" variant="ghost" onPress={() => router.push('/calculate')} />
        ) : null}
      </Card>

      <SectionTitle title="Malzemeler" />
      <Card>
        {form.primerLitres || !fromWizard ? (
          <FieldRow>
            {!fromWizard ? (
              <NumberField label="Astar" unit="L" value={form.primerLitres} onChangeText={(t) => set('primerLitres', t)} testID="primer-litres" />
            ) : null}
            <PriceField label="1 litre astar fiyatı" unit="₺/L" price={form.primerPrice} onChange={(v) => set('primerPrice', v)} testID="cost-primer" />
          </FieldRow>
        ) : null}
        <PriceField label="Macun ve zımpara (toplam)" price={form.filler} onChange={(v) => set('filler', v)} testID="cost-filler" />
        <PriceField
          label="Yardımcı malzemeler (toplam)"
          price={form.supplies}
          onChange={(v) => set('supplies', v)}
          hint="Rulo, fırça, bant, örtü"
          testID="cost-supplies"
        />
      </Card>

      {form.who === 'pro' ? (
        <>
          <SectionTitle title="İşçilik" />
          <Card>
            <PriceField label="Ustanın işçilik ücreti (toplam)" price={form.labour} onChange={(v) => set('labour', v)} testID="cost-labor" />
          </Card>
        </>
      ) : null}

      <Disclosure title="Ek masraflar ve bütçe" initiallyOpen={Object.keys(form.extras).length > 0}>
        <View style={{ gap: space.sm }}>
          {EXTRA_OPTIONS.map((o) => (
            <View key={o.value} style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row' }}>
                <Toggle label={o.label} value={!!form.extras[o.value]} onChange={(on) => toggleExtra(o.value, on)} />
              </View>
              {form.extras[o.value] ? (
                <PriceField
                  label={o.label}
                  price={form.extras[o.value]!}
                  onChange={(v) => setForm((f) => ({ ...f, extras: { ...f.extras, [o.value]: v } }))}
                  testID={`cost-extra-${o.value}`}
                />
              ) : null}
            </View>
          ))}
        </View>
        <NumberField label="Bütçen (isteğe bağlı)" unit="₺" value={form.budget} onChangeText={(t) => set('budget', t)} testID="quick-budget" />
      </Disclosure>

      <SectionTitle title="Sonuç" />
      <CostSummaryCard summary={summary} />

      <Notice>
        Tutarlar senin yazdığın fiyatlarla hesaplanır. BoyaCep piyasa fiyatı uydurmaz; mağazadan ya da ustadan teyit ettiğin fiyatları “Kesin” olarak işaretle.
      </Notice>

      {session ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="small" tone="muted" style={{ fontFamily: fonts.medium }}>
            Projelerim’de malzeme listesi fiyatlarla birlikte otomatik hesaplanır ve saklanır.
          </AppText>
          <Button label="Projelerime git" variant="secondary" icon="albums" onPress={() => router.push('/projects')} />
        </View>
      ) : null}
    </Screen>
  );
}
