"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  InstallmentPaymentDialog,
  type InstallmentPaymentTarget,
} from "@/features/business/installment-payment-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { customerRiskLabels, installmentStatusLabels } from "@/lib/labels";
import type { OverdueInstallmentData } from "@/types";

type OverdueInstallmentsTableProps = {
  installments: OverdueInstallmentData[];
  accounts: { id: string; name: string }[];
};

export function OverdueInstallmentsTable({
  installments,
  accounts,
}: OverdueInstallmentsTableProps) {
  const [selected, setSelected] = useState<InstallmentPaymentTarget | null>(null);

  if (installments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No hay cuotas en mora
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Venta</TableHead>
            <TableHead>Cuota</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead>Mora</TableHead>
            <TableHead className="text-right">Pendiente</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {installments.map((inst) => {
            const pending = inst.expectedAmount - inst.paidAmount;
            return (
              <TableRow key={inst.id}>
                <TableCell>{inst.customerName ?? "—"}</TableCell>
                <TableCell>{inst.saleNumber}</TableCell>
                <TableCell>#{inst.installmentNo}</TableCell>
                <TableCell>{formatDate(inst.dueDate)}</TableCell>
                <TableCell>
                  <Badge variant="destructive">{inst.overdueDays} días</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(pending)}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelected(inst)}>
                    Registrar abono
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <InstallmentPaymentDialog
        installment={selected}
        accounts={accounts}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}

export function CustomerRiskBadge({ level }: { level: string }) {
  const variant =
    level === "HIGH" || level === "BLOCKED"
      ? "destructive"
      : level === "MEDIUM"
        ? "secondary"
        : "outline";
  return (
    <Badge variant={variant}>
      {customerRiskLabels[level as keyof typeof customerRiskLabels] ?? level}
    </Badge>
  );
}
