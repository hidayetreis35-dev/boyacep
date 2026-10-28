import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View, type HostInstance } from 'react-native';

import { areaEstimate, DEFAULT_CAN_SIZES, materialCost, planPackages, type AreaEstimate, type RangeEstimate } from '@/engine';
import { formatLiraRange, formatResearchDate } from '@/features/market/format';
import { MATERIAL_PRICES, sourceName } from '@/features/market/sources';
import { msg, t } from '@/i18n';
import { formatNumber, parseDecimal } from '@/lib/number';
import { Gradient, StatTile } from '@/ui/brand';
import { AppText, Button, Card, Checkbox, Icon, Notice, NumberField, useScrollToView, type IconName } from '@/ui/components';
import { FadeIn, PressableScale, tick, useAnimatedTo } from '@/ui/motion';
import { Photo, type PhotoName } from '@/ui/photos';
import { fonts, radius, shadowOf, space, usePalette } from '@/ui/theme';

import { packageText } from './labels';
import { canGroups, ResultHero } from './wizard-result';
import { CoatsDial } from './wizard-steps';

type RoomKind = 'living' | 'bedroom' | 'kids' | 'kitchen' | 'bathroom' | 'hall';
type PaintKind = 'interior' | 'exterior';

const ROOMS: { value: RoomKind; label: string; photo: PhotoName }[] = [
  { value: 'living', label: msg('Salon'), photo: 'livingRoom' },
  { value: 'bedroom', label: msg('Yatak odası'), photo: 'bedroom' },
  { value: 'kids', label: msg('Çocuk odası'), photo: 'kidsRoom' },
  { value: 'kitchen', label: msg('Mutfak'), photo: 'kitchenGreen' },
  { value: 'bathroom', label: msg('Banyo'), photo: 'bathroom' },
  { value: 'hall', label: msg('Koridor'), photo: 'hallway' },
];

/** Which paint suits the room; general guidance, not a product claim. */
const ROOM_ADVICE: Record<RoomKind, string> = {
  living: msg('Salon için silinebilir mat ya da ipek mat iç cephe boyası uygun.'),
  bedroom: msg('Yatak odasında kokusu az, düşük uçucu maddeli (VOC) boya tercih et.'),
  kids: msg('Çocuk odasında silinebilir ve kokusu az boya seç; etiketindeki uygunluk bilgisine bak.'),
  kitchen: msg('Mutfakta yağ ve buhara karşı silinebilir, yarı parlak boya kullan.'),
  bathroom: msg('Banyoda neme ve küfe dayanıklı boya kullan; küf varsa önce temizle.'),
  hall: msg('Koridor sık dokunulan bir alan; silinebilir boya seç.'),
};

const PAINTS: { value: PaintKind; label: string; hint: string; icon: IconName }[] = [
  { value: 'interior', label: msg('İç cephe'), hint: msg('Oda, salon, mutfak'), icon: 'home' },
  { value: 'exterior', label: msg('Dış cephe'), hint: msg('Bina ve bahçe duvarı'), icon: 'business' },
];

/** A room as a small photo card; the chosen one gets an orange ring and a gentle zoom. */
function RoomChip({ room, selected, onPress }: { room: (typeof ROOMS)[number]; selected: boolean; onPress: () => void }) {
  const p = usePalette();
  const zoom = useAnimatedTo(selected ? 1.1 : 1, { duration: 420 });
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityLabel={t(room.label)}
      aria-checked={selected}
      onPress={() => {
        if (!selected) tick();
        onPress();
      }}
      style={[styles.roomChip, { borderColor: selected ? p.cta : p.surface, backgroundColor: p.surfaceMuted }, shadowOf(p, selected ? 2 : 1)]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: zoom }] }]}>
        <Photo name={room.photo} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Gradient from="#121C33" to="#121C33" fromOpacity={0} toOpacity={0.85} vertical />
      {selected ? (
        <View style={[styles.roomCheck, { backgroundColor: p.cta }]}>
          <Icon name="checkmark" size={14} color={p.onCta} />
        </View>
      ) : null}
      <AppText variant="small" style={styles.roomLabel} numberOfLines={1}>
        {t(room.label)}
      </AppText>
    </PressableScale>
  );
}

