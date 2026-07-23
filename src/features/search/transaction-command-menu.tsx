"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Search,
} from "lucide-react";
import {
  searchTransactions,
  type TransactionSearchResult,
} from "@/actions/search.actions";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { formatUserDate } from "@/utils/dates";
import { useUserTimezone } from "@/contexts/user-timezone-context";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

export function TransactionCommandMenu() {
  const router = useRouter();
  const timezone = useUserTimezone();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TransactionSearchResult[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const data = await searchTransactions(query);
        setResults(data);
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, open]);

  const handleSelect = useCallback(
    (transactionId: string) => {
      setOpen(false);
      router.push(`/transactions?focus=${transactionId}`);
    },
    [router]
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="relative hidden h-9 w-full max-w-sm justify-start gap-2 text-muted-foreground sm:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 shrink-0 opacity-60" />
        <span className="text-sm">Buscar transacciones...</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-0.5 rounded border border-border/60 bg-muted/50 px-1.5 font-mono text-[10px] font-medium opacity-80 lg:inline-flex">
          ⌘K
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Buscar transacciones"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Buscar transacciones"
        description="Busca por descripción, categoría o monto"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Descripción, categoría o monto..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {pending && query.trim().length >= 2 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando...
              </div>
            ) : query.trim().length < 2 ? (
              <CommandEmpty>Escribe al menos 2 caracteres para buscar.</CommandEmpty>
            ) : results.length === 0 && !pending ? (
              <CommandEmpty>Sin transacciones que coincidan.</CommandEmpty>
            ) : (
              <CommandGroup heading="Transacciones">
                {results.map((tx) => (
                  <CommandItem
                    key={tx.id}
                    value={tx.id}
                    onSelect={() => handleSelect(tx.id)}
                    className="flex items-start gap-3 py-2.5"
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        tx.type === "INCOME"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-600"
                      )}
                    >
                      {tx.type === "INCOME" ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {tx.description || tx.category}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tx.category} · {tx.fundSource} ·{" "}
                        {formatUserDate(tx.date, "d MMM yyyy", timezone)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        tx.type === "INCOME" ? "text-emerald-600" : "text-foreground"
                      )}
                    >
                      {tx.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
