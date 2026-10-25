import { exportFileName, isDeleteConfirmed } from '@/features/account/privacy';
import { setCurrentLocale } from '@/i18n';

describe('account privacy helpers', () => {
  it('accepts the Turkish confirmation word in any case', () => {
    expect(isDeleteConfirmed('SİL')).toBe(true);
    expect(isDeleteConfirmed(' sil ')).toBe(true);
    expect(isDeleteConfirmed('SIL')).toBe(false);
    expect(isDeleteConfirmed('')).toBe(false);
  });

  it('accepts the English word in English, and still the Turkish one', () => {
    setCurrentLocale('en');
    try {
      expect(isDeleteConfirmed('DELETE')).toBe(true);
      expect(isDeleteConfirmed(' delete ')).toBe(true);
      expect(isDeleteConfirmed('SİL')).toBe(true);
      expect(isDeleteConfirmed('DELET')).toBe(false);
    } finally {
      setCurrentLocale('tr');
    }
  });

  it('accepts only the Turkish word in Turkish', () => {
    expect(isDeleteConfirmed('DELETE')).toBe(false);
  });

  it('names the export by date', () => {
    expect(exportFileName(new Date('2026-10-25T12:00:00Z'))).toBe('boyacep-verilerim-2026-10-25.json');
  });
});
