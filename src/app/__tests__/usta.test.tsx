import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import * as accountApi from '@/features/account/api';
import * as prosApi from '@/features/pros/api';
import * as quotesApi from '@/features/quotes/api';
import * as sharingApi from '@/features/sharing/api';
import type { QuoteItemRow, QuoteRow } from '@/lib/database.types';

jest.mock('@/lib/supabase', () => ({
  isBackendConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'pro-1', email: 'usta@example.com' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

jest.mock('@/features/account/api', () => ({
  ...jest.requireActual('@/features/account/api'),
  getAccount: jest.fn(),
  enableRoles: jest.fn(async () => {}),
  setActiveRole: jest.fn(async () => {}),
}));
const account = jest.mocked(accountApi);

jest.mock('@/features/pros/api', () => ({
  ...jest.requireActual('@/features/pros/api'),
  getMyProProfile: jest.fn(),
  saveProProfile: jest.fn(),
}));
const pros = jest.mocked(prosApi);

jest.mock('@/features/sharing/api', () => ({
  ...jest.requireActual('@/features/sharing/api'),
  listSharedProjects: jest.fn(),
  redeemInvite: jest.fn(),
}));
const sharing = jest.mocked(sharingApi);

jest.mock('@/features/quotes/api', () => ({
  ...jest.requireActual('@/features/quotes/api'),
  listMyQuotes: jest.fn(),
  getQuote: jest.fn(),
  saveQuote: jest.fn(async () => {}),
  setQuoteStatus: jest.fn(async () => {}),
  respondToQuote: jest.fn(async () => {}),
}));
const quotes = jest.mocked(quotesApi);

function asRoles(roles: ('homeowner' | 'pro')[], id = 'pro-1') {
  account.getAccount.mockResolvedValue({
    profile: { id, display_name: 'Mehmet', active_role: roles[0], updated_at: '1' } as never,
    roles,
  });
}

const quote = (overrides: Partial<QuoteRow> = {}): QuoteRow => ({
  id: 'q1',
  pro_id: 'pro-1',
  project_id: null,
  number: 3,
  title: 'Dükkan boyası',
  customer_name: 'Ali Bey',
  customer_contact: '',
  notes: '',
  vat_rate: 20,
  discount: 0,
  currency: 'TRY',
  valid_until: '2026-11-09',
  status: 'draft',
  sent_at: null,
  responded_at: null,
  created_at: '2026-10-25T10:00:00Z',
  updated_at: '2026-10-25T10:00:00Z',
  ...overrides,
});
const item: QuoteItemRow = {
  id: 'i1',
  quote_id: 'q1',
  kind: 'labor',
  description: 'Duvar işçiliği',
  quantity: 50,
  unit: 'm²',
  unit_price: 100,
  sort_order: 0,
  created_at: '',
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['pro']));
  pros.getMyProProfile.mockResolvedValue(null);
  sharing.listSharedProjects.mockResolvedValue([]);
  quotes.listMyQuotes.mockResolvedValue([]);
});

describe('Usta tab', () => {
  it('offers the painter role to homeowners', async () => {
    asRoles(['homeowner']);
    await renderRouter('./src/app', { initialUrl: '/usta' });
    expect(await screen.findByText('Usta musun?')).toBeTruthy();
    asRoles(['homeowner', 'pro']);
    await fireEvent.press(screen.getByText('Usta rolünü aç'));
    expect(account.enableRoles).toHaveBeenCalledWith(expect.anything(), 'pro-1', ['pro']);
    expect(await screen.findByText('Usta profilini oluştur')).toBeTruthy();
  });

  it('checks the code format before joining, then opens the project', async () => {
    asRoles(['pro']);
    sharing.redeemInvite.mockRejectedValueOnce(new Error('Kod bulunamadı ya da süresi doldu. Ev sahibinden yeni bir kod iste.'));
    await renderRouter('./src/app', { initialUrl: '/usta' });
    await fireEvent.changeText(await screen.findByTestId('invite-code'), 'ABC');
    await fireEvent.press(screen.getByText('Projeye katıl'));
    expect(screen.getByText('Kod 8 karakterdir. Örnek: BOYA-2345')).toBeTruthy();
    expect(sharing.redeemInvite).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('invite-code'), 'boya-2345');
    await fireEvent.press(screen.getByText('Projeye katıl'));
    expect(sharing.redeemInvite).toHaveBeenCalledWith(expect.anything(), 'BOYA2345');
    expect(await screen.findByText(/süresi doldu/)).toBeTruthy();
  });

  it('lists quotes with their status', async () => {
    asRoles(['pro']);
    quotes.listMyQuotes.mockResolvedValue([quote({ status: 'sent' })]);
    await renderRouter('./src/app', { initialUrl: '/usta' });
    expect(await screen.findByText('#3 Dükkan boyası')).toBeTruthy();
    expect(screen.getByText('Gönderildi')).toBeTruthy();
  });
});

