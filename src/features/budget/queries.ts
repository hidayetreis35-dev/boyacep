import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';
import type { PickedPhoto } from '@/features/photos/picker';

import { addExpense, deleteExpense, listAllExpenses, listExpenses, type ExpenseDraft, type ExpenseWithReceipt } from './api';

export const budgetKeys = {
  all: ['expenses'] as const,
  expenses: (projectId: string) => ['expenses', projectId] as const,
  everything: (userId: string | undefined) => ['expenses', 'all', userId] as const,
};

/** All of the user's expenses, for the home-wide budget. */
export function useAllExpenses() {
  const { db, session } = useSession();
  return useQuery({
    queryKey: budgetKeys.everything(session?.user.id),
    enabled: !!db && !!session,
    queryFn: () => listAllExpenses(db!),
  });
}

export function useExpenses(projectId: string) {
  const { db, session } = useSession();
  return useQuery({
    queryKey: budgetKeys.expenses(projectId),
    enabled: !!db && !!session && !!projectId,
    queryFn: () => listExpenses(db!, projectId),
  });
}

export function useExpenseActions(projectId: string) {
  const { db, session } = useSession();
  const queryClient = useQueryClient();
  // Prefix match: refreshes this project's list and the home-wide list.
  const refresh = () => queryClient.invalidateQueries({ queryKey: budgetKeys.all });
  return {
    add: useMutation({
      mutationFn: (args: { draft: ExpenseDraft; receipt: PickedPhoto | null }) =>
        addExpense(db!, { ownerId: session!.user.id, projectId, ...args }),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (e: ExpenseWithReceipt) => deleteExpense(db!, e), onSuccess: refresh }),
  };
}
