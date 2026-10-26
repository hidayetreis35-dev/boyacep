import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Session storage for the Supabase client on phones: the sign-in tokens live in
 * the Keychain (iOS) or the Keystore-encrypted store (Android), not in plain
 * AsyncStorage. iOS warns above 2048 bytes per value, so a value is URL-encoded
 * (ASCII only, one byte per character) and split into chunks.
 */
export const CHUNK_SIZE = 1800;

const OPTIONS: SecureStore.SecureStoreOptions = {
  // Lets the token refresh run while the phone is locked after the first unlock.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

/** SecureStore keys allow only letters, digits, ".", "-" and "_". */
export function storeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function toChunks(value: string, size = CHUNK_SIZE): string[] {
  const encoded = encodeURIComponent(value);
  const out: string[] = [];
  for (let i = 0; i < encoded.length; i += size) out.push(encoded.slice(i, i + size));
  return out.length ? out : [''];
}

export function fromChunks(chunks: string[]): string {
  return decodeURIComponent(chunks.join(''));
}

async function count(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(`${key}.n`, OPTIONS);
  const n = raw === null ? 0 : Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

async function removeChunks(key: string, from: number, to: number) {
  for (let i = from; i < to; i++) await SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS);
}

async function write(key: string, value: string) {
  const k = storeKey(key);
  const before = await count(k);
  const chunks = toChunks(value);
  for (let i = 0; i < chunks.length; i++) await SecureStore.setItemAsync(`${k}.${i}`, chunks[i], OPTIONS);
  await SecureStore.setItemAsync(`${k}.n`, String(chunks.length), OPTIONS);
  await removeChunks(k, chunks.length, before);
}

async function read(key: string): Promise<string | null> {
  const k = storeKey(key);
  const n = await count(k);
  if (n === 0) return null;
  const chunks: string[] = [];
  for (let i = 0; i < n; i++) {
    const chunk = await SecureStore.getItemAsync(`${k}.${i}`, OPTIONS);
    if (chunk === null) return null;
    chunks.push(chunk);
  }
  return fromChunks(chunks);
}

async function remove(key: string) {
  const k = storeKey(key);
  await removeChunks(k, 0, await count(k));
  await SecureStore.deleteItemAsync(`${k}.n`, OPTIONS);
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    // An unreadable store (e.g. keys lost after a backup restore) means signing in again.
    const value = await read(key).catch(() => null);
    if (value !== null) return value;
    // Earlier versions kept the session in AsyncStorage: move it once, so nobody is signed out.
    const legacy = await AsyncStorage.getItem(key).catch(() => null);
    if (legacy !== null) {
      try {
        await write(key, legacy);
        await AsyncStorage.removeItem(key);
      } catch {
        // Keep the old copy; the move is tried again on the next start.
      }
    }
    return legacy;
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await write(key, value);
    } catch {
      // A phone whose secure store fails would otherwise never stay signed in. Drop any older
      // secure copy so it is not read back instead of this one.
      await remove(key).catch(() => {});
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    await Promise.allSettled([remove(key), AsyncStorage.removeItem(key)]);
  },
};
