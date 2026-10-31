import { render, screen } from '@testing-library/react-native';

import { countSteps, Odometer } from '@/ui/odometer';

describe('countSteps', () => {
  it('climbs fast, then slowly, and ends on the value itself', () => {
    const steps = countSteps(0, 12.3);
    expect(steps).toHaveLength(16);
    expect(steps.at(-1)).toBe(12.3);
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1]);
    // Eased out: the first step covers more ground than the last one.
    expect(steps[0]).toBeGreaterThan(steps.at(-1)! - steps.at(-2)!);
  });

  it('counts on from an earlier value', () => {
    const steps = countSteps(8.8, 11.4, 4);
    expect(steps[0]).toBeGreaterThan(8.8);
    expect(steps.at(-1)).toBe(11.4);
  });
});

describe('Odometer', () => {
  const style = { fontSize: 52 };

  it('gives screen readers the final number while it counts', async () => {
    await render(<Odometer value={12.3} lineHeight={58} style={style} testID="litres" />);
    expect(screen.getByTestId('litres')).toHaveTextContent('12,3');
  });

  it('shows a smaller number at once', async () => {
    const { rerender } = await render(<Odometer value={12.3} lineHeight={58} style={style} testID="litres" />);
    await rerender(<Odometer value={8.8} lineHeight={58} style={style} testID="litres" />);
    expect(screen.getByTestId('litres')).toHaveTextContent('8,8');
  });
});
