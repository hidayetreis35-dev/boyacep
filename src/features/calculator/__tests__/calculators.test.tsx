import { fireEvent, render, screen } from '@testing-library/react-native';

import { PaintWizard } from '@/features/calculator/paint-wizard';
import { Screen } from '@/ui/components';

jest.mock('@/lib/supabase', () => ({ supabase: null, isBackendConfigured: false }));

async function renderWizard() {
  await render(
    <Screen>
      <PaintWizard />
    </Screen>,
  );
}

const next = () => fireEvent.press(screen.getByRole('button', { name: 'Devam' }));

describe('PaintWizard, one room', () => {
  it('asks one question at a time and blocks on missing measurements', async () => {
    await renderWizard();
    expect(screen.getByText('ADIM 1 / 6')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Devam' })).toBeDisabled();
    await fireEvent.press(screen.getByTestId('space-room'));
    await next();
    expect(screen.getByText('ADIM 2 / 6')).toBeTruthy();
    await next();
    expect(screen.getByText('Kırmızı alanlara bir göz atalım, sonra devam edelim.')).toBeTruthy();
    expect(screen.getByText('Oda uzunluğu 0 ile 50 m arasında olmalı.')).toBeTruthy();
    expect(screen.getByText('ADIM 2 / 6')).toBeTruthy();
  });

  it('walks through every step and shows the same numbers as the engine', async () => {
    await renderWizard();
    await fireEvent.press(screen.getByTestId('space-kitchen'));
    await next();
    await fireEvent.changeText(screen.getByTestId('length'), '4');
    await fireEvent.changeText(screen.getByTestId('width'), '3');
    await fireEvent.changeText(screen.getByTestId('height'), '2,5');
    await next(); // surfaces: walls and ceiling by default
    await next(); // openings: 1 door, 1 window
    await next(); // condition: painted
    await next(); // coats: 2
    await fireEvent.press(screen.getByRole('button', { name: 'Sonucu göster' }));
    expect(screen.getByTestId('room-results')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Hesap detayları' }));
    // Default door 0.9 x 2.1 and window 1.2 x 1.4: 35 - 1.89 - 1.68 = 31.43 m² of wall
    expect(screen.getByText('31,43 m²')).toBeTruthy();
    expect(screen.getByText('İç cephe boyası')).toBeTruthy();
    expect(screen.getByText(/mutfak-banyo/)).toBeTruthy();
    expect(screen.getAllByText('Tahmini').length).toBeGreaterThan(0);
  });

  it('adds primer for new plaster and lets the user go back to edit', async () => {
    await renderWizard();
    await fireEvent.press(screen.getByTestId('space-room'));
    await next();
    await fireEvent.changeText(screen.getByTestId('length'), '4');
    await fireEvent.changeText(screen.getByTestId('width'), '3');
    await next();
    await next();
    await next();
    await fireEvent.press(screen.getByText('Yeni sıva'));
    await next();
    await fireEvent.press(screen.getByRole('button', { name: 'Sonucu göster' }));
    expect(screen.getAllByText('Astar').length).toBe(2);
    await fireEvent.press(screen.getByRole('button', { name: 'Hangi ürünü almalıyım?' }));
    expect(screen.getByText('Su bazlı iç cephe astarı')).toBeTruthy();
    expect(screen.getByText('Orta tüylü rulo (12–18 mm)')).toBeTruthy();
    expect(screen.queryByText('Gerekmiyor')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Düzenle' }));
    expect(screen.getByText('ADIM 6 / 6')).toBeTruthy();
  });

  it('draws the room and keeps a running total while the user answers', async () => {
    await renderWizard();
    await fireEvent.press(screen.getByTestId('space-room'));
    await next();
    expect(screen.getByLabelText('Örnek oda çizimi')).toBeTruthy();
    expect(screen.getByText('Ölçüleri yazınca hesaplanır')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('width'), '3');
    await fireEvent.changeText(screen.getByTestId('length'), '4');
    expect(screen.getByLabelText('Oda çizimi: 3 × 4 m, tavan 2,6 m')).toBeTruthy();
    // 36,4 m² of wall − door 1,89 − window 1,68 + 12 m² of ceiling, with the default answers.
    expect(screen.getByText('44,8')).toBeTruthy();
    expect(screen.getByText('Şu ana kadarki cevaplarla')).toBeTruthy();
    // A common size fills both fields at once.
    await fireEvent.press(screen.getByLabelText('3,5 m en, 4 m boy'));
    expect(screen.getByTestId('width').props.value).toBe('3,5');
    expect(screen.getByLabelText('Oda çizimi: 3,5 × 4 m, tavan 2,6 m')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Tavan 2,8 m'));
    expect(screen.getByTestId('height').props.value).toBe('2,8');
  });

  it('counts doors and windows with big buttons', async () => {
    await renderWizard();
    await fireEvent.press(screen.getByTestId('space-room'));
    await next();
    await fireEvent.changeText(screen.getByTestId('width'), '3');
    await fireEvent.changeText(screen.getByTestId('length'), '4');
    await next();
    await next();
    await fireEvent.press(screen.getByLabelText('Pencere artır'));
    await fireEvent.press(screen.getByLabelText('Kapı azalt'));
    expect(screen.getByLabelText('Kapı azalt')).toBeDisabled();
    // No door, two windows: 36,4 − 2 × 1,68 + 12 m² of ceiling.
    expect(screen.getByText('45')).toBeTruthy();
  });

  it('marks exterior walls as coming soon instead of guessing', async () => {
    await renderWizard();
    expect(screen.getByLabelText('Dış cephe, Yakında')).toBeDisabled();
  });
});

describe('PaintWizard, whole home', () => {
  it('estimates a 3+1, 120 m² home', async () => {
    await renderWizard();
    await fireEvent.press(screen.getByTestId('space-home'));
    await next();
    expect(screen.getByText('ADIM 2 / 4')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('floor-area'), '120');
    await next();
    await next();
    await fireEvent.press(screen.getByRole('button', { name: 'Sonucu göster' }));
    expect(screen.getByTestId('quick-results')).toBeTruthy();
    expect(screen.getByTestId('total-litres')).toHaveTextContent('100,3');
    expect(screen.getByText('Duvar: 5 × 15 L · Tavan: 1 × 15 L + 1 × 7,5 L + 2 × 2,5 L')).toBeTruthy();
  });

  it('shows the moving-out order of work', async () => {
    await renderWizard();
    await fireEvent.press(screen.getByTestId('space-home'));
    await next();
    await fireEvent.changeText(screen.getByTestId('floor-area'), '90');
    await fireEvent.press(screen.getByTestId('reason-move_out'));
    await next();
    await next();
    await fireEvent.press(screen.getByRole('button', { name: 'Sonucu göster' }));
    expect(screen.getByText('Kiracı çıkışı için sıra')).toBeTruthy();
    expect(screen.getByText(/her duvarını fotoğrafla/)).toBeTruthy();
  });

  it('shows no moving plan for a normal refresh', async () => {
    await renderWizard();
    await fireEvent.press(screen.getByTestId('space-home'));
    await next();
    await fireEvent.changeText(screen.getByTestId('floor-area'), '90');
    await next();
    await next();
    await fireEvent.press(screen.getByRole('button', { name: 'Sonucu göster' }));
    expect(screen.queryByText(/için sıra|taşınırken sıra/)).toBeNull();
  });

  it('rejects an unrealistic area', async () => {
    await renderWizard();
    await fireEvent.press(screen.getByTestId('space-home'));
    await next();
    await fireEvent.changeText(screen.getByTestId('floor-area'), '3');
    await next();
    expect(screen.getByText('Net alan 10 ile 1000 m² arasında olmalı.')).toBeTruthy();
  });
});
