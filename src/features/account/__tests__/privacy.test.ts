import { exportFileName, isDeleteConfirmed } from '@/features/account/privacy';

describe('account privacy helpers', () => {
  it('accepts the Turkish confirmation word in any case', () => {
    expect(isDeleteConfirmed('SİL')).toBe(true);
    expect(isDeleteConfirmed(' sil ')).toBe(true);
    expect(isDeleteConfirmed('SIL')).toBe(false);
    expect(isDeleteConfirmed('')).toBe(false);
  });

  it('names the export by date', () => {
    expect(exportFileName(new Date('2026-10-25T12:00:00Z'))).toBe('boyacep-verilerim-2026-10-25.json');
  });
});
