import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';
import type { PickedPhoto } from '@/features/photos/picker';

import { addExpense, deleteExpense, listExpenses, type ExpenseDraft, type ExpenseWithReceipt } from './api';

export const budgetKeys = {
  expenses: (projectId: string) => ['expenses', projectId] as const,
};

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
  const refresh = () => queryClient.invalidateQueries({ queryKey: budgetKeys.expenses(projectId) });
  return {
    add: useMutation({
      mutationFn: (args: { draft: ExpenseDraft; receipt: PickedPhoto | null }) =>
        addExpense(db!, { ownerId: session!.user.id, projectId, ...args }),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (e: ExpenseWithReceipt) => deleteExpense(db!, e), onSuccess: refresh }),
  };
}
