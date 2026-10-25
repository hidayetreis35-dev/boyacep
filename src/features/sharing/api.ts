import { listMaterials } from '@/features/materials/api';
import { getRooms } from '@/features/projects/api';
import type { ProjectInviteRow, ProjectMaterialRow, ProjectMember, SharedProject } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

/** "boya 2345" → "BOYA2345"; null when it cannot be a code. */
export function normaliseInviteCode(input: string): string | null {
  const code = input.replace(/[\s-]/g, '').toUpperCase();
  return /^[A-Z2-9]{8}$/.test(code) ? code : null;
}

/** "BOYA2345" → "BOYA-2345", easier to read out on the phone. */
export const formatInviteCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export function isInviteActive(
  invite: Pick<ProjectInviteRow, 'expires_at' | 'revoked_at' | 'uses' | 'max_uses'>,
  now = new Date(),
): boolean {
  return invite.revoked_at === null && new Date(invite.expires_at) > now && invite.uses < invite.max_uses;
}

export const INVITE_NOT_FOUND = 'Kod bulunamadı ya da süresi doldu. Ev sahibinden yeni bir kod iste.';

export function redeemErrorMessage(message: string): string {
  if (message.includes('only painters')) return 'Paylaşılan projeye katılmak için usta rolünün açık olması gerekir.';
  if (message.includes('not found or expired')) return INVITE_NOT_FOUND;
  if (message.includes('used up')) return 'Bu kodun katılım sınırı doldu. Ev sahibinden yeni bir kod iste.';
  if (message.includes('too many attempts')) return 'Çok fazla yanlış kod denendi. Bir saat sonra tekrar dene.';
  if (message.includes('your own project')) return 'Bu senin kendi projen.';
  return 'Katılınamadı. İnternet bağlantını kontrol et.';
}

export async function listInvites(db: DbClient, projectId: string): Promise<ProjectInviteRow[]> {
  const { data, error } = await db
    .from('project_invites')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createInvite(db: DbClient, projectId: string): Promise<ProjectInviteRow> {
  const { data, error } = await db.from('project_invites').insert({ project_id: projectId }).select('*').single();
  if (error) throw new Error('Paylaşım kodu oluşturulamadı.');
  return data;
}

export async function revokeInvite(db: DbClient, inviteId: string): Promise<void> {
  const { error } = await db.from('project_invites').update({ revoked_at: new Date().toISOString() }).eq('id', inviteId);
  if (error) throw new Error('Kod iptal edilemedi.');
}

export async function listMembers(db: DbClient, projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await db.rpc('project_member_list', { project: projectId });
  if (error) throw new Error(error.message);
  return data;
}

export async function removeMember(db: DbClient, projectId: string, userId: string): Promise<void> {
  const { error } = await db.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
  if (error) throw new Error('Erişim kaldırılamadı.');
}

export async function redeemInvite(db: DbClient, code: string): Promise<string> {
  const { data, error } = await db.rpc('redeem_project_invite', { invite_code: code });
  if (error) throw new Error(redeemErrorMessage(error.message));
  if (!data) throw new Error(INVITE_NOT_FOUND);
  return data;
}

export async function listSharedProjects(db: DbClient): Promise<SharedProject[]> {
  const { data, error } = await db.rpc('shared_projects');
  if (error) throw new Error(error.message);
  return data;
}

/** What a painter sees of a shared project: rooms and the material list (no budget or costs). */
export async function getSharedProject(
  db: DbClient,
  projectId: string,
): Promise<{ rooms: Awaited<ReturnType<typeof getRooms>>; materials: ProjectMaterialRow[] }> {
  const [rooms, materials] = await Promise.all([getRooms(db, projectId), listMaterials(db, projectId)]);
  return { rooms, materials };
}

export const sharingKeys = {
  project: (projectId: string) => ['sharing', projectId] as const,
  shared: (userId?: string) => ['shared-projects', userId] as const,
};

