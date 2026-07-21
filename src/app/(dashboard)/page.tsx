import { StatCard } from "@/components/shared/stat-card";
import { ExpenseByCategoryChart } from "@/features/dashboard/expense-chart";
import { IncomeExpenseChart } from "@/features/dashboard/income-expense-chart";
import { CashFlowChart } from "@/features/dashboard/cash-flow-chart";
import { MonthlyEvolutionChart } from "@/features/dashboard/monthly-evolution-chart";
import { BudgetUsageChart } from "@/features/dashboard/budget-usage-chart";
import { CreditDebtChart } from "@/features/dashboard/credit-debt-chart";
import { getDashboardData } from "@/services/data.service";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground capitalize">
          Resumen financiero de {data.monthLabel}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.stats.map((stat, index) => (
          <StatCard key={stat.id} data={stat} index={index} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ExpenseByCategoryChart data={data.expenseByCategory} />
        <IncomeExpenseChart data={data.monthlyEvolution} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CashFlowChart data={data.cashFlowData} />
        </div>
        <MonthlyEvolutionChart data={data.monthlyEvolution} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BudgetUsageChart data={data.budgets} />
        <CreditDebtChart cards={data.creditCards} />
      </div>
    </div>
  );
}
