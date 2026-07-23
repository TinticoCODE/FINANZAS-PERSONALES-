import { addDays, addMonths, addWeeks, addYears, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { RecurrenceFrequency } from "@prisma/client";

export const DEFAULT_TIMEZONE = "America/Bogota";

export type LocalYmd = {
  year: number;
  month: number;
  day: number;
};

/** Instante UTC → reloj local del usuario (Date con componentes locales). */
export function toUserLocalTime(instantUtc: Date, timezone: string): Date {
  return toZonedTime(instantUtc, timezone);
}

/** Medianoche local → instante UTC almacenable en BD. */
export function localMidnightToUtc(
  parts: LocalYmd,
  timezone: string
): Date {
  const local = new Date(parts.year, parts.month, parts.day, 0, 0, 0, 0);
  return fromZonedTime(local, timezone);
}

export function getLocalYmd(instantUtc: Date, timezone: string): LocalYmd {
  const local = toUserLocalTime(instantUtc, timezone);
  return {
    year: local.getFullYear(),
    month: local.getMonth(),
    day: local.getDate(),
  };
}

export function getLocalHour(instantUtc: Date, timezone: string): number {
  return toUserLocalTime(instantUtc, timezone).getHours();
}

/** Mes calendario actual del usuario (mes 1–12). */
export function getCurrentLocalMonth(
  timezone: string,
  instantUtc: Date = new Date()
): { year: number; month: number } {
  const local = getLocalYmd(instantUtc, timezone);
  return { year: local.year, month: local.month + 1 };
}

/** Rango UTC [inicio, fin] de un mes calendario en la TZ del usuario. mes = 1–12. */
export function monthRangeUtc(
  year: number,
  month: number,
  timezone: string
): { start: Date; end: Date } {
  const lastDay = new Date(year, month, 0).getDate();
  const start = localMidnightToUtc({ year, month: month - 1, day: 1 }, timezone);
  const end = fromZonedTime(
    new Date(year, month - 1, lastDay, 23, 59, 59, 999),
    timezone
  );
  return { start, end };
}

export function previousLocalMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function localYmdMatches(
  instantUtc: Date,
  year: number,
  month: number,
  day: number,
  timezone: string
): boolean {
  const local = getLocalYmd(instantUtc, timezone);
  return local.year === year && local.month === month && local.day === day;
}

/** Día efectivo de corte cuando el mes tiene menos días (ej. 31 → 30 en junio). */
export function effectiveCutoffDay(
  cutOffDate: number,
  year: number,
  month: number
): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(cutOffDate, lastDay);
}

/**
 * ¿Es hoy (en TZ del usuario) el primer instante después del cierre?
 * Procesamos a las 00:xx del día siguiente al corte bancario.
 */
export function isCreditCardCutoffProcessingWindow(
  cutOffDate: number,
  timezone: string,
  instantUtc: Date = new Date()
): boolean {
  if (getLocalHour(instantUtc, timezone) !== 0) return false;

  const today = getLocalYmd(instantUtc, timezone);
  const yesterday = addDays(
    new Date(today.year, today.month, today.day),
    -1
  );
  const effective = effectiveCutoffDay(
    cutOffDate,
    yesterday.getFullYear(),
    yesterday.getMonth()
  );
  return yesterday.getDate() === effective;
}

/** Fin de ciclo en UTC para el corte que acaba de cerrar (fin del día de corte local). */
export function cutoffCycleEndUtc(
  cutOffDate: number,
  timezone: string,
  instantUtc: Date = new Date()
): Date {
  const today = getLocalYmd(instantUtc, timezone);
  const y = today.year;
  const m = today.month;
  const d = today.day;
  const yesterdayParts = addDays(new Date(y, m, d), -1);
  const effective = effectiveCutoffDay(
    cutOffDate,
    yesterdayParts.getFullYear(),
    yesterdayParts.getMonth()
  );
  const endLocal = new Date(
    yesterdayParts.getFullYear(),
    yesterdayParts.getMonth(),
    effective,
    23,
    59,
    59,
    999
  );
  return fromZonedTime(endLocal, timezone);
}

export function cutoffCycleStartUtc(cycleEndUtc: Date, cutOffDate: number, timezone: string): Date {
  const endLocal = toUserLocalTime(cycleEndUtc, timezone);
  const prevMonth = addMonths(new Date(endLocal.getFullYear(), endLocal.getMonth(), 1), -1);
  const effective = effectiveCutoffDay(
    cutOffDate,
    prevMonth.getFullYear(),
    prevMonth.getMonth()
  );
  const startLocal = new Date(
    prevMonth.getFullYear(),
    prevMonth.getMonth(),
    effective + 1,
    0,
    0,
    0,
    0
  );
  return fromZonedTime(startLocal, timezone);
}

/** ¿La recurrencia vence según el calendario local del usuario? */
export function isRecurringDue(
  nextRunAtUtc: Date,
  timezone: string,
  instantUtc: Date = new Date()
): boolean {
  if (instantUtc < nextRunAtUtc) return false;
  const dueLocal = getLocalYmd(nextRunAtUtc, timezone);
  const nowLocal = getLocalYmd(instantUtc, timezone);
  if (dueLocal.year !== nowLocal.year) return dueLocal.year < nowLocal.year;
  if (dueLocal.month !== nowLocal.month) return dueLocal.month < nowLocal.month;
  return dueLocal.day <= nowLocal.day;
}

export function computeNextRunAt(params: {
  frequency: RecurrenceFrequency;
  timezone: string;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  monthOfYear?: number | null;
  afterUtc: Date;
}): Date {
  const { frequency, timezone, afterUtc } = params;
  const local = startOfDay(toUserLocalTime(afterUtc, timezone));

  switch (frequency) {
    case "DAILY": {
      const next = addDays(local, 1);
      return localMidnightToUtc(
        { year: next.getFullYear(), month: next.getMonth(), day: next.getDate() },
        timezone
      );
    }
    case "WEEKLY": {
      const targetDow = params.dayOfWeek ?? local.getDay();
      let next = addDays(local, 1);
      while (next.getDay() !== targetDow) {
        next = addDays(next, 1);
      }
      return localMidnightToUtc(
        { year: next.getFullYear(), month: next.getMonth(), day: next.getDate() },
        timezone
      );
    }
    case "MONTHLY": {
      const dom = params.dayOfMonth ?? local.getDate();
      let next = addMonths(local, 1);
      const effective = effectiveCutoffDay(dom, next.getFullYear(), next.getMonth());
      next.setDate(effective);
      return localMidnightToUtc(
        { year: next.getFullYear(), month: next.getMonth(), day: next.getDate() },
        timezone
      );
    }
    case "YEARLY": {
      const dom = params.dayOfMonth ?? local.getDate();
      const moy = (params.monthOfYear ?? local.getMonth() + 1) - 1;
      let next = addYears(local, 1);
      next.setMonth(moy);
      const effective = effectiveCutoffDay(dom, next.getFullYear(), next.getMonth());
      next.setDate(effective);
      return localMidnightToUtc(
        { year: next.getFullYear(), month: next.getMonth(), day: next.getDate() },
        timezone
      );
    }
    default:
      return addDays(afterUtc, 1);
  }
}
