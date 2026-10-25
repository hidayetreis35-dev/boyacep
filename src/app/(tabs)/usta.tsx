import { router } from 'expo-router';

import { AppText, Button, EmptyState, Screen } from '@/ui/components';

export default function UstaScreen() {
  return (
    <Screen>
      <AppText variant="title">Usta</AppText>
      <EmptyState
        icon="construct"
        title="Usta modülü yakında"
        message="Usta profili, teklif hazırlama ve PDF teklif 6. aşamada geliyor."
        action={<Button label="Boya Hesapla" icon="calculator" variant="secondary" onPress={() => router.push('/calculate')} />}
      />
    </Screen>
  );
}
