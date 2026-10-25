import { formatInviteCode, isInviteActive, normaliseInviteCode, redeemErrorMessage, redeemInvite } from '@/features/sharing/api';
import type { DbClient } from '@/lib/supabase';

describe('invite codes', () => {
  it('accepts what people type', () => {
    expect(normaliseInviteCode('boya-2345')).toBe('BOYA2345');
    expect(normaliseInviteCode(' BOYA 2345 ')).toBe('BOYA2345');
  });

  it('rejects impossible codes', () => {
    expect(normaliseInviteCode('BOYA234')).toBeNull();
    expect(normaliseInviteCode('BOYA2340')).toBeNull(); // 0 is never used
    expect(normaliseInviteCode('ÇOYA2345')).toBeNull();
  });

  it('formats for reading aloud', () => {
    expect(formatInviteCode('BOYA2345')).toBe('BOYA-2345');
  });

  it('knows when a code still works', () => {
    const now = new Date('2026-10-25T12:00:00Z');
    const open = { expires_at: '2026-10-30T00:00:00Z', revoked_at: null, uses: 1, max_uses: 3 };
    expect(isInviteActive(open, now)).toBe(true);
    expect(isInviteActive({ ...open, expires_at: '2026-10-20T00:00:00Z' }, now)).toBe(false);
    expect(isInviteActive({ ...open, revoked_at: '2026-10-25T00:00:00Z' }, now)).toBe(false);
    expect(isInviteActive({ ...open, uses: 3 }, now)).toBe(false);
  });

  it('explains redeem errors', () => {
    expect(redeemErrorMessage('only painters can join shared projects')).toMatch(/usta rolünün/);
    expect(redeemErrorMessage('invite not found or expired')).toMatch(/süresi doldu/);
    expect(redeemErrorMessage('invite used up')).toMatch(/sınırı doldu/);
    expect(redeemErrorMessage('too many attempts')).toMatch(/bir saat sonra/i);
  });

  it('treats a code the server does not know as not found', async () => {
    const db = { rpc: jest.fn().mockResolvedValue({ data: null, error: null }) } as unknown as DbClient;
    await expect(redeemInvite(db, 'NOPE2345')).rejects.toThrow(/süresi doldu/);
  });
});
