import { BudgetsView } from "@/features/budgets/budgets-view";
import { getBudgets, getCategories } from "@/services/data.service";

export default async function BudgetsPage() {
  const [budgets, categories] = await Promise.all([
    getBudgets(),
    getCategories("EXPENSE"),
  ]);

  return (
    <BudgetsView
      budgets={budgets}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
