"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { processInstallmentPaymentAction } from "@/actions/business.actions";
import { BUSINESS_CASH_DESTINATION } from "@/domain/business/installment-payment.constants";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { installmentStatusLabels } from "@/lib/labels";
import type { PendingInstallmentData } from "@/types";

type InstallmentPaymentTarget = PendingInstallmentData & {
  saleNumber: string;
  customerName?: string;
  customerPhone?: string;
};

type InstallmentPaymentDialogProps = {
  installment: InstallmentPaymentTarget | null;
  accounts: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InstallmentPaymentDialog({
  installment,
  accounts,
  open,
  onOpenChange,
}: InstallmentPaymentDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState(
    BUSINESS_CASH_DESTINATION
  );
  const [error, setError] = useState<string | null>(null);

  const pendingAmount = installment
    ? installment.expectedAmount - installment.paidAmount
    : 0;

  const destinationOptions = [
    { id: BUSINESS_CASH_DESTINATION, name: "Caja del Negocio" },
    ...accounts,
  ];

  const selectedDestinationName =
    destinationOptions.find((a) => a.id === destinationAccountId)?.name ??
    "Selecciona destino";

  useEffect(() => {
    if (installment && open) {
      setAmount(String(installment.expectedAmount - installment.paidAmount));
      setDestinationAccountId(BUSINESS_CASH_DESTINATION);
      setError(null);
    }
  }, [installment, open]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!installment) return;

    const parsedAmount = Number(amount);
    if (parsedAmount <= 0) {
      setError("El abono debe ser mayor a cero");
      return;
    }
    if (parsedAmount > pendingAmount + 0.01) {
      setError(`El abono no puede superar ${formatCurrency(pendingAmount)}`);
      return;
    }
    if (!destinationAccountId) {
      setError("Selecciona la cuenta destino del cobro");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await processInstallmentPaymentAction({
        installmentId: installment.id,
        amount: parsedAmount,
        destinationAccountId,
        paymentDate:
          (formData.get("paymentDate") as string) ||
          new Date().toISOString().slice(0, 10),
        notes: (formData.get("notes") as string) || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar abono</DialogTitle>
          </DialogHeader>
          {installment && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <p className="font-medium">
                  {installment.customerName ?? "Sin cliente"} · {installment.saleNumber}
                </p>
                <p className="text-muted-foreground">
                  Cuota #{installment.installmentNo} · Vence {formatDate(installment.dueDate)}
                </p>
                <p className="mt-1">
                  Saldo pendiente:{" "}
                  <strong>{formatCurrency(pendingAmount)}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-amount">Monto del abono</Label>
                <Input
                  id="payment-amount"
                  name="amount"
                  type="number"
                  min={0.01}
                  max={pendingAmount}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Puedes registrar un abono parcial menor al saldo de la cuota.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-destination">Cuenta destino</Label>
                <Select
                  value={destinationAccountId}
                  onValueChange={(v) => v && setDestinationAccountId(v)}
                >
                  <SelectTrigger id="payment-destination" className="w-full">
                    <span className="flex-1 truncate text-left">
                      {selectedDestinationName}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {destinationOptions.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-date">Fecha de cobro</Label>
                <Input
                  id="payment-date"
                  name="paymentDate"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-notes">Notas (opcional)</Label>
                <Textarea id="payment-notes" name="notes" rows={2} />
              </div>

              <p className="text-xs text-muted-foreground">
                Estado actual:{" "}
                {
                  installmentStatusLabels[
                    installment.status as keyof typeof installmentStatusLabels
                  ]
                }
                {Number(amount) > 0 && Number(amount) < pendingAmount - 0.01
                  ? " · Quedará parcialmente pagada"
                  : Number(amount) >= pendingAmount - 0.01
                    ? " · Se marcará como pagada"
                    : ""}
              </p>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending || !installment || !destinationAccountId}>
              {pending ? "Registrando..." : "Confirmar abono"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type { InstallmentPaymentTarget };
