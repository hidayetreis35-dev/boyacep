import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { PaintWizard } from '@/features/calculator/paint-wizard';
import { resetCityStore } from '@/features/market/city';
import { SNAPSHOT_AS_OF } from '@/features/market/snapshot';
import { setCurrentLocale } from '@/i18n';
import { Screen } from '@/ui/components';

jest.mock('@/lib/supabase', () => ({ supabase: null, isBackendConfigured: false }));

const CITY_KEY = 'boyacep.city.v1';
const savedCity = async () => JSON.parse((await AsyncStorage.getItem(CITY_KEY)) ?? 'null');

/** Pins "today" so the shipped data's age, and so its quality, stays fixed in tests. */
function today(iso: string) {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse(`${iso}T12:00:00Z`));
}

afterEach(() => jest.restoreAllMocks());

beforeEach(async () => {
  today(SNAPSHOT_AS_OF);
  setCurrentLocale('tr');
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
    expect(screen.getByText('PİYASA REFERANSI')).toBeTruthy();
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
    await fireEvent.press(screen.getByText('İlçe seç (isteğe bağlı)'));
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

describe('regional cost on calculator results', () => {
  async function wholeHome(area: string) {
    await render(
      <Screen>
        <PaintWizard />
      </Screen>,
    );
    await fireEvent.press(screen.getByTestId('space-home'));
    await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));
    await fireEvent.changeText(screen.getByTestId('floor-area'), area);
    await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sonucu göster' }));
  }

  it('works without a city, on Türkiye-wide labour and shop paint prices', async () => {
    await wholeHome('120');
    expect(await screen.findByTestId('regional-cost')).toBeTruthy();
    expect(screen.getByText('Şehir seçmediğin için Türkiye geneli gösteriliyor.')).toBeTruthy();
    // 100–150 ₺/m² × 120 m²; 100,3 L × 165–335 ₺/L.
    expect(screen.getByText('12.000–18.000 ₺')).toBeTruthy();
    expect(screen.getByText('16.500–33.500 ₺')).toBeTruthy();
    expect(screen.getByText('28.500–51.500 ₺')).toBeTruthy();
  });

  it('uses the chosen city\'s own labour range', async () => {
    await AsyncStorage.setItem(CITY_KEY, JSON.stringify({ province: '45', answered: true }));
    await wholeHome('120');
    expect(await screen.findByText('Ustayla yaklaşık maliyet · Manisa')).toBeTruthy();
    // 75–180 ₺/m² × 120 m².
    expect(screen.getByText('9.000–21.500 ₺')).toBeTruthy();
    expect(screen.queryByText('Türkiye geneli gösteriliyor', { exact: false })).toBeNull();
  });
});

describe('scenarios from the brief', () => {
  it('switches between labour only and materials included', async () => {
    await AsyncStorage.setItem(CITY_KEY, JSON.stringify({ province: '35', answered: true }));
    await renderRouter('./src/app', { initialUrl: '/prices' });
    expect(await screen.findByText('İzmir · Sadece işçilik')).toBeTruthy();
    expect(screen.queryByText('Ortanca (medyan)')).toBeNull(); // limited: no median
    await fireEvent.press(screen.getByLabelText('Malzeme dahil'));
    expect(screen.getByText('İzmir · Malzeme dahil')).toBeTruthy();
    const card = within(screen.getByTestId('market-reference'));
    expect(card.getByText('Orta düzey veri')).toBeTruthy();
    expect(card.getByText('Ortanca (medyan)')).toBeTruthy();
    expect(card.queryByText('Ortalama')).toBeNull(); // medium: no mean
  });

  it('changes the city later', async () => {
    await AsyncStorage.setItem(CITY_KEY, JSON.stringify({ province: '45', answered: true }));
    await renderRouter('./src/app', { initialUrl: '/prices' });
    expect(await screen.findByText('Manisa · Sadece işçilik')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Değiştir'));
    await fireEvent.changeText(screen.getByTestId('province-search'), 'izmir');
    await fireEvent.press(screen.getByLabelText('İzmir'));
    expect(await screen.findByText('İzmir · Sadece işçilik')).toBeTruthy();
    expect(await savedCity()).toEqual({ province: '35', district: null, answered: true });
  });

  it('compares Manisa and İzmir without claiming a difference the data cannot support', async () => {
    await renderRouter('./src/app', { initialUrl: '/prices' });
    expect(await screen.findByText('Manisa ve İzmir')).toBeTruthy();
    expect(screen.getByText('Kesin bir fark söylemek için yeterli veri yok. Aralıklar yalnızca yön gösterir.')).toBeTruthy();
    expect(screen.queryByText('daha pahalı görünüyor', { exact: false })).toBeNull();
    expect(screen.queryByText('daha uygun görünüyor', { exact: false })).toBeNull();
  });

  it('warns when the data is old and stops showing numbers it no longer supports', async () => {
    today('2028-01-01');
    await AsyncStorage.setItem(CITY_KEY, JSON.stringify({ province: '35', answered: true }));
    await renderRouter('./src/app', { initialUrl: '/prices' });
    expect(await screen.findByText('Bu fiyatlar 25.10.2026 tarihinde toplandı ve güncel olmayabilir.')).toBeTruthy();
    expect(screen.getByText('İzmir için yeterli güncel veri bulunamadı. Türkiye geneli gösteriliyor.')).toBeTruthy();
    expect(screen.getAllByText('Bu iş için yeterli güncel veri bulunamadı.').length).toBeGreaterThan(0);
  });
});
