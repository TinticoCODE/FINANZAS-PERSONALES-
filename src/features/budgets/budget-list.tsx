"use client";

import { motion } from "framer-motion";
import { Gauge, Rabbit, Trash2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BudgetProgressBar } from "@/features/budgets/budget-progress-bar";
import {
  getBudgetPacing,
  getSafeDailySpend,
  getSemaphoreTextClass,
  type BudgetMonthContext,
} from "@/features/budgets/budget-analytics";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BudgetData } from "@/types";

type BudgetListProps = {
  budgets: BudgetData[];
  monthContext: BudgetMonthContext;
  onDelete?: (id: string) => void;
  deleting?: boolean;
};

function PacingBadge({ pacing }: { pacing: ReturnType<typeof getBudgetPacing> }) {
  if (pacing === "ahead") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-red-500/60 bg-red-500/10 text-red-500 dark:text-red-400"
      >
        <Rabbit className="h-3 w-3" />
        Adelantado
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    >
      <Gauge className="h-3 w-3" />
      En ritmo
    </Badge>
  );
}

export function BudgetList({
  budgets,
  monthContext,
  onDelete,
  deleting,
}: BudgetListProps) {
  const { daysLeftInMonth, monthElapsedPercent } = monthContext;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {budgets.map((budget, index) => {
        const percent =
          budget.budget > 0 ? (budget.spent / budget.budget) * 100 : 0;
        const available = budget.budget - budget.spent;
        const safeDaily = getSafeDailySpend(available, daysLeftInMonth);
        const pacing = getBudgetPacing(percent, monthElapsedPercent);
        const percentClass = getSemaphoreTextClass(percent);

        return (
          <motion.div
            key={budget.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ y: -2 }}
          >
            <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: budget.categoryColor }}
                    />
                    <CardTitle className="truncate text-base">
                      {budget.category}
                    </CardTitle>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <PacingBadge pacing={pacing} />
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={deleting}
                        onClick={() => onDelete(budget.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Presupuesto</p>
                    <p className="font-semibold">{formatCurrency(budget.budget)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Gastado</p>
                    <p className={cn("font-semibold", percentClass)}>
                      {formatCurrency(budget.spent)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Disponible</p>
                    <p
                      className={cn(
                        "font-semibold",
                        available < 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {formatCurrency(available)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <BudgetProgressBar value={percent} />
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {formatPercent(percent)} utilizado
                    </span>
                    {pacing === "ahead" && (
                      <span className="flex items-center gap-1 text-red-500">
                        <TrendingUp className="h-3 w-3" />
                        +{formatPercent(percent - monthElapsedPercent, 0)} vs mes
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Gasto seguro diario</p>
                  <p className="text-lg font-semibold tracking-tight">
                    {available > 0 ? (
                      <>
                        {formatCurrency(safeDaily)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          / día · {daysLeftInMonth}d restantes
                        </span>
                      </>
                    ) : (
                      <span className="text-red-500">Presupuesto agotado</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
