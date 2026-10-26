import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import * as colourApi from '@/features/colour/project-colours';
import * as homeLogApi from '@/features/home-log/api';
import * as projectsApi from '@/features/projects/api';
import type { HomeLogRow, ProjectRow } from '@/lib/database.types';

jest.mock('@/lib/supabase', () => ({
  isBackendConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'user-1', email: 'ayse@example.com' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

jest.mock('@/features/account/api', () => ({
  ...jest.requireActual('@/features/account/api'),
  getAccount: jest.fn(async () => ({
    profile: { id: 'user-1', display_name: 'Ayşe', active_role: 'homeowner', updated_at: '1' },
    roles: ['homeowner'],
  })),
  enableRoles: jest.fn(async () => {}),
}));

jest.mock('@/features/home-log/api', () => ({
  ...jest.requireActual('@/features/home-log/api'),
  listHomeLog: jest.fn(),
  addHomeLog: jest.fn(),
  deleteHomeLog: jest.fn(),
}));
const api = jest.mocked(homeLogApi);
jest.mock('@/features/projects/api');
const projects = jest.mocked(projectsApi);
jest.mock('@/features/colour/project-colours', () => ({
  ...jest.requireActual('@/features/colour/project-colours'),
  useProjectColours: jest.fn(),
}));
const colours = jest.mocked(colourApi);

const salon: HomeLogRow = {
  id: 'h1',
  owner_id: 'user-1',
  project_id: null,
  place: 'Salon duvarları',
  colour_name: 'Kırık beyaz',
  colour_hex: '#F4F1EA',
  colour_code: '7035',
  product: 'İç cephe, silinebilir',
  finish: 'matt',
  painted_on: '2026-10-20',
  painter: 'Ahmet usta',
  note: 'Rötuş için 1 L kaldı',
  created_at: '',
  updated_at: '',
};

beforeEach(async () => {
  jest.clearAllMocks();
  colours.useProjectColours.mockReturnValue({ data: [], isError: false } as never);
  await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner']));
});

describe('Ev Hafızası', () => {
  it('lists what was painted with colour, product and date', async () => {
    api.listHomeLog.mockResolvedValue([salon]);
    await renderRouter('./src/app', { initialUrl: '/home-log' });
    expect(await screen.findByText('Salon duvarları')).toBeTruthy();
    expect(screen.getByText('Kırık beyaz · 7035')).toBeTruthy();
    expect(screen.getByText('İç cephe, silinebilir · Mat · 20.10.2026 · Ahmet usta')).toBeTruthy();
    expect(screen.getByLabelText('Renk #F4F1EA')).toBeTruthy();
  });

  it('adds a record', async () => {
    api.listHomeLog.mockResolvedValue([]);
    api.addHomeLog.mockResolvedValue();
    await renderRouter('./src/app', { initialUrl: '/home-log' });
    await fireEvent.press(await screen.findByText('Kayıt ekle'));
    await fireEvent.changeText(screen.getByTestId('log-place'), 'Banyo tavanı');
    await fireEvent.changeText(screen.getByTestId('log-hex'), 'fff');
    await fireEvent.changeText(screen.getByTestId('log-date'), '01.09.2026');
    await fireEvent.press(screen.getByText('İpek mat'));
    await fireEvent.press(screen.getByText('Kaydet'));
    expect(api.addHomeLog).toHaveBeenCalledWith(expect.anything(), [
      expect.objectContaining({ place: 'Banyo tavanı', colour_hex: '#FFFFFF', painted_on: '2026-09-01', finish: 'eggshell', project_id: null }),
    ]);
  });

  it('asks before deleting a record', async () => {
    api.listHomeLog.mockResolvedValue([salon]);
    api.deleteHomeLog.mockResolvedValue();
    await renderRouter('./src/app', { initialUrl: '/home-log' });
    await fireEvent.press(await screen.findByText('Kaydı sil'));
    expect(api.deleteHomeLog).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Evet, sil'));
    expect(api.deleteHomeLog).toHaveBeenCalledWith(expect.anything(), 'h1');
  });

  it('says "Yakında" while the server does not have the feature', async () => {
    api.listHomeLog.mockRejectedValue(new Error("Could not find the table 'public.home_log' in the schema cache"));
    await renderRouter('./src/app', { initialUrl: '/home-log' });
    expect(await screen.findByText('Yakında', {}, { timeout: 3000 })).toBeTruthy();
  });

  it('saves the colours of a finished project', async () => {
    const done: ProjectRow = { id: 'p1', owner_id: 'user-1', title: 'Salon boyası', status: 'completed', notes: null, budget: null, currency: 'TRY', created_at: '', updated_at: '' };
    projects.getProject.mockResolvedValue({ project: done, rooms: [] });
    colours.useProjectColours.mockReturnValue({
      data: [{ id: 'c1', project_id: 'p1', name: 'Kırık beyaz', hex: '#f4f1ea', surface: 'Duvarlar', created_at: '' }],
      isError: false,
    } as never);
    api.addHomeLog.mockResolvedValue();
    api.listHomeLog.mockResolvedValue([]);
    await renderRouter('./src/app', { initialUrl: '/projects/p1' });
    await fireEvent.press(await screen.findByText('1 rengi Ev Hafızası’na ekle'));
    expect(api.addHomeLog).toHaveBeenCalledWith(expect.anything(), [
      expect.objectContaining({ project_id: 'p1', place: 'Duvarlar', colour_name: 'Kırık beyaz', colour_hex: '#F4F1EA' }),
    ]);
    await waitFor(() => expect(screen).toHavePathname('/home-log'));
  });
});
