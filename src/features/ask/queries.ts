import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';
import type { ConsultationTopic } from '@/lib/database.types';

import { askQuestion, closeConsultation, getConsultation, listConsultations, sendMessage } from './api';

export function useMyQuestions() {
  const { db, session } = useSession();
  return useQuery({
    queryKey: ['ask', 'mine', session?.user.id],
    enabled: !!db && !!session,
    queryFn: () => listConsultations(db!, { onlyMine: session!.user.id }),
  });
}

export function useOpenQuestions(enabled: boolean) {
  const { db } = useSession();
  return useQuery({ queryKey: ['ask', 'open'], enabled: !!db && enabled, queryFn: () => listConsultations(db!, { status: 'open' }) });
}

export function useQuestion(id: string) {
  const { db, session } = useSession();
  return useQuery({ queryKey: ['ask', 'one', id], enabled: !!db && !!session && !!id, queryFn: () => getConsultation(db!, id) });
}

export function useAskActions() {
  const { db } = useSession();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['ask'] });
  return {
    ask: useMutation({
      mutationFn: (args: { topic: ConsultationTopic; subject: string; body: string; projectId?: string | null }) => askQuestion(db!, args),
      onSuccess: refresh,
    }),
    send: useMutation({ mutationFn: (args: { id: string; body: string }) => sendMessage(db!, args.id, args.body), onSuccess: refresh }),
    close: useMutation({ mutationFn: (id: string) => closeConsultation(db!, id), onSuccess: refresh }),
  };
}
