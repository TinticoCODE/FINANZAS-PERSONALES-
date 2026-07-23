"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createSavingsGoal, deleteSavingsGoal } from "@/actions/finance.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { GoalList } from "@/features/goals/goal-list";
import { EmptyState } from "@/components/shared/empty-state";
import type { AccountData, SavingsGoalData } from "@/types";

type GoalsViewProps = {
  goals: SavingsGoalData[];
  accounts: AccountData[];
};

export function GoalsView({ goals, accounts }: GoalsViewProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      await createSavingsGoal({
        name: formData.get("name") as string,
        targetAmount: Number(formData.get("targetAmount")),
        savedAmount: Number(formData.get("savedAmount") || 0),
        targetDate: (formData.get("targetDate") as string) || undefined,
      });
      setOpen(false);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteSavingsGoal(id);
      router.refresh();
    });
  };

  const handleContributionSuccess = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas de ahorro"
        description="Define y sigue el progreso de tus objetivos financieros"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" className="gap-2" />}>
              <Plus className="h-4 w-4" />
              Nueva meta
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva meta de ahorro</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" name="name" placeholder="Ej: Vacaciones" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetAmount">Meta</Label>
                    <Input id="targetAmount" name="targetAmount" type="number" min="0" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="savedAmount">Ahorrado inicial</Label>
                    <Input id="savedAmount" name="savedAmount" type="number" min="0" defaultValue="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetDate">Fecha objetivo</Label>
                  <Input id="targetDate" name="targetDate" type="date" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={pending}>
                    {pending ? "Guardando..." : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {goals.length === 0 ? (
        <EmptyState
          title="Sin metas de ahorro"
          description="Crea metas para visualizar tu progreso hacia objetivos importantes."
          actionLabel="Nueva meta"
          onAction={() => setOpen(true)}
        />
      ) : (
        <GoalList
          goals={goals}
          accounts={accounts}
          onDelete={handleDelete}
          onContributionSuccess={handleContributionSuccess}
          deleting={pending}
        />
      )}
    </div>
  );
}
