import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

import { useSession } from "@/features/account/session";

const KEY = "boyacep.colours.favourites.v1";
const MAX = 60;
/** Where favourites live in the account: the user's own metadata, so they follow a new phone. */
export const ACCOUNT_KEY = "favourite_colours";

const HEX = /^#[0-9A-F]{6}$/;

/** Valid colour codes only, no repeats, at most MAX. */
export function cleanFavourites(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((x): x is string => typeof x === "string" && HEX.test(x)),
    ),
  ].slice(0, MAX);
}

/** This phone's list first, then the ones only the account has (picked on another phone). */
export function mergeFavourites(local: string[], account: string[]): string[] {
  return cleanFavourites([...local, ...account]);
}

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** Favourite colour codes, kept on the device and, when signed in, in the account. */
export function useFavourites() {
  const { db, session } = useSession();
  const [list, setList] = useState<string[]>([]);
  const accountList = cleanFavourites(
    session?.user.user_metadata?.[ACCOUNT_KEY],
  );
  const accountKey = accountList.join();
  const synced = useRef<string | null>(null);
  const loaded = useRef<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    // Read the phone's list once; later runs (the account changed) merge into what is on screen,
    // so a removal that is still being written is not read back.
    const read = loaded.current
      ? Promise.resolve(loaded.current)
      : AsyncStorage.getItem(KEY)
          .then((raw) => cleanFavourites(raw ? JSON.parse(raw) : []))
          .catch(() => [] as string[]);
    read.then((local) => {
      if (!alive) return;
      const account = accountKey ? accountKey.split(",") : [];
      const merged = mergeFavourites(local, account);
      loaded.current = merged;
      setList(merged);
      if (!sameList(merged, local))
        AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => {});
      // Push this phone's favourites to the account once per sign-in, if the account is missing some.
      const userId = session?.user.id ?? null;
      if (
        db &&
        userId &&
        synced.current !== userId &&
        !sameList(merged, account)
      ) {
        synced.current = userId;
        db.auth.updateUser({ data: { [ACCOUNT_KEY]: merged } }).catch(() => {});
      }
    });
    return () => {
      alive = false;
    };
  }, [db, session?.user.id, accountKey]);

  const toggle = useCallback(
    (hex: string) => {
      setList((current) => {
        const next = current.includes(hex)
          ? current.filter((h) => h !== hex)
          : [hex, ...current].slice(0, MAX);
        loaded.current = next;
        AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        // Saving to the account is best effort: the phone keeps the list either way.
        if (db && session)
          db.auth.updateUser({ data: { [ACCOUNT_KEY]: next } }).catch(() => {});
        return next;
      });
    },
    [db, session],
  );

  return { list, isFavourite: (hex: string) => list.includes(hex), toggle };
}
