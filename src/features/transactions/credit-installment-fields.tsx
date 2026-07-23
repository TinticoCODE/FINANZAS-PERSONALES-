"use client";

import { useMemo } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  MSI_INSTALLMENT_OPTIONS,
  computeInstallmentAmount,
} from "@/domain/credit/msi.constants";
import { formatCurrency } from "@/lib/format";
import { previewCreditPurchase } from "@/services/credit-card.service";
import { formatUserDate } from "@/utils/dates";
import { useUserTimezone } from "@/contexts/user-timezone-context";

export type CreditCardFormOption = {
  id: string;
  name: string;
  interestRate: number;
  cutOffDate?: number;
  paymentDueDate?: number;
};

type CreditInstallmentFieldsProps = {
  amount: string;
  installments: string;
  onInstallmentsChange: (value: string) => void;
  hasZeroInterest: boolean;
  onHasZeroInterestChange: (value: boolean) => void;
  selectedCard?: CreditCardFormOption;
  purchaseDate: string;
  showDateField?: boolean;
  onPurchaseDateChange?: (value: string) => void;
};

export function CreditInstallmentFields({
  amount,
  installments,
  onInstallmentsChange,
  hasZeroInterest,
  onHasZeroInterestChange,
  selectedCard,
  purchaseDate,
  showDateField = true,
  onPurchaseDateChange,
}: CreditInstallmentFieldsProps) {
  const timezone = useUserTimezone();
  const parsedAmount = Number(amount);
  const parsedInstallments = Math.max(1, Number(installments) || 1);

  const preview = useMemo(() => {
    if (!parsedAmount || parsedAmount <= 0 || !selectedCard) return null;

    const purchaseDateObj = purchaseDate
      ? new Date(`${purchaseDate}T12:00:00`)
      : new Date();

    return previewCreditPurchase(
      parsedAmount,
      parsedInstallments,
      selectedCard.interestRate,
      {
        hasZeroInterest,
        cutOffDate: selectedCard.cutOffDate,
        paymentDueDate: selectedCard.paymentDueDate,
        purchaseDate: purchaseDateObj,
      }
    );
  }, [
    parsedAmount,
    parsedInstallments,
    selectedCard,
    hasZeroInterest,
    purchaseDate,
  ]);

  const handleMsiToggle = (checked: boolean) => {
    onHasZeroInterestChange(checked);
    if (checked && !MSI_INSTALLMENT_OPTIONS.includes(parsedInstallments as 3 | 6 | 9)) {
      onInstallmentsChange("3");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
        <Switch
          id="hasZeroInterest"
          checked={hasZeroInterest}
          onCheckedChange={(checked) => handleMsiToggle(checked === true)}
        />
        <div className="space-y-1">
          <Label htmlFor="hasZeroInterest" className="cursor-pointer font-medium">
            ¿Es una compra a cuotas sin intereses (MSI)?
          </Label>
          <p className="text-xs text-muted-foreground">
            El monto total se refleja en el cupo utilizado, pero esas cuotas no
            generan intereses punitorios.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {hasZeroInterest ? (
          <div className="space-y-2">
            <Label htmlFor="msi-term">Plazo MSI</Label>
            <Select
              value={String(parsedInstallments)}
              onValueChange={(value) => onInstallmentsChange(value ?? "3")}
            >
              <SelectTrigger id="msi-term" className="w-full">
                <span>{parsedInstallments} meses sin intereses</span>
              </SelectTrigger>
              <SelectContent>
                {MSI_INSTALLMENT_OPTIONS.map((term) => (
                  <SelectItem key={term} value={String(term)}>
                    {term} meses sin intereses
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="installments">Número de cuotas</Label>
            <Input
              id="installments"
              name="installments"
              type="number"
              min="1"
              max="48"
              required
              value={installments}
              onChange={(e) => onInstallmentsChange(e.target.value)}
            />
          </div>
        )}

        {showDateField && (
          <div className="space-y-2">
            <Label htmlFor="purchase-date">Fecha de la compra</Label>
            <Input
              id="purchase-date"
              name="date"
              type="date"
              required
              value={purchaseDate}
              onChange={(e) => onPurchaseDateChange?.(e.target.value)}
            />
          </div>
        )}
      </div>

      {preview && (
        <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm space-y-2">
          {preview.isMsi ? (
            <>
              <p className="flex items-center gap-1.5 font-medium text-emerald-600">
                <Sparkles className="h-4 w-4" />
                {parsedInstallments} MSI — 0% interés
              </p>
              <p>
                Cuota mensual:{" "}
                <span className="font-semibold">
                  {formatCurrency(preview.monthlyPayment)}
                </span>
                {" "}
                ({formatCurrency(parsedAmount)} ÷ {parsedInstallments})
              </p>
            </>
          ) : parsedInstallments === 1 ? (
            <p className="font-medium text-emerald-600">
              1 cuota — 0% interés (periodo de gracia)
            </p>
          ) : (
            <>
              <p>
                Cuota mensual proyectada:{" "}
                <span className="font-semibold">
                  {formatCurrency(preview.monthlyPayment)}
                </span>
              </p>
              <p className="text-muted-foreground">
                TEA {selectedCard?.interestRate}% — intereses totales:{" "}
                {formatCurrency(preview.totalInterest)}
              </p>
            </>
          )}

          {preview.paymentDates.length > 0 && (
            <div className="border-t border-border/60 pt-2">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Calendario de pagos proyectado
              </p>
              <ul className="space-y-1 text-xs">
                {preview.paymentDates.map((dueDate, index) => (
                  <li key={dueDate.toISOString()} className="flex justify-between">
                    <span>
                      Cuota {index + 1} ·{" "}
                      {formatUserDate(dueDate.toISOString(), "d MMM yyyy", timezone)}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(preview.schedule[index]?.payment ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Campo oculto para el envío del formulario cuando se usa el selector MSI */}
      {hasZeroInterest && (
        <input type="hidden" name="installments" value={parsedInstallments} />
      )}
    </div>
  );
}

export function buildCreditInstallmentPayload(
  amount: number,
  installments: number,
  hasZeroInterest: boolean
) {
  const totalInstallments = Math.max(1, installments);
  const isInstallments = totalInstallments > 1;
  const zeroInterest = hasZeroInterest && isInstallments;

  return {
    installments: totalInstallments,
    isInstallments,
    hasZeroInterest: zeroInterest,
    installmentAmount: isInstallments
      ? computeInstallmentAmount(amount, totalInstallments)
      : null,
  };
}
