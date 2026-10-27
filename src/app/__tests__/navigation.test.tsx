import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { resetCityStore } from '@/features/market/city';

// These tests cover the app without a backend (accounts not connected).
jest.mock('@/lib/supabase', () => ({ supabase: null, isBackendConfigured: false }));

// The first test renders the whole router cold, which can take over 5 s on CI.
jest.setTimeout(20_000);

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
    expect(await screen.findByText('Evin için güzel fikirler burada başlıyor.')).toBeTruthy();
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
    expect(screen.getByLabelText('İlçe seç: Bornova')).toBeTruthy();
    await fireEvent.press(screen.getByText('Devam Et'));
    await screen.findByText('Evin için güzel fikirler burada başlıyor.');
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

  it('shows the main actions, the rooms and the other services, and opens the calculator', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Evin için güzel fikirler burada başlıyor.');
    for (const title of ['Boya Hesapla', 'Renkleri Dene', 'Duvarını İncele', 'Maliyetini Hesapla']) {
      expect(screen.getByLabelText(title)).toBeTruthy();
    }
    for (const room of ['Salon', 'Yatak odası', 'Çocuk odası', 'Çalışma odası', 'Mutfak', 'Banyo', 'Koridor', 'Tüm ev', 'Tadilat', 'Dekorasyon']) {
      expect(screen.getByLabelText(room)).toBeTruthy();
    }
    // Everything else stays one tap away.
    for (const title of ['Usta Bul', 'Ev Bütçesi', 'Projelerim', 'Boya Fiyatları', 'Ustaya Sor', 'Boya Rehberi', 'Ev Hafızası']) {
      expect(screen.getAllByLabelText(title).length).toBeGreaterThan(0);
    }
    await fireEvent.press(screen.getByLabelText('Boya Hesapla'));
    expect(screen).toHavePathname('/calculate');
  });

  it('starts with one clear action that opens the calculator', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByLabelText('Hemen başla'));
    expect(screen).toHavePathname('/calculate');
  });

  it('opens the calculator with the tapped room already chosen', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByLabelText('Mutfak'));
    expect(screen).toHavePathname('/calculate');
    expect(screen).toHaveSearchParams({ space: 'kitchen' });
    expect(screen.getByRole('radio', { name: 'Mutfak' })).toBeSelected();
  });

  it('opens the hallway as a custom space', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByLabelText('Koridor'));
    expect(screen).toHaveSearchParams({ space: 'custom' });
    expect(screen.getByRole('radio', { name: 'Özel alan' })).toBeSelected();
  });

  it('marks AI design as coming soon instead of pretending it works', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByLabelText('AI Ev Tasarımı, yakında'));
    expect(screen).toHavePathname('/soon/ai-design');
  });

  it('shows the five tabs, with Keşfet instead of Hizmetler', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Evin için güzel fikirler burada başlıyor.');
    for (const tab of ['Ana Sayfa', 'Projelerim', 'Keşfet', 'Bütçe', 'Profil']) {
      expect(screen.getAllByText(tab).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText('Hizmetler')).toBeNull();
  });

  it('searches the app from the home screen', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.changeText(await screen.findByLabelText('Uygulamada ara'), 'nem');
    // The page steps aside for the results.
    expect(screen.queryByTestId('home-hero')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Duvarını İncele, Araç'));
    expect(screen).toHavePathname('/inspect');
  });

  it('opens a searched colour in the studio', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.changeText(await screen.findByLabelText('Uygulamada ara'), 'terakota');
    await fireEvent.press(screen.getByLabelText('Terakota, Renk'));
    expect(screen).toHavePathname('/colour');
    expect(screen.getByTestId('selected-colour')).toHaveTextContent(/Terakota/);
  });

  it('says so when the search finds nothing', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.changeText(await screen.findByLabelText('Uygulamada ara'), 'zzqx');
    expect(screen.getByText('“zzqx” için bir şey bulamadık.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Aramayı temizle'));
    expect(screen.getByTestId('home-hero')).toBeTruthy();
  });

  it('explains how BoyaCep works to someone without projects', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('BoyaCep nasıl çalışır?')).toBeTruthy();
    expect(screen.getByText('Rengini odanda dene')).toBeTruthy();
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
    expect(screen.getByText('Tespit Edilen Sorunlar')).toBeTruthy();
    expect(screen.getByLabelText('Geniş çatlak, Uzmana danış')).toBeTruthy();
    expect(screen.getByLabelText('Küf, Dikkatli ol')).toBeTruthy();
    // Causes open one by one, or all at once with the detailed report.
    expect(screen.queryByText('Olası neden')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Geniş çatlak, Uzmana danış'));
    expect(screen.getAllByText('Olası neden')).toHaveLength(1);
    await fireEvent.press(screen.getByText('Detaylı Rapor'));
    expect(screen.getAllByText('Olası neden')).toHaveLength(2);
    await fireEvent.press(screen.getByText('Raporu kısalt'));
    expect(screen.queryByText('Olası neden')).toBeNull();
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
    await fireEvent.press(await screen.findByLabelText('Renkleri Dene'));
    expect(screen).toHavePathname('/colour');
    expect(screen.getByText('Renk kataloğu')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Odayı Dene'));
    expect(screen.getByText('Odanın fotoğrafını ekle')).toBeTruthy();
    expect(screen.getByText('Fotoğraf çek')).toBeTruthy();
  });

  it('explains that accounts are not connected when there is no backend', async () => {
    await renderRouter('./src/app', { initialUrl: '/projects' });
    expect(await screen.findByText('Projelerini kaydet')).toBeTruthy();
    expect(screen.getByText(/hesap sistemi bağlanınca açılacak/)).toBeTruthy();
  });
});
