import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

describe('app navigation', () => {
  it('shows the six home actions and opens the calculator', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    for (const title of ['Boya Hesapla', 'Rengini Dene', 'Maliyet Hesapla', 'Duvarını İncele', 'Boya Rehberi', 'Ustaya Sor']) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }
    await fireEvent.press(screen.getByLabelText('Boya Hesapla'));
    expect(screen).toHavePathname('/calculate');
  });

  it('marks unfinished features as coming soon', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(screen.getByLabelText('Rengini Dene, yakında'));
    expect(screen).toHavePathname('/soon/color');
    expect(screen.getByText('Rengini Dene yakında')).toBeTruthy();
  });
});
