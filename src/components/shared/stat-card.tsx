"use client";

import { motion } from "framer-motion";
import {
  Banknote,
  CreditCard,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import type { StatCardData } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  wallet: Wallet,
  banknote: Banknote,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  "piggy-bank": PiggyBank,
  "credit-card": CreditCard,
};

type StatCardProps = {
  data: StatCardData;
  index?: number;
};

export function StatCard({ data, index = 0 }: StatCardProps) {
  const Icon = iconMap[data.icon] ?? Wallet;
  const change =
    data.previousValue === 0
      ? 0
      : ((data.value - data.previousValue) / data.previousValue) * 100;
  const isPositive = change >= 0;
  const isExpense = data.id === "expenses" || data.id === "debt";
  const changeIsGood = isExpense ? !isPositive : isPositive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm",
        "transition-shadow duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
          data.gradient
        )}
      />
      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{data.title}</p>
          <p className="text-2xl font-semibold tracking-tight">
            <AnimatedCounter value={data.value} />
          </p>
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "font-medium",
                changeIsGood ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}
            >
              {isPositive ? "+" : ""}
              {formatPercent(change)}
            </span>
            <span className="text-muted-foreground">
              {data.comparisonLabel ?? "vs mes anterior"}
            </span>
          </div>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm"
          style={{ backgroundColor: `${data.color}20`, color: data.color }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
