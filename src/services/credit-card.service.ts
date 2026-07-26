/**
 * Motor de crédito revolvente para tarjetas de crédito.
 * TEA = Tasa Efectiva Anual (%). Cuota única = 0% interés (periodo de gracia).
 * Fechas de corte/pago: src/domain/billing/credit-card-billing.ts
 */

import {
  getCurrentBillingCycle,
  getCurrentPaymentDueDate,
  getInstallmentPaymentDates,
  getPaymentDueForCycle,
  getStatementCycleForInstant,
  isWithinCycle,
  sameMonthYear,
  type StatementCycle,
} from "@/domain/billing/credit-card-billing";

export type { StatementCycle };

export type CreditCardBillingConfig = {
  cutOffDate: number;
  paymentDueDate: number;
  interestRate: number;
};

export type CreditCardPurchase = {
  date: Date;
  amount: number;
  installments: number;
  isInstallments?: boolean;
  installmentAmount?: number;
  hasZeroInterest?: boolean;
};

export type InstallmentBreakdown = {
  installmentNumber: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
};

export type PaymentToAvoidInterest = {
  total: number;
  singleInstallmentCurrentCycle: number;
  deferredInstallmentsDue: number;
  msiInstallmentsDue: number;
  cycle: StatementCycle;
  paymentDueDate: Date;
  installmentPreview?: InstallmentBreakdown[];
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Convierte TEA (%) a tasa mensual efectiva (decimal). */
export function teaToMonthlyRate(teaPercent: number): number {
  if (teaPercent <= 0) return 0;
  return Math.pow(1 + teaPercent / 100, 1 / 12) - 1;
}

/** Convierte TEA (%) a Tasa Mensual Vencida M.V. (%) para mostrar en la interfaz. */
export function teaToMonthlyPercent(teaPercent: number): number {
  return round2(teaToMonthlyRate(teaPercent) * 100);
}

/** Amortización francesa. Cuota 1 = 0% interés en pago único. MSI = cuotas iguales sin interés. */
export function buildAmortizationSchedule(
  principal: number,
  installments: number,
  teaPercent: number,
  hasZeroInterest = false
): InstallmentBreakdown[] {
  if (installments <= 1) {
    return [
      {
        installmentNumber: 1,
        payment: round2(principal),
        principal: round2(principal),
        interest: 0,
        remainingBalance: 0,
      },
    ];
  }

  if (hasZeroInterest || teaPercent <= 0) {
    return buildZeroInterestSchedule(principal, installments);
  }

  const monthlyRate = teaToMonthlyRate(teaPercent);
  const payment =
    monthlyRate === 0
      ? principal / installments
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, installments)) /
        (Math.pow(1 + monthlyRate, installments) - 1);

  const schedule: InstallmentBreakdown[] = [];
  let balance = principal;

  for (let i = 1; i <= installments; i++) {
    const interest = balance * monthlyRate;
    const principalPart = payment - interest;
    balance = Math.max(0, balance - principalPart);
    schedule.push({
      installmentNumber: i,
      payment: round2(payment),
      principal: round2(principalPart),
      interest: round2(interest),
      remainingBalance: round2(balance),
    });
  }

  return schedule;
}

/** Cuotas iguales sin interés (MSI). */
export function buildZeroInterestSchedule(
  principal: number,
  installments: number
): InstallmentBreakdown[] {
  const basePayment = round2(principal / installments);
  const schedule: InstallmentBreakdown[] = [];
  let remaining = principal;

  for (let i = 1; i <= installments; i++) {
    const payment = i === installments ? round2(remaining) : basePayment;
    remaining = round2(Math.max(remaining - payment, 0));
    schedule.push({
      installmentNumber: i,
      payment,
      principal: payment,
      interest: 0,
      remainingBalance: remaining,
    });
  }

  return schedule;
}

function getDueInstallmentAmount(
  purchase: CreditCardPurchase,
  config: CreditCardBillingConfig,
  paymentDueDate: Date,
  timezone: string
): number {
  const installments = Math.max(1, purchase.installments);
  if (installments === 1) return purchase.amount;

  const paymentDates = getInstallmentPaymentDates(
    purchase.date,
    installments,
    config.cutOffDate,
    config.paymentDueDate,
    timezone
  );
  const dueIndex = paymentDates.findIndex((d) => sameMonthYear(d, paymentDueDate));
  if (dueIndex < 0 || dueIndex >= installments) return 0;

  if (purchase.hasZeroInterest) {
    return (
      purchase.installmentAmount ?? round2(purchase.amount / installments)
    );
  }

  const schedule = buildAmortizationSchedule(
    purchase.amount,
    installments,
    config.interestRate,
    false
  );
  return schedule[dueIndex]?.payment ?? 0;
}

