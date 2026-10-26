import type { CostGroup, CostSummary } from './cost';
import { round } from './round';

/** Categories of money actually spent ("Akıllı Bütçe"). */
export type ExpenseCategory = 'paint' | 'material' | 'labor' | 'other';

export const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = ['paint', 'material', 'labor', 'other'];

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  paint: 'Boya',
  material: 'Malzeme',
  labor: 'İşçilik',
  other: 'Diğer',
};

/** Which spending category a planned cost group belongs to. */
export const EXPENSE_CATEGORY_OF_GROUP: Record<CostGroup, ExpenseCategory> = {
  paint: 'paint',
  primer: 'material',
  filler: 'material',
  supplies: 'material',
  labor: 'labor',
  transport: 'other',
  other: 'other',
};

export interface Expense {
  category: ExpenseCategory;
  amount: number;
}

export interface BudgetLine {
  category: ExpenseCategory;
  /** From the material list and costs. */
  planned: number;
  spent: number;
}

export type BudgetStatus = 'no-budget' | 'on-track' | 'near-limit' | 'over';

export interface BudgetSummary {
  lines: BudgetLine[];
  planned: number;
  spent: number;
  budget: number | null;
  /** Budget minus spent; null without a budget. Negative means over budget. */
  left: number | null;
  /**
   * Expected final cost: per category, what was spent or what is still planned,
   * whichever is larger. A category already over its plan does not get cheaper.
   */
  forecast: number;
  /** Spent as a share of the budget, 0..1+; null without a budget. */
  usedShare: number | null;
  status: BudgetStatus;
  /** True when the forecast is above the budget while spending is still within it. */
  forecastOver: boolean;
  /** Planned lines with no price yet; the plan is incomplete while above 0. */
  missingPrices: number;
}

/** Share of the budget at which the summary warns that the limit is near. */
export const NEAR_LIMIT_SHARE = 0.9;

export function summarizeBudget(plan: CostSummary, expenses: Expense[], budget: number | null): BudgetSummary {
  const planned = new Map<ExpenseCategory, number>(EXPENSE_CATEGORY_ORDER.map((c) => [c, 0]));
  const spent = new Map<ExpenseCategory, number>(EXPENSE_CATEGORY_ORDER.map((c) => [c, 0]));
  for (const g of plan.groups) {
    const c = EXPENSE_CATEGORY_OF_GROUP[g.group];
    planned.set(c, planned.get(c)! + g.total);
  }
  for (const e of expenses) spent.set(e.category, spent.get(e.category)! + e.amount);

  const lines = EXPENSE_CATEGORY_ORDER.map((category) => ({
    category,
    planned: round(planned.get(category)!),
    spent: round(spent.get(category)!),
  }));
  const spentTotal = round(lines.reduce((s, l) => s + l.spent, 0));
  const forecast = round(lines.reduce((s, l) => s + Math.max(l.planned, l.spent), 0));
  const hasBudget = budget !== null && budget > 0;
  const usedShare = hasBudget ? spentTotal / budget : null;
  const status: BudgetStatus = !hasBudget
    ? 'no-budget'
    : spentTotal > budget
      ? 'over'
      : usedShare! >= NEAR_LIMIT_SHARE
        ? 'near-limit'
        : 'on-track';

  return {
    lines,
    planned: plan.total,
    spent: spentTotal,
    budget: hasBudget ? budget : null,
    left: hasBudget ? round(budget - spentTotal) : null,
    forecast,
    usedShare,
    status,
    forecastOver: hasBudget && status !== 'over' && forecast > budget,
    missingPrices: plan.missingPrices,
  };
}

/** One project's money for the home-wide view ("Ev Bütçem"). */
export interface HomeBudgetProject {
  id: string;
  budget: number | null;
}

export interface HomeBudgetExpense extends Expense {
  projectId: string;
}

export interface HomeBudgetSummary {
  /** Sum of the budgets the user wrote; null when no project has one. */
  budget: number | null;
  spent: number;
  /** Budget minus what was spent in the projects that have a budget; null without a budget. */
  left: number | null;
  /** Spent in budgeted projects as a share of their budgets, 0..1+; null without a budget. */
  usedShare: number | null;
  /** Spending per category, largest first; share is of all spending. */
  categories: { category: ExpenseCategory; amount: number; share: number }[];
  projects: { id: string; budget: number | null; spent: number }[];
}

/**
 * All projects together. Spending in a project without a budget counts towards
 * "spent" but not against any budget, so "left" never mixes the two.
 */
export function summarizeHomeBudget(projects: HomeBudgetProject[], expenses: HomeBudgetExpense[]): HomeBudgetSummary {
  const byProject = new Map(projects.map((p) => [p.id, 0]));
  const byCategory = new Map<ExpenseCategory, number>(EXPENSE_CATEGORY_ORDER.map((c) => [c, 0]));
  for (const e of expenses) {
    if (!byProject.has(e.projectId)) continue;
    byProject.set(e.projectId, byProject.get(e.projectId)! + e.amount);
    byCategory.set(e.category, byCategory.get(e.category)! + e.amount);
  }
  const rows = projects.map((p) => ({
    id: p.id,
    budget: p.budget !== null && p.budget > 0 ? p.budget : null,
    spent: round(byProject.get(p.id)!),
  }));
  const spent = round(rows.reduce((s, r) => s + r.spent, 0));
  const budgeted = rows.filter((r) => r.budget !== null);
  const budget = budgeted.length ? round(budgeted.reduce((s, r) => s + r.budget!, 0)) : null;
  const spentInBudgeted = round(budgeted.reduce((s, r) => s + r.spent, 0));
  const categories = EXPENSE_CATEGORY_ORDER.map((category) => ({ category, amount: round(byCategory.get(category)!) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({ ...c, share: spent > 0 ? c.amount / spent : 0 }));
  return {
    budget,
    spent,
    left: budget === null ? null : round(budget - spentInBudgeted),
    usedShare: budget === null ? null : spentInBudgeted / budget,
    categories,
    projects: rows,
  };
}
