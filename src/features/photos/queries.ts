import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';
import type { PhotoSurface } from '@/lib/database.types';

import { deleteProjectPhoto, getProjectPhoto, listProjectPhotos, saveSurfaces, uploadProjectPhoto, type ProjectPhoto } from './api';
import type { PickedPhoto } from './picker';

export const photoKeys = {
  project: (projectId: string) => ['photos', 'project', projectId] as const,
  one: (photoId: string) => ['photos', 'one', photoId] as const,
};

export function useProjectPhotos(projectId: string) {
  const { db, session } = useSession();
  return useQuery({
    queryKey: photoKeys.project(projectId),
    enabled: !!db && !!session && !!projectId,
    queryFn: () => listProjectPhotos(db!, projectId),
    // Signed links last an hour; refresh well before that.
    staleTime: 30 * 60 * 1000,
  });
}

export function useProjectPhoto(photoId: string | undefined) {
  const { db, session } = useSession();
  return useQuery({
    queryKey: photoKeys.one(photoId ?? ''),
    enabled: !!db && !!session && !!photoId,
    queryFn: () => getProjectPhoto(db!, photoId!),
    staleTime: 30 * 60 * 1000,
  });
}

export function useUploadPhoto(projectId: string) {
  const { db, session } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photo: PickedPhoto) => uploadProjectPhoto(db!, { ownerId: session!.user.id, projectId, photo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: photoKeys.project(projectId) }),
  });
}

export function useDeletePhoto(projectId: string) {
  const { db } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photo: ProjectPhoto) => deleteProjectPhoto(db!, photo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: photoKeys.project(projectId) }),
  });
}

export function useSaveSurfaces(photo: Pick<ProjectPhoto, 'id' | 'project_id'>) {
  const { db } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (surfaces: PhotoSurface[]) => saveSurfaces(db!, photo.id, surfaces),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: photoKeys.one(photo.id) });
      await queryClient.invalidateQueries({ queryKey: photoKeys.project(photo.project_id) });
    },
  });
}
