"use client";

import { useState } from "react";
import { AlertTriangle, Calendar, CreditCard, Info, Trash2, Wallet } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatPercent } from "@/lib/format";
import { teaToMonthlyPercent } from "@/services/credit-card.service";
import { cn } from "@/lib/utils";
import { CreditCardPaymentDialog } from "@/features/cards/credit-card-payment-dialog";
import type { AccountData, CreditCardData } from "@/types";

type CreditCardItemProps = {
  card: CreditCardData;
  accounts: AccountData[];
  onDelete?: (id: string) => void;
  deleting?: boolean;
};

function normalizeCardName(name: string): string {
  return name.replace(/\bRAPPY\s+CARD\b/i, "RAPPI CARD");
}

function getUtilizationTone(utilization: number) {
  if (utilization > 70) {
    return {
      balance: "text-red-600 dark:text-red-400",
      progress: "text-red-600",
      label: "Crítico",
    };
  }
  if (utilization > 30) {
    return {
      balance: "text-amber-600 dark:text-amber-400",
      progress: "text-amber-600",
      label: "Alerta",
    };
  }
  return {
    balance: "text-foreground",
    progress: "text-primary",
    label: "Saludable",
  };
}

export function CreditCardItem({
  card,
  accounts,
  onDelete,
  deleting,
}: CreditCardItemProps) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const displayName = normalizeCardName(card.name);

  const projectedDebt = card.projectedRemainingDebt ?? card.usedBalance;

  const utilization =
    card.creditLimit > 0 ? (card.usedBalance / card.creditLimit) * 100 : 0;
  const available = Math.max(card.creditLimit - card.usedBalance, 0);
  const daysToCutoff = card.daysToCutoff ?? 0;
  const daysToPayment = card.daysToPayment ?? 0;
  const recommendedPayment = card.paymentToAvoidInterest ?? card.usedBalance * 0.3;
  const minPayment = card.minPayment ?? card.usedBalance * 0.05;
  const singleInstallmentDue =
    card.singleInstallmentDue ?? Math.round(card.usedBalance * 0.45 * 100) / 100;
  const msiInstallmentsDue = card.msiInstallmentsDue ?? 0;
  const interestBearingDeferred = Math.max(
    (card.deferredInstallmentsDue ?? 0) - msiInstallmentsDue,
    0
  );
  const deferredInstallmentsDue =
    card.deferredInstallmentsDue ?? Math.max(card.usedBalance - singleInstallmentDue, 0);
  const monthlyRate = teaToMonthlyPercent(card.interestRate);
  const tone = getUtilizationTone(utilization);
  const isHighUtilization = utilization > 70;
  const isPaymentSoon = daysToPayment <= 5;

  return (
    <Card className="overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm">
      <div
        className="h-2"
        style={{ background: `linear-gradient(90deg, ${card.color}, ${card.color}80)` }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{displayName}</CardTitle>
            <CardDescription>
              {card.bank} •••• {card.lastFourDigits}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={deleting}
                onClick={() => onDelete(card.id)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saldo utilizado (registrado)
            </p>
            <p className={cn("text-3xl font-bold tracking-tight", tone.balance)}>
              {formatCurrency(card.usedBalance)}
            </p>
            {card.projectedRemainingDebt !== undefined &&
              Math.abs(card.projectedRemainingDebt - card.usedBalance) > 1 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Deuda proyectada hoy:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(projectedDebt)}
                  </span>
                </p>
              )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Utilización del cupo</span>
              <span
                className={cn(
                  "font-medium",
                  utilization > 30 && "text-amber-600",
                  utilization > 70 && "text-red-600"
                )}
              >
                {formatPercent(utilization)}
              </span>
            </div>
            <Progress value={utilization} className="h-2.5" />
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>
              Cupo total{" "}
              <span className="font-medium text-foreground/80">
                {formatCurrency(card.creditLimit)}
              </span>
            </span>
            <span>
              Disponible{" "}
              <span className="font-medium text-foreground/80">
                {formatCurrency(available)}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Tasa E.A.</span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex text-muted-foreground hover:text-foreground"
                    aria-label="Ver equivalente mensual vencido"
                  />
                }
              >
                <Info className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-left">
                <p className="font-medium">Equivalente M.V.</p>
                <p className="mt-1 opacity-90">
                  {formatPercent(monthlyRate)} mensual vencido
                </p>
                <p className="mt-1 text-[10px] opacity-75">
                  M.V. = (1 + E.A.)^(1/12) − 1
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="font-semibold">{formatPercent(card.interestRate)} E.A.</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Corte en {daysToCutoff} días
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 text-muted-foreground",
              isPaymentSoon && "border-amber-500 text-amber-600"
            )}
          >
            <Calendar className="h-3 w-3" />
            Pago en {daysToPayment} días
          </Badge>
          {isHighUtilization && (
            <Badge variant="outline" className="gap-1 border-red-500 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              {tone.label}
            </Badge>
          )}
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value={`debt-${card.id}`}>
            <AccordionTrigger itemValue={`debt-${card.id}`}>
              Ver detalles de deuda
            </AccordionTrigger>
            <AccordionContent itemValue={`debt-${card.id}`} className="space-y-3">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Pago mínimo</span>
                <span className="font-medium">{formatCurrency(minPayment)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Pago para no generar intereses
                </span>
                <span className="font-semibold">{formatCurrency(recommendedPayment)}</span>
              </div>
              <div className="space-y-2 border-t border-border/60 pt-3">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    Compras a 1 cuota (Sin interés)
                  </span>
                  <span>{formatCurrency(singleInstallmentDue)}</span>
                </div>
                {msiInstallmentsDue > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      Cuotas MSI del mes (0% interés)
                    </span>
                    <span className="text-emerald-600">
                      {formatCurrency(msiInstallmentsDue)}
                    </span>
                  </div>
                )}
                {interestBearingDeferred > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      Compras diferidas (Generando interés)
                    </span>
                    <span className="text-amber-600">
                      {formatCurrency(interestBearingDeferred)}
                    </span>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {card.usedBalance > 0 && (
          <Button
            type="button"
            className="w-full gap-2"
            onClick={() => setPaymentOpen(true)}
            disabled={accounts.length === 0}
          >
            <Wallet className="h-4 w-4" />
            Pagar tarjeta
          </Button>
        )}
      </CardContent>

      <CreditCardPaymentDialog
        card={card}
        accounts={accounts}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      />
    </Card>
  );
}
