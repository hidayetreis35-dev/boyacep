import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Sends a crash report for signed-in users. Never throws: reporting must not
 * cause a second error. Messages are trimmed to the database limits.
 */
export async function reportError(error: unknown, screen = ''): Promise<void> {
  try {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const err = error instanceof Error ? error : new Error(String(error));
    const platform = Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web' ? Platform.OS : '';
    await supabase.from('client_errors').insert({
      message: (err.message || err.name || 'Bilinmeyen hata').slice(0, 500),
      stack: (err.stack ?? '').slice(0, 4000),
      screen: screen.slice(0, 200),
      platform,
      app_version: (Constants.expoConfig?.version ?? '').slice(0, 40),
    });
  } catch {
    // Offline or blocked: nothing else to do.
  }
}
