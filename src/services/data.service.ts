import { addDays, addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import {
  mapAccount,
  mapLoan,
  mapBudget,
  mapCreditCard,
  mapReminder,
  mapRecurringTransaction,
  mapSavingsGoal,
  mapTransaction,
} from "@/lib/mappers";
import { getDefaultUserId, getUserTimezone } from "@/lib/user";
import {
  getCurrentLocalMonth,
  getLocalYmd,
  localMidnightToUtc,
  monthRangeUtc,
  toUserLocalTime,
} from "@/domain/billing/timezone";
import {
  computeAvailableCash,
  computeNetWorth,
  mtdRangeUtc,
  previousMtdRangeUtc,
} from "@/domain/dashboard/dashboard-metrics";
import { computeLoansSummary } from "@/domain/loans/loan-calculations";
import {
  formatPeriodLabel,
  getExpenseByCategoryForMonth,
  getMonthlyHistoryForUser,
  parsePeriodFromSearchParams,
} from "@/domain/snapshots/monthly-snapshot.service";
import { formatUserDate, formatUserMonthYear } from "@/utils/dates";
import {
  calculatePaymentToAvoidInterest,
  type CreditCardPurchase,
} from "@/services/credit-card.service";
import type {
  ChartDataPoint,
  CreditCardData,
  LoansSummaryData,
  MonthlyDataPoint,
  ReportsPageData,
  StatCardData,
} from "@/types";

async function enrichCreditCardsWithPayments(
  cards: Awaited<ReturnType<typeof prisma.creditCard.findMany>>,
  timezone: string
): Promise<CreditCardData[]> {
  if (cards.length === 0) return [];

  const userId = await getDefaultUserId();
  const cardIds = cards.map((c) => c.id);

  const purchases = await prisma.transaction.findMany({
    where: {
      userId,
      creditCardId: { in: cardIds },
      paymentMethod: "CREDIT",
      type: "EXPENSE",
    },
    select: {
      creditCardId: true,
      date: true,
      amount: true,
      installments: true,
      isInstallments: true,
      installmentAmount: true,
      hasZeroInterest: true,
    },
  });

  const purchasesByCard = new Map<string, CreditCardPurchase[]>();
  for (const tx of purchases) {
    if (!tx.creditCardId) continue;
    const list = purchasesByCard.get(tx.creditCardId) ?? [];
    list.push({
      date: tx.date,
      amount: toNumber(tx.amount),
      installments: tx.installments ?? 1,
      isInstallments: tx.isInstallments,
      installmentAmount: tx.installmentAmount
        ? toNumber(tx.installmentAmount)
        : undefined,
      hasZeroInterest: tx.hasZeroInterest,
    });
    purchasesByCard.set(tx.creditCardId, list);
  }

  return cards.map((card) => {
    const mapped = mapCreditCard(card);
    const cardPurchases = purchasesByCard.get(card.id) ?? [];
    const referenceLocal = toUserLocalTime(new Date(), timezone);
    const payment = calculatePaymentToAvoidInterest(
      {
        cutOffDate: card.cutOffDate,
        paymentDueDate: card.paymentDueDate,
        interestRate: toNumber(card.interestRate),
      },
      cardPurchases,
      referenceLocal
    );

    return {
      ...mapped,
      paymentToAvoidInterest: payment.total,
      singleInstallmentDue: payment.singleInstallmentCurrentCycle,
      deferredInstallmentsDue: payment.deferredInstallmentsDue,
      msiInstallmentsDue: payment.msiInstallmentsDue,
      minPayment: Math.max(mapped.usedBalance * 0.05, 0),
    };
  });
}

export async function getAccounts() {
  const userId = await getDefaultUserId();
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return accounts.map(mapAccount);
}

export async function getCategories(type?: "INCOME" | "EXPENSE") {
  const userId = await getDefaultUserId();
  return prisma.category.findMany({
    where: { userId, ...(type ? { type } : {}) },
    orderBy: { name: "asc" },
  });
}

export async function getCreditCards() {
  const userId = await getDefaultUserId();
  const timezone = await getUserTimezone();
  const cards = await prisma.creditCard.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return enrichCreditCardsWithPayments(cards, timezone);
}

export async function getTransactions() {
  const userId = await getDefaultUserId();
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    include: { category: true, account: true, creditCard: true },
    orderBy: { date: "desc" },
  });
  return transactions.map(mapTransaction);
}

