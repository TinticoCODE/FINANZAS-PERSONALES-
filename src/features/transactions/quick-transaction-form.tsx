"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTransaction } from "@/actions/finance.actions";
import { todayIsoInTimezone } from "@/utils/dates";
import { useUserTimezone } from "@/contexts/user-timezone-context";
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
  paymentMethodLabels,
  transactionTypeLabels,
} from "@/lib/labels";

type Option = { id: string; name: string; type?: string };

type QuickTransactionFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "INCOME" | "EXPENSE";
  accounts: Option[];
  categories: Option[];
  title: string;
};

export function QuickTransactionForm({
  open,
  onOpenChange,
  type,
  accounts,
  categories,
  title,
}: QuickTransactionFormProps) {
  const router = useRouter();
  const timezone = useUserTimezone();
  const todayIso = useMemo(() => todayIsoInTimezone(timezone), [timezone]);
  const [pending, startTransition] = useTransition();
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<keyof typeof paymentMethodLabels>("DEBIT");

  const isCashExpense = type === "EXPENSE" && paymentMethod === "CASH";
  const showBankAccount = type === "INCOME" || !isCashExpense;

  const filteredCategories = categories.filter((c) => c.type === type);
  const selectedCategoryName =
    categories.find((c) => c.id === categoryId)?.name ?? "";
  const selectedAccountName =
    accounts.find((a) => a.id === accountId)?.name ?? "";

  const resetForm = () => {
    setAccountId("");
    setCategoryId("");
    setPaymentMethod("DEBIT");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      await createTransaction({
        accountId: showBankAccount ? accountId || undefined : undefined,
        categoryId,
        type,
        amount: Number(formData.get("amount")),
        description: (formData.get("description") as string) || undefined,
        paymentMethod: type === "INCOME" ? "TRANSFER" : paymentMethod,
        date: formData.get("date") as string,
      });
      handleOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Input
                value={transactionTypeLabels[type]}
                readOnly
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qt-amount">Monto</Label>
              <Input
                id="qt-amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qt-description">Descripción</Label>
            <Textarea id="qt-description" name="description" rows={2} />
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
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "EXPENSE" && (
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => {
                  const method = (v ?? "DEBIT") as keyof typeof paymentMethodLabels;
                  setPaymentMethod(method);
                  if (method === "CASH") setAccountId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{paymentMethodLabels[paymentMethod]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(paymentMethodLabels) as Array<
                    keyof typeof paymentMethodLabels
                  >)
                    .filter((key) => key !== "CREDIT")
                    .map((key) => (
                      <SelectItem key={key} value={key}>
                        {paymentMethodLabels[key]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showBankAccount && (
            <div className="space-y-2">
              <Label>Cuenta bancaria</Label>
              <Select
                value={accountId}
                onValueChange={(v) => setAccountId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar cuenta">
                    {selectedAccountName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isCashExpense && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Pago en efectivo: no requiere cuenta bancaria.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="qt-date">Fecha</Label>
            <Input
              id="qt-date"
              name="date"
              type="date"
              defaultValue={todayIso}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={
                pending ||
                !categoryId ||
                (showBankAccount ? !accountId : false)
              }
            >
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
