"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { payInstallmentAction } from "@/actions/business.actions";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { customerRiskLabels, installmentStatusLabels } from "@/lib/labels";
import type { OverdueInstallmentData } from "@/types";

type OverdueInstallmentsTableProps = {
  installments: OverdueInstallmentData[];
};

export function OverdueInstallmentsTable({
  installments,
}: OverdueInstallmentsTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<OverdueInstallmentData | null>(null);
  const [amount, setAmount] = useState("");

  function openPayment(inst: OverdueInstallmentData) {
    const remaining = inst.expectedAmount - inst.paidAmount;
    setSelected(inst);
    setAmount(String(remaining));
  }

  function handlePay() {
    if (!selected) return;
    startTransition(async () => {
      await payInstallmentAction({
        installmentId: selected.id,
        amount: Number(amount),
        paymentDate: new Date().toISOString(),
      });
      setSelected(null);
      router.refresh();
    });
  }

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
                  <Button size="sm" variant="outline" onClick={() => openPayment(inst)}>
                    Cobrar
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar cobro de cuota</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {selected.customerName} · {selected.saleNumber} · Cuota #
                {selected.installmentNo}
              </p>
              <div className="space-y-2">
                <Label htmlFor="pay-amount">Monto</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Estado:{" "}
                {installmentStatusLabels[selected.status as keyof typeof installmentStatusLabels]}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handlePay} disabled={pending || !amount}>
              {pending ? "Registrando..." : "Confirmar cobro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
