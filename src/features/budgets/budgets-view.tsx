"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createBudget, deleteBudget } from "@/actions/finance.actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { BudgetList } from "@/features/budgets/budget-list";
import { EmptyState } from "@/components/shared/empty-state";
import type { BudgetData } from "@/types";

type Option = { id: string; name: string };

type BudgetsViewProps = {
  budgets: BudgetData[];
  categories: Option[];
};

export function BudgetsView({ budgets, categories }: BudgetsViewProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState("");
  const now = new Date();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      await createBudget({
        categoryId,
        amount: Number(formData.get("amount")),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
      setOpen(false);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteBudget(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presupuestos"
        description="Controla tus gastos por categoría este mes"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" className="gap-2" disabled={categories.length === 0} />}>
              <Plus className="h-4 w-4" />
              Nuevo presupuesto
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo presupuesto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto del presupuesto</Label>
                  <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={pending || !categoryId}>
                    {pending ? "Guardando..." : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {budgets.length === 0 ? (
        <EmptyState
          title="Sin presupuestos"
          description="Define presupuestos por categoría para controlar tus gastos mensuales."
          actionLabel="Nuevo presupuesto"
          onAction={() => setOpen(true)}
        />
      ) : (
        <BudgetList budgets={budgets} onDelete={handleDelete} deleting={pending} />
      )}
    </div>
  );
}
