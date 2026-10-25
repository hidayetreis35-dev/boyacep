import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { resetCityStore } from '@/features/market/city';

jest.mock('@/lib/supabase', () => ({ supabase: null, isBackendConfigured: false }));

const CITY_KEY = 'boyacep.city.v1';
const savedCity = async () => JSON.parse((await AsyncStorage.getItem(CITY_KEY)) ?? 'null');

beforeEach(async () => {
  resetCityStore();
  await AsyncStorage.clear();
  await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner']));
});

describe('city choice on the home screen', () => {
  it('is offered, not forced, and remembers a pilot city', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Fiyatları şehrine göre görmek ister misin?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Manisa’yı seç'));
    expect(await screen.findByText('Manisa usta fiyatları, kaynağı ve tarihiyle')).toBeTruthy();
    expect(screen.queryByText('Fiyatları şehrine göre görmek ister misin?')).toBeNull();
    expect(await savedCity()).toEqual({ province: '45', district: null, answered: true });
  });

  it('stops asking after "Şehir seçmeden devam et"', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByText('Şehir seçmeden devam et'));
    expect(await screen.findByText('Usta fiyatları şehre göre, kaynağı ve tarihiyle')).toBeTruthy();
    expect(await savedCity()).toEqual({ province: null, district: null, answered: true });
  });
});

describe('Türkiye Boya Fiyatları', () => {
  it('shows Türkiye-wide prices, honestly labelled, without a city', async () => {
    await renderRouter('./src/app', { initialUrl: '/prices' });
    expect(await screen.findByText('Türkiye Boya Fiyatları')).toBeTruthy();
    expect(screen.getByText('Şehir seçmediğin için Türkiye geneli gösteriliyor.')).toBeTruthy();
    expect(screen.getByText('Piyasa referansı')).toBeTruthy();
    expect(screen.getByText('Kesin bir fark söylemek için yeterli veri yok. Aralıklar yalnızca yön gösterir.')).toBeTruthy();
    expect(screen.getAllByText('Bu bir teklif değildir', { exact: false }).length).toBeGreaterThan(0);
  });

  it('says so when a province has no data, and never borrows another city', async () => {
    await AsyncStorage.setItem(CITY_KEY, JSON.stringify({ province: '02', answered: true }));
    await renderRouter('./src/app', { initialUrl: '/prices' });
    expect(await screen.findByText('Adıyaman için yeterli güncel veri bulunamadı. Türkiye geneli gösteriliyor.')).toBeTruthy();
  });

  it('picks a province from the list of 81 and keeps a pilot district', async () => {
    await renderRouter('./src/app', { initialUrl: '/prices?pick=1' });
    await fireEvent.changeText(await screen.findByTestId('province-search'), 'izm');
    await fireEvent.press(screen.getByLabelText('İzmir'));
    expect(await savedCity()).toMatchObject({ province: '35' });
    await fireEvent.press(screen.getByText('Bornova'));
    expect(await savedCity()).toEqual({ province: '35', district: 'Bornova', answered: true });
    expect(screen.getByText('İlçe bazında henüz yeterli veri yok; il geneli gösteriliyor.')).toBeTruthy();
  });

  it('turns a per-m² range into a home total', async () => {
    await renderRouter('./src/app', { initialUrl: '/prices' });
    await fireEvent.press(await screen.findByLabelText('Ev tipine göre'));
    expect(screen.getByText('toplam (2+1, yaklaşık 90 m²)', { exact: false })).toBeTruthy();
  });

  it('shows no numbers for work without enough data', async () => {
    await renderRouter('./src/app', { initialUrl: '/prices' });
    await fireEvent.press(await screen.findByText('Dekoratif boya'));
    expect(screen.getByText('Bu iş için yeterli güncel veri bulunamadı.', { exact: false })).toBeTruthy();
    expect(screen.queryByTestId('market-reference')).toBeNull();
  });

  it('keeps the city when the language changes', async () => {
    await AsyncStorage.setItem(CITY_KEY, JSON.stringify({ province: '45', answered: true }));
    await renderRouter('./src/app', { initialUrl: '/profile' });
    expect(await screen.findByText('Manisa')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('English'));
    });
    expect(await screen.findByText('Change city')).toBeTruthy();
    expect(screen.getByText('Manisa')).toBeTruthy();
    expect(await savedCity()).toMatchObject({ province: '45' });
  });
});
