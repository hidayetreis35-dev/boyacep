import { summarizeCost, type CostSummary } from '@/engine';
import type { ProjectCostRow, ProjectMaterialRow } from '@/lib/database.types';

/** The plan from the project's material list and extra costs (numeric columns arrive as strings). */
export function costSummaryFromRows(materials: ProjectMaterialRow[], costs: ProjectCostRow[], budget: number | null): CostSummary {
  return summarizeCost(
    materials.map((m) => ({
      category: m.category,
      quantity: Number(m.quantity),
      unitPrice: m.unit_price === null ? null : Number(m.unit_price),
      priceSource: m.price_source,
    })),
    costs.map((c) => ({ kind: c.kind, amount: Number(c.amount), priceSource: c.price_source })),
    budget,
  );
}
