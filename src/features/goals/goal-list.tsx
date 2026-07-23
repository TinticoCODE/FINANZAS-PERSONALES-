"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Target, Trash2, Plus, TrendingUp, AlertTriangle } from "lucide-react";
import { contributeToSavingsGoal } from "@/actions/finance.actions";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { formatCurrency, formatPercent } from "@/lib/format";
import { formatUserDate } from "@/utils/dates";
import { useUserTimezone } from "@/contexts/user-timezone-context";
import {
  computeGoalPacing,
  formatPacingSuggestion,
} from "@/domain/goals/goal-pacing";
import { cn } from "@/lib/utils";
import type { AccountData, SavingsGoalData } from "@/types";

type GoalListProps = {
  goals: SavingsGoalData[];
  accounts: AccountData[];
  onDelete?: (id: string) => void;
  onContributionSuccess?: () => void;
  deleting?: boolean;
};

const QUICK_AMOUNTS = [50_000, 100_000, 200_000];

export function GoalList({
  goals,
  accounts,
  onDelete,
  onContributionSuccess,
  deleting,
}: GoalListProps) {
  const timezone = useUserTimezone();
  const [pending, startTransition] = useTransition();
  const [contributionOpen, setContributionOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoalData | null>(null);
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [prefillAmount, setPrefillAmount] = useState<number | null>(null);

  const selectedAccountName =
    accounts.find((a) => a.id === sourceAccountId)?.name ?? "";

  const openContribution = (goal: SavingsGoalData, amount?: number) => {
    setSelectedGoal(goal);
    setSourceAccountId("");
    setPrefillAmount(amount ?? null);
    setContributionOpen(true);
  };

  const handleContributionSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedGoal) return;

    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get("amount"));

    startTransition(async () => {
      const result = await contributeToSavingsGoal({
        goalId: selectedGoal.id,
        amount,
        sourceAccountId,
      });

      if (!result.ok) {
        alert(result.error);
        return;
      }

      setContributionOpen(false);
      setSelectedGoal(null);
      setPrefillAmount(null);
      onContributionSuccess?.();
    });
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal, index) => {
          const pacing = computeGoalPacing(
            goal.targetAmount,
            goal.savedAmount,
            goal.targetDate
          );
          const pacingText = formatPacingSuggestion(pacing, formatCurrency);
          const isComplete = pacing.status === "completed";

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
                      style={{
                        backgroundColor: `${goal.color}20`,
                        color: goal.color,
                      }}
                    >
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{goal.name}</CardTitle>
                      {goal.targetDate && (
                        <CardDescription>
                          Meta:{" "}
                          {formatUserDate(
                            goal.targetDate,
                            "d MMMM yyyy",
                            timezone
                          )}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-end justify-between gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Progreso
                      </span>
                      <span className="text-lg font-bold tabular-nums">
                        {formatPercent(pacing.percent)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(pacing.percent, 100)}
                      className="w-full flex-col gap-0"
                      trackClassName="h-3.5 bg-muted/80 shadow-inner"
                      indicatorClassName={cn(
                        "transition-all duration-500",
                        pacing.progressIndicatorClass
                      )}
                    />
                  </div>

                  {pacingText && (
                    <p
                      className={cn(
                        "flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed",
                        pacing.status === "at_risk" || pacing.status === "overdue"
                          ? "bg-destructive/10 text-destructive"
                          : pacing.status === "behind"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                      )}
                    >
                      {pacing.status === "at_risk" || pacing.status === "overdue" ? (
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      )}
                      {pacingText}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Meta</p>
                      <p className="font-semibold">
                        {formatCurrency(goal.targetAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ahorrado</p>
                      <p className="font-semibold text-emerald-600">
                        <AnimatedCounter value={goal.savedAmount} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Faltan</p>
                      <p className="font-semibold">
                        {formatCurrency(pacing.missingAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    {!isComplete && accounts.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deleting || pending}
                          onClick={() => openContribution(goal)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Aportar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleting || pending}
                          onClick={() => openContribution(goal, 100_000)}
                          className="text-muted-foreground"
                        >
                          +$100.000
                        </Button>
                      </>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleting || pending}
                        onClick={() => onDelete(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={contributionOpen} onOpenChange={setContributionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar aporte</DialogTitle>
          </DialogHeader>
          {selectedGoal && (
            <form onSubmit={handleContributionSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Meta:{" "}
                <span className="font-medium">{selectedGoal.name}</span>
                {" · "}
                Faltan:{" "}
                <span className="font-medium text-amber-600">
                  {formatCurrency(
                    Math.max(
                      selectedGoal.targetAmount - selectedGoal.savedAmount,
                      0
                    )
                  )}
                </span>
              </p>
              <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                El monto se sumará a la meta y se descontará del saldo de la
                cuenta que elijas.
              </p>

              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPrefillAmount(amount)}
                  >
                    {formatCurrency(amount)}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contribution-amount">Monto del aporte</Label>
                <Input
                  id="contribution-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  key={prefillAmount ?? "empty"}
                  defaultValue={prefillAmount ?? undefined}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Cuenta de origen</Label>
                <Select
                  value={sourceAccountId}
                  onValueChange={(v) => setSourceAccountId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <span className="flex-1 truncate text-left">
                      {selectedAccountName || (
                        <span className="text-muted-foreground">
                          ¿De qué cuenta sale el dinero?
                        </span>
                      )}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} · {formatCurrency(account.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={pending || !sourceAccountId}
                >
                  {pending ? "Registrando..." : "Confirmar aporte"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
