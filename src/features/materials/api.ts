import type { ProjectCostRow, ProjectMaterialRow } from '@/lib/database.types';
import type { DbClient } from '@/lib/supabase';

import { carryOverPrices, type MaterialDraft } from './from-calculation';

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listMaterials(db: DbClient, projectId: string): Promise<ProjectMaterialRow[]> {
  const { data, error } = await db
    .from('project_materials')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')
    .order('created_at');
  fail(error);
  return data ?? [];
}

export async function listCosts(db: DbClient, projectId: string): Promise<ProjectCostRow[]> {
  const { data, error } = await db.from('project_costs').select('*').eq('project_id', projectId).order('created_at');
  fail(error);
  return data ?? [];
}

/** Replaces rows created from the calculation, keeping user-added rows and known prices. */
export async function syncFromCalculation(db: DbClient, projectId: string, drafts: MaterialDraft[]): Promise<void> {
  const existing = await listMaterials(db, projectId);
  const previous = existing.filter((m) => m.from_calculation);
  const rows = carryOverPrices(drafts, previous).map((d, i) => ({
    ...d,
    project_id: projectId,
    from_calculation: true,
    sort_order: i,
  }));

  if (previous.length > 0) {
    const { error } = await db.from('project_materials').delete().in('id', previous.map((m) => m.id));
    fail(error);
  }
  if (rows.length > 0) {
    const { error } = await db.from('project_materials').insert(rows);
    fail(error);
  }
}

export type MaterialPatch = Partial<
  Pick<ProjectMaterialRow, 'name' | 'quantity' | 'unit' | 'unit_price' | 'price_source' | 'store_name' | 'note'>
>;

export async function updateMaterial(db: DbClient, id: string, patch: MaterialPatch): Promise<void> {
  const { error } = await db.from('project_materials').update(patch).eq('id', id);
  fail(error);
}

export async function addMaterial(
  db: DbClient,
  projectId: string,
  item: Pick<ProjectMaterialRow, 'category' | 'name' | 'quantity' | 'unit'>,
): Promise<void> {
  const { error } = await db.from('project_materials').insert({ ...item, project_id: projectId, sort_order: 1000 });
  fail(error);
}

export async function deleteMaterial(db: DbClient, id: string): Promise<void> {
  const { error } = await db.from('project_materials').delete().eq('id', id);
  fail(error);
}

export async function addCost(
  db: DbClient,
  projectId: string,
  cost: Pick<ProjectCostRow, 'kind' | 'label' | 'amount' | 'price_source'>,
): Promise<void> {
  const { error } = await db.from('project_costs').insert({ ...cost, project_id: projectId });
  fail(error);
}

export async function deleteCost(db: DbClient, id: string): Promise<void> {
  const { error } = await db.from('project_costs').delete().eq('id', id);
  fail(error);
}

export async function setBudget(db: DbClient, projectId: string, budget: number | null): Promise<void> {
  const { error } = await db.from('projects').update({ budget }).eq('id', projectId);
  fail(error);
}
