import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { deviceLocale } from './device';
import { isLocale, setCurrentLocale, type Locale } from './index';

const STORAGE_KEY = 'boyacep.locale.v1';

type LocaleState = { locale: Locale; ready: boolean; setLocale: (locale: Locale) => void };

const LocaleContext = createContext<LocaleState>({ locale: 'tr', ready: true, setLocale: () => {} });

export function useLocale(): LocaleState {
  return useContext(LocaleContext);
}

/**
 * Starts in the saved language, or the phone's, and re-renders the whole app
 * when the user switches, so every t() call picks up the new language.
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

  const setLocale = useCallback((next: Locale) => {
    setCurrentLocale(next);
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ locale, ready, setLocale }), [locale, ready, setLocale]);
  return (
    <LocaleContext.Provider value={value}>
      <Fragment key={locale}>{children}</Fragment>
    </LocaleContext.Provider>
  );
}
