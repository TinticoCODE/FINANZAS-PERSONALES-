"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBudgetStatus, budgetStatusColors } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BudgetData } from "@/types";

type BudgetListProps = {
  budgets: BudgetData[];
};

export function BudgetList({ budgets }: BudgetListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {budgets.map((budget, index) => {
        const percent = (budget.spent / budget.budget) * 100;
        const available = budget.budget - budget.spent;
        const status = getBudgetStatus(percent);
        const isAlert = percent >= 70;

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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{budget.category}</CardTitle>
                  {isAlert && (
                    <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      Alerta
                    </Badge>
                  )}
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
                    <p className="font-semibold">{formatCurrency(budget.spent)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Disponible</p>
                    <p className={cn("font-semibold", available < 0 && "text-red-600")}>
                      {formatCurrency(available)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Progress value={Math.min(percent, 100)} className="h-2.5" />
                    <div
                      className={cn(
                        "absolute inset-0 h-2.5 rounded-full",
                        budgetStatusColors[status]
                      )}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPercent(percent)} del presupuesto utilizado
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
