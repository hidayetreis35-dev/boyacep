import type { ProjectRow, ProjectStatus } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

import { FREE_PROJECT_LIMIT } from './limits';
import type { OpeningRecord, RoomRecord, RoomWithOpenings } from './mapping';

function check<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message);
  if (result.data == null) throw new Error('Kayıt bulunamadı.');
  return result.data;
}

export async function listProjects(db: DbClient): Promise<ProjectRow[]> {
  return check(await db.from('projects').select('*').order('updated_at', { ascending: false }));
}

export async function createProject(db: DbClient, title: string): Promise<ProjectRow> {
  const result = await db.from('projects').insert({ title: title.trim() }).select().single();
  if (result.error?.message.includes('project limit')) {
    throw new Error(`Ücretsiz sürümde en fazla ${FREE_PROJECT_LIMIT} proje oluşturabilirsin.`);
  }
  return check(result);
}

export async function getProject(db: DbClient, id: string): Promise<{ project: ProjectRow; rooms: RoomWithOpenings[] }> {
  const project = check(await db.from('projects').select('*').eq('id', id).single());
  const rooms = check(
    await db.from('rooms').select('*').eq('project_id', id).order('sort_order').order('created_at'),
  );
  const openings =
    rooms.length === 0
      ? []
      : check(await db.from('room_openings').select('*').in('room_id', rooms.map((r) => r.id)));
  return {
    project,
    rooms: rooms.map((r) => ({ ...r, openings: openings.filter((o) => o.room_id === r.id) })),
  };
}

export async function updateProject(
  db: DbClient,
  id: string,
  patch: Partial<Pick<ProjectRow, 'title' | 'status' | 'notes' | 'budget'>>,
): Promise<ProjectRow> {
  return check(await db.from('projects').update(patch).eq('id', id).select().single());
}

export async function setProjectStatus(db: DbClient, id: string, status: ProjectStatus): Promise<ProjectRow> {
  return updateProject(db, id, { status });
}

export async function deleteProject(db: DbClient, id: string): Promise<void> {
  const { error } = await db.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Creates or updates a room and replaces its openings.
 * Not atomic: if the openings write fails the room keeps its previous openings
 * deleted, so the caller shows the error and the user saves again.
 */
export async function saveRoom(
  db: DbClient,
  args: { projectId: string; roomId?: string; name: string; room: RoomRecord; openings: OpeningRecord[] },
): Promise<string> {
  const values = { ...args.room, name: args.name.trim(), project_id: args.projectId };
  const saved = args.roomId
    ? check(await db.from('rooms').update(values).eq('id', args.roomId).select('id').single())
    : check(await db.from('rooms').insert(values).select('id').single());

  if (args.roomId) {
    const { error } = await db.from('room_openings').delete().eq('room_id', saved.id);
    if (error) throw new Error(error.message);
  }
  if (args.openings.length > 0) {
    const { error } = await db
      .from('room_openings')
      .insert(args.openings.map((o) => ({ ...o, room_id: saved.id })));
    if (error) throw new Error(error.message);
  }
  return saved.id;
}

export async function deleteRoom(db: DbClient, roomId: string): Promise<void> {
  const { error } = await db.from('rooms').delete().eq('id', roomId);
  if (error) throw new Error(error.message);
}
