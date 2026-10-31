import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import * as budgetApi from '@/features/budget/api';
import { monthLabel } from '@/features/budget/charts';
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
    profile: { id: 'user-1', display_name: 'Ayşe Kaya', active_role: 'homeowner', updated_at: '1' },
    roles: ['homeowner'],
  })),
  enableRoles: jest.fn(async () => {}),
}));

jest.mock('@/features/projects/api');
const api = jest.mocked(projectsApi);
jest.mock('@/features/budget/api', () => ({
  ...jest.requireActual('@/features/budget/api'),
  listAllExpenses: jest.fn(),
}));
const bapi = jest.mocked(budgetApi);

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

/** A day in the month `back` months before this one, as YYYY-MM-DD. */
function monthsAgo(back: number, day = 15): string {
  const d = new Date();
  const m = new Date(d.getFullYear(), d.getMonth() - back, day);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const expense = (id: string, project_id: string, category: 'paint' | 'material' | 'labor' | 'other', amount: number, label: string, spent_on: string) => ({
  id,
  project_id,
  category,
  amount,
  label,
  spent_on,
  created_at: `${spent_on}T10:00:00Z`,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner']));
});

describe('Ana sayfa', () => {
  it('greets the user by first name and shows their initials', async () => {
    api.listProjects.mockResolvedValue([]);
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Merhaba Ayşe')).toBeTruthy();
    expect(screen.getByText('AK')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Ev Bütçesi'));
    expect(screen).toHavePathname('/budget');
  });
});

describe('Ev Bütçem', () => {
  it('adds up every project, by category, with the share of each', async () => {
    api.listProjects.mockResolvedValue([
      project({ id: 'p1', title: 'Salon', budget: 10000 }),
      project({ id: 'p2', title: 'Yatak odası', budget: 5000 }),
    ]);
    // Newest first, as the server sorts them.
    bapi.listAllExpenses.mockResolvedValue([
      expense('e1', 'p1', 'paint', 3000, 'Boya alımı', monthsAgo(0, 2)),
      expense('e3', 'p2', 'material', 1500, 'Rulo ve fırça', monthsAgo(0, 1)),
      expense('e2', 'p1', 'labor', 4500, 'Usta ödemesi', monthsAgo(1)),
    ]);
    await renderRouter('./src/app', { initialUrl: '/budget' });
    expect(await screen.findByTestId('home-budget-total')).toHaveTextContent('15.000 ₺');
    expect(screen.getByText('%60 kullanıldı')).toBeTruthy();
    expect(screen.getByText('9.000 ₺')).toBeTruthy();
    expect(screen.getByText('6.000 ₺')).toBeTruthy();
    expect(screen.getByText('İşçilik')).toBeTruthy();
    expect(screen.getByText('%50')).toBeTruthy();
    expect(screen.getByTestId('category-bar').props.accessibilityLabel).toBe('Boya %33, Malzeme %17, İşçilik %50');

    // This month first; a tap on last month's bar shows its total.
    expect(screen.getByTestId('month-total')).toHaveTextContent('4.500 ₺');
    await fireEvent.press(screen.getByRole('button', { name: `${monthLabel(monthsAgo(2).slice(0, 7))}: Harcama yok` }));
    expect(screen.getByTestId('month-total')).toHaveTextContent('Harcama yok');
    await fireEvent.press(screen.getByRole('button', { name: `${monthLabel(monthsAgo(1).slice(0, 7))}: 4.500 ₺` }));
    expect(screen.getByTestId('month-total')).toHaveTextContent('4.500 ₺');

    // Recent spending, newest first, opens its project.
    expect(screen.getByText('Usta ödemesi')).toBeTruthy();
    expect(screen.getByText('Rulo ve fırça')).toBeTruthy();
    // Two projects: adding an expense asks which one.
    await fireEvent.press(screen.getByText('Yeni Harcama Ekle'));
    expect(screen.getByText('Hangi projeye?')).toBeTruthy();
    // The chooser comes before the per-project list.
    await fireEvent.press(screen.getAllByRole('button', { name: 'Yatak odası' })[0]);
    expect(screen).toHavePathname('/projects/p2/budget');
  });

  it('shows an honest empty state with no projects', async () => {
    api.listProjects.mockResolvedValue([]);
    bapi.listAllExpenses.mockResolvedValue([]);
    await renderRouter('./src/app', { initialUrl: '/budget' });
    expect(await screen.findByText('Henüz proje yok')).toBeTruthy();
  });

  it('says "Yakında" when the server table is not there yet', async () => {
    api.listProjects.mockResolvedValue([project()]);
    bapi.listAllExpenses.mockRejectedValue(new Error('relation "public.project_expenses" does not exist'));
    await renderRouter('./src/app', { initialUrl: '/budget' });
    expect(await screen.findByText('Ev Bütçem hazır ama sunucuda henüz açılmadı.', {}, { timeout: 3000 })).toBeTruthy();
  });
});

describe('Usta Bul', () => {
  it('lists the trades, honestly marks the closed ones and never shows fake pros', async () => {
    await renderRouter('./src/app', { initialUrl: '/services' });
    expect(await screen.findByText('Boyacı')).toBeTruthy();
    expect(screen.getByLabelText('Elektrikçi, yakında')).toBeTruthy();
    expect(screen.getByText(/Usta listesi henüz açılmadı/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Tesisatçı, yakında'));
    expect(screen).toHavePathname('/soon/plumber');
    expect(await screen.findByText('Tesisatçı yakında')).toBeTruthy();
  });

  it('filters the trades by search', async () => {
    await renderRouter('./src/app', { initialUrl: '/services' });
    await fireEvent.changeText(await screen.findByTestId('service-search'), 'MAR');
    expect(screen.getByText('Marangoz')).toBeTruthy();
    expect(screen.queryByText('Boyacı')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('service-search'), 'zzz');
    expect(screen.getByText('Bu adla bir hizmet bulamadık.')).toBeTruthy();
  });
});

describe('Profil', () => {
  it('shows the account, the menu and an honest premium card', async () => {
    await renderRouter('./src/app', { initialUrl: '/profile' });
    expect(await screen.findByText('Ayşe Kaya')).toBeTruthy();
    expect(screen.getByText('ayse@example.com')).toBeTruthy();
    expect(screen.getByText('Daha fazla proje ve özellik. Ödeme henüz açılmadı.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('menu-account'));
    expect(screen).toHavePathname('/account');
  });

  it('opens help and support', async () => {
    await renderRouter('./src/app', { initialUrl: '/profile' });
    await fireEvent.press(await screen.findByLabelText('Yardım ve Destek'));
    expect(screen).toHavePathname('/help');
    await fireEvent.press(screen.getByText('Hesabımı nasıl silerim?'));
    expect(screen.getByText(/hesabını ve tüm verilerini silebilirsin/)).toBeTruthy();
  });
});
