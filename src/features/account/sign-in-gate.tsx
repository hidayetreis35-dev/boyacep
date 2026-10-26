import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { IconBubble } from '@/ui/brand';
import { AppText, Button, Icon, type IconName } from '@/ui/components';
import { radius, shadowOf, space, useFeatureColour, usePalette, type FeatureKey } from '@/ui/theme';

/**
 * What a signed-out user sees on a screen that needs an account: what they
 * get by signing in, and one clear button.
 */
export function SignInGate({
  feature,
  icon,
  title,
  message,
  benefits,
}: {
  feature: FeatureKey;
  icon: IconName;
  title: string;
  message: string;
  benefits: string[];
}) {
  const p = usePalette();
  const f = useFeatureColour(feature);
  return (
    <View style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p)]}>
      <View style={[styles.band, { backgroundColor: f.soft }]}>
        <IconBubble icon={icon} feature={feature} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading">{title}</AppText>
          <AppText variant="small" tone="muted">
            {message}
          </AppText>
        </View>
      </View>
      <View style={{ gap: space.sm, padding: space.lg }}>
        {benefits.map((b) => (
          <View key={b} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <Icon name="checkmark-circle" size={20} color={f.base} />
            <AppText style={{ flex: 1 }}>{b}</AppText>
          </View>
        ))}
        <View style={{ marginTop: space.sm, gap: space.xs }}>
          <Button label={t('Giriş yap')} icon="log-in" variant="cta" size="lg" onPress={() => router.push('/sign-in')} />
          <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {t('Şifre yok: e-postana gelen bağlantıyla girersin. Hesabın yoksa kendiliğinden açılır.')}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  band: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
});
