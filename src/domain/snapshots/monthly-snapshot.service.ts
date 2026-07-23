import type { MonthlySnapshot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import { getDefaultUserId, getUserTimezone } from "@/lib/user";
import {
  getCurrentLocalMonth,
  monthRangeUtc,
  previousLocalMonth,
} from "@/domain/billing/timezone";
import { computeNetWorth } from "@/domain/dashboard/dashboard-metrics";

export type MonthlySnapshotDTO = {
  id?: string;
  month: number;
  year: number;
  totalAssets: number;
  totalLiabilities: number;
  totalIncome: number;
  totalExpense: number;
  netWorth: number;
  /** true = calculado en vivo (mes actual); false = cierre persistido. */
  isLive: boolean;
  /** true = mes pasado sin cierre guardado aún. */
  isMissing?: boolean;
  createdAt?: string;
};

const MONTH_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function mapStoredSnapshot(row: MonthlySnapshot): MonthlySnapshotDTO {
  const totalAssets = toNumber(row.totalAssets);
  const totalLiabilities = toNumber(row.totalLiabilities);
  return {
    id: row.id,
    month: row.month,
    year: row.year,
    totalAssets,
    totalLiabilities,
    totalIncome: toNumber(row.totalIncome),
    totalExpense: toNumber(row.totalExpense),
    netWorth: totalAssets - totalLiabilities,
    isLive: false,
    createdAt: row.createdAt.toISOString(),
  };
}

function isFutureMonth(
  year: number,
  month: number,
  currentYear: number,
  currentMonth: number
): boolean {
  return year > currentYear || (year === currentYear && month > currentMonth);
}

function isCurrentMonth(
  year: number,
  month: number,
  currentYear: number,
  currentMonth: number
): boolean {
  return year === currentYear && month === currentMonth;
}

/** Calcula patrimonio e ingresos/gastos de un mes (dinámico). */
export async function computeLiveMonthlySnapshot(
  userId: string,
  year: number,
  month: number,
  timezone: string,
  referenceUtc: Date = new Date()
): Promise<MonthlySnapshotDTO> {
  const { start, end } = monthRangeUtc(year, month, timezone);
  const { year: currentYear, month: currentMonth } = getCurrentLocalMonth(
    timezone,
    referenceUtc
  );
  const isCurrent = isCurrentMonth(year, month, currentYear, currentMonth);

  const rangeEnd = isCurrent ? referenceUtc : end;

  const [
    accounts,
    cards,
    activeLoans,
    incomeAgg,
    expenseAgg,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { userId, isActive: true },
      select: { balance: true },
    }),
    prisma.creditCard.findMany({
      where: { userId, isActive: true },
      select: { usedBalance: true },
    }),
    prisma.loan.findMany({
      where: { userId, status: "ACTIVE" },
      select: { outstandingBalance: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "INCOME",
        date: { gte: start, lte: rangeEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: start, lte: rangeEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  const bankBalance = accounts.reduce((sum, a) => sum + toNumber(a.balance), 0);
  const receivables = activeLoans.reduce(
    (sum, loan) => sum + toNumber(loan.outstandingBalance),
    0
  );
  const creditDebt = cards.reduce((sum, c) => sum + toNumber(c.usedBalance), 0);
  const { totalAssets, totalLiabilities, netWorth } = computeNetWorth(
    bankBalance,
    receivables,
    creditDebt
  );

  return {
    month,
    year,
    totalAssets,
    totalLiabilities,
    totalIncome: toNumber(incomeAgg._sum.amount),
    totalExpense: toNumber(expenseAgg._sum.amount),
    netWorth,
    isLive: isCurrent,
  };
}

/** Persiste un cierre mensual (inmutable). Idempotente por @@unique. */
export async function persistMonthlySnapshot(
  userId: string,
  year: number,
  month: number,
  timezone: string
): Promise<MonthlySnapshotDTO | null> {
  const existing = await prisma.monthlySnapshot.findUnique({
    where: { userId_month_year: { userId, month, year } },
  });
  if (existing) return mapStoredSnapshot(existing);

  const live = await computeLiveMonthlySnapshot(
    userId,
    year,
    month,
    timezone,
    monthRangeUtc(year, month, timezone).end
  );

  const row = await prisma.monthlySnapshot.create({
    data: {
      userId,
      month,
      year,
      totalAssets: live.totalAssets,
      totalLiabilities: live.totalLiabilities,
      totalIncome: live.totalIncome,
      totalExpense: live.totalExpense,
    },
  });

  return mapStoredSnapshot(row);
}

/** Obtiene los 12 cierres de un año. Mes actual = dinámico; pasados = tabla. */
export async function getYearlyMonthlySnapshots(
  userId: string,
  year: number,
  timezone: string
): Promise<MonthlySnapshotDTO[]> {
  const { year: currentYear, month: currentMonth } = getCurrentLocalMonth(
    timezone
  );

  const stored = await prisma.monthlySnapshot.findMany({
    where: { userId, year },
    orderBy: { month: "asc" },
  });
  const storedByMonth = new Map(stored.map((row) => [row.month, row]));

  const results: MonthlySnapshotDTO[] = [];

  for (let month = 1; month <= 12; month++) {
    if (isFutureMonth(year, month, currentYear, currentMonth)) {
      results.push({
        month,
        year,
        totalAssets: 0,
        totalLiabilities: 0,
        totalIncome: 0,
        totalExpense: 0,
        netWorth: 0,
        isLive: false,
        isMissing: true,
      });
      continue;
    }

    if (isCurrentMonth(year, month, currentYear, currentMonth)) {
      results.push(await computeLiveMonthlySnapshot(userId, year, month, timezone));
      continue;
    }

    const row = storedByMonth.get(month);
    if (row) {
      results.push(mapStoredSnapshot(row));
    } else {
      results.push({
        month,
        year,
        totalAssets: 0,
        totalLiabilities: 0,
        totalIncome: 0,
        totalExpense: 0,
        netWorth: 0,
        isLive: false,
        isMissing: true,
      });
    }
  }

  return results;
}

/** Convierte snapshots anuales al formato de gráfico ingresos vs gastos. */
export function snapshotsToMonthlyEvolution(snapshots: MonthlySnapshotDTO[]) {
  return snapshots.map((snapshot) => ({
    month: MONTH_NAMES[snapshot.month - 1] ?? String(snapshot.month),
    income: snapshot.isMissing ? 0 : snapshot.totalIncome,
    expenses: snapshot.isMissing ? 0 : snapshot.totalExpense,
    savings: snapshot.isMissing
      ? 0
      : Math.max(snapshot.totalIncome - snapshot.totalExpense, 0),
    isMissing: snapshot.isMissing ?? false,
    isLive: snapshot.isLive,
  }));
}

/** Cierra el mes anterior para todos los usuarios (cron). */
export async function closePreviousMonthForAllUsers(referenceUtc: Date = new Date()) {
  const users = await prisma.user.findMany({ select: { id: true, timezone: true } });
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const tz = user.timezone || "America/Bogota";
    const { year, month } = getCurrentLocalMonth(tz, referenceUtc);
    const prev = previousLocalMonth(year, month);

    const existing = await prisma.monthlySnapshot.findUnique({
      where: {
        userId_month_year: { userId: user.id, month: prev.month, year: prev.year },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await persistMonthlySnapshot(user.id, prev.year, prev.month, tz);
    created++;
  }

  return { created, skipped, users: users.length };
}

export async function getMonthlyHistoryForUser(
  year: number,
  month?: number
): Promise<{
  year: number;
  month: number | null;
  snapshots: MonthlySnapshotDTO[];
  monthlyEvolution: ReturnType<typeof snapshotsToMonthlyEvolution>;
}> {
  const userId = await getDefaultUserId();
  const timezone = await getUserTimezone();
  const { year: currentYear, month: currentMonth } = getCurrentLocalMonth(timezone);

  const snapshots = await getYearlyMonthlySnapshots(userId, year, timezone);
  const monthlyEvolution = snapshotsToMonthlyEvolution(snapshots);

  const selectedMonth = month ?? currentMonth;

  return {
    year,
    month: month ?? null,
    snapshots,
    monthlyEvolution,
  };
}

export async function getExpenseByCategoryForMonth(
  year: number,
  month: number,
  timezone: string
) {
  const userId = await getDefaultUserId();
  const { start, end } = monthRangeUtc(year, month, timezone);
  const { year: cy, month: cm } = getCurrentLocalMonth(timezone);
  const rangeEnd =
    year === cy && month === cm ? new Date() : end;

  const [expenseGroups, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: start, lte: rangeEnd },
      },
      _sum: { amount: true },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true },
    }),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const raw = expenseGroups.map((group) => {
    const category = categoryMap.get(group.categoryId);
    return {
      name: category?.name ?? "Sin categoría",
      value: toNumber(group._sum.amount),
      color: category?.color ?? "#6366f1",
    };
  });
  const total = raw.reduce((sum, item) => sum + item.value, 0);
  return raw.map((item) => ({
    ...item,
    percent: total > 0 ? (item.value / total) * 100 : 0,
  }));
}

export function parsePeriodFromSearchParams(
  params: { year?: string; month?: string },
  timezone: string
): { year: number; month: number } {
  const { year: currentYear, month: currentMonth } = getCurrentLocalMonth(timezone);
  const year = clampInt(params.year, currentYear, 2000, 2100);
  const month = clampInt(params.month, currentMonth, 1, 12);
  return { year, month };
}

function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function formatPeriodLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(date);
}
