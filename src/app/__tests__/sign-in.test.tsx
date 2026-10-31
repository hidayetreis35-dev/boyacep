import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

const mockAuth = {
  getSession: jest.fn(async () => ({ data: { session: null } })),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signInWithOtp: jest.fn(async (): Promise<{ error: { message: string } | null }> => ({ error: null })),
  verifyOtp: jest.fn(async (): Promise<{ error: { message: string } | null }> => ({ error: { message: 'Token has expired or is invalid' } })),
};

jest.mock('@/lib/supabase', () => ({ isBackendConfigured: true, supabase: { get auth() { return mockAuth; } } }));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.setItem('boyacep.roles.v1', JSON.stringify(['homeowner']));
});

async function sendEmail() {
  await renderRouter('./src/app', { initialUrl: '/sign-in' });
  await fireEvent.changeText(await screen.findByTestId('email'), 'ayse@example.com');
  await fireEvent.press(screen.getByText('Giriş e-postası gönder'));
  await screen.findByText('E-postanı kontrol et');
}

describe('Giriş', () => {
  it('waits a minute before another email and explains what to check', async () => {
    await sendEmail();
    expect(mockAuth.signInWithOtp).toHaveBeenCalledTimes(1);
    expect(screen.getByText("60 sn sonra yeniden gönderebilirsin")).toBeTruthy();
    expect(screen.getByText(/Gereksiz \(spam\) klasörüne bak/)).toBeTruthy();
    // The disabled resend button does nothing.
    await fireEvent.press(screen.getByText(/sn sonra yeniden gönderebilirsin/));
    expect(mockAuth.signInWithOtp).toHaveBeenCalledTimes(1);
  });

  it('uses the wait time the server asks for', async () => {
    mockAuth.signInWithOtp.mockResolvedValueOnce({ error: { message: 'For security purposes, you can only request this after 42 seconds.' } });
    await renderRouter('./src/app', { initialUrl: '/sign-in' });
    await fireEvent.changeText(await screen.findByTestId('email'), 'ayse@example.com');
    await fireEvent.press(screen.getByText('Giriş e-postası gönder'));
    expect(await screen.findByText('Güvenlik için yeni e-postayı 42 saniye sonra isteyebilirsin.')).toBeTruthy();
  });

  it('asks for a new email after five wrong codes', async () => {
    await sendEmail();
    await fireEvent.changeText(screen.getByTestId('code'), '123456');
    for (let i = 0; i < 5; i++) {
      await fireEvent.press(screen.getByText('Giriş yap'));
      await screen.findByText('Bu kod çalışmadı ya da süresi geçti. Yeni bir kod ister misin?');
    }
    expect(mockAuth.verifyOtp).toHaveBeenCalledTimes(5);
    await fireEvent.press(screen.getByText('Giriş yap'));
    expect(mockAuth.verifyOtp).toHaveBeenCalledTimes(5);
  });
});

describe('Misafir önizlemesi', () => {
  it('shows guests a sample of their projects, clearly tagged, with a way to sign in', async () => {
    await renderRouter('./src/app', { initialUrl: '/projects' });
    expect(await screen.findByText('Projelerin burada böyle görünecek.')).toBeTruthy();
    expect(screen.getByTestId('sign-in-preview')).toHaveTextContent(/ÖRNEK/);
    expect(screen.getByText('Salon, 18 m²')).toBeTruthy();
    await fireEvent.press(screen.getByText('Giriş yap'));
    expect(screen).toHavePathname('/sign-in');
  });

  it('shows guests a sample home budget instead of a wall', async () => {
    await renderRouter('./src/app', { initialUrl: '/budget' });
    expect(await screen.findByText('Bütçen burada böyle görünecek.')).toBeTruthy();
    expect(screen.getByTestId('sign-in-preview')).toHaveTextContent(/25\.000 ₺/);
    // The sample never poses as the user's real total.
    expect(screen.queryByTestId('home-budget-total')).toBeNull();
  });
});
