import { completeSignIn, parseAuthInput } from '@/features/account/auth-link';
import type { DbClient } from '@/lib/supabase';

const VERIFY = 'https://abc.supabase.co/auth/v1/verify?token=pkce_or_hash123&type=magiclink&redirect_to=exp://192.168.1.5:8081/--/';

describe('parseAuthInput', () => {
  it('reads a 6-8 digit code', () => {
    expect(parseAuthInput(' 123456 ')).toEqual({ kind: 'code', code: '123456' });
  });

  it('reads the link from the email', () => {
    expect(parseAuthInput(VERIFY)).toEqual({ kind: 'verify', tokenHash: 'pkce_or_hash123', type: 'magiclink' });
    expect(parseAuthInput(VERIFY.replace('magiclink', 'signup'))).toMatchObject({ type: 'signup' });
  });

  it('reads the session from the redirect back to the app', () => {
    expect(parseAuthInput('exp://192.168.1.5:8081/--/#access_token=a.b.c&expires_in=3600&refresh_token=r1&type=magiclink')).toEqual({
      kind: 'session',
      accessToken: 'a.b.c',
      refreshToken: 'r1',
    });
  });

  it('turns an expired link into a plain message', () => {
    expect(parseAuthInput('boyacep://#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')).toEqual({
      kind: 'error',
      message: 'Kod hatalı veya süresi dolmuş. Yeni kod isteyin.',
    });
  });

  it.each(['', '12345', 'hello', 'https://example.com/page', 'https://abc.supabase.co/other?token=x'])('ignores %p', (input) =>
    expect(parseAuthInput(input)).toBeNull(),
  );
});

describe('completeSignIn', () => {
  const auth = {
    verifyOtp: jest.fn().mockResolvedValue({ error: null }),
    setSession: jest.fn().mockResolvedValue({ error: null }),
  };
  const db = { auth } as unknown as DbClient;

  beforeEach(() => jest.clearAllMocks());

  it('verifies a code with the email', async () => {
    await completeSignIn(db, ' Ayse@Mail.com ', '123456');
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'ayse@mail.com', token: '123456', type: 'email' });
  });

  it('verifies a pasted email link by its token hash', async () => {
    await completeSignIn(db, 'ayse@mail.com', VERIFY);
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'pkce_or_hash123', type: 'magiclink' });
  });

  it('rejects text that is neither', async () => {
    await expect(completeSignIn(db, 'ayse@mail.com', 'merhaba')).rejects.toThrow('E-postadaki kodu ya da giriş bağlantısını yapıştırın.');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('maps Supabase errors', async () => {
    auth.verifyOtp.mockResolvedValueOnce({ error: { message: 'Token has expired or is invalid' } });
    await expect(completeSignIn(db, 'ayse@mail.com', '123456')).rejects.toThrow('Kod hatalı veya süresi dolmuş.');
  });
});
