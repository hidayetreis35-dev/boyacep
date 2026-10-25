import { router } from 'expo-router';

import { AppText, Button, EmptyState, Screen } from '@/ui/components';

export default function ProjectsScreen() {
  return (
    <Screen>
      <AppText variant="title">Projelerim</AppText>
      <EmptyState
        icon="folder-open"
        title="Projelerin burada olacak"
        message="Hesap açıp projelerini, odalarını ve ölçülerini kaydetme özelliği 2. aşamada geliyor. Şimdilik Boya Hesapla'yı kullanabilirsin."
        action={<Button label="Boya Hesapla" icon="calculator" variant="secondary" onPress={() => router.push('/calculate')} />}
      />
    </Screen>
  );
}
