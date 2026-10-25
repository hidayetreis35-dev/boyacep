import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DEFAULT_CAN_SIZES, planPackages, type MaterialCategory, type MaterialItem, type PackagePlan, type ProjectCalculation, type QuickEstimate } from '@/engine';
import { useSession } from '@/features/account/session';
import { formatNumber } from '@/lib/number';
import { Disclosure, Gradient, SectionTitle, StatTile, TileRow } from '@/ui/brand';
import { AppText, Badge, Button, Card, Icon, Notice, Row, type IconName } from '@/ui/components';
import { fonts, radius, space, useFeatureColour, usePalette } from '@/ui/theme';

import type { RoomForm } from './form';
import { SOURCE_LABEL } from './labels';
import { packageText } from './results';
import { SPACE_LABEL, type SpaceKind } from './wizard';

const MATERIAL_ICON: Record<MaterialCategory, IconName> = {
  interior_paint: 'color-fill',
  ceiling_paint: 'color-fill',
  exterior_paint: 'color-fill',
  primer: 'water',
  filler: 'construct',
  sandpaper: 'layers',
  roller: 'brush',
  brush: 'brush',
  masking_tape: 'bandage',
  drop_sheet: 'albums',
  other: 'cube',
};

const LIQUID: MaterialCategory[] = ['interior_paint', 'ceiling_paint', 'exterior_paint', 'primer'];

