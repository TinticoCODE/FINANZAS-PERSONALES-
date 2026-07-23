"use client";

import { motion } from "framer-motion";
import { CalendarDays, PiggyBank, TrendingDown, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BudgetProgressBar } from "@/features/budgets/budget-progress-bar";
import {
  getBudgetTotals,
  getSemaphoreTextClass,
  type BudgetMonthContext,
} from "@/features/budgets/budget-analytics";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BudgetData } from "@/types";

type BudgetSummaryProps = {
  budgets: BudgetData[];
  monthContext: BudgetMonthContext;
  monthLabel: string;
};

export function BudgetSummary({
  budgets,
  monthContext,
  monthLabel,
}: BudgetSummaryProps) {
  const { totalBudgeted, totalSpent, totalRemaining, globalPercent } =
    getBudgetTotals(budgets);
  const percentClass = getSemaphoreTextClass(globalPercent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="h-1 bg-gradient-to-r from-indigo-500/80 via-violet-500/60 to-fuchsia-500/40" />
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Consolidado del mes</CardTitle>
              <CardDescription className="capitalize">{monthLabel}</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>
                Día {monthContext.dayOfMonth} de {monthContext.daysInMonth} ·{" "}
                {monthContext.daysLeftInMonth}{" "}
                {monthContext.daysLeftInMonth === 1 ? "día restante" : "días restantes"}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <PiggyBank className="h-3.5 w-3.5" />
                Total presupuestado
              </div>
              <p className="text-2xl font-semibold tracking-tight">
                {formatCurrency(totalBudgeted)}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingDown className="h-3.5 w-3.5" />
                Total gastado
              </div>
              <p className={cn("text-2xl font-semibold tracking-tight", percentClass)}>
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" />
                Restante global
              </div>
              <p
                className={cn(
                  "text-2xl font-semibold tracking-tight",
                  totalRemaining < 0 ? "text-red-500" : "text-emerald-500"
                )}
              >
                {formatCurrency(totalRemaining)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uso global del presupuesto</span>
              <span className={cn("font-medium tabular-nums", percentClass)}>
                {formatPercent(globalPercent)}
              </span>
            </div>
            <BudgetProgressBar value={globalPercent} trackClassName="h-3" />
            <p className="text-xs text-muted-foreground">
              {formatPercent(monthContext.monthElapsedPercent, 0)} del mes transcurrido
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
