"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Plus, TrendingUp, Users, Wallet } from "lucide-react";
import {
  createAccountReceivable,
  deleteAccountReceivable,
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
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ReceivableList } from "@/features/loans/receivable-list";
import { todayIsoInTimezone } from "@/utils/dates";
import { useUserTimezone } from "@/contexts/user-timezone-context";
import { formatCurrency } from "@/lib/format";
import type { AccountReceivableData, LoansSummaryData } from "@/types";

type AccountOption = { id: string; name: string };

type LoansViewProps = {
  loans: AccountReceivableData[];
  summary: LoansSummaryData;
  accounts: AccountOption[];
};

export function LoansView({ loans, summary, accounts }: LoansViewProps) {
  const router = useRouter();
  const timezone = useUserTimezone();
  const todayIso = useMemo(() => todayIsoInTimezone(timezone), [timezone]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === sourceAccountId);

  function resetForm() {
    setSourceAccountId("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    setOpen(next);
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const principalAmount = Number(formData.get("principalAmount"));
    if (!sourceAccountId) {
      setError("Selecciona la cuenta de origen del dinero");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createAccountReceivable({
        debtorName: formData.get("debtorName") as string,
        principalAmount,
        sourceAccountId,
        loanDate: formData.get("loanDate") as string,
        interestRate: Number(formData.get("interestRate") || 0),
        notes: (formData.get("notes") as string) || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteAccountReceivable(id);
        router.refresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Error al eliminar");
      }
    });
  };

  const summaryCards = [
    {
      label: "Dinero en la calle",
      value: summary.totalOutstanding,
      icon: HandCoins,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      label: "Total prestado",
      value: summary.totalPrincipalLent,
      icon: Wallet,
      color: "text-sky-600",
      bg: "bg-sky-500/10",
    },
    {
      label: "Total recuperado",
      value: summary.totalCollected,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Deudores activos",
      value: summary.activeLoans,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-500/10",
      isCount: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Préstamos a terceros"
        description="Cuentas por cobrar — activos fuera de tus cuentas bancarias"
        action={
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
              render={
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={accounts.length === 0}
                >
                  <Plus className="h-4 w-4" />
                  Nuevo préstamo
                </Button>
              }
            />
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nuevo préstamo a tercero</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="debtorName">Nombre del deudor</Label>
                  <Input id="debtorName" name="debtorName" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="principalAmount">Monto prestado</Label>
                    <Input
                      id="principalAmount"
                      name="principalAmount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interestRate">Tasa de interés (%)</Label>
                    <Input
                      id="interestRate"
                      name="interestRate"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loanDate">Fecha del préstamo</Label>
                  <Input
                    id="loanDate"
                    name="loanDate"
                    type="date"
                    defaultValue={todayIso}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loan-source-account">Cuenta bancaria de origen</Label>
                  <Select
                    value={sourceAccountId}
                    onValueChange={(v) => {
                      setSourceAccountId(v ?? "");
                      setError(null);
                    }}
                  >
                    <SelectTrigger id="loan-source-account" className="w-full">
                      <span className="flex-1 truncate text-left">
                        {selectedAccount ? (
                          selectedAccount.name
                        ) : (
                          <span className="text-muted-foreground">
                            ¿Desde qué cuenta salió el dinero?
                          </span>
                        )}
                      </span>
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                  Queda registrado como activo en cuentas por cobrar. No es un
                  gasto y no afecta tus ingresos del mes.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea id="notes" name="notes" rows={2} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={pending || !sourceAccountId}>
                    {pending ? "Registrando..." : "Registrar préstamo"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}
                >
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-semibold">
                    {card.isCount
                      ? card.value
                      : formatCurrency(card.value as number)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title="Crea una cuenta bancaria primero"
          description="Necesitas al menos una cuenta para registrar de dónde sale el dinero prestado."
          actionLabel="Ir a cuentas"
          onAction={() => router.push("/accounts")}
        />
      ) : loans.length === 0 ? (
        <EmptyState
          title="Sin préstamos registrados"
          description="Registra dinero prestado a terceros y lleva el control de abonos sin distorsionar tus ingresos."
          actionLabel="Nuevo préstamo"
          onAction={() => setOpen(true)}
        />
      ) : (
        <ReceivableList
          loans={loans}
          accounts={accounts}
          onDelete={handleDelete}
          onPaymentRegistered={() => router.refresh()}
          deleting={pending}
        />
      )}
    </div>
  );
}
