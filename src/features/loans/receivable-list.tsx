"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { HandCoins, Trash2, Wallet } from "lucide-react";
import { registerReceivablePayment } from "@/actions/finance.actions";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { receivableStatusLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { AccountReceivableData } from "@/types";

type AccountOption = { id: string; name: string };

type ReceivableListProps = {
  loans: AccountReceivableData[];
  accounts: AccountOption[];
  onDelete?: (id: string) => void;
  onPaymentRegistered?: () => void;
  deleting?: boolean;
};

export function ReceivableList({
  loans,
  accounts,
  onDelete,
  onPaymentRegistered,
  deleting,
}: ReceivableListProps) {
  const [pending, startTransition] = useTransition();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<AccountReceivableData | null>(
    null
  );
  const [destinationAccountId, setDestinationAccountId] = useState("");

  const selectedAccountName =
    accounts.find((a) => a.id === destinationAccountId)?.name ?? "";

  const openPayment = (loan: AccountReceivableData) => {
    setSelectedLoan(loan);
    setDestinationAccountId("");
    setPaymentOpen(true);
  };

  const handlePaymentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLoan) return;
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      await registerReceivablePayment({
        receivableId: selectedLoan.id,
        amount: Number(formData.get("amount")),
        destinationAccountId,
        paymentDate: formData.get("paymentDate") as string,
        notes: (formData.get("notes") as string) || undefined,
      });
      setPaymentOpen(false);
      setSelectedLoan(null);
      onPaymentRegistered?.();
    });
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {loans.map((loan, index) => {
          const isActive = loan.status === "ACTIVE";
          const statusLabel =
            receivableStatusLabels[
              loan.status as keyof typeof receivableStatusLabels
            ] ?? loan.status;

          return (
            <motion.div
              key={loan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              whileHover={{ y: -4 }}
            >
              <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                        <HandCoins className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{loan.debtorName}</CardTitle>
                        <CardDescription>
                          Prestado el{" "}
                          {new Date(loan.loanDate).toLocaleDateString("es-CO", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        loan.status === "PAID" && "border-emerald-500 text-emerald-600",
                        loan.status === "ACTIVE" && "border-sky-500 text-sky-600"
                      )}
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Capital prestado</p>
                      <p className="font-semibold">
                        {formatCurrency(loan.principalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Saldo pendiente</p>
                      <p className="font-semibold text-amber-600">
                        {formatCurrency(loan.outstandingBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Recuperado</p>
                      <p className="font-semibold text-emerald-600">
                        {formatCurrency(loan.collectedAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tasa de interés</p>
                      <p className="font-semibold">{loan.interestRate}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progreso de cobro</span>
                      <span className="font-medium">
                        {formatPercent(loan.progressPercent)}
                      </span>
                    </div>
                    <Progress value={loan.progressPercent} className="h-2" />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Wallet className="h-3.5 w-3.5" />
                    Desembolsado desde: {loan.sourceAccount}
                  </div>

                  {loan.payments.length > 0 && (
                    <div className="rounded-xl bg-muted/40 p-3 text-sm space-y-2">
                      <p className="font-medium text-muted-foreground">
                        Últimos abonos
                      </p>
                      {loan.payments.slice(0, 3).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex justify-between gap-2"
                        >
                          <span>
                            {new Date(payment.paymentDate).toLocaleDateString(
                              "es-CO"
                            )}{" "}
                            → {payment.destinationAccount}
                          </span>
                          <span className="font-medium text-emerald-600">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {isActive && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => openPayment(loan)}
                        disabled={pending || accounts.length === 0}
                      >
                        Registrar abono
                      </Button>
                    )}
                    {onDelete && loan.payments.length === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deleting}
                        onClick={() => onDelete(loan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar abono</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Deudor: <span className="font-medium">{selectedLoan.debtorName}</span>
                {" · "}
                Pendiente:{" "}
                <span className="font-medium text-amber-600">
                  {formatCurrency(selectedLoan.outstandingBalance)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-2">
                Este abono es un traslado interno: no se registrará como ingreso
                en tus métricas de ganancias.
              </p>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Monto del abono</Label>
                <Input
                  id="payment-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  max={selectedLoan.outstandingBalance}
                  step="0.01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Cuenta receptora</Label>
                <Select
                  value={destinationAccountId}
                  onValueChange={(v) => setDestinationAccountId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="¿A qué cuenta entra el dinero?">
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
              <div className="space-y-2">
                <Label htmlFor="payment-date">Fecha del abono</Label>
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
                <Input id="payment-notes" name="notes" />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={pending || !destinationAccountId}
                >
                  {pending ? "Registrando..." : "Confirmar abono"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
