import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { DISTRICTS, provinceByCode, type ProvinceCode } from './provinces';

/**
 * The user's optional city for regional prices. Kept on the device, outside
 * React state, so a language switch (which remounts the screens) keeps it.
 * Nothing here uses location: the user picks or skips.
 */
const KEY = 'boyacep.city.v1';

export interface CityChoice {
  province: ProvinceCode | null;
  district: string | null;
  /** True once the user picked a city or chose to continue without one. */
  answered: boolean;
}

export type CityState = { loading: true } | ({ loading: false } & CityChoice);

const EMPTY: CityChoice = { province: null, district: null, answered: false };

let state: CityState = { loading: true };
let started = false;
const listeners = new Set<() => void>();

function emit(next: CityState) {
  state = next;
  listeners.forEach((l) => l());
}

/** Keeps only a known province and one of its districts. */
export function cleanChoice(raw: unknown): CityChoice {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const r = raw as Record<string, unknown>;
  const province = typeof r.province === 'string' && provinceByCode(r.province) ? r.province : null;
  const district =
    province && typeof r.district === 'string' && (DISTRICTS[province] ?? []).includes(r.district) ? r.district : null;
  return { province, district, answered: r.answered === true || !!province };
}

async function load() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    emit({ loading: false, ...(raw ? cleanChoice(JSON.parse(raw)) : EMPTY) });
  } catch {
    emit({ loading: false, ...EMPTY });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void load();
  }
  return () => listeners.delete(listener);
}

export function useCity(): CityState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

async function save(choice: CityChoice) {
  emit({ loading: false, ...choice });
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(choice));
  } catch {
    // Storage can be unavailable (private browsing); the choice lasts until the app closes.
  }
}

export function chooseCity(province: ProvinceCode | null, district: string | null = null): Promise<void> {
  return save(cleanChoice({ province, district, answered: true }));
}

/** "Şehir seçmeden devam et": stop asking, keep Türkiye-wide prices. */
export function skipCity(): Promise<void> {
  return save({ province: null, district: null, answered: true });
}

/** For tests: forget the loaded state so the next subscriber reads storage again. */
export function resetCityStore() {
  state = { loading: true };
  started = false;
}
