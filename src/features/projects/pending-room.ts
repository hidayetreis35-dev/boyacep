import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RoomForm } from '@/features/calculator/form';

/** A room calculated in "Ne Kadar Boya?", waiting to be saved into a project. */
export interface PendingRoom {
  name: string;
  form: RoomForm;
}

// Kept on the device too, so the room survives the sign-in link reloading the app.
const KEY = 'boyacep.pending-room.v1';
let pending: PendingRoom | null = null;

export function setPendingRoom(room: PendingRoom): void {
  pending = room;
  AsyncStorage.setItem(KEY, JSON.stringify(room)).catch(() => {});
}

export function getPendingRoom(): PendingRoom | null {
  return pending;
}

export async function loadPendingRoom(): Promise<PendingRoom | null> {
  if (pending) return pending;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    pending = raw ? (JSON.parse(raw) as PendingRoom) : null;
  } catch {
    pending = null;
  }
  return pending;
}

export function clearPendingRoom(): void {
  pending = null;
  AsyncStorage.removeItem(KEY).catch(() => {});
}
