import { fireEvent, render, screen } from '@testing-library/react-native';

import { QuickCalculator } from '@/features/calculator/quick-calculator';
import { RoomCalculator } from '@/features/calculator/room-calculator';

describe('RoomCalculator', () => {
  it('shows field errors when dimensions are missing', async () => {
    await render(<RoomCalculator />);
    await fireEvent.press(screen.getByText('Hesapla'));
    expect(screen.getByText('Lütfen kırmızı işaretli alanları düzeltin.')).toBeTruthy();
    expect(screen.getByText('Oda uzunluğu 0 ile 50 m arasında olmalı.')).toBeTruthy();
    expect(screen.queryByTestId('room-results')).toBeNull();
  });

  it('calculates a room typed with comma decimals', async () => {
    await render(<RoomCalculator />);
    await fireEvent.changeText(screen.getByTestId('length'), '4');
    await fireEvent.changeText(screen.getByTestId('width'), '3');
    await fireEvent.changeText(screen.getByTestId('height'), '2,5');
    await fireEvent.press(screen.getByText('Hesapla'));
    expect(screen.getByTestId('room-results')).toBeTruthy();
    // Default door 0.9 x 2.1 and window 1.2 x 1.4: 35 - 1.89 - 1.68 = 31.43 m² of wall
    expect(screen.getByText('31,43 m²')).toBeTruthy();
    expect(screen.getByText('İç cephe boyası')).toBeTruthy();
    expect(screen.getAllByText('Tahmini').length).toBeGreaterThan(0);
  });

  it('clears stale results when an input changes', async () => {
    await render(<RoomCalculator />);
    await fireEvent.changeText(screen.getByTestId('length'), '4');
    await fireEvent.changeText(screen.getByTestId('width'), '3');
    await fireEvent.press(screen.getByText('Hesapla'));
    expect(screen.getByTestId('room-results')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('width'), '5');
    expect(screen.queryByTestId('room-results')).toBeNull();
  });
});

describe('QuickCalculator', () => {
  it('prompts before any input', async () => {
    await render(<QuickCalculator />);
    expect(screen.getByText('Ev tipini seç ve net metrekareyi yaz; sonuç hemen çıkar.')).toBeTruthy();
  });

  it('estimates a 3+1, 120 m² home', async () => {
    await render(<QuickCalculator />);
    await fireEvent.changeText(screen.getByTestId('floor-area'), '120');
    expect(screen.getByText('100,3 L')).toBeTruthy();
    expect(screen.getByText('Al: 6 × 15 L + 1 × 7,5 L + 2 × 2,5 L')).toBeTruthy();
  });

  it('rejects an unrealistic area', async () => {
    await render(<QuickCalculator />);
    await fireEvent.changeText(screen.getByTestId('floor-area'), '3');
    expect(screen.getByText('Net alan 10 ile 1000 m² arasında olmalı.')).toBeTruthy();
  });
});