/** Cans drawn as chips: "2 × 15 L". */
function CanChips({ plan }: { plan: PackagePlan }) {
  const p = usePalette();
  return (
    <View style={styles.cans}>
      {plan.lines.map((l) => (
        <View key={l.size} style={[styles.can, { backgroundColor: p.surfaceMuted }]}>
          <Icon name="beaker" size={16} color={p.text} />
          <AppText variant="small" style={{ fontFamily: fonts.bold }}>
            {l.count} × {formatNumber(l.size)} L
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** Wall and ceiling paint are different products, so their cans are listed separately. */
function buyText(paints: MaterialItem[]): string {
  if (paints.length === 1 && paints[0].packages) return `Al: ${packageText(paints[0].packages)}`;
  return paints
    .filter((m) => m.packages)
    .map((m) => `${m.category === 'ceiling_paint' ? 'Tavan' : 'Duvar'}: ${packageText(m.packages!)}`)
    .join(' · ');
}

/** Orange result banner with the headline number. */
function ResultHero({ overline, litres, caption, buy, estimate }: { overline: string; litres: number; caption: string; buy: string; estimate: boolean }) {
  const p = usePalette();
  const f = useFeatureColour('calculate');
  return (
    <View style={styles.hero}>
      <Gradient from={f.base} to="#C2367A" />
      <AppText variant="overline" style={{ color: '#FFFFFF', opacity: 0.9 }}>
        {overline}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
        <AppText variant="display" style={{ color: '#FFFFFF', fontSize: 52, lineHeight: 58 }} testID="total-litres">
          {formatNumber(litres)}
        </AppText>
        <AppText variant="heading" style={{ color: '#FFFFFF' }}>
          litre boya
        </AppText>
      </View>
      <AppText style={{ color: '#FFFFFF', opacity: 0.92 }}>{caption}</AppText>
      <View style={[styles.heroBuy, { backgroundColor: p.surface }]}>
        <Icon name="cart" size={18} color={p.text} />
        <AppText variant="small" style={{ flex: 1, fontFamily: fonts.semibold }}>
          {buy}
        </AppText>
        {estimate ? <Badge label="Tahmini" tone="accent" /> : null}
      </View>
    </View>
  );
}

function MaterialLine({ item }: { item: MaterialItem }) {
  const p = usePalette();
  const source = SOURCE_LABEL[item.source];
  return (
    <View style={styles.material}>
      <View style={[styles.materialIcon, { backgroundColor: p.surfaceMuted }]}>
        <Icon name={MATERIAL_ICON[item.category]} size={18} color={p.text} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {item.name}
          </AppText>
          <AppText variant="bodyStrong">
            {formatNumber(item.quantity)} {item.unit}
          </AppText>
        </View>
        {item.packages && item.packages.lines.length > 0 ? (
          <>
            <CanChips plan={item.packages} />
            {item.packages.leftover > 0 ? (
              <AppText variant="caption" tone="muted">
                Yaklaşık {formatNumber(item.packages.leftover)} L artar; rötuş için saklayabilirsin.
              </AppText>
            ) : null}
          </>
        ) : null}
        {LIQUID.includes(item.category) ? <Badge label={source.label} tone={source.tone} /> : null}
      </View>
    </View>
  );
}

function CostTeaser({ paintLitres, primerLitres }: { paintLitres: number; primerLitres: number }) {
  const f = useFeatureColour('cost');
  return (
    <View style={[styles.teaser, { backgroundColor: f.soft }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name="wallet" size={22} color={f.ink} />
        <AppText variant="heading" style={{ color: f.ink, flex: 1 }}>
          Tahmini maliyet
        </AppText>
      </View>
      <AppText style={{ color: f.ink }}>
        Fiyatlar markaya ve mağazaya göre çok değişiyor. Gördüğün litre fiyatını yaz, toplamı hemen hesaplayalım.
      </AppText>
      <Button
        label="Maliyeti hesapla"
        icon="calculator"
        variant="primary"
        onPress={() =>
          router.push({ pathname: '/cost', params: { paint: String(paintLitres), primer: String(primerLitres) } })
        }
      />
    </View>
  );
}

function Actions({ onEdit, onRestart }: { onEdit: () => void; onRestart: () => void }) {
  const { session, db } = useSession();
  return (
    <View style={{ gap: space.sm }}>
      {db ? (
        <Button
          label={session ? 'Projelerime kaydet' : 'Giriş yap ve kaydet'}
          icon="bookmark"
          variant="cta"
          onPress={() => router.push(session ? '/projects' : '/sign-in')}
        />
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button label="Düzenle" icon="create" variant="secondary" onPress={onEdit} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Yeni hesap" icon="refresh" variant="secondary" onPress={onRestart} />
        </View>
      </View>
    </View>
  );
}

export function RoomResult({
  result,
  space: kind,
  form,
  onEdit,
  onRestart,
}: {
  result: ProjectCalculation;
  space: SpaceKind;
  form: RoomForm;
  onEdit: () => void;
  onRestart: () => void;
}) {
  const room = result.rooms[0];
  const { totals } = result;
  const finish = totals.wallLitres + totals.ceilingLitres;
  const liquids = result.materials.filter((m) => LIQUID.includes(m.category));
  const supplies = result.materials.filter((m) => !LIQUID.includes(m.category));
  const estimate = liquids.some((m) => m.source === 'estimate');

  return (
    <View style={{ gap: space.lg }} testID="room-results" accessibilityLiveRegion="polite">
      <ResultHero
        overline={`Sonuç · ${SPACE_LABEL[kind]}`}
        litres={finish}
        caption={`${formatNumber(totals.totalPaintable, 2)} m² alana ${form.coats} kat`}
        buy={buyText(liquids.filter((m) => m.category !== 'primer'))}
        estimate={estimate}
      />

      <TileRow>
        <StatTile label="Boyanacak alan" value={formatNumber(totals.totalPaintable, 1)} unit="m²" icon="resize" feature="calculate" />
        <StatTile
          label="Astar"
          value={totals.primerLitres > 0 ? formatNumber(totals.primerLitres) : 'Gerekmiyor'}
          unit={totals.primerLitres > 0 ? 'L' : undefined}
          icon="water"
          feature="ask"
          hint={totals.primerLitres > 0 ? 'Boyadan önce 1 kat' : undefined}
        />
      </TileRow>

      {kind === 'kitchen' || kind === 'bathroom' ? (
        <Notice icon="water" tone="info">
          {kind === 'kitchen' ? 'Mutfakta' : 'Banyoda'} buhar ve nem olur. Silinebilir, küfe dayanıklı “mutfak-banyo” boyası seç.
        </Notice>
      ) : null}

      <Card>
        <SectionTitle title="Alacağın boyalar" />
        {liquids.map((m) => (
          <MaterialLine key={m.category} item={m} />
        ))}
      </Card>

      {supplies.length > 0 ? (
        <Card>
          <SectionTitle title="Yardımcı malzemeler" />
          {supplies.map((m) => (
            <MaterialLine key={m.category} item={m} />
          ))}
        </Card>
      ) : null}

      <CostTeaser paintLitres={finish} primerLitres={totals.primerLitres} />

      <Disclosure title="Hesap detayları">
        <Row label="Toplam duvar alanı" value={`${formatNumber(room.areas.grossWall, 2)} m²`} />
        <Row label="Kapı düşümü" value={`− ${formatNumber(room.areas.doorDeduction, 2)} m²`} />
        <Row label="Pencere düşümü" value={`− ${formatNumber(room.areas.windowDeduction, 2)} m²`} />
        <Row label="Boyanacak duvar" value={`${formatNumber(room.areas.netWall, 2)} m²`} strong />
        <Row label="Tavan alanı" value={`${formatNumber(room.areas.ceiling, 2)} m²`} strong />
        <View style={{ height: 1 }} />
        <AppText variant="bodyStrong">Hesapta kullanılan değerler</AppText>
        {result.assumptions.map((a) => {
          const s = SOURCE_LABEL[a.source];
          return (
            <View key={`${a.key}-${a.label}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <AppText variant="small" style={{ flex: 1 }}>
                {a.label}
              </AppText>
              <Badge label={s.label} tone={s.tone} />
            </View>
          );
        })}
      </Disclosure>

      <Notice>
        Sonuçlar tahminidir. Kesin miktar için boyanın teknik föyündeki sarfiyatı gir; duvarın emiciliği ve uygulama şekli sonucu değiştirebilir.
      </Notice>

      <Actions onEdit={onEdit} onRestart={onRestart} />
    </View>
  );
}

export function HomeResult({
  result,
  home,
  onEdit,
  onRestart,
}: {
  result: QuickEstimate;
  home: { houseType: string; area: string; ceilings: boolean; coats: number };
  onEdit: () => void;
  onRestart: () => void;
}) {
  return (
    <View style={{ gap: space.lg }} testID="quick-results" accessibilityLiveRegion="polite">
      <ResultHero
        overline={`Sonuç · Tüm ev (${home.houseType})`}
        litres={result.totalLitres}
        caption={`${home.area} m² ev, ${home.coats} kat${home.ceilings ? ', tavanlar dahil' : ''}`}
        buy={
          home.ceilings && result.ceilingLitres > 0
            ? `Duvar: ${packageText(planPackages(result.wallLitres, DEFAULT_CAN_SIZES))} · Tavan: ${packageText(planPackages(result.ceilingLitres, DEFAULT_CAN_SIZES))}`
            : `Al: ${packageText(planPackages(result.wallLitres, DEFAULT_CAN_SIZES))}`
        }
        estimate
      />
      <TileRow>
        <StatTile label="Duvar boyası" value={formatNumber(result.wallLitres)} unit="L" icon="color-fill" feature="calculate" hint={`≈ ${formatNumber(result.wallArea)} m² duvar`} />
        {home.ceilings ? (
          <StatTile label="Tavan boyası" value={formatNumber(result.ceilingLitres)} unit="L" icon="arrow-up-circle" feature="ask" hint={`≈ ${formatNumber(result.ceilingArea)} m² tavan`} />
        ) : null}
      </TileRow>
      <CostTeaser paintLitres={result.totalLitres} primerLitres={0} />
      <Notice>
        Hızlı hesap, ev tipine göre ortalama duvar alanı kullanır (taslak katsayılar, usta kontrolü bekliyor). Astar ve yardımcı malzemeler için odaları tek tek hesapla.
      </Notice>
      <Actions onEdit={onEdit} onRestart={onRestart} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.sm, overflow: 'hidden' },
  heroBuy: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, padding: space.md, marginTop: space.sm },
  cans: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  can: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
  material: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.xs },
  materialIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  teaser: { borderRadius: radius.lg, padding: space.lg + 2, gap: space.md },
});
