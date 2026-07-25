import {
  buildAmortizationSchedule,
  getCurrentBillingCycle,
  getPaymentDueForCycle,
  getStatementCycleForDate,
  type CreditCardBillingConfig,
  type StatementCycle,
} from "@/services/credit-card.service";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function sameMonthYear(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Avanza al cierre del ciclo de facturación siguiente. */
function nextCycleEnd(cycleEnd: Date, cutOffDate: number): Date {
  let month = cycleEnd.getMonth() + 1;
  let year = cycleEnd.getFullYear();
  if (month > 11) {
    month = 0;
    year += 1;
  }
  const next = clampDay(year, month, cutOffDate);
  next.setHours(23, 59, 59, 999);
  return next;
}

/**
 * Cuenta cuántos cierres de ciclo completos ocurrieron DESPUÉS del ancla
 * hasta la fecha actual (exclusive del ancla, inclusive de ciclos cerrados).
 */
export function countBillingCyclesAdvanced(
  anchorCycleEnd: Date,
  realCurrentDate: Date,
  cutOffDate: number
): number {
  let cycles = 0;
  let cursor = nextCycleEnd(anchorCycleEnd, cutOffDate);

  while (cursor.getTime() <= realCurrentDate.getTime()) {
    cycles += 1;
    cursor = nextCycleEnd(cursor, cutOffDate);
  }

  return cycles;
}

export type ProjectedDebtTransaction = {
  date: Date;
  amount: number;
  installments: number;
  /** Cuota registrada en el extracto / alta (inmutable). */
  currentInstallment: number;
  installmentAmount?: number;
  hasZeroInterest?: boolean;
  /** Fin de ciclo del extracto donde se registró la cuota (opcional). */
  statementCycleEnd?: Date;
};

export type ProjectedDebtResult = {
  recordedCurrentInstallment: number;
  projectedCurrentInstallment: number;
  totalInstallments: number;
  remainingInstallments: number;
  remainingPrincipal: number;
  installmentDueThisCycle: number;
  cyclesAdvanced: number;
  isFullyPaid: boolean;
};

function resolveAnchorCycleEnd(
  transaction: ProjectedDebtTransaction,
  cutOffDate: number
): Date {
  if (transaction.statementCycleEnd) {
    return transaction.statementCycleEnd;
  }
  return getStatementCycleForDate(transaction.date, cutOffDate).cycleEnd;
}

function computeRemainingPrincipal(
  transaction: ProjectedDebtTransaction,
  projectedInstallment: number,
  config: CreditCardBillingConfig
): number {
  const total = Math.max(1, transaction.installments);
  if (projectedInstallment > total) return 0;

  const remainingCount = total - projectedInstallment + 1;
  if (remainingCount <= 0) return 0;

  if (total === 1) {
    return round2(transaction.amount);
  }

  if (transaction.hasZeroInterest) {
    const monthly =
      transaction.installmentAmount ?? round2(transaction.amount / total);
    if (projectedInstallment === total) {
      return round2(monthly);
    }
    return round2(monthly * remainingCount);
  }

  const schedule = buildAmortizationSchedule(
    transaction.amount,
    total,
    config.interestRate,
    false
  );

  return round2(
    schedule
      .slice(projectedInstallment - 1)
      .reduce((sum, row) => sum + row.payment, 0)
  );
}

function computeInstallmentDueThisCycle(
  transaction: ProjectedDebtTransaction,
  projectedInstallment: number,
  config: CreditCardBillingConfig,
  currentCycle: StatementCycle,
  paymentDueDate: Date
): number {
  const total = Math.max(1, transaction.installments);
  if (projectedInstallment > total) return 0;

  if (total === 1) {
    const purchaseCycle = getStatementCycleForDate(
      transaction.date,
      config.cutOffDate
    );
    return purchaseCycle.cycleEnd.getTime() >= currentCycle.cycleStart.getTime() &&
      purchaseCycle.cycleEnd.getTime() <= currentCycle.cycleEnd.getTime()
      ? round2(transaction.amount)
      : 0;
  }

  const purchaseCycle = getStatementCycleForDate(
    transaction.date,
    config.cutOffDate
  );
  const firstDue = getPaymentDueForCycle(
    purchaseCycle.cycleEnd,
    config.cutOffDate,
    config.paymentDueDate
  );

  const dueDates: Date[] = [];
  for (let i = 0; i < total; i++) {
    const due = new Date(firstDue);
    due.setMonth(due.getMonth() + i);
    const normalized = clampDay(
      due.getFullYear(),
      due.getMonth(),
      config.paymentDueDate
    );
    normalized.setHours(23, 59, 59, 999);
    dueDates.push(normalized);
  }

  const dueIndex = projectedInstallment - 1;
  if (dueIndex < 0 || dueIndex >= dueDates.length) return 0;
  if (!sameMonthYear(dueDates[dueIndex], paymentDueDate)) return 0;

  if (transaction.hasZeroInterest) {
    return round2(
      transaction.installmentAmount ??
        transaction.amount / total
    );
  }

  const schedule = buildAmortizationSchedule(
    transaction.amount,
    total,
    config.interestRate,
    false
  );
  return schedule[dueIndex]?.payment ?? 0;
}

/**
 * Motor de proyección de deuda (registros inmutables).
 *
 * Matemática:
 * 1. Ancla = fin del ciclo del extracto (o del ciclo de compra si no hay extracto).
 * 2. cyclesAdvanced = cierres de ciclo completos entre ancla y hoy.
 * 3. projectedInstallment = min(recorded + cyclesAdvanced, totalInstallments).
 * 4. remainingPrincipal = suma de cuotas pendientes desde projectedInstallment.
 * 5. installmentDueThisCycle = cuota del mes si el vencimiento cae en el ciclo actual.
 */
export function calculateProjectedDebt(
  transaction: ProjectedDebtTransaction,
  config: CreditCardBillingConfig,
  realCurrentDate: Date = new Date()
): ProjectedDebtResult {
  const totalInstallments = Math.max(1, transaction.installments);
  const recordedCurrentInstallment = Math.min(
    Math.max(1, transaction.currentInstallment),
    totalInstallments
  );

  const anchorCycleEnd = resolveAnchorCycleEnd(
    transaction,
    config.cutOffDate
  );
  const cyclesAdvanced = countBillingCyclesAdvanced(
    anchorCycleEnd,
    realCurrentDate,
    config.cutOffDate
  );

  const projectedCurrentInstallment = Math.min(
    recordedCurrentInstallment + cyclesAdvanced,
    totalInstallments
  );

  const isFullyPaid =
    recordedCurrentInstallment + cyclesAdvanced > totalInstallments;

  const remainingInstallments = isFullyPaid
    ? 0
    : totalInstallments - projectedCurrentInstallment + 1;

  const remainingPrincipal = isFullyPaid
    ? 0
    : computeRemainingPrincipal(
        transaction,
        projectedCurrentInstallment,
        config
      );

  const currentCycle = getCurrentBillingCycle(
    config.cutOffDate,
    realCurrentDate
  );
  const paymentDueDate = getPaymentDueForCycle(
    currentCycle.cycleEnd,
    config.cutOffDate,
    config.paymentDueDate
  );

  const installmentDueThisCycle = isFullyPaid
    ? 0
    : computeInstallmentDueThisCycle(
        transaction,
        projectedCurrentInstallment,
        config,
        currentCycle,
        paymentDueDate
      );

  return {
    recordedCurrentInstallment,
    projectedCurrentInstallment,
    totalInstallments,
    remainingInstallments,
    remainingPrincipal,
    installmentDueThisCycle,
    cyclesAdvanced,
    isFullyPaid,
  };
}

export type CardProjectedDebtSummary = {
  storedUsedBalance: number;
  projectedRemainingDebt: number;
  projectedPaymentDueThisCycle: number;
  purchaseCount: number;
  activeInstallmentCount: number;
};

export function calculateCardProjectedDebt(
  purchases: ProjectedDebtTransaction[],
  storedUsedBalance: number,
  config: CreditCardBillingConfig,
  realCurrentDate: Date = new Date()
): CardProjectedDebtSummary {
  let projectedRemainingDebt = 0;
  let projectedPaymentDueThisCycle = 0;
  let activeInstallmentCount = 0;

  for (const purchase of purchases) {
    const projection = calculateProjectedDebt(
      purchase,
      config,
      realCurrentDate
    );
    if (!projection.isFullyPaid) {
      projectedRemainingDebt += projection.remainingPrincipal;
      projectedPaymentDueThisCycle += projection.installmentDueThisCycle;
      if (projection.totalInstallments > 1) activeInstallmentCount += 1;
    }
  }

  return {
    storedUsedBalance: round2(storedUsedBalance),
    projectedRemainingDebt: round2(projectedRemainingDebt),
    projectedPaymentDueThisCycle: round2(projectedPaymentDueThisCycle),
    purchaseCount: purchases.length,
    activeInstallmentCount,
  };
}
