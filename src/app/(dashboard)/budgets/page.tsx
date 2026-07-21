import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { BudgetList } from "@/features/budgets/budget-list";
import { budgets } from "@/services/mock-data";

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Presupuestos"
        description="Controla tus gastos por categoría"
        action={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo presupuesto
          </Button>
        }
      />
      <BudgetList budgets={budgets} />
    </div>
  );
}
