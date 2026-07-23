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
import {
  CreditInstallmentFields,
  type CreditCardFormOption,
} from "@/features/transactions/credit-installment-fields";
import { todayIsoInTimezone } from "@/utils/dates";
import { useUserTimezone } from "@/contexts/user-timezone-context";

type Option = { id: string; name: string };

export type CreditCardOption = CreditCardFormOption;

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
  const timezone = useUserTimezone();
  const todayIso = useMemo(() => todayIsoInTimezone(timezone), [timezone]);
  const [pending, startTransition] = useTransition();
  const [creditCardId, setCreditCardId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("1");
  const [hasZeroInterest, setHasZeroInterest] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(todayIso);

  const selectedCard = creditCards.find((c) => c.id === creditCardId);
  const selectedCategoryName =
    categories.find((c) => c.id === categoryId)?.name ?? "";
  const selectedCardName = selectedCard?.name ?? "";

  const resetForm = () => {
    setCreditCardId("");
    setCategoryId("");
    setAmount("");
    setInstallments("1");
    setHasZeroInterest(false);
    setPurchaseDate(todayIso);
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
        date: purchaseDate,
        installments: Math.max(1, Number(installments) || 1),
        hasZeroInterest,
      });
      handleOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

          <div className="space-y-2">
            <Label htmlFor="cc-amount">Monto total de la compra</Label>
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

          {creditCardId && (
            <CreditInstallmentFields
              amount={amount}
              installments={installments}
              onInstallmentsChange={setInstallments}
              hasZeroInterest={hasZeroInterest}
              onHasZeroInterestChange={setHasZeroInterest}
              selectedCard={selectedCard}
              purchaseDate={purchaseDate}
              onPurchaseDateChange={setPurchaseDate}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="cc-description">Descripción</Label>
            <Textarea id="cc-description" name="description" rows={2} />
          </div>

          <input type="hidden" name="hasZeroInterest" value={hasZeroInterest ? "1" : "0"} />

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