/** @deprecated Usar getStatementCycleForInstant desde credit-card-billing */
export function getStatementCycleForDate(
  transactionDate: Date,
  cutOffDate: number
): StatementCycle {
  return getStatementCycleForInstant(transactionDate, cutOffDate, "America/Bogota");
}

export {
  getCurrentBillingCycle,
  getCurrentPaymentDueDate,
  getPaymentDueForCycle,
  getInstallmentPaymentDates,
} from "@/domain/billing/credit-card-billing";

/**
 * Pago total para no generar intereses en el ciclo vigente:
 * (Compras a 1 cuota del ciclo actual) + (Cuota mensual de compras diferidas de ciclos anteriores).
 */
export function calculatePaymentToAvoidInterest(
  config: CreditCardBillingConfig,
  purchases: CreditCardPurchase[],
  timezone: string,
  instantUtc: Date = new Date()
): PaymentToAvoidInterest {
  const cycle = getCurrentBillingCycle(config.cutOffDate, timezone, instantUtc);
  const paymentDueDate = getPaymentDueForCycle(
    cycle.cycleEnd,
    config.cutOffDate,
    config.paymentDueDate
  );

  let singleInstallmentCurrentCycle = 0;
  let deferredInstallmentsDue = 0;
  let msiInstallmentsDue = 0;

  for (const purchase of purchases) {
    const installments = Math.max(1, purchase.installments);

    if (installments === 1) {
      if (isWithinCycle(purchase.date, cycle, timezone)) {
        singleInstallmentCurrentCycle += purchase.amount;
      }
      continue;
    }

    const purchaseCycle = getStatementCycleForInstant(
      purchase.date,
      config.cutOffDate,
      timezone
    );
    const isFromPreviousCycle = purchaseCycle.cycleEnd < cycle.cycleStart;

    if (!isFromPreviousCycle) continue;

    const dueAmount = getDueInstallmentAmount(
      purchase,
      config,
      paymentDueDate,
      timezone
    );

    if (dueAmount <= 0) continue;

    if (purchase.hasZeroInterest) {
      msiInstallmentsDue += dueAmount;
    } else {
      deferredInstallmentsDue += dueAmount;
    }
  }

  return {
    total: round2(
      singleInstallmentCurrentCycle + deferredInstallmentsDue + msiInstallmentsDue
    ),
    singleInstallmentCurrentCycle: round2(singleInstallmentCurrentCycle),
    deferredInstallmentsDue: round2(deferredInstallmentsDue + msiInstallmentsDue),
    msiInstallmentsDue: round2(msiInstallmentsDue),
    cycle,
    paymentDueDate,
  };
}

/** Proyección al registrar una compra nueva (vista previa en formulario). */
export function previewCreditPurchase(
  amount: number,
  installments: number,
  teaPercent: number,
  options?: {
    hasZeroInterest?: boolean;
    cutOffDate?: number;
    paymentDueDate?: number;
    purchaseDate?: Date;
    timezone?: string;
  }
): {
  schedule: InstallmentBreakdown[];
  monthlyPayment: number;
  totalInterest: number;
  hasInterest: boolean;
  paymentDates: Date[];
  isMsi: boolean;
} {
  const hasZeroInterest = options?.hasZeroInterest ?? false;
  const timezone = options?.timezone ?? "America/Bogota";
  const schedule = buildAmortizationSchedule(
    amount,
    installments,
    teaPercent,
    hasZeroInterest
  );
  const totalInterest = round2(
    schedule.reduce((sum, row) => sum + row.interest, 0)
  );

  const paymentDates =
    installments > 1 &&
    options?.cutOffDate &&
    options?.paymentDueDate &&
    options?.purchaseDate
      ? getInstallmentPaymentDates(
          options.purchaseDate,
          installments,
          options.cutOffDate,
          options.paymentDueDate,
          timezone
        )
      : [];

  return {
    schedule,
    monthlyPayment: schedule[0]?.payment ?? amount,
    totalInterest,
    hasInterest: installments > 1 && !hasZeroInterest && teaPercent > 0,
    paymentDates,
    isMsi: hasZeroInterest && installments > 1,
  };
}
