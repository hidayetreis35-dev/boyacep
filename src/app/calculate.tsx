import { useState } from 'react';

import { QuickCalculator } from '@/features/calculator/quick-calculator';
import { RoomCalculator } from '@/features/calculator/room-calculator';
import { ChoiceChips, Screen } from '@/ui/components';

type Mode = 'room' | 'quick';

export default function CalculateScreen() {
  const [mode, setMode] = useState<Mode>('room');
  return (
    <Screen edges={['bottom']}>
      <ChoiceChips
        options={[
          { value: 'room', label: 'Oda oda (detaylı)' },
          { value: 'quick', label: 'Tüm ev (hızlı)' },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'room' ? <RoomCalculator /> : <QuickCalculator />}
    </Screen>
  );
}
