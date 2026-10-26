import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { resetCityStore } from '@/features/market/city';

// These tests cover the app without a backend (accounts not connected).
jest.mock('@/lib/supabase', () => ({ supabase: null, isBackendConfigured: false }));

beforeEach(async () => {
  await AsyncStorage.clear();
  resetCityStore();
});

describe('first launch', () => {
  it('walks through three steps, then opens the home screen', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Evin için ihtiyacın olan her şey, tek platformda.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Başlayalım'));
    expect(await screen.findByText('Hesabını nasıl kullanmak istersin?')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Usta / Profesyonel'));
    expect(await screen.findByText('Konum Seçimi')).toBeTruthy();
    await fireEvent.press(screen.getByText('Şehir seçmeden devam et'));
    expect(await screen.findByText('Evin için bugün neler yapmak istersin?')).toBeTruthy();
    expect(JSON.parse((await AsyncStorage.getItem('boyacep.roles.v1')) ?? '[]')).toEqual(['pro']);
    // Skipping the city is remembered, so nobody asks again.
    expect(JSON.parse((await AsyncStorage.getItem('boyacep.city.v1')) ?? '{}')).toMatchObject({ province: null, answered: true });
  });

  it('keeps the picked city and district', async () => {
    await renderRouter('./src/app', { initialUrl: '/welcome' });
    await fireEvent.press(await screen.findByText('Başlayalım'));
    await fireEvent.press(await screen.findByLabelText('Ev sahibi'));
    // No district list until a province with districts is chosen.
    expect(screen.getByTestId('select-district')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('select-province'));
    // Pilot cities come first; the rest are searchable.
    await fireEvent.press(screen.getAllByLabelText('İzmir')[0]);
    await fireEvent.press(screen.getByTestId('select-district'));
    await fireEvent.press(screen.getByLabelText('Bornova'));
    expect(screen.getByLabelText('İlçe seçin: Bornova')).toBeTruthy();
    await fireEvent.press(screen.getByText('Devam Et'));
    await screen.findByText('Evin için bugün neler yapmak istersin?');
    expect(JSON.parse((await AsyncStorage.getItem('boyacep.city.v1')) ?? '{}')).toEqual({ province: '35', district: 'Bornova', answered: true });
    expect(JSON.parse((await AsyncStorage.getItem('boyacep.roles.v1')) ?? '[]')).toEqual(['homeowner']);
  });

  it('goes back a step', async () => {
    await renderRouter('./src/app', { initialUrl: '/welcome' });
    await fireEvent.press(await screen.findByText('Başlayalım'));
    await fireEvent.press(await screen.findByLabelText('Geri'));
    expect(await screen.findByText('Başlayalım')).toBeTruthy();
  });
});

describe('language', () => {
  it('opens in the saved language', async () => {
    await AsyncStorage.setItem('boyacep.locale.v1', 'en');
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Everything your home needs, in one place.')).toBeTruthy();
    expect(screen.getByText('Let’s start')).toBeTruthy();
  });

  it('switches to English from the welcome screen and remembers it', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Evin için ihtiyacın olan her şey, tek platformda.');
    await fireEvent.press(screen.getByLabelText('English'));
    expect(await screen.findByText('Everything your home needs, in one place.')).toBeTruthy();
    expect(screen).toHavePathname('/welcome');
    expect(await AsyncStorage.getItem('boyacep.locale.v1')).toBe('en');
  });

  it('switches back to Turkish from the profile', async () => {
    await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner']));
    await AsyncStorage.setItem('boyacep.locale.v1', 'en');
    await renderRouter('./src/app', { initialUrl: '/profile' });
    expect(await screen.findByText('My Profile')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('menu-language'));
    await fireEvent.press(screen.getByLabelText('Türkçe'));
    expect(await screen.findByText('Profilim')).toBeTruthy();
    expect(screen).toHavePathname('/profile');
    expect(await AsyncStorage.getItem('boyacep.locale.v1')).toBe('tr');
  });
});

describe('app navigation', () => {
  beforeEach(async () => {
    await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner']));
  });

  it('shows the six home actions and opens the calculator', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Evin için bugün neler yapmak istersin?');
    for (const title of ['Boya Hesapla', 'Renk Stüdyosu', 'Usta Bul', 'Tadilat & Yenileme', 'Ev Bütçesi', 'AI Tasarım']) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }
    // The other tools stay one tap away.
    for (const title of ['Maliyet Hesapla', 'Duvarını İncele', 'Boya Fiyatları', 'Ustaya Sor']) {
      expect(screen.getByLabelText(title)).toBeTruthy();
    }
    await fireEvent.press(screen.getByLabelText('Boya Hesapla'));
    expect(screen).toHavePathname('/calculate');
  });

  it('marks AI design as coming soon instead of pretending it works', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByLabelText('AI Tasarım, yakında'));
    expect(screen).toHavePathname('/soon/ai-design');
  });

  it('shows the five tabs', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Evin için bugün neler yapmak istersin?');
    for (const tab of ['Ana Sayfa', 'Projelerim', 'Hizmetler', 'Bütçe', 'Profil']) {
      expect(screen.getAllByText(tab).length).toBeGreaterThan(0);
    }
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
