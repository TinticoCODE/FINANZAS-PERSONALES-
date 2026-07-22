"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditCardTransactionForm } from "@/features/transactions/credit-card-transaction-form";
import { QuickTransactionForm } from "@/features/transactions/quick-transaction-form";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string; type?: string };

type CreditCardOption = Option & { interestRate: number };

type DashboardFabProps = {
  accounts: Option[];
  categories: Option[];
  creditCards: CreditCardOption[];
};

const actions = [
  {
    id: "income",
    label: "Nuevo Ingreso",
    icon: ArrowUpCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
  },
  {
    id: "expense",
    label: "Nuevo Gasto",
    icon: ArrowDownCircle,
    color: "text-red-500",
    bg: "bg-red-500/10 hover:bg-red-500/20",
  },
  {
    id: "credit",
    label: "Nueva Transacción de Tarjeta",
    icon: CreditCard,
    color: "text-violet-600",
    bg: "bg-violet-500/10 hover:bg-violet-500/20",
  },
] as const;

export function DashboardFab({
  accounts,
  categories,
  creditCards,
}: DashboardFabProps) {
  const [expanded, setExpanded] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  const handleAction = (id: (typeof actions)[number]["id"]) => {
    setExpanded(false);
    if (id === "income") setIncomeOpen(true);
    if (id === "expense") setExpenseOpen(true);
    if (id === "credit") setCreditOpen(true);
  };

  const hasAccounts = accounts.length > 0;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-2 mb-1"
            >
              {actions.map((action, index) => {
                const Icon = action.icon;
                const disabled =
                  !hasAccounts ||
                  (action.id === "credit" && creditCards.length === 0);

                return (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleAction(action.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-full border border-border/60 bg-background/95 px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-sm transition-colors",
                      action.bg,
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", action.color)} />
                    {action.label}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          size="icon-lg"
          className="h-14 w-14 rounded-full shadow-xl"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? "Cerrar acciones" : "Nueva acción"}
        >
          {expanded ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>

      <QuickTransactionForm
        open={incomeOpen}
        onOpenChange={setIncomeOpen}
        type="INCOME"
        accounts={accounts}
        categories={categories}
        title="Nuevo ingreso"
      />

      <QuickTransactionForm
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        type="EXPENSE"
        accounts={accounts}
        categories={categories}
        title="Nuevo gasto"
      />

      <CreditCardTransactionForm
        open={creditOpen}
        onOpenChange={setCreditOpen}
        categories={categories.filter((c) => c.type === "EXPENSE")}
        creditCards={creditCards}
      />
    </>
  );
}
