import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';
import type { QuoteStatus } from '@/lib/database.types';

import {
  createQuote,
  deleteQuote,
  getQuote,
  listMyQuotes,
  listReceivedQuotes,
  quoteKeys,
  respondToQuote,
  saveQuote,
  setQuoteStatus,
} from './api';
import type { ItemRecord, QuoteRecord } from './form';

export function useMyQuotes() {
  const { db, session } = useSession();
  return useQuery({
    queryKey: quoteKeys.mine(session?.user.id),
    enabled: !!db && !!session,
    queryFn: () => listMyQuotes(db!, session!.user.id),
  });
}

export function useReceivedQuotes(projectId: string) {
  const { db, session } = useSession();
  return useQuery({
    queryKey: quoteKeys.received(projectId),
    enabled: !!db && !!session && !!projectId,
    queryFn: () => listReceivedQuotes(db!, projectId),
  });
}

export function useQuote(id: string) {
  const { db, session } = useSession();
  return useQuery({ queryKey: quoteKeys.one(id), enabled: !!db && !!session && !!id, queryFn: () => getQuote(db!, id) });
}

export function useQuoteActions(id: string) {
  const { db } = useSession();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['quotes'] });
  return {
    save: useMutation({
      mutationFn: (args: { quote: QuoteRecord; items: ItemRecord[] }) => saveQuote(db!, id, args.quote, args.items),
      onSuccess: refresh,
    }),
    setStatus: useMutation({ mutationFn: (status: QuoteStatus) => setQuoteStatus(db!, id, status), onSuccess: refresh }),
    remove: useMutation({ mutationFn: () => deleteQuote(db!, id), onSuccess: refresh }),
    respond: useMutation({ mutationFn: (accept: boolean) => respondToQuote(db!, id, accept), onSuccess: refresh }),
  };
}

export function useCreateQuote() {
  const { db } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { title: string; projectId?: string | null }) => createQuote(db!, args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });
}
