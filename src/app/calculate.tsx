import { useState } from 'react';

import { ManualCalculator } from '@/features/calculator/manual-calculator';
import { PaintWizard } from '@/features/calculator/paint-wizard';
import { msg } from '@/i18n';
import { Segmented } from '@/ui/brand';
import { Screen } from '@/ui/components';

type Mode = 'manual' | 'rooms';

const MODES: { value: Mode; label: string }[] = [
  { value: 'manual', label: msg('Manuel Giriş') },
  { value: 'rooms', label: msg('Oda Seç') },
];

export default function CalculateScreen() {
  const [mode, setMode] = useState<Mode>('manual');
  return (
    <Screen edges={['bottom']}>
      <Segmented options={MODES} value={mode} onChange={setMode} />
      {mode === 'manual' ? <ManualCalculator onMeasure={() => setMode('rooms')} /> : <PaintWizard />}
    </Screen>
  );
}
