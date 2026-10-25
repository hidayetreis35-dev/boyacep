import { t } from '@/i18n';
import type { CalculationRow, InspectionPlace, InspectionResultRow } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

import { stableStringify, type SurveyModel } from './model';

export type InspectionRecord = { project_id: string; place: InspectionPlace; symptoms: string[]; location: string | null };

export function inspectionError(message: string): string {
  if (message.includes('limit')) return t('Bir projeye en fazla 30 inceleme kaydedebilirsin. Eskilerden birini sil.');
  return t('İnceleme kaydedilemedi. İnternet bağlantını kontrol et.');
}

export async function listInspections(db: DbClient, projectId: string): Promise<InspectionResultRow[]> {
  const { data, error } = await db.from('inspection_results').select('*').eq('project_id', projectId).order('created_at');
  if (error) throw new Error(error.message);
  return data;
}

export async function addInspection(db: DbClient, record: InspectionRecord): Promise<void> {
  const { error } = await db.from('inspection_results').insert(record);
  if (error) throw new Error(inspectionError(error.message));
}

export async function removeInspection(db: DbClient, id: string): Promise<void> {
  const { error } = await db.from('inspection_results').delete().eq('id', id);
  if (error) throw new Error(t('İnceleme silinemedi. İnternet bağlantını kontrol et.'));
}

/** The newest calculation snapshot of a project, if one was shared. */
export async function latestSnapshot(db: DbClient, projectId: string): Promise<CalculationRow | null> {
  const { data, error } = await db
    .from('calculations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Records what the homeowner shared, so the numbers a painter quoted from can be
 * found again later. Skipped when nothing changed since the last snapshot.
 */
export async function saveSnapshot(db: DbClient, projectId: string, snapshot: NonNullable<SurveyModel['snapshot']>): Promise<boolean> {
  const last = await latestSnapshot(db, projectId);
  if (
    last &&
    last.engine_version === snapshot.engineVersion &&
    stableStringify(last.input) === stableStringify(snapshot.input) &&
    stableStringify(last.result) === stableStringify(snapshot.result)
  ) {
    return false;
  }
  const { error } = await db
    .from('calculations')
    .insert({ project_id: projectId, engine_version: snapshot.engineVersion, input: snapshot.input, result: snapshot.result });
  if (error) throw new Error(error.message);
  return true;
}
