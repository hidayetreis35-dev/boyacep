import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

// These tests cover the app without a backend (accounts not connected).
jest.mock('@/lib/supabase', () => ({ supabase: null, isBackendConfigured: false }));

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('first launch', () => {
  it('asks for a role, then opens the home screen', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('BoyaCep’e hoş geldin')).toBeTruthy();
    expect(screen.getByText('Başla')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Ustayım'));
    await fireEvent.press(screen.getByText('Başla'));
    expect(await screen.findByText('Boyanı planla, hesapla, doğru malzemeyi al.')).toBeTruthy();
    expect(JSON.parse((await AsyncStorage.getItem('boyacep.roles.v1')) ?? '[]')).toEqual(['pro']);
  });
});

describe('app navigation', () => {
  beforeEach(async () => {
    await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner']));
  });

  it('shows the six home actions and opens the calculator', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Boyanı planla, hesapla, doğru malzemeyi al.');
    for (const title of ['Boya Hesapla', 'Rengini Dene', 'Maliyet Hesapla', 'Duvarını İncele', 'Boya Rehberi', 'Ustaya Sor']) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }
    await fireEvent.press(screen.getByLabelText('Boya Hesapla'));
    expect(screen).toHavePathname('/calculate');
  });

  it('marks unfinished features as coming soon', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByLabelText('Ustaya Sor, yakında'));
    expect(screen).toHavePathname('/soon/ask');
    expect(screen.getByText('Ustaya Sor yakında')).toBeTruthy();
  });

  it('explains wall problems without an account', async () => {
    await renderRouter('./src/app', { initialUrl: '/inspect' });
    expect(screen.getByRole('button', { name: 'Sonucu göster' })).toBeDisabled();
    await fireEvent.press(screen.getByText('Küf, siyah noktalar'));
    await fireEvent.press(screen.getByText('Geniş ya da büyüyen çatlak'));
    await fireEvent.press(screen.getByText('Sonucu göster'));
    expect(screen.getByTestId('inspect-result')).toBeTruthy();
    expect(screen.getByText(/uzmanın görmesi gereken/)).toBeTruthy();
    expect(screen.getAllByText('Uzmana danış').length).toBe(1);
  });

  it('opens the colour preview without an account', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByLabelText('Rengini Dene'));
    expect(screen).toHavePathname('/colour');
    expect(screen.getByText('Duvarının fotoğrafını ekle')).toBeTruthy();
    expect(screen.getByText('Fotoğraf çek')).toBeTruthy();
  });

  it('explains that accounts are not connected when there is no backend', async () => {
    await renderRouter('./src/app', { initialUrl: '/projects' });
    expect(await screen.findByText('Projelerini kaydet')).toBeTruthy();
    expect(screen.getByText(/hesap sistemi bağlanınca açılacak/)).toBeTruthy();
  });
});
