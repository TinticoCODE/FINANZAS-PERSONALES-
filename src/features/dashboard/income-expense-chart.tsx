"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCompact } from "@/lib/format";
import type { MonthlyDataPoint } from "@/types";

type IncomeExpenseChartProps = {
  data: MonthlyDataPoint[];
};

function normalizeChartData(data: MonthlyDataPoint[]) {
  return data.map((point) => ({
    month: point.month,
    income: Number(point.income) || 0,
    expenses: Number(point.expenses) || 0,
    savings: Number(point.savings) || 0,
  }));
}

export function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  const chartData = useMemo(() => normalizeChartData(data), [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.25 }}
    >
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Ingresos vs Gastos</CardTitle>
          <CardDescription>Comparativa mensual (últimos 6 meses)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4} margin={{ bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fontSize: 12 }}
                  domain={[0, "auto"]}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value) => formatCompact(Number(value) || 0)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  name="Ingresos"
                  fill="#22c55e"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={chartData.length > 0}
                  animationDuration={800}
                />
                <Bar
                  dataKey="expenses"
                  name="Gastos"
                  fill="#ef4444"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={chartData.length > 0}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
