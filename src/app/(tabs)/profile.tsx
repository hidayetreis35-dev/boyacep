import { router } from 'expo-router';

import { AppText, Button, EmptyState, Screen } from '@/ui/components';

export default function ProfileScreen() {
  return (
    <Screen>
      <AppText variant="title">Profil</AppText>
      <EmptyState
        icon="person-circle"
        title="Profil yakında"
        message="Giriş, profil ve ev sahibi / usta rol seçimi 2. aşamada geliyor."
        action={<Button label="Boya Hesapla" icon="calculator" variant="secondary" onPress={() => router.push('/calculate')} />}
      />
    </Screen>
  );
}
