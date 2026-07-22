"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  toggleRecurringTransaction,
  updateRecurringTransaction,
} from "@/actions/finance.actions";
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
import { EmptyState } from "@/components/shared/empty-state";
import { RecurringList } from "@/features/recurring/recurring-list";
import {
  dayOfWeekLabels,
  paymentMethodLabels,
  transactionTypeLabels,
} from "@/lib/labels";
import { todayIsoInTimezone, formatUserDate } from "@/utils/dates";
import { useUserTimezone } from "@/contexts/user-timezone-context";
import type { CreditCardData, RecurringTransactionData } from "@/types";
import type { RecurrenceFrequency } from "@prisma/client";

type Option = { id: string; name: string; type?: string };

type RecurringViewProps = {
  recurring: RecurringTransactionData[];
  accounts: Option[];
  categories: Option[];
  creditCards: CreditCardData[];
};

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: "DAILY", label: "Diaria" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensual" },
  { value: "YEARLY", label: "Anual" },
];

export function RecurringView({
  recurring,
  accounts,
  categories,
  creditCards,
}: RecurringViewProps) {
  const router = useRouter();
  const timezone = useUserTimezone();
  const todayIso = useMemo(() => todayIsoInTimezone(timezone), [timezone]);

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<RecurringTransactionData | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    paymentMethod: "DEBIT" as keyof typeof paymentMethodLabels,
    accountId: "",
    categoryId: "",
    creditCardId: "",
    frequency: "MONTHLY" as RecurrenceFrequency,
    dayOfMonth: "1",
    dayOfWeek: "1",
    monthOfYear: "1",
  });

  const filteredCategories = categories.filter((c) => c.type === form.type);
  const isCredit = form.paymentMethod === "CREDIT" && form.type === "EXPENSE";
  const isCash = form.paymentMethod === "CASH" && form.type === "EXPENSE";
  const showBankAccount =
    form.type === "INCOME" ||
    (form.type === "EXPENSE" &&
      form.paymentMethod !== "CREDIT" &&
      form.paymentMethod !== "CASH");

  const resetForm = () => {
    setForm({
      type: "EXPENSE",
      paymentMethod: "DEBIT",
      accountId: "",
      categoryId: "",
      creditCardId: "",
      frequency: "MONTHLY",
      dayOfMonth: "1",
      dayOfWeek: "1",
      monthOfYear: "1",
    });
    setEditItem(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
  };

  const handleEdit = (item: RecurringTransactionData) => {
    setEditItem(item);
    setForm({
      type: item.type,
      paymentMethod:
        (Object.entries(paymentMethodLabels).find(
          ([, label]) => label === item.paymentMethod
        )?.[0] as keyof typeof paymentMethodLabels) ?? "DEBIT",
      accountId: item.accountId ?? "",
      categoryId: item.categoryId,
      creditCardId: item.creditCardId ?? "",
      frequency: item.frequencyRaw as RecurrenceFrequency,
      dayOfMonth: String(item.dayOfMonth ?? 1),
      dayOfWeek: String(item.dayOfWeek ?? 1),
      monthOfYear: String(item.monthOfYear ?? 1),
    });
    setOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const amount = Number(fd.get("amount"));
    const startDate = String(fd.get("startDate") || fd.get("nextRunAt") || todayIso);
    const description = String(fd.get("description") || "");

    const payload = {
      type: form.type,
      amount,
      categoryId: form.categoryId,
      accountId: isCredit || isCash ? undefined : form.accountId || undefined,
      creditCardId: isCredit ? form.creditCardId : undefined,
      paymentMethod: form.paymentMethod,
      description: description || undefined,
      frequency: form.frequency,
      dayOfMonth:
        form.frequency === "MONTHLY" || form.frequency === "YEARLY"
          ? Number(form.dayOfMonth)
          : undefined,
      dayOfWeek: form.frequency === "WEEKLY" ? Number(form.dayOfWeek) : undefined,
      monthOfYear: form.frequency === "YEARLY" ? Number(form.monthOfYear) : undefined,
      installments: Number(fd.get("installments") || 1),
      startDate,
    };

    startTransition(async () => {
      if (editItem) {
        await updateRecurringTransaction(editItem.id, {
          amount: payload.amount,
          description: payload.description,
          frequency: payload.frequency,
          dayOfMonth: payload.dayOfMonth ?? null,
          dayOfWeek: payload.dayOfWeek ?? null,
          monthOfYear: payload.monthOfYear ?? null,
          nextRunAt: startDate,
        });
      } else {
        await createRecurringTransaction(payload);
      }
      setOpen(false);
      resetForm();
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transacciones recurrentes"
        description="Movimientos automáticos ejecutados por el cron según tu zona horaria"
        action={
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button size="sm" className="gap-2" />}>
              <Plus className="h-4 w-4" />
              Nueva recurrente
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editItem ? "Editar recurrente" : "Nueva transacción recurrente"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          type: (v ?? "EXPENSE") as "INCOME" | "EXPENSE",
                          categoryId: "",
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>{transactionTypeLabels[form.type]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXPENSE">Gasto</SelectItem>
                        <SelectItem value="INCOME">Ingreso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Método</Label>
                    <Select
                      value={form.paymentMethod}
                      onValueChange={(v) => {
                        const method = (v ?? "DEBIT") as typeof form.paymentMethod;
                        setForm((f) => ({
                          ...f,
                          paymentMethod: method,
                          accountId:
                            method === "CREDIT" || method === "CASH" ? "" : f.accountId,
                          creditCardId: method === "CREDIT" ? f.creditCardId : "",
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {paymentMethodLabels[form.paymentMethod]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(paymentMethodLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, categoryId: v ?? "" }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar">
                        {filteredCategories.find((c) => c.id === form.categoryId)?.name}
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

                {isCredit ? (
                  <div className="space-y-2">
                    <Label>Tarjeta</Label>
                    <Select
                      value={form.creditCardId}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, creditCardId: v ?? "" }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar tarjeta">
                          {creditCards.find((c) => c.id === form.creditCardId)?.name}
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
                ) : isCash ? (
                  <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    Efectivo: no requiere cuenta bancaria.
                  </p>
                ) : showBankAccount ? (
                  <div className="space-y-2">
                    <Label>Cuenta</Label>
                    <Select
                      value={form.accountId}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, accountId: v ?? "" }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar cuenta">
                          {accounts.find((a) => a.id === form.accountId)?.name}
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
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto</Label>
                    <Input id="amount" name="amount" type="number" min="0" step="0.01" required defaultValue={editItem?.amount} />
                  </div>
                  <div className="space-y-2">
                    <Label>Frecuencia</Label>
                    <Select
                      value={form.frequency}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          frequency: (v ?? "MONTHLY") as RecurrenceFrequency,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {FREQUENCIES.find((f) => f.value === form.frequency)?.label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.frequency === "WEEKLY" && (
                  <div className="space-y-2">
                    <Label>Día de la semana</Label>
                    <Select
                      value={form.dayOfWeek}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, dayOfWeek: v ?? "1" }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {dayOfWeekLabels[Number(form.dayOfWeek)]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {dayOfWeekLabels.map((label, index) => (
                          <SelectItem key={label} value={String(index)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(form.frequency === "MONTHLY" || form.frequency === "YEARLY") && (
                  <div className="space-y-2">
                    <Label htmlFor="dayOfMonth">Día del mes</Label>
                    <Input
                      id="dayOfMonth"
                      type="number"
                      min="1"
                      max="31"
                      value={form.dayOfMonth}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, dayOfMonth: e.target.value }))
                      }
                    />
                  </div>
                )}

                {form.frequency === "YEARLY" && (
                  <div className="space-y-2">
                    <Label htmlFor="monthOfYear">Mes del año</Label>
                    <Input
                      id="monthOfYear"
                      type="number"
                      min="1"
                      max="12"
                      value={form.monthOfYear}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, monthOfYear: e.target.value }))
                      }
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor={editItem ? "nextRunAt" : "startDate"}>
                    {editItem ? "Próxima ejecución" : "Primera ejecución"}
                  </Label>
                  <Input
                    id={editItem ? "nextRunAt" : "startDate"}
                    name={editItem ? "nextRunAt" : "startDate"}
                    type="date"
                    required
                    defaultValue={
                      editItem
                        ? formatUserDate(editItem.nextRunAt, "yyyy-MM-dd", timezone)
                        : todayIso
                    }
                  />
                </div>

                {isCredit && (
                  <div className="space-y-2">
                    <Label htmlFor="installments">Cuotas</Label>
                    <Input
                      id="installments"
                      name="installments"
                      type="number"
                      min="1"
                      max="48"
                      defaultValue={editItem?.installments ?? 1}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editItem?.description}
                    placeholder="Opcional"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={
                      pending ||
                      !form.categoryId ||
                      (isCredit
                        ? !form.creditCardId
                        : showBankAccount
                          ? !form.accountId
                          : false)
                    }
                  >
                    {pending ? "Guardando..." : editItem ? "Actualizar" : "Crear"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {recurring.length === 0 ? (
        <EmptyState
          title="Sin transacciones recurrentes"
          description="Programa ingresos o gastos que se registren automáticamente"
        />
      ) : (
        <RecurringList
          items={recurring}
          pending={pending}
          onToggle={(id, isActive) =>
            startTransition(async () => {
              await toggleRecurringTransaction(id, isActive);
              router.refresh();
            })
          }
          onEdit={handleEdit}
          onDelete={(id) =>
            startTransition(async () => {
              await deleteRecurringTransaction(id);
              router.refresh();
            })
          }
        />
      )}
    </div>
  );
}
