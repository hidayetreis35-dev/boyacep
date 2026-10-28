import type { HomeLogRow } from '@/lib/database.types';

/**
 * The web build has no scheduled local notifications: the switch stays
 * hidden and expo-notifications is never loaded. Same API as reminders.ts.
 */
export const careRemindersSupported = false;
export const MAX_CARE_REMINDERS = 0;

export async function careRemindersOn(): Promise<boolean> {
  return false;
}

export async function scheduleCareReminders(_rows: HomeLogRow[], _today: string): Promise<number> {
  return 0;
}

export async function turnOnCareReminders(_rows: HomeLogRow[], _today: string): Promise<'on' | 'denied'> {
  return 'denied';
}

export async function turnOffCareReminders() {}

export function useCareReminderLinks() {}
