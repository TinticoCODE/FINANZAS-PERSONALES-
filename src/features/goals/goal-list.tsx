"use client";

import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { SavingsGoalData } from "@/types";

type GoalListProps = {
  goals: SavingsGoalData[];
};

export function GoalList({ goals }: GoalListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {goals.map((goal, index) => {
        const percent = (goal.savedAmount / goal.targetAmount) * 100;
        const remaining = goal.targetAmount - goal.savedAmount;

        return (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
          >
            <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                  >
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{goal.name}</CardTitle>
                    {goal.targetDate && (
                      <CardDescription>
                        Meta:{" "}
                        {new Date(goal.targetDate).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium">{formatPercent(percent)}</span>
                  </div>
                  <Progress value={percent} className="h-2.5" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Meta</p>
                    <p className="font-semibold">{formatCurrency(goal.targetAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ahorrado</p>
                    <p className="font-semibold text-emerald-600">
                      <AnimatedCounter value={goal.savedAmount} />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Faltan</p>
                    <p className="font-semibold">{formatCurrency(remaining)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
