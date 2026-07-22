"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createTransaction, deleteTransaction } from "@/actions/finance.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PageHeader } from "@/components/shared/page-header";
import { TransactionTable } from "@/features/transactions/transaction-table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  paymentMethodLabels,
  transactionTypeLabels,
} from "@/lib/labels";
import { formatCurrency } from "@/lib/format";
import { previewCreditPurchase } from "@/services/credit-card.service";
import type { Transaction } from "@/types";

type Option = { id: string; name: string; type?: string };
type CreditCardOption = Option & { interestRate: number };

type TransactionsViewProps = {
  transactions: Transaction[];
  accounts: Option[];
  categories: Option[];
  creditCards: CreditCardOption[];
};

const initialFormState = {
  type: "EXPENSE" as "INCOME" | "EXPENSE",
  paymentMethod: "DEBIT" as keyof typeof paymentMethodLabels,
  accountId: "",
  categoryId: "",
  creditCardId: "",
  installments: "1",
  amount: "",
};

export function TransactionsView({
  transactions,
  accounts,
  categories,
  creditCards,
}: TransactionsViewProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(initialFormState);

  const filteredCategories = categories.filter((c) => c.type === form.type);
  const isCreditPurchase =
    form.paymentMethod === "CREDIT" && form.type === "EXPENSE";

  const resetForm = () => setForm(initialFormState);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      await createTransaction({
        accountId: isCreditPurchase ? undefined : form.accountId || undefined,
        categoryId: form.categoryId,
        creditCardId: isCreditPurchase ? form.creditCardId : undefined,
        type: form.type,
        amount: Number(formData.get("amount")),
        description: (formData.get("description") as string) || undefined,
        paymentMethod: form.paymentMethod,
        date: formData.get("date") as string,
        installments: isCreditPurchase
          ? Math.max(1, Number(formData.get("installments")) || 1)
          : 1,
      });
      handleOpenChange(false);
      router.refresh();
    });
  };

  const handlePaymentMethodChange = (
    method: keyof typeof paymentMethodLabels
  ) => {
    setForm((prev) => ({
      ...prev,
      paymentMethod: method,
      accountId: method === "CREDIT" ? "" : prev.accountId,
      creditCardId: method === "CREDIT" ? prev.creditCardId : "",
      installments: "1",
      amount: method === "CREDIT" ? prev.amount : "",
    }));
  };

  const handleTypeChange = (type: "INCOME" | "EXPENSE") => {
    setForm((prev) => ({
      ...prev,
      type,
      categoryId: "",
      paymentMethod: "DEBIT",
      accountId: prev.accountId,
      creditCardId: "",
      installments: "1",
      amount: "",
    }));
  };

  const canCreateTransaction = accounts.length > 0 || creditCards.length > 0;
  const requiresAccount = form.type === "INCOME" || !isCreditPurchase;
  const canSubmit =
    Boolean(form.categoryId) &&
    (isCreditPurchase
      ? Boolean(form.creditCardId)
      : requiresAccount
        ? Boolean(form.accountId)
        : true);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteTransaction(id);
      router.refresh();
    });
  };

  const selectedCategoryName =
    categories.find((c) => c.id === form.categoryId)?.name ?? "";
  const selectedAccountName =
    accounts.find((a) => a.id === form.accountId)?.name ?? "";
  const selectedCard = creditCards.find((c) => c.id === form.creditCardId);
  const selectedCardName = selectedCard?.name ?? "";

  const creditPreview = useMemo(() => {
    if (form.paymentMethod !== "CREDIT" || !selectedCard) return null;
    const parsedAmount = Number(form.amount);
    const parsedInstallments = Math.max(1, Number(form.installments) || 1);
    if (!parsedAmount || parsedAmount <= 0) return null;
    return previewCreditPurchase(
      parsedAmount,
      parsedInstallments,
      selectedCard.interestRate
    );
  }, [form.paymentMethod, form.amount, form.installments, selectedCard]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transacciones"
        description="Administra todas tus entradas y salidas de dinero"
        action={
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button size="sm" className="gap-2" disabled={!canCreateTransaction} />}>
              <Plus className="h-4 w-4" />
              Nueva transacción
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva transacción</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => {
                        if (!v) return;
                        handleTypeChange(v as "INCOME" | "EXPENSE");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar tipo">
                          {transactionTypeLabels[form.type]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCOME">{transactionTypeLabels.INCOME}</SelectItem>
                        <SelectItem value="EXPENSE">{transactionTypeLabels.EXPENSE}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={isCreditPurchase ? form.amount : undefined}
                      onChange={
                        isCreditPurchase
                          ? (e) =>
                              setForm((prev) => ({
                                ...prev,
                                amount: e.target.value,
                              }))
                          : undefined
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" name="description" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) =>
                      setForm((prev) => ({ ...prev, categoryId: v ?? "" }))
                    }
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

                {form.type === "EXPENSE" && (
                  <div className="space-y-2">
                    <Label>Método de pago</Label>
                    <Select
                      value={form.paymentMethod}
                      onValueChange={(v) => {
                        if (!v) return;
                        handlePaymentMethodChange(
                          v as keyof typeof paymentMethodLabels
                        );
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar método">
                          {paymentMethodLabels[form.paymentMethod]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(paymentMethodLabels) as Array<
                          keyof typeof paymentMethodLabels
                        >).map((key) => (
                          <SelectItem key={key} value={key}>
                            {paymentMethodLabels[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!isCreditPurchase && (
                  <div className="space-y-2">
                    <Label>Cuenta bancaria</Label>
                    <Select
                      value={form.accountId}
                      onValueChange={(v) =>
                        setForm((prev) => ({ ...prev, accountId: v ?? "" }))
                      }
                      disabled={accounts.length === 0}
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
                    {accounts.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Crea una cuenta bancaria para registrar este movimiento.
                      </p>
                    )}
                  </div>
                )}

                {isCreditPurchase && (
                  <div className="space-y-2">
                    <Label>Tarjeta de crédito asociada</Label>
                    <Select
                      value={form.creditCardId}
                      onValueChange={(v) =>
                        setForm((prev) => ({ ...prev, creditCardId: v ?? "" }))
                      }
                      disabled={creditCards.length === 0}
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
                    {creditCards.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Registra una tarjeta de crédito antes de continuar.
                      </p>
                    )}
                  </div>
                )}

                {isCreditPurchase && creditCards.length > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="installments">Número de cuotas</Label>
                        <Input
                          id="installments"
                          name="installments"
                          type="number"
                          min="1"
                          max="48"
                          required
                          value={form.installments}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              installments: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Fecha exacta de transacción</Label>
                        <Input
                          id="date"
                          name="date"
                          type="date"
                          defaultValue={new Date().toISOString().slice(0, 10)}
                          required
                        />
                      </div>
                    </div>
                    {creditPreview && (
                      <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm space-y-1">
                        {Number(form.installments) === 1 ? (
                          <p className="text-emerald-600 font-medium">
                            1 cuota — 0% interés (periodo de gracia)
                          </p>
                        ) : (
                          <>
                            <p>
                              Cuota mensual proyectada:{" "}
                              <span className="font-semibold">
                                {formatCurrency(creditPreview.monthlyPayment)}
                              </span>
                            </p>
                            <p className="text-muted-foreground">
                              TEA {selectedCard?.interestRate}% — intereses
                              totales:{" "}
                              {formatCurrency(creditPreview.totalInterest)}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {!isCreditPurchase && (
                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      required
                    />
                  </div>
                )}

                <DialogFooter>
                  <Button type="submit" disabled={pending || !canSubmit}>
                    {pending ? "Guardando..." : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {accounts.length === 0 && creditCards.length === 0 ? (
        <EmptyState
          title="Crea una cuenta o tarjeta primero"
          description="Necesitas al menos una cuenta bancaria o tarjeta de crédito para registrar transacciones."
          actionLabel="Ir a cuentas"
          onAction={() => router.push("/accounts")}
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="Sin transacciones"
          description="Empieza registrando tu primera transacción. Todos los valores del dashboard se calcularán automáticamente."
          actionLabel="Nueva transacción"
          onAction={() => setOpen(true)}
        />
      ) : (
        <TransactionTable data={transactions} onDelete={handleDelete} deleting={pending} />
      )}
    </div>
  );
}
