"use client";

import { motion } from "framer-motion";
import {
  Banknote,
  Building2,
  Globe,
  Smartphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import type { AccountData } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  "building-2": Building2,
  smartphone: Smartphone,
  banknote: Banknote,
  globe: Globe,
  wallet: Wallet,
};

type AccountListProps = {
  accounts: AccountData[];
};

export function AccountList({ accounts }: AccountListProps) {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-6 backdrop-blur-sm"
      >
        <p className="text-sm text-muted-foreground">Balance total en cuentas</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">
          <AnimatedCounter value={totalBalance} />
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account, index) => {
          const Icon = iconMap[account.icon] ?? Wallet;

          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -4 }}
            >
              <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-medium">{account.name}</CardTitle>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${account.color}20`, color: account.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">
                    <AnimatedCounter value={account.balance} />
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{account.type}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