/** Inside or outside: two big cards with an icon. */
function PaintChoice({ value, onChange }: { value: PaintKind; onChange: (v: PaintKind) => void }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }} accessibilityRole="radiogroup" testID="manual-paint">
      {PAINTS.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={t(o.label)}
            aria-checked={selected}
            onPress={() => {
              if (!selected) tick();
              onChange(o.value);
            }}
            style={[styles.paint, { backgroundColor: selected ? p.primary : p.surface, borderColor: selected ? p.primary : p.border }, !selected && shadowOf(p)]}>
            <View style={[styles.paintIcon, { backgroundColor: selected ? 'rgba(255,255,255,0.14)' : p.primarySoft }]}>
              <Icon name={o.icon} size={18} color={selected ? p.onPrimary : p.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" style={{ color: selected ? p.onPrimary : p.text, fontFamily: fonts.bold }}>
                {t(o.label)}
              </AppText>
              <AppText variant="caption" style={{ color: selected ? p.onHeroMuted : p.textMuted }}>
                {t(o.hint)}
              </AppText>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
      {children}
    </AppText>
  );
}

interface Result {
  estimate: AreaEstimate;
  cost: RangeEstimate | null;
  room: RoomKind;
  paint: PaintKind;
}

/** Paint cost at shop prices. Ceiling paint is priced like interior paint, which errs on the high side. */
function shopCost(e: AreaEstimate, paint: PaintKind): RangeEstimate | null {
  return materialCost([
    { quantity: e.wallLitres, price: paint === 'exterior' ? MATERIAL_PRICES.exterior_paint : MATERIAL_PRICES.interior_paint },
    { quantity: e.ceilingLitres, price: MATERIAL_PRICES.interior_paint },
  ]);
}

