import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import * as projectsApi from '@/features/projects/api';
import type { ProjectRow } from '@/lib/database.types';

// A signed-in session against a fake backend; the data layer is mocked below.
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

jest.mock('@/features/projects/api');
const api = jest.mocked(projectsApi);

function project(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: 'p1',
    owner_id: 'user-1',
    title: 'Salon boyası',
    status: 'planning',
    notes: null,
    budget: null,
    currency: 'TRY',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner']));
});

describe('Projelerim (signed in)', () => {
  it('shows the empty state when there are no projects', async () => {
    api.listProjects.mockResolvedValue([]);
    await renderRouter('./src/app', { initialUrl: '/projects' });
    expect(await screen.findByText('Henüz projen yok')).toBeTruthy();
  });

  it('shows an error with retry when loading fails', async () => {
    api.listProjects.mockRejectedValue(new Error('offline'));
    await renderRouter('./src/app', { initialUrl: '/projects' });
    expect(await screen.findByText('Bir sorun oluştu', {}, { timeout: 3000 })).toBeTruthy();
    api.listProjects.mockResolvedValue([project()]);
    await fireEvent.press(screen.getByText('Tekrar dene'));
    expect(await screen.findByText('Salon boyası')).toBeTruthy();
  });

  it('creates a project and opens it', async () => {
    api.listProjects.mockResolvedValue([]);
    api.createProject.mockResolvedValue(project({ id: 'p9', title: 'Mutfak' }));
    api.getProject.mockResolvedValue({ project: project({ id: 'p9', title: 'Mutfak' }), rooms: [] });
    await renderRouter('./src/app', { initialUrl: '/projects' });
    await fireEvent.press(await screen.findByText('Yeni proje'));
    await fireEvent.changeText(screen.getByTestId('project-title'), 'Mutfak');
    await fireEvent.press(screen.getByText('Oluştur'));
    expect(api.createProject).toHaveBeenCalledWith(expect.anything(), 'Mutfak');
    expect(await screen.findByText('Henüz oda yok')).toBeTruthy();
    expect(screen).toHavePathname('/projects/p9');
  });

  it('blocks a fourth project on the free plan', async () => {
    api.listProjects.mockResolvedValue([project({ id: 'a' }), project({ id: 'b' }), project({ id: 'c' })]);
    await renderRouter('./src/app', { initialUrl: '/projects' });
    expect(await screen.findByText(/en fazla 3 proje/)).toBeTruthy();
    expect(screen.queryByText('Yeni proje')).toBeNull();
  });
});

describe('Project detail', () => {
  it('totals the paint for saved rooms', async () => {
    api.getProject.mockResolvedValue({
      project: project(),
      rooms: [
        {
          id: 'r1',
          project_id: 'p1',
          name: 'Salon',
          length_m: 4,
          width_m: 3,
          height_m: 2.5,
          paint_walls: true,
          paint_ceiling: true,
          coats: 2,
          surface_type: 'painted',
          surface_condition: 'good',
          coverage_m2_per_l: null,
          coverage_source: null,
          sort_order: 0,
          created_at: '',
          updated_at: '',
          openings: [],
        },
      ],
    });
    await renderRouter('./src/app', { initialUrl: '/projects/p1' });
    expect(await screen.findByText('Proje toplamı')).toBeTruthy();
    // 35 m² walls + 12 m² ceiling, 2 coats, 10 m²/L, +10 %: 7.7 + 2.6 = 10.3 L
    expect(screen.getAllByText('10,3 L').length).toBeGreaterThan(0);
  });

  it('saves a new room through the room editor', async () => {
    api.getProject.mockResolvedValue({ project: project(), rooms: [] });
    api.saveRoom.mockResolvedValue('r2');
    await renderRouter('./src/app', { initialUrl: '/projects/p1/room' });
    await fireEvent.changeText(await screen.findByTestId('room-name'), 'Yatak odası');
    await fireEvent.changeText(screen.getByTestId('length'), '3,5');
    await fireEvent.changeText(screen.getByTestId('width'), '3');
    await fireEvent.press(screen.getByText('Kaydet'));
    expect(api.saveRoom).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        projectId: 'p1',
        name: 'Yatak odası',
        room: expect.objectContaining({ length_m: 3.5, width_m: 3, height_m: 2.6 }),
      }),
    );
  });

  it('does not save a room without a name', async () => {
    api.getProject.mockResolvedValue({ project: project(), rooms: [] });
    await renderRouter('./src/app', { initialUrl: '/projects/p1/room' });
    await fireEvent.changeText(await screen.findByTestId('length'), '3');
    await fireEvent.changeText(screen.getByTestId('width'), '3');
    await fireEvent.press(screen.getByText('Kaydet'));
    expect(screen.getByText('Oda adı yazın.')).toBeTruthy();
    expect(api.saveRoom).not.toHaveBeenCalled();
  });
});