describe('Home for painters', () => {
  it('starts painters with what is waiting in Usta Paneli', async () => {
    asRoles(['pro', 'homeowner']);
    sharing.listSharedProjects.mockResolvedValue([{ id: 's1' }, { id: 's2' }] as never);
    quotes.listMyQuotes.mockResolvedValue([quote({ status: 'sent' }), quote({ id: 'q2', status: 'draft' })]);
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('2 paylaşılan proje · 1 teklif yanıt bekliyor')).toBeTruthy();
    await fireEvent.press(screen.getByText('Usta Paneli’ni aç'));
    expect(screen).toHavePathname('/usta');
  });

  it('shows homeowners no painter card', async () => {
    asRoles(['homeowner', 'pro']);
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Merhaba Mehmet')).toBeTruthy();
    expect(screen.queryByText('Usta Paneli’ni aç')).toBeNull();
  });
});

describe('Quote screen', () => {
  it('validates and saves a draft, then marks it sent', async () => {
    asRoles(['pro']);
    quotes.getQuote.mockResolvedValue({ quote: quote(), items: [], pro: null });
    await renderRouter('./src/app', { initialUrl: '/quotes/q1' });
    await fireEvent.press(await screen.findByText('Kaydet ve gönderildi olarak işaretle'));
    expect(screen.getByText('Kırmızı işaretli kalemleri düzelt.')).toBeTruthy();
    expect(quotes.saveQuote).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Açıklama'), 'Duvar işçiliği');
    await fireEvent.changeText(screen.getByLabelText('Miktar'), '50');
    await fireEvent.changeText(screen.getByLabelText('Birim fiyat'), '100');
    expect(screen.getByText('6.000,00 ₺')).toBeTruthy();
    await fireEvent.press(screen.getByText('Kaydet ve gönderildi olarak işaretle'));
    await waitFor(() => expect(quotes.setQuoteStatus).toHaveBeenCalledWith(expect.anything(), 'q1', 'sent'));
    expect(quotes.saveQuote).toHaveBeenCalledWith(
      expect.anything(),
      'q1',
      expect.objectContaining({ title: 'Dükkan boyası', vat_rate: 20 }),
      [{ kind: 'labor', description: 'Duvar işçiliği', quantity: 50, unit: 'm²', unit_price: 100, sort_order: 0 }],
    );
  });

  it('lets the homeowner accept a sent quote after confirming', async () => {
    asRoles(['homeowner'], 'owner-1');
    quotes.getQuote.mockResolvedValue({
      quote: quote({ pro_id: 'another-pro', status: 'sent', project_id: 'p1', sent_at: '2026-10-25T11:00:00Z' }),
      items: [item],
      pro: null,
    });
    await renderRouter('./src/app', { initialUrl: '/quotes/q1' });
    expect(await screen.findByText('6.000,00 ₺')).toBeTruthy();
    await fireEvent.press(screen.getByText('Teklifi kabul et'));
    expect(quotes.respondToQuote).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Evet, kabul et'));
    await waitFor(() => expect(quotes.respondToQuote).toHaveBeenCalledWith(expect.anything(), 'q1', true));
  });
});
