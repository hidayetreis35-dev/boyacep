import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import * as askApi from '@/features/ask/api';

jest.mock('@/lib/supabase', () => ({
  isBackendConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'user-1', email: 'ayse@example.com' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

jest.mock('@/features/ask/api', () => ({
  ...jest.requireActual('@/features/ask/api'),
  listConsultations: jest.fn(),
  getConsultation: jest.fn(),
  askQuestion: jest.fn(),
  sendMessage: jest.fn(async () => {}),
}));
const api = jest.mocked(askApi);

const consultation = {
  id: 'c1',
  user_id: 'user-1',
  project_id: null,
  topic: 'problem' as const,
  subject: 'Banyo tavanında kabarma',
  status: 'answered' as const,
  created_at: '2026-10-25T10:00:00Z',
  updated_at: '2026-10-25T11:00:00Z',
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner']));
  api.listConsultations.mockResolvedValue([]);
});

describe('Ustaya Sor', () => {
  it('checks the question before sending, then opens it', async () => {
    api.askQuestion.mockResolvedValue({ ...consultation, status: 'open' });
    api.getConsultation.mockResolvedValue({ consultation: { ...consultation, status: 'open' }, messages: [] });
    await renderRouter('./src/app', { initialUrl: '/ask' });
    await fireEvent.press(await screen.findByText('Soru sor'));
    await fireEvent.press(screen.getByText('Gönder'));
    expect(screen.getByText('Kısaca konuyu yaz (en az 3 harf).')).toBeTruthy();
    expect(api.askQuestion).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('ask-subject'), 'Banyo tavanında kabarma');
    await fireEvent.changeText(screen.getByTestId('ask-body'), 'Tavan boyası iki ayda kabardı, ne yapmalıyım?');
    await fireEvent.press(screen.getByText('Gönder'));
    await waitFor(() => expect(screen).toHavePathname('/ask/c1'));
    expect(api.askQuestion).toHaveBeenCalledWith(expect.anything(), {
      topic: 'problem',
      subject: 'Banyo tavanında kabarma',
      body: 'Tavan boyası iki ayda kabardı, ne yapmalıyım?',
    });
  });

  it('shows team answers and sends a follow-up', async () => {
    api.getConsultation.mockResolvedValue({
      consultation,
      messages: [
        { id: 'm1', consultation_id: 'c1', author_id: 'user-1', from_team: false, body: 'Tavan kabardı.', created_at: '2026-10-25T10:00:00Z' },
        { id: 'm2', consultation_id: 'c1', author_id: 'team', from_team: true, body: 'Aspiratör var mı?', created_at: '2026-10-25T11:00:00Z' },
      ],
    });
    await renderRouter('./src/app', { initialUrl: '/ask/c1' });
    expect(await screen.findByText('Aspiratör var mı?')).toBeTruthy();
    expect(screen.getByText(/BoyaCep ekibi/)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('ask-reply'), 'Yok, penceresi de küçük.');
    await fireEvent.press(screen.getByText('Gönder'));
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledWith(expect.anything(), 'c1', 'Yok, penceresi de küçük.'));
  });
});
