import { Stack } from 'expo-router';

import { InspectWizard } from '@/features/inspect/inspect-wizard';
import { Screen } from '@/ui/components';

export default function InspectScreen() {
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Duvarını İncele' }} />
      <InspectWizard />
    </Screen>
  );
}
