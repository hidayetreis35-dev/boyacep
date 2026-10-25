import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase, type DbClient } from '@/lib/supabase';

import { enableRoles, getAccount, type Account } from './api';
import { readLocalRoles } from './local-role';

interface SessionState {
  /** null when there is no backend configured. */
  db: DbClient | null;
  session: Session | null;
  /** True until the stored session has been read. */
  loading: boolean;
}

const SessionContext = createContext<SessionState>({ db: null, session: null, loading: false });

export function SessionProvider({ children, client = supabase }: { children: ReactNode; client?: DbClient | null }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!client);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!client) return;
    let mounted = true;
    client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Never show one user's cached data to the next.
      if (!next) queryClient.clear();
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [client, queryClient]);

  return <SessionContext.Provider value={{ db: client, session, loading }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}

/** The signed-in user's profile and roles; copies first-launch role choices into the account. */
export function useAccount() {
  const { db, session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['account', userId],
    enabled: !!db && !!userId,
    queryFn: async (): Promise<Account> => {
      const account = await getAccount(db!, userId!);
      const local = await readLocalRoles();
      const missing = (local ?? []).filter((r) => !account.roles.includes(r));
      if (missing.length > 0 || (!account.profile.active_role && local)) {
        await enableRoles(db!, userId!, missing, account.profile.active_role ? undefined : local?.[0]);
        return getAccount(db!, userId!);
      }
      return account;
    },
  });
}