export async function getBudgets(month?: number, year?: number) {
  const userId = await getDefaultUserId();
  const timezone = await getUserTimezone();
  const current = getCurrentLocalMonth(timezone);
  const targetMonth = month ?? current.month;
  const targetYear = year ?? current.year;

  const budgets = await prisma.budget.findMany({
    where: { userId, month: targetMonth, year: targetYear },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  const { start, end } = monthRangeUtc(targetYear, targetMonth, timezone);

  const results = await Promise.all(
    budgets.map(async (budget) => {
      const spentAgg = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: budget.categoryId,
          type: "EXPENSE",
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      });
      return mapBudget(budget, toNumber(spentAgg._sum.amount));
    })
  );

  return results;
}

export async function getSavingsGoals() {
  const userId = await getDefaultUserId();
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return goals.map(mapSavingsGoal);
}

export async function getLoansData() {
  const userId = await getDefaultUserId();
  const timezone = await getUserTimezone();

  const [loansRaw, accounts] = await Promise.all([
    prisma.loan.findMany({
      where: { userId },
      include: {
        sourceAccount: true,
        payments: {
          include: { destinationAccount: true },
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: { loanDate: "desc" },
    }),
    prisma.account.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const loans = loansRaw.map((loan) => mapLoan(loan, timezone));
  const summary = computeLoansSummary(loans);

  return { loans, summary, accounts };
}

export async function getReminders() {
  const userId = await getDefaultUserId();
  const reminders = await prisma.reminder.findMany({
    where: { userId, isCompleted: false },
    orderBy: { dueDate: "asc" },
    take: 20,
  });
  return reminders.map(mapReminder);
}

export async function getSearchData() {
  const [transactions, cards, accounts, budgets, incomeCategories, expenseCategories] =
    await Promise.all([
      getTransactions(),
      getCreditCards(),
      getAccounts(),
      getBudgets(),
      getCategories("INCOME"),
      getCategories("EXPENSE"),
    ]);

  return {
    transactions,
    creditCards: cards,
    accounts,
    budgets,
    incomeCategories: incomeCategories.map((c) => c.name),
    expenseCategories: expenseCategories.map((c) => c.name),
  };
}

export async function getDashboardData() {
  const userId = await getDefaultUserId();
  const timezone = await getUserTimezone();
  const now = new Date();
  const { year, month } = getCurrentLocalMonth(timezone, now);
  const { start, end } = monthRangeUtc(year, month, timezone);

  const todayLocal = getLocalYmd(now, timezone);
  const mtdRange = mtdRangeUtc(year, month, todayLocal.day, timezone);
  const prevMtdRange = previousMtdRangeUtc(year, month, todayLocal.day, timezone);
  const mtdComparisonLabel = `vs MTD anterior (1–${todayLocal.day})`;

  const weekStartDate = addDays(
    new Date(todayLocal.year, todayLocal.month, todayLocal.day),
    -6
  );
  const evolutionStartLocal = addMonths(new Date(year, month - 1, 1), -5);
  const evolutionStart = monthRangeUtc(
    evolutionStartLocal.getFullYear(),
    evolutionStartLocal.getMonth() + 1,
    timezone
  ).start;
  const weekQueryStart = localMidnightToUtc(
    {
      year: weekStartDate.getFullYear(),
      month: weekStartDate.getMonth(),
      day: weekStartDate.getDate(),
    },
    timezone
  );

  const [
    accounts,
    cards,
    budgets,
    activeLoans,
    mtdIncomeAgg,
    mtdExpensesAgg,
    prevMtdIncomeAgg,
    prevMtdExpensesAgg,
    mtdCreditExpensesAgg,
    expenseGroups,
    monthlyTx,
    weekTx,
  ] = await Promise.all([
    prisma.account.findMany({ where: { userId, isActive: true } }),
    prisma.creditCard.findMany({ where: { userId, isActive: true } }),
    getBudgets(month, year),
    prisma.loan.findMany({
      where: { userId, status: "ACTIVE" },
      select: { outstandingBalance: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "INCOME",
        date: { gte: mtdRange.start, lte: mtdRange.end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: mtdRange.start, lte: mtdRange.end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "INCOME",
        date: { gte: prevMtdRange.start, lte: prevMtdRange.end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: prevMtdRange.start, lte: prevMtdRange.end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        date: { gte: mtdRange.start, lte: mtdRange.end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: evolutionStart,
          lte: end,
        },
      },
      select: { type: true, amount: true, date: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: weekQueryStart,
          lte: end,
        },
      },
      select: { type: true, amount: true, date: true },
    }),
  ]);

  const bankBalance = accounts.reduce((sum, a) => sum + toNumber(a.balance), 0);
  const receivablesOutstanding = activeLoans.reduce(
    (sum, loan) => sum + toNumber(loan.outstandingBalance),
    0
  );
  const totalDebt = cards.reduce((sum, c) => sum + toNumber(c.usedBalance), 0);
  const budgetReserved = budgets.reduce((sum, b) => sum + b.budget, 0);

  const { netWorth } = computeNetWorth(
    bankBalance,
    receivablesOutstanding,
    totalDebt
  );
  const availableCash = computeAvailableCash(bankBalance, budgetReserved);

  const mtdIncome = toNumber(mtdIncomeAgg._sum.amount);
  const mtdExpenses = toNumber(mtdExpensesAgg._sum.amount);
  const prevMtdIncome = toNumber(prevMtdIncomeAgg._sum.amount);
  const prevMtdExpenses = toNumber(prevMtdExpensesAgg._sum.amount);
  const mtdCreditExpenses = toNumber(mtdCreditExpensesAgg._sum.amount);
  const mtdNetFlow = mtdIncome - mtdExpenses;
  const prevMtdNetFlow = prevMtdIncome - prevMtdExpenses;
  const mtdSavings = Math.max(mtdNetFlow, 0);
  const prevMtdSavings = Math.max(prevMtdNetFlow, 0);

  const stats: StatCardData[] = [
    {
      id: "balance",
      title: "Balance total",
      value: netWorth,
      previousValue: netWorth - mtdNetFlow + mtdCreditExpenses,
      icon: "wallet",
      color: "#6366f1",
      gradient: "from-indigo-500/10 to-violet-500/5",
      comparisonLabel: mtdComparisonLabel,
    },
    {
      id: "available",
      title: "Dinero disponible",
      value: availableCash,
      previousValue: computeAvailableCash(
        bankBalance - mtdNetFlow,
        budgetReserved
      ),
      icon: "banknote",
      color: "#06b6d4",
      gradient: "from-cyan-500/10 to-blue-500/5",
      comparisonLabel: mtdComparisonLabel,
    },
    {
      id: "expenses",
      title: "Gastos del mes",
      value: mtdExpenses,
      previousValue: prevMtdExpenses,
      icon: "trending-down",
      color: "#ef4444",
      gradient: "from-red-500/10 to-orange-500/5",
      comparisonLabel: mtdComparisonLabel,
    },
    {
      id: "income",
      title: "Ingresos del mes",
      value: mtdIncome,
      previousValue: prevMtdIncome,
      icon: "trending-up",
      color: "#10b981",
      gradient: "from-emerald-500/10 to-green-500/5",
      comparisonLabel: mtdComparisonLabel,
    },
    {
      id: "savings",
      title: "Ahorros (MTD)",
      value: mtdSavings,
      previousValue: prevMtdSavings,
      icon: "piggy-bank",
      color: "#8b5cf6",
      gradient: "from-violet-500/10 to-purple-500/5",
      comparisonLabel: mtdComparisonLabel,
    },
    {
      id: "debt",
      title: "Deuda total",
      value: totalDebt,
      previousValue: Math.max(totalDebt - mtdCreditExpenses, 0),
      icon: "credit-card",
      color: "#f59e0b",
      gradient: "from-amber-500/10 to-yellow-500/5",
      comparisonLabel: mtdComparisonLabel,
    },
  ];

  const categories = await prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true, color: true, type: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const expenseByCategoryRaw: ChartDataPoint[] = expenseGroups.map((group) => {
    const category = categoryMap.get(group.categoryId);
    return {
      name: category?.name ?? "Sin categoría",
      value: toNumber(group._sum.amount),
      color: category?.color ?? "#6366f1",
    };
  });
  const expenseTotal = expenseByCategoryRaw.reduce((sum, item) => sum + item.value, 0);
  const expenseByCategory: ChartDataPoint[] = expenseByCategoryRaw.map((item) => ({
    ...item,
    percent: expenseTotal > 0 ? (item.value / expenseTotal) * 100 : 0,
  }));

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const monthlyEvolution: MonthlyDataPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = addMonths(new Date(year, month - 1, 1), -i);
    const y = d.getFullYear();
    const m = d.getMonth();
    const txInMonth = monthlyTx.filter((tx) => {
      const local = getLocalYmd(tx.date, timezone);
      return local.year === y && local.month === m;
    });
    const inc = txInMonth
      .filter((tx) => tx.type === "INCOME")
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);
    const exp = txInMonth
      .filter((tx) => tx.type === "EXPENSE")
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);
    monthlyEvolution.push({
      month: monthNames[m],
      income: Math.max(inc, 0),
      expenses: Math.max(exp, 0),
      savings: Math.max(inc - exp, 0),
    });
  }

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const cashFlowData = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(
      new Date(todayLocal.year, todayLocal.month, todayLocal.day),
      index - 6
    );
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    const dayTx = weekTx.filter((tx) => {
      const local = getLocalYmd(tx.date, timezone);
      return local.year === y && local.month === m && local.day === d;
    });
    const inflow = dayTx
      .filter((tx) => tx.type === "INCOME")
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);
    const outflow = dayTx
      .filter((tx) => tx.type === "EXPENSE")
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);
    return {
      day: dayNames[date.getDay()],
      inflow,
      outflow,
    };
  });

  const monthLabel = formatUserMonthYear(now, timezone);

  const fabAccounts = await prisma.account.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const enrichedCards = await enrichCreditCardsWithPayments(cards, timezone);

  return {
    stats,
    expenseByCategory,
    monthlyEvolution,
    cashFlowData,
    budgets,
    creditCards: enrichedCards,
    monthLabel,
    timezone,
    fabAccounts,
    fabCategories: categories.map(({ id, name, type }) => ({ id, name, type })),
  };
}

