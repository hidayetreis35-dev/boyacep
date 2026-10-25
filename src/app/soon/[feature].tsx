import { router, useLocalSearchParams } from 'expo-router';

import { findAction } from '@/features/home/actions';
import { Button, EmptyState, Screen } from '@/ui/components';

/** Honest placeholder for features that are not built yet. */
export default function SoonScreen() {
  const { feature } = useLocalSearchParams<{ feature: string }>();
  const action = findAction(feature ?? '');
  return (
    <Screen edges={['bottom']}>
      <EmptyState
        icon={action?.icon ?? 'time'}
        title={action ? `${action.title} yakında` : 'Bu bölüm yakında'}
        message={
          action
            ? `Bu özellik henüz hazır değil. Geliştirme planında ${action.phase}. aşamada eklenecek.`
            : 'Aradığın sayfa bulunamadı.'
        }
        action={<Button label="Boya Hesapla'yı dene" icon="calculator" onPress={() => router.replace('/calculate')} />}
      />
    </Screen>
  );
}
