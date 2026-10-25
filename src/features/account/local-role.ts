import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SelectableRole } from './api';

/**
 * The role picked on first launch, before any account exists.
 * Copied to the account's roles after sign-in.
 */
const KEY = 'boyacep.roles.v1';

export async function readLocalRoles(): Promise<SelectableRole[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const roles = parsed.filter((r): r is SelectableRole => r === 'homeowner' || r === 'pro');
    return roles.length > 0 ? roles : null;
  } catch {
    return null;
  }
}

export async function writeLocalRoles(roles: SelectableRole[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(roles));
  } catch {
    // Storage can be unavailable (private browsing); the choice is asked again next time.
  }
}
