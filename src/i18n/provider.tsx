import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, type Href } from 'expo-router';
import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { deviceLocale } from './device';
import { isLocale, setCurrentLocale, type Locale } from './index';

const STORAGE_KEY = 'boyacep.locale.v1';

type LocaleState = {
  locale: Locale;
  ready: boolean;
  /** Switches the language; returnTo is the screen to show again after the app re-renders. */
  setLocale: (locale: Locale, returnTo?: string) => void;
};

const LocaleContext = createContext<LocaleState>({ locale: 'tr', ready: true, setLocale: () => {} });

export function useLocale(): LocaleState {
  return useContext(LocaleContext);
}

/**
 * Starts in the saved language, or the phone's, and re-renders the whole app
 * when the user switches, so every t() call picks up the new language. The
 * re-render starts navigation over, so the screen the switch was made on is
 * opened again.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setState] = useState<Locale>(() => {
    const initial = deviceLocale();
    setCurrentLocale(initial);
    return initial;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (active && isLocale(saved)) {
          setCurrentLocale(saved);
          setState(saved);
        }
      })
      .catch(() => {})
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  const returnTo = useRef<string | null>(null);
  const setLocale = useCallback((next: Locale, path?: string) => {
    returnTo.current = path ?? null;
    setCurrentLocale(next);
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  // Runs after the re-rendered app has mounted its navigator.
  useEffect(() => {
    const path = returnTo.current;
    returnTo.current = null;
    if (path) router.replace(path as Href);
  }, [locale]);

  const value = useMemo(() => ({ locale, ready, setLocale }), [locale, ready, setLocale]);
  return (
    <LocaleContext.Provider value={value}>
      <Fragment key={locale}>{children}</Fragment>
    </LocaleContext.Provider>
  );
}
