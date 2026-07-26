import { addDays, addMonths, differenceInCalendarDays, startOfDay } from "date-fns";
import {
  effectiveCutoffDay,
  getLocalYmd,
  type LocalYmd,
  toUserLocalTime,
} from "@/domain/billing/timezone";

export type StatementCycle = {
  /** Fecha local (componentes en zona del usuario) inicio del ciclo 00:00:00 */
  cycleStart: Date;
  /** Fecha local fin del ciclo 23:59:59.999 */
  cycleEnd: Date;
};

export type UpcomingBillingDates = {
  nextCutoffLocal: Date;
  nextPaymentDueLocal: Date;
  daysToCutoff: number;
  daysToPayment: number;
  activeCycle: StatementCycle;
};

function localDateAtEndOfDay(parts: LocalYmd): Date {
  return new Date(parts.year, parts.month, parts.day, 23, 59, 59, 999);
}

function localDateAtStartOfDay(parts: LocalYmd): Date {
  return new Date(parts.year, parts.month, parts.day, 0, 0, 0, 0);
}

function localYmdFromDate(local: Date): LocalYmd {
  return {
    year: local.getFullYear(),
    month: local.getMonth(),
    day: local.getDate(),
  };
}

function cycleEndLocalYmd(local: LocalYmd, cutOffDate: number): LocalYmd {
  const effective = effectiveCutoffDay(cutOffDate, local.year, local.month);
  if (local.day > effective) {
    const next = addMonths(new Date(local.year, local.month, 1), 1);
    return {
      year: next.getFullYear(),
      month: next.getMonth(),
      day: effectiveCutoffDay(cutOffDate, next.getFullYear(), next.getMonth()),
    };
  }
  return { year: local.year, month: local.month, day: effective };
}

function cycleStartFromEnd(end: LocalYmd, cutOffDate: number): LocalYmd {
  const prev = addMonths(new Date(end.year, end.month, 1), -1);
  const effective = effectiveCutoffDay(cutOffDate, prev.getFullYear(), prev.getMonth());
  const start = addDays(new Date(prev.getFullYear(), prev.getMonth(), effective), 1);
  return localYmdFromDate(start);
}

/** Ciclo de facturación que contiene una fecha local del usuario. */
export function getStatementCycleForLocalDate(
  local: LocalYmd,
  cutOffDate: number
): StatementCycle {
  const endParts = cycleEndLocalYmd(local, cutOffDate);
  const startParts = cycleStartFromEnd(endParts, cutOffDate);
  return {
    cycleStart: localDateAtStartOfDay(startParts),
    cycleEnd: localDateAtEndOfDay(endParts),
  };
}

/** Ciclo activo respecto a "hoy" en la zona horaria del usuario. */
export function getCurrentBillingCycle(
  cutOffDate: number,
  timezone: string,
  instantUtc: Date = new Date()
): StatementCycle {
  const local = getLocalYmd(instantUtc, timezone);
  return getStatementCycleForLocalDate(local, cutOffDate);
}

/** Ciclo que contiene una compra (instante UTC → local → ciclo). */
export function getStatementCycleForInstant(
  purchaseInstantUtc: Date,
  cutOffDate: number,
  timezone: string
): StatementCycle {
  const local = getLocalYmd(purchaseInstantUtc, timezone);
  return getStatementCycleForLocalDate(local, cutOffDate);
}

/**
 * Fecha límite de pago asociada al cierre de un ciclo.
 * cycleEndLocal debe ser fecha local (fin de ciclo).
 */
export function getPaymentDueForCycle(
  cycleEndLocal: Date,
  cutOffDate: number,
  paymentDueDate: number
): Date {
  let payMonth = cycleEndLocal.getMonth();
  let payYear = cycleEndLocal.getFullYear();

  if (paymentDueDate <= cutOffDate) {
    const next = addMonths(new Date(payYear, payMonth, 1), 1);
    payMonth = next.getMonth();
    payYear = next.getFullYear();
  }

  const effective = effectiveCutoffDay(paymentDueDate, payYear, payMonth);
  return localDateAtEndOfDay({ year: payYear, month: payMonth, day: effective });
}

