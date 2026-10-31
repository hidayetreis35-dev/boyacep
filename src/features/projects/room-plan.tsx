import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { renovationPlan, type PlanStep, type PlanStepKind } from '@/engine';
import { msg, t } from '@/i18n';
import { Disclosure } from '@/ui/brand';
import { AppText, Button } from '@/ui/components';
import { fonts, space, usePalette } from '@/ui/theme';

import { roomToInput, type RoomWithOpenings } from './mapping';

const STEP_TEXT: Record<PlanStepKind, { title: string; detail: string }> = {
  prepare: { title: msg('Hazırlık'), detail: msg('Eşyaları ortaya topla ve ört; priz, süpürgelik ve pencere kenarlarını bantla.') },
  scrape: { title: msg('Bozuk yüzeyi düzelt'), detail: msg('Kabaran ve dökülen boyayı kazı. Nem izi ya da geniş çatlak varsa önce nedenini çöz; gerekirse ustaya danış.') },
  fill: { title: msg('Küçük tamirler'), detail: msg('Çatlak ve delikleri macunla, kuruyunca zımparala ve tozunu al.') },
  sand: { title: msg('Hafif zımpara'), detail: msg('Duvarı hafifçe zımparala, tozunu nemli bezle al; boya daha iyi tutar.') },
  prime: { title: msg('Astar'), detail: msg('Yeni sıva, alçıpan, beton ya da tamir edilen yerlere astar sür; kurumasını bekle.') },
  ceiling: { title: msg('Önce tavan'), detail: msg('Tavanı duvarlardan önce boya; damlayan boya duvarı bozmasın.') },
  walls: { title: msg('Duvarlar: {coats} kat'), detail: msg('Katlar arasında boyanın kutusunda yazan süre kadar bekle.') },
  finish: { title: msg('Bitiş'), detail: msg('Bantları boya tam kurumadan sök, odayı havalandır. Rengi ve ürünü Ev Hafızası’na yaz.') },
};

function Step({ step, index }: { step: PlanStep; index: number }) {
  const p = usePalette();
  const text = STEP_TEXT[step.kind];
  return (
    <View style={styles.step} testID={`plan-${step.kind}${step.coats ?? ''}`}>
      <View style={[styles.no, { backgroundColor: p.primary }]}>
        <AppText variant="caption" style={{ color: p.onPrimary, fontFamily: fonts.bold }}>
          {String(index + 1)}
        </AppText>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{t(text.title, { coats: step.coats ?? 0 })}</AppText>
        <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
          {step.rooms.join(', ')}
        </AppText>
        <AppText variant="small" tone="muted">
          {t(text.detail)}
        </AppText>
      </View>
    </View>
  );
}

/** The project's work in order, room by room, from each room's surface and condition. */
export function RoomPlan({ rooms }: { rooms: RoomWithOpenings[] }) {
  const plan = renovationPlan(
    rooms.map((r) => {
      const input = roomToInput(r);
      return { name: r.name, paintWalls: input.paintWalls, paintCeiling: input.paintCeiling, coats: input.coats, surfaceType: input.surfaceType, surfaceCondition: input.surfaceCondition };
    }),
  );
  if (plan.length === 0) return null;
  return (
    <Disclosure title={t('Oda oda yenileme planı')}>
      {plan.map((step, i) => (
        <Step key={`${step.kind}${step.coats ?? ''}`} step={step} index={i} />
      ))}
      <AppText variant="caption" tone="muted">
        {t('Plan, odalara yazdığın yüzey türü ve durumuna göre hazırlandı. Bekleme süreleri için boyanın ve astarın kutusuna bak.')}
      </AppText>
      <Button label={t('Boya Rehberi’nde adım adım')} icon="book" variant="ghost" onPress={() => router.push('/guide')} />
    </Disclosure>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  no: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
