import { router } from 'expo-router';
import { View } from 'react-native';

import { useMyQuotes } from '@/features/quotes/queries';
import { useSharedProjects } from '@/features/sharing/queries';
import { t } from '@/i18n';
import { IconBubble } from '@/ui/brand';
import { AppText, Button, Card } from '@/ui/components';
import { space } from '@/ui/theme';

/** The painter's own start on the home screen: what is waiting in Usta Paneli. Counts come from their own data. */
export function ProHomeCard() {
  const shared = useSharedProjects();
  const quotes = useMyQuotes();
  const projects = shared.data?.length ?? 0;
  const waiting = quotes.data?.filter((q) => q.status === 'sent').length ?? 0;
  const ready = shared.isSuccess && quotes.isSuccess;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconBubble icon="construct" feature="inspect" size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="overline" tone="muted">
            {t('Usta Paneli')}
          </AppText>
          <AppText variant="heading" testID="pro-home-summary">
            {ready
              ? t('{projects} paylaşılan proje · {waiting} teklif yanıt bekliyor', { projects, waiting })
              : t('İşlerin burada')}
          </AppText>
        </View>
      </View>
      <AppText tone="muted">{t('Ev sahiplerinin paylaştığı projeleri gör, ölçülere göre PDF teklif hazırla.')}</AppText>
      <Button label={t('Usta Paneli’ni aç')} icon="arrow-forward" variant="cta" onPress={() => router.push('/usta')} />
    </Card>
  );
}
