import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { GoalList } from "@/features/goals/goal-list";
import { savingsGoals } from "@/services/mock-data";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas de ahorro"
        description="Define y sigue el progreso de tus objetivos financieros"
        action={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva meta
          </Button>
        }
      />
      <GoalList goals={savingsGoals} />
    </div>
  );
}
