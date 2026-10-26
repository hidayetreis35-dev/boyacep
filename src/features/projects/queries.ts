import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';
import type { ProjectStatus } from '@/lib/database.types';

import { createProject, deleteProject, deleteRoom, getProject, listProjects, saveRoom, setProjectStatus } from './api';
import type { OpeningRecord, RoomRecord } from './mapping';

export const projectKeys = {
  all: (userId?: string) => ['projects', userId] as const,
  one: (userId: string | undefined, id: string) => ['projects', userId, id] as const,
};

function useDb() {
  const { db, session } = useSession();
  return { db, userId: session?.user.id };
}

export function useProjects() {
  const { db, userId } = useDb();
  return useQuery({
    queryKey: projectKeys.all(userId),
    enabled: !!db && !!userId,
    queryFn: () => listProjects(db!),
  });
}

export function useProject(id: string) {
  const { db, userId } = useDb();
  return useQuery({
    queryKey: projectKeys.one(userId, id),
    enabled: !!db && !!userId && !!id,
    queryFn: () => getProject(db!, id),
  });
}

/** Refreshes the list and the one project after any write. */
function useInvalidate() {
  const queryClient = useQueryClient();
  const { userId } = useDb();
  return () => queryClient.invalidateQueries({ queryKey: projectKeys.all(userId) });
}

export function useCreateProject() {
  const { db } = useDb();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (title: string) => createProject(db!, title), onSuccess: invalidate });
}

export function useSetProjectStatus(id: string) {
  const { db } = useDb();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (status: ProjectStatus) => setProjectStatus(db!, id, status), onSuccess: invalidate });
}

export function useDeleteProject() {
  const { db } = useDb();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => deleteProject(db!, id), onSuccess: invalidate });
}

export function useSaveRoom(projectId: string) {
  const { db } = useDb();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (args: { roomId?: string; name: string; room: RoomRecord; openings: OpeningRecord[] }) =>
      saveRoom(db!, { projectId, ...args }),
    onSuccess: invalidate,
  });
}

export function useDeleteRoom() {
  const { db } = useDb();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (roomId: string) => deleteRoom(db!, roomId), onSuccess: invalidate });
}
