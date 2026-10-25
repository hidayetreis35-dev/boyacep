import { Stack } from 'expo-router';

import { InspectWizard } from '@/features/inspect/inspect-wizard';
import { t } from '@/i18n';
import { Screen } from '@/ui/components';

export default function InspectScreen() {
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('Duvarını İncele') }} />
      <InspectWizard />
    </Screen>
  );
}
