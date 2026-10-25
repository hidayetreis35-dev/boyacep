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
    expect(await screen.findByText('Evini boyamanın en kolay yolu')).toBeTruthy();
    expect(JSON.parse((await AsyncStorage.getItem('boyacep.roles.v1')) ?? '[]')).toEqual(['pro']);
  });
});

describe('app navigation', () => {
  beforeEach(async () => {
    await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner']));
  });

  it('shows the six home actions and opens the calculator', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Evini boyamanın en kolay yolu');
    for (const title of ['Ne Kadar Boya?', 'Renk Stüdyosu', 'Maliyet Hesapla', 'Duvarını İncele', 'Boya Rehberi', 'Ustaya Sor']) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }
    await fireEvent.press(screen.getByLabelText('Ne Kadar Boya?'));
    expect(screen).toHavePathname('/calculate');
  });

  it('opens Ustaya Sor and explains it needs the server', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByLabelText('Ustaya Sor'));
    expect(screen).toHavePathname('/ask');
    expect(screen.getByText('Sunucu bağlı değil')).toBeTruthy();
  });

  it('shows an honest placeholder for unknown features', async () => {
    await renderRouter('./src/app', { initialUrl: '/soon/unknown' });
    expect(await screen.findByText('Bu bölüm yakında')).toBeTruthy();
  });

  it('explains wall problems without an account', async () => {
    await renderRouter('./src/app', { initialUrl: '/inspect' });
    await fireEvent.press(screen.getByText('Fotoğrafsız devam et'));
    expect(screen.getByRole('button', { name: 'Devam' })).toBeDisabled();
    await fireEvent.press(screen.getByText('Banyo ya da mutfak'));
    await fireEvent.press(screen.getByText('Devam'));

    expect(screen.getByRole('button', { name: 'Sonucu göster' })).toBeDisabled();
    await fireEvent.press(screen.getByText('Küf'));
    await fireEvent.press(screen.getByText('Çatlak'));
    expect(screen.getByRole('button', { name: 'Sonucu göster' })).toBeDisabled();
    await fireEvent.press(screen.getByText('Geniş ya da büyüyor'));
    await fireEvent.press(screen.getByText('Sonucu göster'));

    expect(screen.getByTestId('inspect-result')).toBeTruthy();
    expect(screen.getByTestId('inspect-verdict')).toHaveTextContent('Önce bir uzmana göster');
    expect(screen.getByText(/inşaat mühendisine/)).toBeTruthy();
    expect(screen.getByText(/küfe dayanıklı/)).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Geniş çatlak').at(-1)!);
    expect(screen.getByText('Uzmana danış')).toBeTruthy();
  });

  it('says a wall in good shape is ready to paint', async () => {
    await renderRouter('./src/app', { initialUrl: '/inspect' });
    await fireEvent.press(screen.getByText('Fotoğrafsız devam et'));
    await fireEvent.press(screen.getByText('Oda ya da salon'));
    await fireEvent.press(screen.getByText('Devam'));
    await fireEvent.press(screen.getByText('Hiçbiri, duvar iyi görünüyor'));
    await fireEvent.press(screen.getByText('Sonucu göster'));
    expect(screen.getByTestId('inspect-verdict')).toHaveTextContent('Boyaya hazır görünüyor');
  });

  it('opens the colour preview without an account', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByLabelText('Renk Stüdyosu'));
    expect(screen).toHavePathname('/colour');
    expect(screen.getByText('Renk kataloğu')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Duvarda'));
    expect(screen.getByText('Odanın fotoğrafını ekle')).toBeTruthy();
    expect(screen.getByText('Fotoğraf çek')).toBeTruthy();
  });

  it('explains that accounts are not connected when there is no backend', async () => {
    await renderRouter('./src/app', { initialUrl: '/projects' });
    expect(await screen.findByText('Projelerini kaydet')).toBeTruthy();
    expect(screen.getByText(/hesap sistemi bağlanınca açılacak/)).toBeTruthy();
  });
});
