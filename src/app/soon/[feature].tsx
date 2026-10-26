import { router, useLocalSearchParams } from 'expo-router';

import { findAction, findService } from '@/features/home/actions';
import { t } from '@/i18n';
import { Button, EmptyState, Screen } from '@/ui/components';

/** Honest placeholder for features that are not built yet. */
export default function SoonScreen() {
  const { feature } = useLocalSearchParams<{ feature: string }>();
  const action = findAction(feature ?? '');
  const service = action ? undefined : findService(feature ?? '');
  return (
    <Screen edges={['bottom']}>
      {service ? (
        <EmptyState
          icon={service.icon}
          title={t('{title} yakında', { title: t(service.title) })}
          message={t('BoyaCep şimdilik boya işlerine odaklanıyor. Diğer ustalar sonraki aşamalarda eklenecek.')}
          action={<Button label={t('Boyacı için başla')} icon="color-fill" onPress={() => router.replace('/services')} />}
        />
      ) : (
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
      )}
    </Screen>
  );
}
