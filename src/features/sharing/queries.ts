import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/account/session';

import {
  createInvite,
  getSharedProject,
  listInvites,
  listMembers,
  listSharedProjects,
  redeemInvite,
  removeMember,
  revokeInvite,
  sharingKeys,
} from './api';

export function useProjectSharing(projectId: string) {
  const { db, session } = useSession();
  return useQuery({
    queryKey: sharingKeys.project(projectId),
    enabled: !!db && !!session,
    queryFn: async () => {
      const [invites, members] = await Promise.all([listInvites(db!, projectId), listMembers(db!, projectId)]);
      return { invites, members };
    },
  });
}

export function useSharingActions(projectId: string) {
  const { db } = useSession();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: sharingKeys.project(projectId) });
  return {
    create: useMutation({ mutationFn: () => createInvite(db!, projectId), onSuccess: refresh }),
    revoke: useMutation({ mutationFn: (id: string) => revokeInvite(db!, id), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (userId: string) => removeMember(db!, projectId, userId), onSuccess: refresh }),
  };
}

export function useSharedProjects() {
  const { db, session } = useSession();
  return useQuery({
    queryKey: sharingKeys.shared(session?.user.id),
    enabled: !!db && !!session,
    queryFn: () => listSharedProjects(db!),
  });
}

export function useSharedProject(projectId: string) {
  const { db, session } = useSession();
  return useQuery({
    queryKey: ['shared-project', projectId],
    enabled: !!db && !!session && !!projectId,
    queryFn: () => getSharedProject(db!, projectId),
  });
}

export function useRedeemInvite() {
  const { db, session } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => redeemInvite(db!, code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sharingKeys.shared(session?.user.id) }),
  });
}
