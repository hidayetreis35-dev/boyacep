import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';

import { getMyPlan } from './api';

export function useMyPlan() {
  const { db, session } = useSession();
  return useQuery({ queryKey: ['plan', session?.user.id], enabled: !!db && !!session, queryFn: () => getMyPlan(db!) });
}
