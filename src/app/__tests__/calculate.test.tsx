import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { BackHandler } from 'react-native';

jest.mock('@/lib/supabase', () => ({ supabase: null, isBackendConfigured: false }));

jest.setTimeout(20_000);

// The test phone has no back button, so collect the handlers and press it the way Android does: newest first, until one takes it.
type BackPress = Parameters<typeof BackHandler.addEventListener>[1];
let backHandlers: BackPress[] = [];
async function pressBack(): Promise<boolean> {
  let taken = false;
  await act(() => {
    taken = [...backHandlers].reverse().some((handler) => handler({} as Parameters<BackPress>[0]));
  });
  return taken;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner']));
  backHandlers = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.push(handler);
    return { remove: () => (backHandlers = backHandlers.filter((h) => h !== handler)) };
  });
});

afterEach(() => jest.restoreAllMocks());

const next = () => fireEvent.press(screen.getByRole('button', { name: 'Devam' }));

describe('Boya Hesapla screen', () => {
  it('steps back through the questions with the phone back button, keeping the answers', async () => {
    await renderRouter('./src/app', { initialUrl: '/calculate?space=room' });
    await next();
    await fireEvent.changeText(screen.getByTestId('width'), '3');
    await fireEvent.changeText(screen.getByTestId('length'), '4');
    await next();
    await next();
    await next();
    await next();
    await fireEvent.press(screen.getByRole('button', { name: 'Sonucu göster' }));
    expect(screen.getByTestId('room-results')).toBeTruthy();

    expect(await pressBack()).toBe(true);
    expect(screen.getByText('ADIM 6 / 6')).toBeTruthy();
    for (let step = 6; step > 1; step--) expect(await pressBack()).toBe(true);
    expect(screen.getByText('ADIM 1 / 6')).toBeTruthy();
    await next();
    expect(screen.getByTestId('width')).toHaveDisplayValue('3');
    expect(screen.getByTestId('length')).toHaveDisplayValue('4');
  });

  it('keeps what was typed in each tab when switching between them', async () => {
    await renderRouter('./src/app', { initialUrl: '/calculate' });
    await fireEvent.changeText(screen.getByTestId('manual-wall'), '40');
    await fireEvent.press(screen.getByText('Oda Seç'));
    await fireEvent.press(screen.getByTestId('space-living'));
    await next();
    await fireEvent.press(screen.getByText('Manuel Giriş'));
    expect(screen.getByTestId('manual-wall')).toHaveDisplayValue('40');
    await fireEvent.press(screen.getByText('Oda Seç'));
    expect(screen.getByText('ADIM 2 / 6')).toBeTruthy();
  });

  it('sends exterior walls to the area calculator with exterior paint chosen', async () => {
    await renderRouter('./src/app', { initialUrl: '/calculate' });
    await fireEvent.press(screen.getByText('Oda Seç'));
    await fireEvent.press(screen.getByLabelText('Dış cephe, Metrekareyle hesapla'));
    expect(screen.getByTestId('manual-wall')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Dış cephe' })).toBeChecked();
    expect(screen.queryByLabelText('Tavan dahil')).toBeNull();
  });
});
