"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { payCreditCard } from "@/actions/finance.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import type { AccountData, CreditCardData } from "@/types";

type CreditCardPaymentDialogProps = {
  card: CreditCardData | null;
  accounts: AccountData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function todayLocalDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CreditCardPaymentDialog({
  card,
  accounts,
  open,
  onOpenChange,
}: CreditCardPaymentDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayLocalDateString());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === sourceAccountId);
  const suggestedAmount =
    card?.projectedPaymentDueThisCycle ??
    card?.paymentToAvoidInterest ??
    card?.usedBalance ??
    0;

  useEffect(() => {
    if (card && open) {
      setAmount(String(Math.max(suggestedAmount, 0)));
      setSourceAccountId(accounts[0]?.id ?? "");
      setPaymentDate(todayLocalDateString());
      setNotes("");
      setError(null);
      setSuccess(null);
    }
  }, [card, open, accounts, suggestedAmount]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!card) return;

    const parsedAmount = Number(amount);
    if (parsedAmount <= 0) {
      setError("El monto debe ser mayor a cero");
      return;
    }
    if (!sourceAccountId) {
      setError("Selecciona la cuenta desde la que pagarás");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await payCreditCard({
        sourceAccountId,
        creditCardId: card.id,
        amount: parsedAmount,
        paymentDate,
        notes: notes.trim() || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess(
        `Pago registrado. Nuevo saldo tarjeta: ${formatCurrency(result.newCardBalance)}.`
      );
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar tarjeta de crédito</DialogTitle>
        </DialogHeader>

        {card && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
              <p className="font-medium">{card.name}</p>
              <p className="text-muted-foreground">
                {card.bank} •••• {card.lastFourDigits}
              </p>
              <p className="mt-2">
                Deuda registrada:{" "}
                <span className="font-semibold">
                  {formatCurrency(card.usedBalance)}
                </span>
              </p>
              {card.projectedRemainingDebt !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Deuda proyectada (cuotas pendientes):{" "}
                  {formatCurrency(card.projectedRemainingDebt)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-source-account">
                Desde qué cuenta vas a pagar *
              </Label>
              <Select
                value={sourceAccountId}
                onValueChange={(value) => setSourceAccountId(value ?? "")}
              >
                <SelectTrigger id="payment-source-account" className="w-full">
                  {selectedAccount
                    ? `${selectedAccount.name} (${formatCurrency(selectedAccount.balance)})`
                    : "Selecciona cuenta origen"}
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} — {formatCurrency(account.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">Monto a pagar *</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
              {suggestedAmount > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setAmount(String(suggestedAmount))}
                >
                  Usar cuota proyectada del mes ({formatCurrency(suggestedAmount)})
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-date">Fecha del pago</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notas (opcional)</Label>
              <Textarea
                id="payment-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
              />
            </div>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            {success && (
              <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                {success}
              </p>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={pending || !sourceAccountId || accounts.length === 0}
              >
                {pending ? "Procesando..." : "Registrar pago"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {accounts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Crea una cuenta bancaria en Cuentas antes de registrar pagos.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
