import { authErrorMessage, isValidEmail, retryAfterSeconds, sendEmailCode, TooSoonError } from '@/features/account/api';
import type { DbClient } from '@/lib/supabase';

describe('isValidEmail', () => {
  it.each(['ayse@example.com', ' Ayse.Yilmaz@mail.com.tr '])('accepts %s', (e) => expect(isValidEmail(e)).toBe(true));
  it.each(['', 'ayse', 'ayse@', 'ayse@example', 'a b@example.com'])('rejects %s', (e) => expect(isValidEmail(e)).toBe(false));
});

describe('authErrorMessage', () => {
  it.each([
    ['Token has expired or is invalid', 'Bu kod çalışmadı ya da süresi geçti. Yeni bir kod ister misin?'],
    ['Email rate limit exceeded', 'Şu an çok fazla giriş e-postası gönderildi. Biraz sonra tekrar dene; daha önce gelen e-postayı da kullanabilirsin.'],
    ['Request rate limit reached', 'Çok fazla deneme oldu. Birkaç dakika sonra tekrar dener misin?'],
    ['For security purposes, you can only request this after 37 seconds.', 'Güvenlik için yeni e-postayı 37 saniye sonra isteyebilirsin.'],
    ['Unable to validate email address: invalid format', 'Geçerli bir e-posta adresi yazın.'],
    ['Failed to fetch', 'İnternet bağlantısı yok gibi görünüyor.'],
    ['something else', 'Bir şeyler ters gitti. Bir daha dener misin?'],
  ])('maps "%s"', (input, expected) => expect(authErrorMessage(input)).toBe(expected));
});

describe('sendEmailCode', () => {
  const db = (message: string | null) =>
    ({ auth: { signInWithOtp: jest.fn(async () => ({ error: message ? { message } : null })) } }) as unknown as DbClient;

  it('reads the wait time Supabase asks for', async () => {
    expect(retryAfterSeconds('you can only request this after 1 second')).toBe(1);
    expect(retryAfterSeconds('Email rate limit exceeded')).toBeNull();
    const error = await sendEmailCode(db('For security purposes, you can only request this after 42 seconds.'), 'a@b.co').catch((e) => e);
    expect(error).toBeInstanceOf(TooSoonError);
    expect(error.seconds).toBe(42);
  });

  it('throws a plain error for other failures', async () => {
    const error = await sendEmailCode(db('Failed to fetch'), 'a@b.co').catch((e) => e);
    expect(error).not.toBeInstanceOf(TooSoonError);
    expect(error.message).toBe('İnternet bağlantısı yok gibi görünüyor.');
  });
});
