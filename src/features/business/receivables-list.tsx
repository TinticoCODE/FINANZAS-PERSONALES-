"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { installmentStatusLabels } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InstallmentPaymentDialog,
  type InstallmentPaymentTarget,
} from "@/features/business/installment-payment-dialog";
import type { PendingInstallmentData } from "@/types";

type ReceivablesListProps = {
  installments: PendingInstallmentData[];
  accounts: { id: string; name: string }[];
};

export function ReceivablesList({ installments, accounts }: ReceivablesListProps) {
  const [selected, setSelected] = useState<InstallmentPaymentTarget | null>(null);

  if (installments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No hay cuentas por cobrar pendientes
      </p>
    );
  }

  const totalPending = installments.reduce(
    (sum, i) => sum + (i.expectedAmount - i.paidAmount),
    0
  );

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          Total por cobrar: <strong>{formatCurrency(totalPending)}</strong> ·{" "}
          {installments.length} cuota(s)
        </div>
        <ul className="divide-y divide-border">
          {installments.map((inst) => {
            const pending = inst.expectedAmount - inst.paidAmount;
            return (
              <li
                key={inst.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {inst.customerName ?? "Sin cliente"} · {inst.saleNumber}
                  </p>
                  <p className="text-muted-foreground">
                    Cuota #{inst.installmentNo} · Vence {formatDate(inst.dueDate)}
                    {inst.customerPhone && ` · ${inst.customerPhone}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(pending)}</p>
                    <Badge variant="outline" className="text-xs">
                      {
                        installmentStatusLabels[
                          inst.status as keyof typeof installmentStatusLabels
                        ]
                      }
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected(inst)}
                  >
                    Registrar abono
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <InstallmentPaymentDialog
        installment={selected}
        accounts={accounts}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
