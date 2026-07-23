"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMonths } from "date-fns";
import { AlertTriangle, HandCoins, Plus, TrendingUp, Users, Wallet } from "lucide-react";
import type { InterestType } from "@prisma/client";
import { createLoan, deleteLoan } from "@/actions/finance.actions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ReceivableList } from "@/features/loans/receivable-list";
import {
  calculateExpectedReturn,
  computeLoansSummary,
  filterLoansByTab,
  type LoanTab,
} from "@/domain/loans/loan-calculations";
import { todayIsoInTimezone } from "@/utils/dates";
import { useUserTimezone } from "@/contexts/user-timezone-context";
import { formatCurrency } from "@/lib/format";
import { interestTypeLabels } from "@/lib/labels";
import type { LoanData } from "@/types";

type AccountOption = { id: string; name: string };

type LoansViewProps = {
  loans: LoanData[];
  accounts: AccountOption[];
};

function defaultDueDateIso(fromIso: string): string {
  const [year, month, day] = fromIso.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, day));
  const due = addMonths(base, 1);
  const y = due.getUTCFullYear();
  const m = String(due.getUTCMonth() + 1).padStart(2, "0");
  const d = String(due.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function LoansView({ loans, accounts }: LoansViewProps) {
  const router = useRouter();
  const timezone = useUserTimezone();
  const todayIso = useMemo(() => todayIsoInTimezone(timezone), [timezone]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [interestType, setInterestType] = useState<InterestType>("FLAT");
  const [loanDate, setLoanDate] = useState(todayIso);
  const [dueDate, setDueDate] = useState(defaultDueDateIso(todayIso));
  const [principalPreview, setPrincipalPreview] = useState("");
  const [interestRatePreview, setInterestRatePreview] = useState("0");
  const [activeTab, setActiveTab] = useState<LoanTab>("active");
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === sourceAccountId);

  const expectedReturnPreview = useMemo(() => {
    const principal = Number(principalPreview);
    const rate = Number(interestRatePreview || 0);
    if (!principal || principal <= 0) return 0;

    const [ly, lm, ld] = loanDate.split("-").map(Number);
    const [dy, dm, dd] = dueDate.split("-").map(Number);
    const loanDateObj = new Date(Date.UTC(ly, lm - 1, ld));
    const dueDateObj = new Date(Date.UTC(dy, dm - 1, dd));

    return calculateExpectedReturn(principal, rate, interestType, loanDateObj, dueDateObj);
  }, [principalPreview, interestRatePreview, interestType, loanDate, dueDate]);

  const tabCounts = useMemo(
    () => ({
      active: filterLoansByTab(loans, "active", todayIso).length,
      overdue: filterLoansByTab(loans, "overdue", todayIso).length,
      closed: filterLoansByTab(loans, "closed", todayIso).length,
    }),
    [loans, todayIso]
  );

  const filteredLoans = useMemo(
    () => filterLoansByTab(loans, activeTab, todayIso),
    [loans, activeTab, todayIso]
  );

  const tabSummary = useMemo(
    () => computeLoansSummary(filteredLoans),
    [filteredLoans]
  );

  function resetForm() {
    setSourceAccountId("");
    setInterestType("FLAT");
    setLoanDate(todayIso);
    setDueDate(defaultDueDateIso(todayIso));
    setPrincipalPreview("");
    setInterestRatePreview("0");
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
      const result = await createLoan({
        debtorName: formData.get("debtorName") as string,
        principalAmount,
        sourceAccountId,
        loanDate: formData.get("loanDate") as string,
        dueDate: formData.get("dueDate") as string,
        interestRate: Number(formData.get("interestRate") || 0),
        interestType,
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
        await deleteLoan(id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al eliminar");
      }
    });
  };

  const summaryCards = [
    {
      label: "Dinero en la calle",
      value: tabSummary.totalOutstanding,
      icon: HandCoins,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      label: "Total prestado",
      value: tabSummary.totalPrincipalLent,
      icon: Wallet,
      color: "text-sky-600",
      bg: "bg-sky-500/10",
    },
    {
      label: "Total a recuperar",
      value: tabSummary.totalExpectedReturn,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-500/10",
    },
    {
      label: "Total recuperado",
      value: tabSummary.totalCollected,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: activeTab === "closed" ? "Préstamos cerrados" : "Préstamos en vista",
      value: filteredLoans.length,
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
        description="Capital + intereses — saldo pendiente sobre el monto total a recuperar"
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
                    <Label htmlFor="principalAmount">Capital prestado</Label>
                    <Input
                      id="principalAmount"
                      name="principalAmount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={principalPreview}
                      onChange={(e) => setPrincipalPreview(e.target.value)}
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
                      value={interestRatePreview}
                      onChange={(e) => setInterestRatePreview(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestType">Tipo de interés</Label>
                  <Select
                    value={interestType}
                    onValueChange={(value) => setInterestType((value ?? "FLAT") as InterestType)}
                  >
                    <SelectTrigger id="interestType" className="w-full">
                      <span className="flex-1 truncate text-left">
                        {interestTypeLabels[interestType]}
                      </span>
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {(Object.keys(interestTypeLabels) as InterestType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {interestTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="loanDate">Fecha del préstamo</Label>
                    <Input
                      id="loanDate"
                      name="loanDate"
                      type="date"
                      value={loanDate}
                      onChange={(e) => setLoanDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Fecha de vencimiento</Label>
                    <Input
                      id="dueDate"
                      name="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      min={loanDate}
                      required
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
                  <p className="text-muted-foreground">Total a recuperar (capital + intereses)</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(expectedReturnPreview)}
                  </p>
                  {expectedReturnPreview > Number(principalPreview || 0) && (
                    <p className="text-xs text-muted-foreground">
                      Intereses estimados:{" "}
                      {formatCurrency(
                        expectedReturnPreview - Number(principalPreview || 0)
                      )}
                    </p>
                  )}
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
                  El saldo pendiente se calcula sobre capital + intereses. Solo se
                  marca como pagado cuando se cubren ambos rubros.
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab((value ?? "active") as LoanTab)}
        >
          <TabsList>
            <TabsTrigger value="active">Activos ({tabCounts.active})</TabsTrigger>
            <TabsTrigger value="overdue">En mora ({tabCounts.overdue})</TabsTrigger>
            <TabsTrigger value="closed">Cerrados ({tabCounts.closed})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredLoans.length === 0 ? (
              <EmptyState
                title={
                  activeTab === "active"
                    ? "Sin préstamos activos"
                    : activeTab === "overdue"
                      ? "Sin préstamos en mora"
                      : "Sin préstamos cerrados"
                }
                description={
                  activeTab === "active"
                    ? "Registra un préstamo o revisa las otras pestañas."
                    : activeTab === "overdue"
                      ? "Ningún préstamo activo superó su fecha de vencimiento."
                      : "Aún no hay préstamos totalmente pagados (capital + intereses)."
                }
                actionLabel={activeTab === "active" ? "Nuevo préstamo" : undefined}
                onAction={activeTab === "active" ? () => setOpen(true) : undefined}
              />
            ) : (
              <ReceivableList
                loans={filteredLoans}
                accounts={accounts}
                onDelete={handleDelete}
                onPaymentRegistered={() => router.refresh()}
                deleting={pending}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
