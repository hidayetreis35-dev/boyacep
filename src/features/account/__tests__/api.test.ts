import { authErrorMessage, isValidEmail } from '@/features/account/api';

describe('isValidEmail', () => {
  it.each(['ayse@example.com', ' Ayse.Yilmaz@mail.com.tr '])('accepts %s', (e) => expect(isValidEmail(e)).toBe(true));
  it.each(['', 'ayse', 'ayse@', 'ayse@example', 'a b@example.com'])('rejects %s', (e) => expect(isValidEmail(e)).toBe(false));
});

describe('authErrorMessage', () => {
  it.each([
    ['Token has expired or is invalid', 'Kod hatalı veya süresi dolmuş. Yeni kod isteyin.'],
    ['Email rate limit exceeded', 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.'],
    ['Failed to fetch', 'İnternet bağlantısı yok gibi görünüyor.'],
    ['something else', 'Bir sorun oluştu. Lütfen tekrar deneyin.'],
  ])('maps "%s"', (input, expected) => expect(authErrorMessage(input)).toBe(expected));
});
