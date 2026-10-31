import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { ManualCalculator, type PaintKind } from '@/features/calculator/manual-calculator';
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
  // Exterior walls are worked out from their area, in "Manuel Giriş".
  const [paint, setPaint] = useState<PaintKind>(space === 'exterior' ? 'exterior' : 'interior');
  // A mode stays on the page once opened, hidden while the other one shows, so switching back keeps what was typed.
  const [opened, setOpened] = useState<Record<Mode, boolean>>({ manual: mode === 'manual', rooms: mode === 'rooms' });
  const open = (next: Mode) => {
    setOpened((o) => ({ ...o, [next]: true }));
    setMode(next);
  };
  const wizardBack = useRef<(() => boolean) | null>(null);

  // The phone's back button goes back one question in the wizard; on the first one it leaves the screen.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => (mode === 'rooms' && wizardBack.current ? wizardBack.current() : false));
      return () => subscription.remove();
    }, [mode]),
  );

  const tabs = <Segmented options={MODES} value={mode} onChange={open} />;
  return (
    <>
      {opened.rooms ? (
        <View style={[styles.mode, mode !== 'rooms' && styles.hidden]}>
          {/* The wizard's back and next buttons stay pinned under the page, so "Devam" never scrolls away. */}
          <PaintWizard
            initialSpace={initialSpace}
            backRef={wizardBack}
            onExterior={() => {
              setPaint('exterior');
              open('manual');
            }}
            frame={(body, footer) => (
              <Screen edges={['bottom']} footer={footer}>
                {mode === 'rooms' ? tabs : null}
                {body}
              </Screen>
            )}
          />
        </View>
      ) : null}
      {opened.manual ? (
        <View style={[styles.mode, mode !== 'manual' && styles.hidden]}>
          <Screen edges={['bottom']}>
            {mode === 'manual' ? tabs : null}
            <ManualCalculator paint={paint} onPaint={setPaint} onMeasure={() => open('rooms')} />
          </Screen>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  mode: { flex: 1 },
  hidden: { display: 'none' },
});
