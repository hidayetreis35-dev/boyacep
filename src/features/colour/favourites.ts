import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'boyacep.colours.favourites.v1';
const MAX = 60;

/** Favourite colour codes, kept on the device. */
export function useFavourites() {
  const [list, setList] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (alive && Array.isArray(parsed)) setList(parsed.filter((x): x is string => typeof x === 'string' && /^#[0-9A-F]{6}$/.test(x)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const toggle = useCallback((hex: string) => {
    setList((current) => {
      const next = current.includes(hex) ? current.filter((h) => h !== hex) : [hex, ...current].slice(0, MAX);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { list, isFavourite: (hex: string) => list.includes(hex), toggle };
}
