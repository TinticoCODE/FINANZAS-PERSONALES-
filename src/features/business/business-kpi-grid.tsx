"use client";

import { motion } from "framer-motion";
import {
  Banknote,
  PiggyBank,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { cn } from "@/lib/utils";
import type { BusinessKpiData } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  wallet: Wallet,
  banknote: Banknote,
  "piggy-bank": PiggyBank,
  "trending-up": TrendingUp,
};

type BusinessKpiGridProps = {
  kpis: BusinessKpiData[];
};

export function BusinessKpiGrid({ kpis }: BusinessKpiGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, index) => {
        const Icon = iconMap[kpi.icon] ?? Wallet;
        return (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm"
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
                kpi.gradient
              )}
            />
            <div className="relative flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </p>
                <p className="text-2xl font-semibold tracking-tight">
                  <AnimatedCounter value={kpi.value} />
                </p>
                {kpi.subtitle && (
                  <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                )}
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${kpi.color}20`, color: kpi.color }}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
