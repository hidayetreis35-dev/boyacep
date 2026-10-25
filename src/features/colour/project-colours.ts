import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';
import type { ProjectColourRow } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

export async function listProjectColours(db: DbClient, projectId: string): Promise<ProjectColourRow[]> {
  const { data, error } = await db.from('project_colours').select('*').eq('project_id', projectId).order('created_at');
  if (error) throw new Error(error.message);
  return data;
}

export function projectColourError(message: string): string {
  if (message.includes('duplicate') || message.includes('unique')) return 'Bu renk projede zaten kayıtlı.';
  if (message.includes('limit')) return 'Bir projeye en fazla 24 renk kaydedebilirsin.';
  return 'Renk kaydedilemedi. İnternet bağlantını kontrol et.';
}

export async function addProjectColour(
  db: DbClient,
  colour: { project_id: string; hex: string; name: string; surface?: string | null },
): Promise<void> {
  const { error } = await db.from('project_colours').insert(colour);
  if (error) throw new Error(projectColourError(error.message));
}

export async function removeProjectColour(db: DbClient, id: string): Promise<void> {
  const { error } = await db.from('project_colours').delete().eq('id', id);
  if (error) throw new Error('Renk silinemedi. İnternet bağlantını kontrol et.');
}

const key = (projectId: string) => ['project-colours', projectId] as const;

export function useProjectColours(projectId: string) {
  const { db, session } = useSession();
  return useQuery({ queryKey: key(projectId), enabled: !!db && !!session && !!projectId, queryFn: () => listProjectColours(db!, projectId) });
}

export function useProjectColourActions() {
  const { db } = useSession();
  const queryClient = useQueryClient();
  const refresh = (projectId: string) => queryClient.invalidateQueries({ queryKey: key(projectId) });
  return {
    add: useMutation({
      mutationFn: (c: { project_id: string; hex: string; name: string; surface?: string | null }) => addProjectColour(db!, c),
      onSuccess: (_d, c) => refresh(c.project_id),
    }),
    remove: useMutation({
      mutationFn: (c: { id: string; project_id: string }) => removeProjectColour(db!, c.id),
      onSuccess: (_d, c) => refresh(c.project_id),
    }),
  };
}
