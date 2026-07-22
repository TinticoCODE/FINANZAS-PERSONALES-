"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCreditCardTransaction } from "@/actions/finance.actions";
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
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { previewCreditPurchase } from "@/services/credit-card.service";

type Option = { id: string; name: string };

export type CreditCardOption = Option & {
  interestRate: number;
};

type CreditCardTransactionFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Option[];
  creditCards: CreditCardOption[];
};

export function CreditCardTransactionForm({
  open,
  onOpenChange,
  categories,
  creditCards,
}: CreditCardTransactionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creditCardId, setCreditCardId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("1");

  const selectedCard = creditCards.find((c) => c.id === creditCardId);
  const selectedCategoryName =
    categories.find((c) => c.id === categoryId)?.name ?? "";
  const selectedCardName = selectedCard?.name ?? "";

  const preview = useMemo(() => {
    const parsedAmount = Number(amount);
    const parsedInstallments = Math.max(1, Number(installments) || 1);
    if (!parsedAmount || parsedAmount <= 0 || !selectedCard) return null;
    return previewCreditPurchase(
      parsedAmount,
      parsedInstallments,
      selectedCard.interestRate
    );
  }, [amount, installments, selectedCard]);

  const resetForm = () => {
    setCreditCardId("");
    setCategoryId("");
    setAmount("");
    setInstallments("1");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      await createCreditCardTransaction({
        creditCardId,
        categoryId,
        amount: Number(formData.get("amount")),
        description: (formData.get("description") as string) || undefined,
        date: formData.get("date") as string,
        installments: Math.max(1, Number(formData.get("installments")) || 1),
      });
      handleOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva transacción de tarjeta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tarjeta de crédito</Label>
            <Select
              value={creditCardId}
              onValueChange={(v) => setCreditCardId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar tarjeta">
                  {selectedCardName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {creditCards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar categoría">
                  {selectedCategoryName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cc-amount">Monto</Label>
              <Input
                id="cc-amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-installments">Número de cuotas</Label>
              <Input
                id="cc-installments"
                name="installments"
                type="number"
                min="1"
                max="48"
                required
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc-date">Fecha exacta de transacción</Label>
            <Input
              id="cc-date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc-description">Descripción</Label>
            <Textarea id="cc-description" name="description" rows={2} />
          </div>

          {preview && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm space-y-1">
              {Number(installments) === 1 ? (
                <p className="text-emerald-600 font-medium">
                  1 cuota — 0% interés (periodo de gracia)
                </p>
              ) : (
                <>
                  <p>
                    Cuota mensual proyectada:{" "}
                    <span className="font-semibold">
                      {formatCurrency(preview.monthlyPayment)}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    TEA {selectedCard?.interestRate}% — intereses totales:{" "}
                    {formatCurrency(preview.totalInterest)}
                  </p>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={
                pending || !creditCardId || !categoryId || creditCards.length === 0
              }
            >
              {pending ? "Guardando..." : "Registrar compra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
