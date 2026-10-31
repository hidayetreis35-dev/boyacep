import { router } from 'expo-router';
import { View } from 'react-native';

import { t } from '@/i18n';
import { todayIso } from '@/lib/day';
import { AppText, Badge, Button, Card, Icon } from '@/ui/components';
import { space, usePalette } from '@/ui/theme';

import { careReminders, paintedAgo } from './care';
import { useHomeLog } from './queries';

/** "Mutfak 5 yıl önce boyandı" on the home screen, from the user's own Ev Hafızası. Nothing when nothing is due. */
export function CareNudge() {
  const p = usePalette();
  const log = useHomeLog();
  if (!log.isSuccess) return null;
  const reminders = careReminders(log.data, todayIso());
  if (reminders.length === 0) return null;
  const [first] = reminders;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name="alarm" size={22} color={p.accent} />
        <AppText variant="overline" tone="muted" style={{ flex: 1 }}>
          {t('Ev Hafızası')}
        </AppText>
        <Badge label={t('Tahmini')} tone="accent" />
      </View>
      <AppText variant="heading" testID="care-nudge">
        {first.entry.place} · {paintedAgo(first.months)}
      </AppText>
      <AppText tone="muted">
        {reminders.length > 1 ? t('Bu ve {count} yer daha yenilenmeye yaklaşmış olabilir.', { count: reminders.length - 1 }) : t('Yenileme zamanı yaklaşmış olabilir.')}
      </AppText>
      <Button label={t('Ev Hafızası’nı aç')} icon="arrow-forward" variant="secondary" onPress={() => router.push('/home-log')} />
    </Card>
  );
}
