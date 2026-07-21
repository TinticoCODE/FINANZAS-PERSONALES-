import { StatCard } from "@/components/shared/stat-card";
import { ExpenseByCategoryChart } from "@/features/dashboard/expense-chart";
import { IncomeExpenseChart } from "@/features/dashboard/income-expense-chart";
import { CashFlowChart } from "@/features/dashboard/cash-flow-chart";
import { MonthlyEvolutionChart } from "@/features/dashboard/monthly-evolution-chart";
import { BudgetUsageChart } from "@/features/dashboard/budget-usage-chart";
import { CreditDebtChart } from "@/features/dashboard/credit-debt-chart";
import {
  dashboardStats,
  expenseByCategory,
  monthlyEvolution,
  cashFlowData,
  budgets,
  creditCards,
} from "@/services/mock-data";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen financiero de julio 2026
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardStats.map((stat, index) => (
          <StatCard key={stat.id} data={stat} index={index} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ExpenseByCategoryChart data={expenseByCategory} />
        <IncomeExpenseChart data={monthlyEvolution} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CashFlowChart data={cashFlowData} />
        </div>
        <MonthlyEvolutionChart data={monthlyEvolution} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BudgetUsageChart data={budgets} />
        <CreditDebtChart cards={creditCards} />
      </div>
    </div>
  );
}
