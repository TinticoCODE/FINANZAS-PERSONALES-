import { fromZonedTime } from "date-fns-tz";
import {
  localMidnightToUtc,
  previousLocalMonth,
  type LocalYmd,
} from "@/domain/billing/timezone";

/** Rango MTD en UTC: día 1 del mes hasta `endDay` (inclusive) en TZ del usuario. month = 1–12. */
export function mtdRangeUtc(
  year: number,
  month: number,
  endDay: number,
  timezone: string
): { start: Date; end: Date } {
  const lastDay = new Date(year, month, 0).getDate();
  const clampedEndDay = Math.min(Math.max(endDay, 1), lastDay);
  const start = localMidnightToUtc({ year, month: month - 1, day: 1 }, timezone);
  const end = fromZonedTime(
    new Date(year, month - 1, clampedEndDay, 23, 59, 59, 999),
    timezone
  );
  return { start, end };
}

/** Mismo rango MTD pero en el mes calendario anterior (mismo número de día). */
export function previousMtdRangeUtc(
  year: number,
  month: number,
  endDay: number,
  timezone: string
): { start: Date; end: Date } {
  const prev = previousLocalMonth(year, month);
  return mtdRangeUtc(prev.year, prev.month, endDay, timezone);
}

export function computeGrowthPercent(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type NetWorthSnapshot = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
};

/** Activos (bancos + cuentas por cobrar) − pasivos (deuda TC). */
export function computeNetWorth(
  bankBalance: number,
  receivablesOutstanding: number,
  creditCardDebt: number
): NetWorthSnapshot {
  const totalAssets = bankBalance + receivablesOutstanding;
  const totalLiabilities = creditCardDebt;
  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  };
}

/** Saldo en bancos menos presupuestos reservados del mes. */
export function computeAvailableCash(
  bankBalance: number,
  budgetReserved: number
): number {
  return Math.round(Math.max(bankBalance - budgetReserved, 0) * 100) / 100;
}

export function buildMtdDayLabel(today: LocalYmd): string {
  return `1–${today.day}`;
}