/** Próxima fecha de pago sin intereses a partir de hoy (avanza ciclo si ya venció). */
export function getCurrentPaymentDueDate(
  cutOffDate: number,
  paymentDueDate: number,
  timezone: string,
  instantUtc: Date = new Date()
): Date {
  const todayLocal = startOfDay(toUserLocalTime(instantUtc, timezone));
  let cycle = getCurrentBillingCycle(cutOffDate, timezone, instantUtc);
  let due = getPaymentDueForCycle(cycle.cycleEnd, cutOffDate, paymentDueDate);

  let guard = 0;
  while (due < todayLocal && guard < 24) {
    const endParts = localYmdFromDate(cycle.cycleEnd);
    const nextEnd = addMonths(new Date(endParts.year, endParts.month, endParts.day), 1);
    const nextEndParts: LocalYmd = {
      year: nextEnd.getFullYear(),
      month: nextEnd.getMonth(),
      day: effectiveCutoffDay(cutOffDate, nextEnd.getFullYear(), nextEnd.getMonth()),
    };
    cycle = {
      cycleStart: localDateAtStartOfDay(cycleStartFromEnd(nextEndParts, cutOffDate)),
      cycleEnd: localDateAtEndOfDay(nextEndParts),
    };
    due = getPaymentDueForCycle(cycle.cycleEnd, cutOffDate, paymentDueDate);
    guard += 1;
  }

  return due;
}

/** Próximo día de corte (si hoy ya pasó el corte del mes, el del mes siguiente). */
export function getNextCutoffDate(
  cutOffDate: number,
  timezone: string,
  instantUtc: Date = new Date()
): Date {
  const local = getLocalYmd(instantUtc, timezone);
  const effective = effectiveCutoffDay(cutOffDate, local.year, local.month);

  if (local.day > effective) {
    const next = addMonths(new Date(local.year, local.month, 1), 1);
    return localDateAtEndOfDay({
      year: next.getFullYear(),
      month: next.getMonth(),
      day: effectiveCutoffDay(cutOffDate, next.getFullYear(), next.getMonth()),
    });
  }

  return localDateAtEndOfDay({
    year: local.year,
    month: local.month,
    day: effective,
  });
}

export function getUpcomingBillingDates(
  cutOffDate: number,
  paymentDueDate: number,
  timezone: string,
  instantUtc: Date = new Date()
): UpcomingBillingDates {
  const todayLocal = startOfDay(toUserLocalTime(instantUtc, timezone));
  const nextCutoffLocal = getNextCutoffDate(cutOffDate, timezone, instantUtc);
  const nextPaymentDueLocal = getCurrentPaymentDueDate(
    cutOffDate,
    paymentDueDate,
    timezone,
    instantUtc
  );
  const activeCycle = getCurrentBillingCycle(cutOffDate, timezone, instantUtc);

  return {
    nextCutoffLocal,
    nextPaymentDueLocal,
    daysToCutoff: Math.max(
      0,
      differenceInCalendarDays(startOfDay(nextCutoffLocal), todayLocal)
    ),
    daysToPayment: Math.max(
      0,
      differenceInCalendarDays(startOfDay(nextPaymentDueLocal), todayLocal)
    ),
    activeCycle,
  };
}

function sameMonthYear(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Fechas de vencimiento de cada cuota según corte y calendario de pago. */
export function getInstallmentPaymentDates(
  purchaseInstantUtc: Date,
  installments: number,
  cutOffDate: number,
  paymentDueDate: number,
  timezone: string
): Date[] {
  const { cycleEnd } = getStatementCycleForInstant(
    purchaseInstantUtc,
    cutOffDate,
    timezone
  );
  const firstPayment = getPaymentDueForCycle(cycleEnd, cutOffDate, paymentDueDate);

  const dates: Date[] = [];
  for (let i = 0; i < installments; i++) {
    const due = addMonths(firstPayment, i);
    const effective = effectiveCutoffDay(
      paymentDueDate,
      due.getFullYear(),
      due.getMonth()
    );
    dates.push(
      localDateAtEndOfDay({
        year: due.getFullYear(),
        month: due.getMonth(),
        day: effective,
      })
    );
  }
  return dates;
}

export function isWithinCycle(
  instantUtc: Date,
  cycle: StatementCycle,
  timezone: string
): boolean {
  const local = startOfDay(toUserLocalTime(instantUtc, timezone));
  return local >= startOfDay(cycle.cycleStart) && local <= cycle.cycleEnd;
}

export { sameMonthYear };

/** Fin del ciclo siguiente al cycleEnd dado (fecha local). */
export function advanceCycleEnd(cycleEndLocal: Date, cutOffDate: number): Date {
  const next = addMonths(
    new Date(cycleEndLocal.getFullYear(), cycleEndLocal.getMonth(), 1),
    1
  );
  return localDateAtEndOfDay({
    year: next.getFullYear(),
    month: next.getMonth(),
    day: effectiveCutoffDay(cutOffDate, next.getFullYear(), next.getMonth()),
  });
}
