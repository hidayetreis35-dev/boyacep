import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { CHUNK_SIZE, fromChunks, secureSessionStorage, storeKey, toChunks } from '../secure-storage';

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const KEY = 'sb-fjph-auth-token';

beforeEach(async () => {
  store.clear();
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('chunks', () => {
  it('round-trips text with Turkish letters and emoji, every chunk ASCII and small', () => {
    const value = JSON.stringify({ name: 'Ayşe Gökçe 🎨', token: 'x'.repeat(5000) });
    const chunks = toChunks(value);
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(CHUNK_SIZE);
      expect(/^[\x20-\x7e]*$/.test(c)).toBe(true);
    }
    expect(fromChunks(chunks)).toBe(value);
  });

  it('makes keys the secure store accepts', () => {
    expect(storeKey('sb-abc-auth-token')).toBe('sb-abc-auth-token');
    expect(storeKey('a b/c:d')).toBe('a_b_c_d');
  });
});

describe('secureSessionStorage', () => {
  it('keeps the session in the secure store, not in AsyncStorage', async () => {
    const session = JSON.stringify({ access_token: 'a'.repeat(4000), refresh_token: 'r' });
    await secureSessionStorage.setItem(KEY, session);
    expect(await secureSessionStorage.getItem(KEY)).toBe(session);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(store.get(`${KEY}.n`)).toBe(String(toChunks(session).length));
  });

  it('removes leftover chunks when a shorter session is saved', async () => {
    await secureSessionStorage.setItem(KEY, 'a'.repeat(5000));
    await secureSessionStorage.setItem(KEY, 'short');
    expect(await secureSessionStorage.getItem(KEY)).toBe('short');
    expect([...store.keys()].sort()).toEqual([`${KEY}.0`, `${KEY}.n`]);
  });

  it('moves a session saved by an older version out of AsyncStorage', async () => {
    await AsyncStorage.setItem(KEY, '{"access_token":"old"}');
    expect(await secureSessionStorage.getItem(KEY)).toBe('{"access_token":"old"}');
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(await secureSessionStorage.getItem(KEY)).toBe('{"access_token":"old"}');
  });

  it('signs out cleanly', async () => {
    await secureSessionStorage.setItem(KEY, 'a'.repeat(5000));
    await AsyncStorage.setItem(KEY, 'stale');
    await secureSessionStorage.removeItem(KEY);
    expect(store.size).toBe(0);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('returns nothing when a chunk is missing', async () => {
    await secureSessionStorage.setItem(KEY, 'a'.repeat(5000));
    store.delete(`${KEY}.1`);
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('falls back to AsyncStorage when the secure store fails', async () => {
    await secureSessionStorage.setItem(KEY, 'old');
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keystore'));
    await secureSessionStorage.setItem(KEY, 'new');
    expect(await AsyncStorage.getItem(KEY)).toBe('new');
    expect(await secureSessionStorage.getItem(KEY)).toBe('new');
  });
});
