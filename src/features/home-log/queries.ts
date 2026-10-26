import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';

import { addHomeLog, deleteHomeLog, listHomeLog, type HomeLogDraft } from './api';

const key = (userId: string | undefined) => ['home-log', userId] as const;

export function useHomeLog() {
  const { db, session } = useSession();
  return useQuery({ queryKey: key(session?.user.id), enabled: !!db && !!session, queryFn: () => listHomeLog(db!) });
}

export function useHomeLogActions() {
  const { db, session } = useSession();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: key(session?.user.id) });
  return {
    add: useMutation({ mutationFn: (drafts: HomeLogDraft[]) => addHomeLog(db!, drafts), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => deleteHomeLog(db!, id), onSuccess: refresh }),
  };
}
