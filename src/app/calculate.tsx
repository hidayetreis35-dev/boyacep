import { PaintWizard } from '@/features/calculator/paint-wizard';
import { Screen } from '@/ui/components';

export default function CalculateScreen() {
  return (
    <Screen edges={['bottom']}>
      <PaintWizard />
    </Screen>
  );
}
