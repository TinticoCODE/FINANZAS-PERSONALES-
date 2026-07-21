"use client";

import { useState, useTransition } from "react";
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
import type { Transaction } from "@/types";

type Option = { id: string; name: string; type?: string };

type TransactionsViewProps = {
  transactions: Transaction[];
  accounts: Option[];
  categories: Option[];
  creditCards: Option[];
};

const initialFormState = {
  type: "EXPENSE" as "INCOME" | "EXPENSE",
  paymentMethod: "DEBIT" as keyof typeof paymentMethodLabels,
  accountId: "",
  categoryId: "",
  creditCardId: "",
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
        accountId: form.accountId,
        categoryId: form.categoryId,
        creditCardId: form.creditCardId || undefined,
        type: form.type,
        amount: Number(formData.get("amount")),
        description: (formData.get("description") as string) || undefined,
        paymentMethod: form.paymentMethod,
        date: formData.get("date") as string,
      });
      handleOpenChange(false);
      router.refresh();
    });
  };

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
  const selectedCardName =
    creditCards.find((c) => c.id === form.creditCardId)?.name ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transacciones"
        description="Administra todas tus entradas y salidas de dinero"
        action={
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button size="sm" className="gap-2" disabled={accounts.length === 0} />}>
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
                        setForm((prev) => ({
                          ...prev,
                          type: v as "INCOME" | "EXPENSE",
                          categoryId: "",
                        }));
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
                    <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" name="description" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label>Cuenta</Label>
                    <Select
                      value={form.accountId}
                      onValueChange={(v) =>
                        setForm((prev) => ({ ...prev, accountId: v ?? "" }))
                      }
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Método de pago</Label>
                    <Select
                      value={form.paymentMethod}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          paymentMethod: (v ?? "DEBIT") as keyof typeof paymentMethodLabels,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar método">
                          {paymentMethodLabels[form.paymentMethod]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(paymentMethodLabels) as Array<keyof typeof paymentMethodLabels>).map(
                          (key) => (
                            <SelectItem key={key} value={key}>
                              {paymentMethodLabels[key]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
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
                </div>
                {form.paymentMethod === "CREDIT" && creditCards.length > 0 && (
                  <div className="space-y-2">
                    <Label>Tarjeta de crédito</Label>
                    <Select
                      value={form.creditCardId}
                      onValueChange={(v) =>
                        setForm((prev) => ({ ...prev, creditCardId: v ?? "" }))
                      }
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
                )}
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={pending || !form.accountId || !form.categoryId}
                  >
                    {pending ? "Guardando..." : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          title="Crea una cuenta primero"
          description="Necesitas al menos una cuenta para registrar transacciones."
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
