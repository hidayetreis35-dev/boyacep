import { fireEvent, render, screen } from '@testing-library/react-native';

import { ManualCalculator } from '@/features/calculator/manual-calculator';
import { Screen } from '@/ui/components';

jest.mock('@/lib/supabase', () => ({ supabase: null, isBackendConfigured: false }));

async function renderManual(onMeasure = jest.fn()) {
  await render(
    <Screen>
      <ManualCalculator onMeasure={onMeasure} />
    </Screen>,
  );
  return onMeasure;
}

describe('Boya Hesapla, Manuel Giriş', () => {
  it('turns a wall area into litres, cans and a shop-price range', async () => {
    await renderManual();
    await fireEvent.changeText(screen.getByTestId('manual-wall'), '120');
    await fireEvent.press(screen.getByText('Hesapla'));
    // 120 m² × 2 coats / 10 m²/L + 10% = 26,4 L
    expect(screen.getByText('26,4')).toBeTruthy();
    expect(screen.getByText('Al: 1 × 15 L + 1 × 7,5 L + 2 × 2,5 L')).toBeTruthy();
    // 26,4 L × 165–335 ₺/L = 4.356–8.844 ₺, rounded to 500
    expect(screen.getByText('4.500–9.000 ₺')).toBeTruthy();
    expect(screen.getByText('Sadece boya, mağaza fiyatıyla')).toBeTruthy();
    expect(screen.getByText(/Tahmindir/)).toBeTruthy();
  });

  it('adds the ceiling and gives advice for the room', async () => {
    await renderManual();
    await fireEvent.changeText(screen.getByTestId('manual-wall'), '30');
    await fireEvent.press(screen.getByTestId('manual-room'));
    await fireEvent.press(screen.getByLabelText('Banyo'));
    await fireEvent.press(screen.getByLabelText('Tavan dahil'));
    await fireEvent.changeText(screen.getByTestId('manual-ceiling'), '6');
    await fireEvent.press(screen.getByText('Hesapla'));
    // (30 + 6) × 2 / 10 × 1,1 = 7,9 L
    expect(screen.getByText('7,9')).toBeTruthy();
    expect(screen.getByText(/neme ve küfe dayanıklı/)).toBeTruthy();
  });

  it('shows errors and hides an old result when the input changes', async () => {
    await renderManual();
    await fireEvent.press(screen.getByText('Hesapla'));
    expect(screen.getByText('Duvar alanı 1 ile 5000 m² arasında olmalı.')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('manual-wall'), '50');
    await fireEvent.press(screen.getByText('Hesapla'));
    expect(screen.getByTestId('manual-result')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('manual-wall'), '60');
    expect(screen.queryByTestId('manual-result')).toBeNull();
  });

  it('prices exterior paint separately and has no ceiling', async () => {
    await renderManual();
    await fireEvent.changeText(screen.getByTestId('manual-wall'), '100');
    await fireEvent.press(screen.getByTestId('manual-paint'));
    await fireEvent.press(screen.getByLabelText('Dış cephe'));
    expect(screen.queryByTestId('manual-room')).toBeNull();
    expect(screen.queryByLabelText('Tavan dahil')).toBeNull();
    await fireEvent.press(screen.getByText('Hesapla'));
    // 22 L × 215–395 ₺/L = 4.730–8.690 ₺, rounded to 500
    expect(screen.getByText('4.500–8.500 ₺')).toBeTruthy();
  });

  it('switches to measuring rooms', async () => {
    const onMeasure = await renderManual();
    await fireEvent.changeText(screen.getByTestId('manual-wall'), '50');
    await fireEvent.press(screen.getByText('Hesapla'));
    await fireEvent.press(screen.getByText('Odayı ölçerek ayrıntılı hesapla'));
    expect(onMeasure).toHaveBeenCalled();
  });
});
