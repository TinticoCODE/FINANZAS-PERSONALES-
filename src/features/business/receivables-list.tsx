"use client";

import { formatCurrency, formatDate } from "@/lib/format";
import { installmentStatusLabels } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import type { PendingInstallmentData } from "@/types";

type ReceivablesListProps = {
  installments: PendingInstallmentData[];
};

export function ReceivablesList({ installments }: ReceivablesListProps) {
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
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        Total por cobrar: <strong>{formatCurrency(totalPending)}</strong> ·{" "}
        {installments.length} cuota(s)
      </div>
      <ul className="divide-y divide-border">
        {installments.map((inst) => {
          const pending = inst.expectedAmount - inst.paidAmount;
          return (
            <li key={inst.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">
                  {inst.customerName ?? "Sin cliente"} · {inst.saleNumber}
                </p>
                <p className="text-muted-foreground">
                  Cuota #{inst.installmentNo} · Vence {formatDate(inst.dueDate)}
                  {inst.customerPhone && ` · ${inst.customerPhone}`}
                </p>
              </div>
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
