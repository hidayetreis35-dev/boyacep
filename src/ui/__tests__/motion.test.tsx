import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Text } from 'react-native';

import { FadeIn, PressableScale, useReducedMotion } from '@/ui/motion';

// The phone starts with "reduce motion" on; `setSystem` flips it like the settings app would.
let setSystem: (on: boolean) => void = () => {};
beforeAll(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_event: string, handler: (on: boolean) => void) => {
    setSystem = handler;
    return { remove: () => {} };
  }) as never);
});

afterEach(() => jest.clearAllMocks());

function Probe() {
  return <Text>{useReducedMotion() ? 'still' : 'moving'}</Text>;
}

function Example() {
  return (
    <FadeIn>
      <PressableScale accessibilityRole="button" accessibilityLabel="Dene" onPress={() => {}} />
    </FadeIn>
  );
}

describe('reduce motion', () => {
  it('follows the system setting, also when it changes', async () => {
    await render(<Probe />);
    expect(await screen.findByText('still')).toBeTruthy();
    await act(async () => setSystem(false));
    expect(screen.getByText('moving')).toBeTruthy();
    await act(async () => setSystem(true));
    expect(screen.getByText('still')).toBeTruthy();
  });

  it('shows content at once and keeps buttons still when motion is reduced', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const spring = jest.spyOn(Animated, 'spring');
    await render(<Example />);
    await fireEvent(screen.getByRole('button', { name: 'Dene' }), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    expect(spring).not.toHaveBeenCalled();
  });

  it('fades content in and springs buttons otherwise', async () => {
    await act(async () => setSystem(false));
    const timing = jest.spyOn(Animated, 'timing');
    const spring = jest.spyOn(Animated, 'spring');
    await render(<Example />);
    expect(timing).toHaveBeenCalled();
    await fireEvent(screen.getByRole('button', { name: 'Dene' }), 'pressIn');
    expect(spring).toHaveBeenCalled();
  });
});
