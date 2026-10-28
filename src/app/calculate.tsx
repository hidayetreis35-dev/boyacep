import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ManualCalculator } from '@/features/calculator/manual-calculator';
import { PaintWizard } from '@/features/calculator/paint-wizard';
import { SPACES, type SpaceKind } from '@/features/calculator/wizard';
import { msg } from '@/i18n';
import { Segmented } from '@/ui/brand';
import { Screen } from '@/ui/components';

type Mode = 'manual' | 'rooms';

const MODES: { value: Mode; label: string }[] = [
  { value: 'manual', label: msg('Manuel Giriş') },
  { value: 'rooms', label: msg('Oda Seç') },
];

/** A room picked elsewhere (home screen, search) opens the wizard with that room chosen. */
function readySpace(value: string | undefined): SpaceKind | undefined {
  return SPACES.find((s) => s.value === value && s.ready)?.value;
}

export default function CalculateScreen() {
  const { space } = useLocalSearchParams<{ space?: string }>();
  const initialSpace = readySpace(space);
  const [mode, setMode] = useState<Mode>(initialSpace ? 'rooms' : 'manual');
  const tabs = <Segmented options={MODES} value={mode} onChange={setMode} />;
  if (mode === 'rooms') {
    // The wizard's back and next buttons stay pinned under the page, so "Devam" never scrolls away.
    return (
      <PaintWizard
        initialSpace={initialSpace}
        frame={(body, footer) => (
          <Screen edges={['bottom']} footer={footer}>
            {tabs}
            {body}
          </Screen>
        )}
      />
    );
  }
  return (
    <Screen edges={['bottom']}>
      {tabs}
      <ManualCalculator onMeasure={() => setMode('rooms')} />
    </Screen>
  );
}
