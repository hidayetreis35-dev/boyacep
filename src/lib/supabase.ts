import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';
import { secureSessionStorage } from './secure-storage';

export type DbClient = SupabaseClient<Database>;

/**
 * Public project URL and publishable (anon) key. Both are safe in the client:
 * Row Level Security protects the data. The service role key must never be here.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const isBackendConfigured = Boolean(url && key);

function create(): DbClient | null {
  if (!url || !key) return null;
  // Phones keep the session in the secure store. The web has no secure store, so it uses the
  // browser's storage; during static web rendering there is no window, so it stays in memory.
  const storage = Platform.OS !== 'web' ? secureSessionStorage : typeof window === 'undefined' ? undefined : AsyncStorage;
  return createClient<Database>(url, key, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/** null when the app runs without a backend (accounts not set up yet). */
export const supabase = create();

// Refresh tokens only while the app is in the foreground (Supabase guidance for React Native).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
