import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';

import { getMyProProfile, requestVerification, saveProProfile } from './api';
import type { ProRecord } from './form';

export function useMyProProfile() {
  const { db, session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['pro-profile', userId],
    enabled: !!db && !!userId,
    queryFn: () => getMyProProfile(db!, userId!),
  });
}

export function useSaveProProfile() {
  const { db, session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: (record: ProRecord) => saveProProfile(db!, userId!, record),
    onSuccess: (data) => queryClient.setQueryData(['pro-profile', userId], data),
  });
}

export function useRequestVerification() {
  const { db, session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: () => requestVerification(db!, userId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pro-profile', userId] }),
  });
}
