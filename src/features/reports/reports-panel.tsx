"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncomeExpenseChart } from "@/features/dashboard/income-expense-chart";
import { ExpenseByCategoryChart } from "@/features/dashboard/expense-chart";
import { PeriodSelector } from "@/features/reports/period-selector";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReportsPageData } from "@/types";

type ReportsPanelProps = ReportsPageData;

function SnapshotKpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold",
          tone === "positive" && "text-emerald-600",
          tone === "negative" && "text-red-600"
        )}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function ReportsPanelContent({
  year,
  month,
  periodLabel,
  monthlyEvolution,
  selectedSnapshot,
  expenseByCategory,
}: ReportsPanelProps) {
  const yearlyChartData = monthlyEvolution.map((point) => ({
    month: point.month,
    income: point.income,
    expenses: point.expenses,
    savings: point.savings,
  }));

  return (
    <div className="space-y-6 pb-24">
      <Suspense fallback={null}>
        <PeriodSelector year={year} month={month} periodLabel={periodLabel} />
      </Suspense>

      {selectedSnapshot && (
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base capitalize">{periodLabel}</CardTitle>
              <CardDescription>
                Cierre mensual {selectedSnapshot.isLive ? "en vivo" : "inmutable"}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                selectedSnapshot.isLive
                  ? "border-sky-500 text-sky-600"
                  : "border-emerald-500 text-emerald-600"
              )}
            >
              {selectedSnapshot.isLive ? (
                <>
                  <Zap className="h-3 w-3" />
                  Dinámico
                </>
              ) : selectedSnapshot.isMissing ? (
                "Sin cierre"
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  Cerrado
                </>
              )}
            </Badge>
          </CardHeader>
          <CardContent>
            {selectedSnapshot.isMissing ? (
              <p className="text-sm text-muted-foreground">
                No hay cierre persistido para este mes. Los meses anteriores al actual se
                registran automáticamente al finalizar cada periodo.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <SnapshotKpi label="Patrimonio (activos)" value={selectedSnapshot.totalAssets} />
                <SnapshotKpi
                  label="Deudas (pasivos)"
                  value={selectedSnapshot.totalLiabilities}
                  tone="negative"
                />
                <SnapshotKpi
                  label="Patrimonio neto"
                  value={selectedSnapshot.netWorth}
                  tone={selectedSnapshot.netWorth >= 0 ? "positive" : "negative"}
                />
                <SnapshotKpi
                  label="Ingresos del mes"
                  value={selectedSnapshot.totalIncome}
                  tone="positive"
                />
                <SnapshotKpi
                  label="Gastos del mes"
                  value={selectedSnapshot.totalExpense}
                  tone="negative"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="year">
        <TabsList>
          <TabsTrigger value="year">Tendencia anual {year}</TabsTrigger>
          <TabsTrigger value="month">Detalle del mes</TabsTrigger>
        </TabsList>

        <TabsContent value="year" className="mt-6">
          <IncomeExpenseChart data={yearlyChartData} />
          <p className="mt-2 text-xs text-muted-foreground">
            Meses cerrados provienen de cierres inmutables. El mes actual se calcula en vivo.
          </p>
        </TabsContent>

        <TabsContent value="month" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ExpenseByCategoryChart data={expenseByCategory} />
            <IncomeExpenseChart
              data={
                selectedSnapshot && !selectedSnapshot.isMissing
                  ? [
                      {
                        month: periodLabel.split(" ")[0] ?? "Mes",
                        income: selectedSnapshot.totalIncome,
                        expenses: selectedSnapshot.totalExpense,
                        savings: Math.max(
                          selectedSnapshot.totalIncome - selectedSnapshot.totalExpense,
                          0
                        ),
                      },
                    ]
                  : []
              }
            />
          </div>
        </TabsContent>
      </Tabs>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Exportar reportes</CardTitle>
            <CardDescription>
              Descarga tus datos financieros en diferentes formatos
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2" disabled>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" className="gap-2" disabled>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" className="gap-2" disabled>
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export function ReportsPanel(props: ReportsPanelProps) {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Cargando periodo...</div>}>
      <ReportsPanelContent {...props} />
    </Suspense>
  );
}
