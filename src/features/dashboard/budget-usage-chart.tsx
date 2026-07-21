"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBudgetStatus, budgetStatusColors } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { BudgetData } from "@/types";
import { cn } from "@/lib/utils";

type BudgetUsageChartProps = {
  data: BudgetData[];
};

export function BudgetUsageChart({ data }: BudgetUsageChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.4 }}
    >
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Presupuesto utilizado</CardTitle>
          <CardDescription>Progreso por categoría</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {data.map((budget, index) => {
            const percent = (budget.spent / budget.budget) * 100;
            const status = getBudgetStatus(percent);

            return (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{budget.category}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.budget)}
                  </span>
                </div>
                <div className="relative">
                  <Progress value={Math.min(percent, 100)} className="h-2" />
                  <div
                    className={cn(
                      "absolute inset-0 h-2 rounded-full opacity-80",
                      budgetStatusColors[status]
                    )}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPercent(percent)} utilizado
                </p>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