/** "Manuel Giriş": the user already knows the wall area. */
export function ManualCalculator({ onMeasure }: { onMeasure: () => void }) {
  const [wall, setWall] = useState('');
  const [room, setRoom] = useState<RoomKind>('living');
  const [paint, setPaint] = useState<PaintKind>('interior');
  const [ceiling, setCeiling] = useState(false);
  const [ceilingArea, setCeilingArea] = useState('');
  const [coats, setCoats] = useState(2);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // After the first "Hesapla" the result follows the fields as they change.
  const [live, setLive] = useState(false);

  const withCeiling = ceiling && paint === 'interior';
  const outcome = useMemo(
    () => areaEstimate({ wallArea: parseDecimal(wall), ceilingArea: withCeiling ? parseDecimal(ceilingArea) : null, coats }),
    [wall, ceilingArea, withCeiling, coats],
  );
  const result: Result | null = live && outcome.ok ? { estimate: outcome.value, cost: shopCost(outcome.value, paint), room, paint } : null;

  // The first result appears below the form: bring it into view.
  const scrollToView = useScrollToView();
  const resultRef = useRef<HostInstance>(null);
  const shown = result !== null;
  useEffect(() => {
    if (shown) scrollToView(resultRef.current);
  }, [shown, scrollToView]);

  // Errors belong to the last press; editing a field clears them.
  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setErrors({});
    };

  const calculate = () => {
    if (!outcome.ok) {
      setErrors(Object.fromEntries(outcome.issues.map((i) => [i.field, t(i.message)])));
      setLive(false);
      return;
    }
    setErrors({});
    setLive(true);
  };

  const price = paint === 'exterior' ? MATERIAL_PRICES.exterior_paint : MATERIAL_PRICES.interior_paint;

  return (
    <>
      <Card>
        <AppText variant="heading">{t('Alan bilgileri')}</AppText>
        <NumberField
          label={t('Duvar alanı')}
          unit="m²"
          value={wall}
          onChangeText={edit(setWall)}
          error={errors.wallArea}
          hint={t('Boyanacak duvarların toplamı; kapı ve pencereleri çıkar.')}
          testID="manual-wall"
        />
        {result ? null : (
          <Button label={t('Alanı bilmiyorum, odayı ölçelim')} icon="resize" variant="ghost" onPress={onMeasure} />
        )}
        <Label>{t('Boya türü')}</Label>
        <PaintChoice value={paint} onChange={edit(setPaint)} />
        {paint === 'interior' ? (
          <>
            <Label>{t('Oda tipi')}</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: space.sm, paddingVertical: 4, paddingRight: space.lg }}
              accessibilityRole="radiogroup"
              testID="manual-room">
              {ROOMS.map((r) => (
                <RoomChip key={r.value} room={r} selected={room === r.value} onPress={() => edit(setRoom)(r.value)} />
              ))}
            </ScrollView>
            <Checkbox label={t('Tavan dahil')} value={ceiling} onChange={edit(setCeiling)} />
            {ceiling ? (
              <NumberField
                label={t('Tavan alanı')}
                unit="m²"
                value={ceilingArea}
                onChangeText={edit(setCeilingArea)}
                error={errors.ceilingArea}
                hint={t('Bilmiyorsan odanın taban alanını yaz.')}
                testID="manual-ceiling"
              />
            ) : null}
          </>
        ) : null}
        <Label>{t('Kaç kat boya?')}</Label>
        <CoatsDial value={coats} onChange={edit(setCoats)} />
        <Button label={t('Hesapla')} icon="calculator" variant="cta" size="lg" onPress={calculate} />
      </Card>

      {result ? (
        <View ref={resultRef} style={{ gap: space.md }} testID="manual-result">
          <ResultHero
            overline={t('Tahmini malzeme')}
            litres={result.estimate.totalLitres}
            caption={t('{area} m² alana {count} kat', {
              area: formatNumber(parseDecimal(wall) + (withCeiling ? parseDecimal(ceilingArea) : 0), 1),
              count: coats,
            })}
            buy={t('Al: {cans}', { cans: packageText(planPackages(result.estimate.totalLitres, DEFAULT_CAN_SIZES)) })}
            estimate
            cans={canGroups([{ category: 'interior_paint', plan: planPackages(result.estimate.totalLitres, DEFAULT_CAN_SIZES) }])}
          />
          <FadeIn delay={250} style={{ gap: space.md }}>
            <StatTile
              label={t('Tahmini maliyet')}
              value={result.cost ? formatLiraRange(result.cost) : t('Yeterli veri yok')}
              icon="wallet"
              feature="cost"
              hint={t('Sadece boya, mağaza fiyatıyla')}
            />
            {result.paint === 'interior' ? <Notice icon="bulb">{t(ROOM_ADVICE[result.room])}</Notice> : null}
            <AppText variant="caption" tone="muted">
              {t('Tahmindir: 1 L boya tek katta yaklaşık 10 m² örter, %10 fire payı eklendi. Kesin miktar için boyanın kutusundaki sarfiyatı kullan. Fiyat kaynağı: {sources}, {date}.', {
                sources: price.sources.map(sourceName).join(', '),
                date: formatResearchDate(price.dataDate),
              })}
            </AppText>
            <Button label={t('Ustayla toplam maliyeti hesapla')} icon="calculator" variant="secondary" onPress={() => router.push('/cost')} />
            <Button label={t('Odayı ölçerek ayrıntılı hesapla')} icon="resize" variant="ghost" onPress={onMeasure} />
          </FadeIn>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  roomChip: { width: 116, height: 86, borderRadius: radius.md, borderWidth: 2.5, overflow: 'hidden', justifyContent: 'flex-end' },
  roomLabel: { color: '#FFFFFF', fontFamily: fonts.bold, paddingHorizontal: space.sm, paddingBottom: 6 },
  roomCheck: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  paint: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, borderWidth: 1.5, padding: space.md },
  paintIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
