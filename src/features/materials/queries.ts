import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';
import { projectKeys } from '@/features/projects/queries';

import {
  addCost,
  addMaterial,
  deleteCost,
  deleteMaterial,
  listCosts,
  listMaterials,
  setBudget,
  syncFromCalculation,
  updateMaterial,
  type MaterialPatch,
} from './api';
import type { MaterialDraft } from './from-calculation';

function useDb() {
  const { db, session } = useSession();
  return { db, userId: session?.user.id };
}

export function useMaterials(projectId: string) {
  const { db, userId } = useDb();
  return useQuery({
    queryKey: [...projectKeys.one(userId, projectId), 'materials'],
    enabled: !!db && !!userId,
    queryFn: () => listMaterials(db!, projectId),
  });
}

export function useCosts(projectId: string) {
  const { db, userId } = useDb();
  return useQuery({
    queryKey: [...projectKeys.one(userId, projectId), 'costs'],
    enabled: !!db && !!userId,
    queryFn: () => listCosts(db!, projectId),
  });
}

/** Any write here refreshes the project, its materials and its costs. */
function useProjectMutation<T>(projectId: string, fn: (db: NonNullable<ReturnType<typeof useDb>['db']>, arg: T) => Promise<void>) {
  const { db, userId } = useDb();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (arg: T) => fn(db!, arg),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.one(userId, projectId) }),
  });
}

export const useSyncMaterials = (projectId: string) =>
  useProjectMutation<MaterialDraft[]>(projectId, (db, drafts) => syncFromCalculation(db, projectId, drafts));
export const useUpdateMaterial = (projectId: string) =>
  useProjectMutation<{ id: string; patch: MaterialPatch }>(projectId, (db, a) => updateMaterial(db, a.id, a.patch));
export const useAddMaterial = (projectId: string) =>
  useProjectMutation<Parameters<typeof addMaterial>[2]>(projectId, (db, item) => addMaterial(db, projectId, item));
export const useDeleteMaterial = (projectId: string) =>
  useProjectMutation<string>(projectId, (db, id) => deleteMaterial(db, id));
export const useAddCost = (projectId: string) =>
  useProjectMutation<Parameters<typeof addCost>[2]>(projectId, (db, cost) => addCost(db, projectId, cost));
export const useDeleteCost = (projectId: string) => useProjectMutation<string>(projectId, (db, id) => deleteCost(db, id));
export const useSetBudget = (projectId: string) =>
  useProjectMutation<number | null>(projectId, (db, budget) => setBudget(db, projectId, budget));
