"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { ChartDataPoint } from "@/types";

type ExpenseChartProps = {
  data: ChartDataPoint[];
};

const FALLBACK_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

function normalizeExpenseData(data: ChartDataPoint[]) {
  const sanitized = data
    .map((item) => ({
      ...item,
      value: Math.max(Number(item.value) || 0, 0),
    }))
    .filter((item) => item.value > 0);

  const total = sanitized.reduce((sum, item) => sum + item.value, 0);

  return sanitized.map((item, index) => ({
    ...item,
    color: item.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    percent: total > 0 ? (item.value / total) * 100 : item.percent ?? 0,
  }));
}

function CategoryLegend({ items }: { items: ReturnType<typeof normalizeExpenseData> }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            <span className="truncate text-muted-foreground">{item.name}</span>
          </div>
          <div className="shrink-0 text-right">
            <span className="font-medium">{formatPercent(item.percent ?? 0)}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {formatCurrency(item.value)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ExpenseByCategoryChart({ data }: ExpenseChartProps) {
  const chartData = useMemo(() => normalizeExpenseData(data), [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
    >
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Gastos por categoría</CardTitle>
          <CardDescription>Distribución MTD (día 1 al hoy)</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              Sin gastos registrados este mes
            </div>
          ) : (
            <>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={92}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      animationDuration={800}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const payload = item?.payload as ChartDataPoint | undefined;
                        const pct = payload?.percent ?? 0;
                        return [
                          `${formatCurrency(Number(value) || 0)} (${formatPercent(pct)})`,
                          payload?.name ?? "Categoría",
                        ];
                      }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--popover))",
                      }}
                    />
                    <Legend content={() => null} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <CategoryLegend items={chartData} />
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
