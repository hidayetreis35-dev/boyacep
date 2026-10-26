import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { DISTRICTS, PROVINCES } from '@/features/market/provinces';
import { TURKISH } from '@/i18n/scan';

// The screens that work without a backend, opened in English.
jest.mock('@/lib/supabase', () => ({ supabase: null, isBackendConfigured: false }));

/** Every text and accessibility label on screen. */
function shownText(): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      const { props, children } = node as { props?: Record<string, unknown>; children?: unknown };
      for (const key of ['accessibilityLabel', 'placeholder', 'title']) {
        if (typeof props?.[key] === 'string') out.push(props[key] as string);
      }
      walk(children);
    }
  };
  walk(screen.toJSON());
  return out;
}

// Place names are proper nouns, shown as they are; the language picker names Turkish in Turkish.
const PLACES = [...PROVINCES.map((p) => p.name), ...Object.values(DISTRICTS).flat(), 'Türkçe'].sort((a, b) => b.length - a.length);
const withoutPlaces = (text: string) => PLACES.reduce((rest, place) => rest.split(place).join(''), text);
const turkishOnScreen = () => shownText().filter((text) => TURKISH.test(withoutPlaces(text)));

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('boyacep.locale.v1', 'en');
  await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner', 'pro']));
});

describe('the app in English', () => {
  it.each([
    ['/', 'What would you like to do for your home today?'],
    ['/calculate', 'What are you painting?'],
    ['/colour', 'Colour catalogue'],
    ['/inspect', 'Continue without a photo'],
    ['/cost', 'How much will it cost?'],
    ['/plans', 'BoyaCep Pro'],
    ['/privacy', 'Privacy'],
    ['/profile', 'Language'],
    ['/account', 'Language'],
    ['/services', 'Find a Pro'],
    ['/budget', 'My Home Budget'],
    ['/help', 'Frequently asked questions'],
    ['/soon/plumber', 'Plumber'],
    ['/projects', 'My projects'],
    ['/usta', 'Painter'],
    ['/ask', 'Ask a Painter'],
    ['/guide', "The guide can't open right now"],
    ['/prices', 'Turkey Painting Prices'],
    ['/prices?pick=1', 'Search provinces'],
  ])('shows %s with no Turkish text', async (url, expected) => {
    await renderRouter('./src/app', { initialUrl: url });
    expect((await screen.findAllByText(expected, { exact: false })).length).toBeGreaterThan(0);
    expect(turkishOnScreen()).toEqual([]);
  });

  it('runs the paint calculator in English', async () => {
    await renderRouter('./src/app', { initialUrl: '/calculate' });
    await screen.findAllByText('What are you painting?');
    expect(turkishOnScreen()).toEqual([]);
    await fireEvent.press(screen.getByLabelText('Room'));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.changeText(screen.getByLabelText('Width'), '3.5');
    await fireEvent.changeText(screen.getByLabelText('Length'), '4');
    // Walk through the other steps with the defaults, up to the result.
    for (let step = 0; step < 8 && screen.queryByRole('button', { name: 'Continue' }); step += 1) {
      await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
      expect(turkishOnScreen()).toEqual([]);
    }
    await fireEvent.press(screen.getByRole('button', { name: 'Show result' }));
    expect(screen.getByText('RESULT · ROOM')).toBeTruthy();
    expect(screen.getByText('Dust sheet (20 m²)')).toBeTruthy();
    expect(screen.getByText('MARKET REFERENCE')).toBeTruthy();
    expect(turkishOnScreen()).toEqual([]);
  });
});
