import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { msg, t } from '@/i18n';
import { AppText, Badge, Button, Card, Notice, Screen } from '@/ui/components';
import { PhotoHero } from '@/ui/showcase';
import { fonts, radius, space, usePalette } from '@/ui/theme';

const STEPS = [
  msg('Odanın fotoğrafını yükle.'),
  msg('Tarzını seç: modern, sıcak minimal, İskandinav ya da klasik.'),
  msg('Önerilen tasarımı gör; renkleri ve malzeme listesini projene ekle.'),
];

const STYLES = [msg('Modern'), msg('Sıcak minimal'), msg('İskandinav'), msg('Klasik'), msg('Endüstriyel'), msg('Bohem')];

const tryColours = () => router.push({ pathname: '/colour', params: { tab: 'photo' } });

/**
 * AI Ev Tasarımı is not built yet (it needs a paid image model and the owner's
 * approval). This page says what it will do, that the photo is a real room,
 * and leads to what works today.
 */
export default function AiDesignScreen() {
  const p = usePalette();
  return (
    <Screen edges={['bottom']}>
      <PhotoHero
        photo="livingRoom"
        title={t('Hayalindeki odayı önceden gör')}
        body={t('Odanın fotoğrafını yükle, tarzını seç; yapay zekâ sana yeni bir tasarım önersin.')}
        action={t('Bugün: odanda renk dene')}
        onAction={tryColours}
        testID="ai-hero"
      />
      <View style={styles.row}>
        <Badge label={t('Yakında')} tone="accent" />
        <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
          {t('Fotoğraftaki gerçek bir oda; yapay zekâ ürünü değil.')}
        </AppText>
      </View>

      <Card>
        <AppText variant="heading">{t('Nasıl çalışacak?')}</AppText>
        {STEPS.map((step, i) => (
          <View key={step} style={styles.row}>
            <View style={[styles.stepNo, { backgroundColor: p.primary }]}>
              <AppText variant="caption" style={{ color: p.onPrimary, fontFamily: fonts.bold }}>
                {String(i + 1)}
              </AppText>
            </View>
            <AppText style={{ flex: 1 }}>{t(step)}</AppText>
          </View>
        ))}
        <View style={styles.chips}>
          {STYLES.map((s) => (
            <View key={s} style={[styles.chip, { backgroundColor: p.surfaceMuted }]}>
              <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
                {t(s)}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <Notice icon="information-circle">
        {t('AI Ev Tasarımı henüz açılmadı. Açıldığında üretilen her görsel “Yapay zekâ örneği” etiketiyle gösterilecek; gerçek fotoğraf gibi sunulmayacak.')}
      </Notice>

      <Card>
        <AppText variant="heading">{t('Bugün ne yapabilirsin?')}</AppText>
        <AppText tone="muted">{t('Renk Stüdyosu kendi fotoğrafında duvar rengini ışığı ve gölgeyi koruyarak değiştirir.')}</AppText>
        <Button label={t('Odanda renk dene')} icon="color-palette" variant="cta" onPress={tryColours} />
        <Button label={t('Renk kombinasyonlarına bak')} icon="color-filter" variant="secondary" onPress={() => router.push({ pathname: '/colour', params: { tab: 'combos' } })} />
        <Button label={t('Ne kadar boya gerekir?')} icon="calculator" variant="ghost" onPress={() => router.push('/calculate')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepNo: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
});
