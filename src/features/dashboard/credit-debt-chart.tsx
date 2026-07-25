"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
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
import type { CreditCardData } from "@/types";

type CreditDebtChartProps = {
  cards: CreditCardData[];
};

export function CreditDebtChart({ cards }: CreditDebtChartProps) {
  const chartData = useMemo(
    () =>
      cards.map((card) => ({
        name: card.name,
        used: Math.max(Number(card.projectedRemainingDebt ?? card.usedBalance) || 0, 0),
        stored: Math.max(Number(card.usedBalance) || 0, 0),
        available: Math.max(Number(card.creditLimit - card.usedBalance) || 0, 0),
        utilization:
          card.creditLimit > 0
            ? (Math.max(card.usedBalance, 0) / card.creditLimit) * 100
            : 0,
        color: card.color,
      })),
    [cards]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.45 }}
    >
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Deuda de tarjetas</CardTitle>
          <CardDescription>
            Deuda proyectada por tarjeta (cuotas pendientes reales)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis
                  type="number"
                  tickFormatter={formatCompact}
                  tick={{ fontSize: 12 }}
                  domain={[0, "auto"]}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => formatCompact(Number(value) || 0)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                  }}
                />
                <Bar
                  dataKey="used"
                  name="Deuda proyectada"
                  fill="#6366f1"
                  radius={[0, 6, 6, 0]}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {chartData.map((card) => (
              <div key={card.name} className="flex items-center justify-between text-sm">
                <span>{card.name}</span>
                <span className="text-muted-foreground">
                  {formatCompact(card.used)} proyectado
                  {card.stored !== card.used && (
                    <span className="ml-1 text-xs">
                      (registrado {formatCompact(card.stored)})
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
