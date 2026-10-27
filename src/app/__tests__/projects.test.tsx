import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { renderRouter } from 'expo-router/testing-library';

import * as materialsApi from '@/features/materials/api';
import * as budgetApi from '@/features/budget/api';
import { EMPTY_ROOM_FORM } from '@/features/calculator/form';
import * as projectsApi from '@/features/projects/api';
import { clearPendingRoom, getPendingRoom, setPendingRoom } from '@/features/projects/pending-room';
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
jest.mock('@/features/photos/api', () => ({ listProjectPhotos: jest.fn(async () => []) }));
const photosMock = jest.mocked(jest.requireMock('@/features/photos/api') as { listProjectPhotos: jest.Mock });
const api = jest.mocked(projectsApi);
jest.mock('@/features/materials/api');
const mapi = jest.mocked(materialsApi);
jest.mock('@/features/budget/api', () => ({
  ...jest.requireActual('@/features/budget/api'),
  listExpenses: jest.fn(),
  addExpense: jest.fn(),
  deleteExpense: jest.fn(),
  deleteReceipts: jest.fn(async () => {}),
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

// The first test renders the whole router cold, which can take over 5 s on CI.
jest.setTimeout(20_000);

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
    expect(await screen.findByText('Bir şeyler ters gitti', {}, { timeout: 3000 })).toBeTruthy();
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

  it('uses the project\'s own photo as its cover', async () => {
    api.listProjects.mockResolvedValue([project({ id: 'p1' }), project({ id: 'p2', title: 'Mutfak' })]);
    photosMock.listProjectPhotos.mockImplementation(async (_db: unknown, id: string) =>
      id === 'p1' ? [{ id: 'ph1', project_id: 'p1', url: 'https://example.invalid/salon.jpg', surfaces: [] }] : [],
    );
    await renderRouter('./src/app', { initialUrl: '/projects' });
    expect(await screen.findByText('Mutfak')).toBeTruthy();
    // Only the project with a photo gets one; nobody else's room is borrowed.
    expect(await screen.findAllByTestId('project-cover-photo')).toHaveLength(1);
  });

  it('blocks a fourth project on the free plan', async () => {
    api.listProjects.mockResolvedValue([project({ id: 'a' }), project({ id: 'b' }), project({ id: 'c' })]);
    await renderRouter('./src/app', { initialUrl: '/projects' });
    expect(await screen.findByText(/en fazla 3 proje/)).toBeTruthy();
    expect(screen.queryByText('Yeni proje')).toBeNull();
  });
});

describe('Projelerim filters', () => {
  it('splits projects into in progress and completed, with progress', async () => {
    api.listProjects.mockResolvedValue([
      project({ id: 'p1', title: 'Salon boyası' }),
      project({ id: 'p2', title: 'Banyo', status: 'completed' }),
    ]);
    api.getProject.mockResolvedValue({ project: project(), rooms: [] });
    await renderRouter('./src/app', { initialUrl: '/projects' });
    expect(await screen.findByText('Salon boyası')).toBeTruthy();
    expect(screen.getByText('Banyo')).toBeTruthy();
    expect(screen.getByText('%100')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Tamamlanan'));
    expect(screen.queryByText('Salon boyası')).toBeNull();
    expect(screen.getByText('Banyo')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Devam Eden'));
    expect(screen.getByText('Salon boyası')).toBeTruthy();
    expect(screen.queryByText('Banyo')).toBeNull();
  });

  it('says so when a filter is empty', async () => {
    api.listProjects.mockResolvedValue([project()]);
    await renderRouter('./src/app', { initialUrl: '/projects' });
    await fireEvent.press(await screen.findByLabelText('Tamamlanan'));
    expect(screen.getByText('Henüz tamamlanan projen yok.')).toBeTruthy();
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

const salon = {
  id: 'r1',
  project_id: 'p1',
  name: 'Salon',
  length_m: 4,
  width_m: 3,
  height_m: 2.5,
  paint_walls: true,
  paint_ceiling: true,
  coats: 2,
  surface_type: 'painted' as const,
  surface_condition: 'good' as const,
  coverage_m2_per_l: null,
  coverage_source: null,
  sort_order: 0,
  created_at: '',
  updated_at: '',
  openings: [],
};

const paintRow = {
  id: 'm1',
  project_id: 'p1',
  catalog_id: null,
  category: 'interior_paint' as const,
  name: 'İç cephe boyası (7,5 L kutu)',
  quantity: 1,
  unit: 'kutu' as const,
  unit_price: 1200,
  price_source: 'store' as const,
  store_name: null,
  note: null,
  from_calculation: true,
  sort_order: 0,
  created_at: '',
  updated_at: '1',
};

describe('Project steps', () => {
  it('suggests measuring a new project first', async () => {
    api.getProject.mockResolvedValue({ project: project(), rooms: [] });
    await renderRouter('./src/app', { initialUrl: '/projects/p1' });
    expect(await screen.findByText('Sıradaki adım: Odalarını ölç')).toBeTruthy();
  });

  it('moves on to the material list once a room is measured', async () => {
    api.getProject.mockResolvedValue({ project: project(), rooms: [salon] });
    mapi.listMaterials.mockResolvedValue([]);
    mapi.listCosts.mockResolvedValue([]);
    await renderRouter('./src/app', { initialUrl: '/projects/p1' });
    expect(await screen.findByLabelText('Ölç: tamam')).toBeTruthy();
    expect(await screen.findByText('Sıradaki adım: Malzeme listeni çıkar')).toBeTruthy();
  });
});

describe('Ana sayfa: devam eden proje', () => {
  it('shows the open project with its next step', async () => {
    api.listProjects.mockResolvedValue([
      project({ id: 'p0', title: 'Eski iş', status: 'completed', updated_at: '2026-10-26' }),
      project({ updated_at: '2026-10-20' }),
    ]);
    api.getProject.mockResolvedValue({ project: project(), rooms: [] });
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('DEVAM EDEN PROJEN')).toBeTruthy();
    expect(await screen.findByText('Sıradaki adım: Odalarını ölç')).toBeTruthy();
    expect(api.getProject).toHaveBeenCalledWith(expect.anything(), 'p1');
    await fireEvent.press(screen.getByText('Oda ekle'));
    expect(screen).toHavePathname('/projects/p1/room');
  });

  it('shows nothing when every project is finished', async () => {
    api.listProjects.mockResolvedValue([project({ status: 'completed' })]);
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Evin için güzel fikirler burada başlıyor.');
    await waitFor(() => expect(api.listProjects).toHaveBeenCalled());
    expect(screen.queryByText('DEVAM EDEN PROJEN')).toBeNull();
  });
});

describe('Malzeme ve maliyet', () => {
  beforeEach(() => {
    api.getProject.mockResolvedValue({ project: project({ budget: 2000 }), rooms: [salon] });
    mapi.listCosts.mockResolvedValue([
      { id: 'c1', project_id: 'p1', kind: 'labor', label: 'İşçilik', amount: 3000, price_source: 'estimate', note: null, created_at: '', updated_at: '' },
    ]);
  });

  it('sums materials and costs, and separates store from estimate', async () => {
    mapi.listMaterials.mockResolvedValue([paintRow, { ...paintRow, id: 'm2', name: 'Rulo', category: 'roller', unit: 'adet', unit_price: null, price_source: 'estimate' }]);
    await renderRouter('./src/app', { initialUrl: '/projects/p1/cost' });
    expect(await screen.findByTestId('cost-total')).toHaveTextContent('4.200,00 ₺');
    expect(screen.getByText('Kesin fiyat: 1.200,00 ₺')).toBeTruthy();
    expect(screen.getByText('Tahmini: 3.000,00 ₺')).toBeTruthy();
    expect(screen.getByText(/Bütçe aşımı/)).toBeTruthy();
    expect(screen.getByText(/1 kalemin fiyatı girilmedi/)).toBeTruthy();
  });

  it('builds the shopping list from the room measurements', async () => {
    mapi.listMaterials.mockResolvedValue([]);
    mapi.syncFromCalculation.mockResolvedValue();
    await renderRouter('./src/app', { initialUrl: '/projects/p1/cost' });
    await fireEvent.press(await screen.findByText('Ölçülerden oluştur'));
    const drafts = mapi.syncFromCalculation.mock.calls[0][2];
    expect(drafts).toEqual(
      expect.arrayContaining([
        { category: 'interior_paint', name: 'İç cephe boyası (7,5 L kutu)', quantity: 1, unit: 'kutu' },
      ]),
    );
  });

  it('saves an edited price as a store price', async () => {
    mapi.listMaterials.mockResolvedValue([{ ...paintRow, unit_price: null, price_source: 'estimate' }]);
    mapi.updateMaterial.mockResolvedValue();
    await renderRouter('./src/app', { initialUrl: '/projects/p1/cost' });
    await fireEvent.changeText(await screen.findByLabelText('Birim fiyat (kutu)'), '1450,5');
    await fireEvent.press(screen.getByText('Mağaza fiyatı'));
    await fireEvent.press(screen.getByText('Kaydet'));
    expect(mapi.updateMaterial).toHaveBeenCalledWith(expect.anything(), 'm1', {
      quantity: 1,
      unit_price: 1450.5,
      price_source: 'store',
      store_name: null,
    });
  });
});

function expense(overrides: Partial<budgetApi.ExpenseWithReceipt> = {}): budgetApi.ExpenseWithReceipt {
  return {
    id: 'e1',
    project_id: 'p1',
    owner_id: 'user-1',
    category: 'paint',
    label: 'İç cephe boyası',
    amount: 1500,
    spent_on: '2026-10-20',
    store_name: 'Yapı market',
    note: null,
    receipt_path: null,
    receiptUrl: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('Alışveriş listesi', () => {
  beforeEach(() => {
    api.getProject.mockResolvedValue({ project: project(), rooms: [salon] });
    mapi.listMaterials.mockResolvedValue([paintRow, { ...paintRow, id: 'm2', name: 'Rulo', category: 'roller', unit: 'adet', unit_price: null, price_source: 'estimate' }]);
  });

  it('ticks items, remembers them and sends only what is left', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderRouter('./src/app', { initialUrl: '/projects/p1/shopping' });
    expect(await screen.findByText('0 / 2 alındı')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: /İç cephe boyası/ }));
    expect(screen.getByText('1 / 2 alındı')).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem('boyacep.shopping.p1.v1')).toBe('["m1"]'));
    await fireEvent.press(screen.getByText('WhatsApp’ta gönder'));
    const url = decodeURIComponent(open.mock.calls[0][0].replace('https://wa.me/?text=', ''));
    expect(url).toContain('• Rulo: 1 adet');
    expect(url).not.toContain('İç cephe');
    open.mockRestore();
  });

  it('shows the empty state without materials', async () => {
    mapi.listMaterials.mockResolvedValue([]);
    await renderRouter('./src/app', { initialUrl: '/projects/p1/shopping' });
    expect(await screen.findByText('Liste boş')).toBeTruthy();
  });
});

describe('Akıllı Bütçe', () => {
  beforeEach(() => {
    api.getProject.mockResolvedValue({ project: project({ budget: 10000 }), rooms: [salon] });
    mapi.listMaterials.mockResolvedValue([paintRow]);
    mapi.listCosts.mockResolvedValue([
      { id: 'c1', project_id: 'p1', kind: 'labor', label: 'İşçilik', amount: 3000, price_source: 'estimate', note: null, created_at: '', updated_at: '' },
    ]);
  });

  it('shows what was spent against the budget and the plan', async () => {
    bapi.listExpenses.mockResolvedValue([expense()]);
    await renderRouter('./src/app', { initialUrl: '/projects/p1/budget' });
    expect(await screen.findByTestId('budget-spent')).toHaveTextContent('1.500,00 ₺');
    expect(screen.getByText('Kalan: 8.500,00 ₺')).toBeTruthy();
    expect(screen.getByText('4.200,00 ₺')).toBeTruthy(); // planned: 1200 paint + 3000 labour
    expect(screen.getByText('İç cephe boyası')).toBeTruthy();
    expect(screen.getByText('Boya · 20.10.2026 · Yapı market')).toBeTruthy();
  });

  it('warns when the forecast goes over the budget', async () => {
    // Paint 7000 spent (plan 1200) + labour still 3000 planned = 10 000 + 500 other.
    bapi.listExpenses.mockResolvedValue([expense({ amount: 7000 }), expense({ id: 'e2', category: 'other', amount: 500 })]);
    await renderRouter('./src/app', { initialUrl: '/projects/p1/budget' });
    expect(await screen.findByText('Bu gidişle bütçeyi yaklaşık 500,00 ₺ aşabilirsin.')).toBeTruthy();
  });

  it('shows an over-budget warning', async () => {
    bapi.listExpenses.mockResolvedValue([expense({ amount: 12000 })]);
    await renderRouter('./src/app', { initialUrl: '/projects/p1/budget' });
    expect(await screen.findByText('Bütçe aşımı: 2.000,00 ₺')).toBeTruthy();
    expect(screen.getByText(/Bütçeyi aştın/)).toBeTruthy();
  });

  it('adds an expense', async () => {
    bapi.listExpenses.mockResolvedValue([]);
    bapi.addExpense.mockResolvedValue();
    await renderRouter('./src/app', { initialUrl: '/projects/p1/budget' });
    expect(await screen.findByText('Henüz harcama yok')).toBeTruthy();
    await fireEvent.press(screen.getByText('Harcama ekle'));
    await fireEvent.press(screen.getByText('Kaydet'));
    expect(screen.getByText('Ne aldığını ya da ödediğini yaz.')).toBeTruthy();
    expect(bapi.addExpense).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('expense-label'), 'Usta kaparo');
    await fireEvent.changeText(screen.getByTestId('expense-amount'), '2.000');
    await fireEvent.changeText(screen.getByTestId('expense-date'), '21.10.2026');
    await fireEvent.press(screen.getAllByText('İşçilik')[0]);
    await fireEvent.press(screen.getByText('Kaydet'));
    expect(bapi.addExpense).toHaveBeenCalledWith(expect.anything(), {
      ownerId: 'user-1',
      projectId: 'p1',
      draft: { category: 'labor', label: 'Usta kaparo', amount: 2000, spent_on: '2026-10-21', store_name: null },
      receipt: null,
    });
  });

  it('says "Yakında" while the server does not have the feature', async () => {
    bapi.listExpenses.mockRejectedValue(new Error("Could not find the table 'public.project_expenses' in the schema cache"));
    await renderRouter('./src/app', { initialUrl: '/projects/p1/budget' });
    expect(await screen.findByText('Yakında', {}, { timeout: 3000 })).toBeTruthy();
  });
});

describe('Maliyet Hesapla (no account needed)', () => {
  it('adds up the groups', async () => {
    await renderRouter('./src/app', { initialUrl: '/cost' });
    await fireEvent.press(await screen.findByLabelText('Boya'));
    await fireEvent.changeText(screen.getByTestId('cost-paint'), '2500');
    expect(screen.queryByLabelText('İşçilik')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Usta ile Yaptıracağım'));
    await fireEvent.press(screen.getByLabelText('İşçilik'));
    await fireEvent.changeText(screen.getByTestId('cost-labor'), '4000,50');
    expect(screen.getByTestId('cost-total')).toHaveTextContent('6.500,50 ₺');
    // Each line shows its own amount in the list.
    expect(screen.getByText('2.500,00 ₺')).toBeTruthy();
  });

  it('prices the litres handed over from the paint wizard', async () => {
    await renderRouter('./src/app', { initialUrl: '/cost?paint=13.9&primer=0' });
    expect(await screen.findByText('Hesaplanan: 13,9 L boya')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('cost-paint'), '200');
    expect(screen.getByTestId('cost-total')).toHaveTextContent('2.780,00 ₺');
  });

  it('starts with no total and offers a labelled shop price instead of inventing one', async () => {
    await renderRouter('./src/app', { initialUrl: '/cost?paint=10&primer=0' });
    expect(await screen.findByText('Kalemlere fiyat ekledikçe toplam burada oluşur.')).toBeTruthy();
    expect(screen.getByTestId('cost-total')).toHaveTextContent('–');
    await fireEvent.press(screen.getByText('Yaklaşık mağaza fiyatını yaz: 250 ₺/L'));
    // 10 L × 250 ₺/L, marked as an estimate, not a checked price
    expect(screen.getByTestId('cost-total')).toHaveTextContent('2.500,00 ₺');
    expect(screen.getByText('Tahmini: 2.500,00 ₺')).toBeTruthy();
    expect(screen.queryByText('Yaklaşık mağaza fiyatını yaz: 250 ₺/L')).toBeNull();
  });
});

describe('Projeye kaydet (from Ne Kadar Boya?)', () => {
  const form = { ...EMPTY_ROOM_FORM, length: '4', width: '3' };
  beforeEach(() => clearPendingRoom());

  it('says there is nothing to save without a calculation', async () => {
    api.listProjects.mockResolvedValue([]);
    await renderRouter('./src/app', { initialUrl: '/projects/save' });
    expect(await screen.findByText('Kaydedilecek hesap yok')).toBeTruthy();
  });

  it('finds the room again after the sign-in link reloads the app', async () => {
    await AsyncStorage.setItem('boyacep.pending-room.v1', JSON.stringify({ name: 'Koridor', form }));
    api.listProjects.mockResolvedValue([]);
    await renderRouter('./src/app', { initialUrl: '/projects/save' });
    expect(await screen.findByTestId('save-room-name')).toHaveDisplayValue('Koridor');
  });

  it('saves the calculated room into a new project and opens it', async () => {
    setPendingRoom({ name: 'Salon', form });
    api.listProjects.mockResolvedValue([]);
    api.createProject.mockResolvedValue(project({ id: 'p9', title: 'Ev boyası' }));
    api.saveRoom.mockResolvedValue('r1');
    api.getProject.mockResolvedValue({ project: project({ id: 'p9', title: 'Ev boyası' }), rooms: [] });
    await renderRouter('./src/app', { initialUrl: '/projects/save' });
    expect(await screen.findByTestId('save-room-name')).toHaveDisplayValue('Salon');
    await fireEvent.press(screen.getByText('Projeye kaydet', { exact: true }));
    expect(api.createProject).toHaveBeenCalledWith(expect.anything(), 'Ev boyası');
    expect(api.saveRoom).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ projectId: 'p9', name: 'Salon', room: expect.objectContaining({ length_m: 4, width_m: 3 }) }),
    );
    expect(await screen.findByText('Henüz oda yok')).toBeTruthy();
    expect(screen).toHavePathname('/projects/p9');
    expect(getPendingRoom()).toBeNull();
  });

  it('adds the room to an existing project', async () => {
    setPendingRoom({ name: 'Mutfak', form });
    api.listProjects.mockResolvedValue([project()]);
    api.saveRoom.mockResolvedValue('r2');
    api.getProject.mockResolvedValue({ project: project(), rooms: [] });
    await renderRouter('./src/app', { initialUrl: '/projects/save' });
    await fireEvent.press(await screen.findByText('Salon boyası'));
    expect(screen.queryByTestId('save-project-title')).toBeNull();
    await fireEvent.press(screen.getByText('Projeye kaydet', { exact: true }));
    expect(api.createProject).not.toHaveBeenCalled();
    expect(api.saveRoom).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ projectId: 'p1', name: 'Mutfak' }));
  });

  it('offers only existing projects at the plan limit', async () => {
    setPendingRoom({ name: 'Salon', form });
    api.listProjects.mockResolvedValue([project({ id: 'a' }), project({ id: 'b', title: 'Banyo' }), project({ id: 'c', title: 'Koridor' })]);
    await renderRouter('./src/app', { initialUrl: '/projects/save' });
    expect(await screen.findByText(/Proje sınırına ulaştın/)).toBeTruthy();
    expect(screen.queryByTestId('save-new')).toBeNull();
  });

  it('shows the error and keeps the room when saving fails', async () => {
    setPendingRoom({ name: 'Salon', form });
    api.listProjects.mockResolvedValue([project()]);
    api.saveRoom.mockRejectedValue(new Error('offline'));
    await renderRouter('./src/app', { initialUrl: '/projects/save' });
    await fireEvent.press(await screen.findByText('Salon boyası'));
    await fireEvent.press(screen.getByText('Projeye kaydet', { exact: true }));
    expect(await screen.findByText('Kaydedilemedi: offline')).toBeTruthy();
    expect(getPendingRoom()).not.toBeNull();
  });
});
