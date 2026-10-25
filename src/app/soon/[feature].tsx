import { router, useLocalSearchParams } from 'expo-router';

import { findAction } from '@/features/home/actions';
import { t } from '@/i18n';
import { Button, EmptyState, Screen } from '@/ui/components';

/** Honest placeholder for features that are not built yet. */
export default function SoonScreen() {
  const { feature } = useLocalSearchParams<{ feature: string }>();
  const action = findAction(feature ?? '');
  return (
    <Screen edges={['bottom']}>
      <EmptyState
        icon={action?.icon ?? 'time'}
        title={action ? t('{title} yakında', { title: t(action.title) }) : t('Bu bölüm yakında')}
        message={
          action
            ? t('Bu özellik henüz hazır değil. Geliştirme planında {phase}. aşamada eklenecek.', { phase: action.phase })
            : t('Aradığın sayfa bulunamadı.')
        }
        action={<Button label={t('Ne Kadar Boya?’yı dene')} icon="calculator" onPress={() => router.replace('/calculate')} />}
      />
    </Screen>
  );
}