export async function getReportsData(options?: {
  year?: number;
  month?: number;
}): Promise<ReportsPageData> {
  const timezone = await getUserTimezone();
  const { year: currentYear, month: currentMonth } = getCurrentLocalMonth(timezone);

  const year = options?.year ?? currentYear;
  const month = options?.month ?? currentMonth;

  const [history, expenseByCategory] = await Promise.all([
    getMonthlyHistoryForUser(year, month),
    getExpenseByCategoryForMonth(year, month, timezone),
  ]);

  const selectedSnapshot =
    history.snapshots.find((snapshot) => snapshot.month === month) ?? null;

  return {
    year,
    month,
    periodLabel: formatPeriodLabel(year, month),
    snapshots: history.snapshots,
    monthlyEvolution: history.monthlyEvolution,
    selectedSnapshot,
    expenseByCategory,
  };
}

export async function getReportsDataFromSearchParams(params: {
  year?: string;
  month?: string;
}): Promise<ReportsPageData> {
  const timezone = await getUserTimezone();
  const { year, month } = parsePeriodFromSearchParams(params, timezone);
  return getReportsData({ year, month });
}

export async function getCalendarData() {
  const timezone = await getUserTimezone();
  const [reminders, cards, budgets] = await Promise.all([
    getReminders(),
    getCreditCards(),
    getBudgets(),
  ]);

  return { reminders, cards, budgets, timezone };
}

export async function getRecurringTransactions() {
  const userId = await getDefaultUserId();
  const items = await prisma.recurringTransaction.findMany({
    where: { userId },
    include: { category: true, account: true, creditCard: true },
    orderBy: [{ isActive: "desc" }, { nextRunAt: "asc" }],
  });
  return items.map(mapRecurringTransaction);
}

export async function getRecurringPageData() {
  const [recurring, accounts, categories, creditCards] = await Promise.all([
    getRecurringTransactions(),
    getAccounts(),
    getCategories(),
    getCreditCards(),
  ]);
  return { recurring, accounts, categories, creditCards };
}
