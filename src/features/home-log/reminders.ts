import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
// Named: the lint rule cannot see this enum through the namespace import.
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { t } from '@/i18n';
import type { HomeLogRow } from '@/lib/database.types';

import { careDueDates } from './care';

/**
 * Care reminders as local notifications: scheduled on the phone, no server
 * and no push service. Off until the user turns them on.
 */
export const careRemindersSupported = Platform.OS !== 'web';

const KEY = 'boyacep.care-reminders.v1';
const ID_PREFIX = 'care-';
const CHANNEL = 'care';
/** iOS keeps at most 64 pending notifications per app; stay well under it. */
export const MAX_CARE_REMINDERS = 20;
/** Notification taps may only open this screen. */
const LINK = '/home-log';

export async function careRemindersOn(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

async function ensureChannel() {
  // Android 8+ shows nothing without a channel, and Android 13 only asks for permission once one exists.
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: t('Bakım hatırlatmaları'),
    importance: AndroidImportance.DEFAULT,
  });
}

async function cancelCareReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith(ID_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Replaces the scheduled reminders with one per place, at 10:00 on its due day. Returns how many are set. */
export async function scheduleCareReminders(rows: HomeLogRow[], today: string): Promise<number> {
  await cancelCareReminders();
  const due = careDueDates(rows, today).slice(0, MAX_CARE_REMINDERS);
  for (const d of due) {
    const [y, m, day] = d.dueOn.split('-').map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${d.entry.id}`,
      content: {
        title: t('{place}: yenileme zamanı', { place: d.entry.place }),
        body: t('{place} genelde {years} yılda bir boyanır. Bu tahmini bir hatırlatma; duvar iyi duruyorsa bekleyebilirsin.', {
          place: d.entry.place,
          years: d.rule.years,
        }),
        data: { url: LINK },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(y, m - 1, day, 10, 0, 0), channelId: CHANNEL },
    });
  }
  return due.length;
}

/** Asks for permission (only if the phone still lets us ask), then schedules. */
export async function turnOnCareReminders(rows: HomeLogRow[], today: string): Promise<'on' | 'denied'> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (current.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
  if (!granted) return 'denied';
  await AsyncStorage.setItem(KEY, '1');
  await scheduleCareReminders(rows, today);
  return 'on';
}

export async function turnOffCareReminders() {
  await AsyncStorage.setItem(KEY, '0');
  await cancelCareReminders();
}

/** Shows reminders while the app is open, and opens Ev Hafızası when one is tapped. */
export function useCareReminderLinks() {
  useEffect(() => {
    if (!careRemindersSupported) return;
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
      });
      const open = (response: Notifications.NotificationResponse | null) => {
        if (response?.notification.request.content.data?.url !== LINK) return;
        // Cleared so the next app start does not open the screen again.
        Notifications.clearLastNotificationResponse();
        router.push(LINK);
      };
      open(Notifications.getLastNotificationResponse());
      const subscription = Notifications.addNotificationResponseReceivedListener(open);
      return () => subscription.remove();
    } catch {
      // A build without the notifications module: nothing to listen to.
    }
  }, []);
}
