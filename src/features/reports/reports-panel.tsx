"use client";

import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncomeExpenseChart } from "@/features/dashboard/income-expense-chart";
import { ExpenseByCategoryChart } from "@/features/dashboard/expense-chart";
import type { ChartDataPoint, MonthlyDataPoint } from "@/types";

type ReportsPanelProps = {
  monthlyEvolution: MonthlyDataPoint[];
  expenseByCategory: ChartDataPoint[];
};

export function ReportsPanel({ monthlyEvolution, expenseByCategory }: ReportsPanelProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="month">
        <TabsList>
          <TabsTrigger value="day">Día</TabsTrigger>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mes</TabsTrigger>
          <TabsTrigger value="year">Año</TabsTrigger>
        </TabsList>
        <TabsContent value="month" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <IncomeExpenseChart data={monthlyEvolution} />
            <ExpenseByCategoryChart data={expenseByCategory} />
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
