"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  accounts,
  budgets,
  creditCards,
  expenseCategories,
  incomeCategories,
  transactions,
} from "@/services/mock-data";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full max-w-sm justify-start text-sm text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Buscar transacciones, cuentas...</span>
        <span className="sm:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar en toda la aplicación..." />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Transacciones">
            {transactions.slice(0, 5).map((tx) => (
              <CommandItem
                key={tx.id}
                onSelect={() => navigate("/transactions")}
              >
                {tx.description} — ${tx.amount.toLocaleString("es-CO")}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Tarjetas">
            {creditCards.map((card) => (
              <CommandItem key={card.id} onSelect={() => navigate("/cards")}>
                {card.name} •••• {card.lastFourDigits}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Cuentas">
            {accounts.map((account) => (
              <CommandItem key={account.id} onSelect={() => navigate("/accounts")}>
                {account.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Presupuestos">
            {budgets.map((budget) => (
              <CommandItem key={budget.id} onSelect={() => navigate("/budgets")}>
                {budget.category}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Categorías">
            {[...incomeCategories, ...expenseCategories].map((cat) => (
              <CommandItem key={cat} onSelect={() => navigate("/transactions")}>
                {cat}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
