import { getDaysInMonth } from "date-fns";
import { utcToUserLocal } from "@/utils/dates";

export type BudgetMonthContext = {
  daysLeftInMonth: number;
  daysInMonth: number;
  dayOfMonth: number;
  monthElapsedPercent: number;
};

export type BudgetPacing = "ahead" | "on-track";

export function getBudgetMonthContext(timezone: string): BudgetMonthContext {
  const local = utcToUserLocal(new Date(), timezone);
  const daysInMonth = getDaysInMonth(local);
  const dayOfMonth = local.getDate();
  const daysLeftInMonth = Math.max(daysInMonth - dayOfMonth, 1);
  const monthElapsedPercent = (dayOfMonth / daysInMonth) * 100;

  return { daysLeftInMonth, daysInMonth, dayOfMonth, monthElapsedPercent };
}

/** Semáforo: verde < 50%, amarillo 50–80%, rojo > 80% */
export function getSemaphoreProgressClass(percent: number): string {
  if (percent > 80) return "bg-red-500";
  if (percent >= 50) return "bg-yellow-500";
  return "bg-green-500";
}

export function getSemaphoreTextClass(percent: number): string {
  if (percent > 80) return "text-red-500";
  if (percent >= 50) return "text-yellow-500";
  return "text-green-500";
}

export function getSafeDailySpend(available: number, daysLeftInMonth: number): number {
  if (available <= 0 || daysLeftInMonth <= 0) return 0;
  return available / daysLeftInMonth;
}

export function getBudgetPacing(
  spentPercent: number,
  monthElapsedPercent: number
): BudgetPacing {
  const delta = spentPercent - monthElapsedPercent;
  return delta > 8 ? "ahead" : "on-track";
}

export function getBudgetTotals(budgets: { budget: number; spent: number }[]) {
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budget, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const globalPercent =
    totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  return { totalBudgeted, totalSpent, totalRemaining, globalPercent };
}
