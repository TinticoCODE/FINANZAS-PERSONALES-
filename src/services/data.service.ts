import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import {
  mapAccount,
  mapBudget,
  mapCreditCard,
  mapReminder,
  mapSavingsGoal,
  mapTransaction,
} from "@/lib/mappers";
import { getDefaultUserId } from "@/lib/user";
import {
  calculatePaymentToAvoidInterest,
  type CreditCardPurchase,
} from "@/services/credit-card.service";
import type {
  ChartDataPoint,
  CreditCardData,
  MonthlyDataPoint,
  StatCardData,
} from "@/types";

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function previousMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

async function enrichCreditCardsWithPayments(
  cards: Awaited<ReturnType<typeof prisma.creditCard.findMany>>
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
    });
    purchasesByCard.set(tx.creditCardId, list);
  }

  return cards.map((card) => {
    const mapped = mapCreditCard(card);
    const cardPurchases = purchasesByCard.get(card.id) ?? [];
    const payment = calculatePaymentToAvoidInterest(
      {
        cutOffDate: card.cutOffDate,
        paymentDueDate: card.paymentDueDate,
        interestRate: toNumber(card.interestRate),
      },
      cardPurchases
    );

    return {
      ...mapped,
      paymentToAvoidInterest: payment.total,
      singleInstallmentDue: payment.singleInstallmentCurrentCycle,
      deferredInstallmentsDue: payment.deferredInstallmentsDue,
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
  const cards = await prisma.creditCard.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return enrichCreditCardsWithPayments(cards);
}

export async function getTransactions() {
  const userId = await getDefaultUserId();
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    include: { category: true, account: true },
    orderBy: { date: "desc" },
  });
  return transactions.map(mapTransaction);
}

export async function getBudgets(month?: number, year?: number) {
  const userId = await getDefaultUserId();
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  const budgets = await prisma.budget.findMany({
    where: { userId, month: targetMonth, year: targetYear },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  const { start, end } = monthRange(targetYear, targetMonth);

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
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { start, end } = monthRange(year, month);
  const prev = previousMonth(year, month);
  const prevRange = monthRange(prev.year, prev.month);

  const [
    accounts,
    cards,
    budgets,
    monthIncome,
    monthExpenses,
    prevIncome,
    prevExpenses,
    expenseGroups,
    monthlyTx,
    weekTx,
  ] = await Promise.all([
    prisma.account.findMany({ where: { userId, isActive: true } }),
    prisma.creditCard.findMany({ where: { userId, isActive: true } }),
    getBudgets(month, year),
    prisma.transaction.aggregate({
      where: { userId, type: "INCOME", date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "INCOME", date: { gte: prevRange.start, lte: prevRange.end } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", date: { gte: prevRange.start, lte: prevRange.end } },
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
          gte: new Date(year, now.getMonth() - 5, 1),
          lte: end,
        },
      },
      select: { type: true, amount: true, date: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
          lte: end,
        },
      },
      select: { type: true, amount: true, date: true },
    }),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + toNumber(a.balance), 0);
  const totalDebt = cards.reduce((sum, c) => sum + toNumber(c.usedBalance), 0);
  const income = toNumber(monthIncome._sum.amount);
  const expenses = toNumber(monthExpenses._sum.amount);
  const prevIncomeVal = toNumber(prevIncome._sum.amount);
  const prevExpensesVal = toNumber(prevExpenses._sum.amount);
  const savings = Math.max(income - expenses, 0);

  const goalsAgg = await prisma.savingsGoal.aggregate({
    where: { userId },
    _sum: { savedAmount: true },
  });
  const totalSaved = toNumber(goalsAgg._sum.savedAmount);

  const stats: StatCardData[] = [
    {
      id: "balance",
      title: "Balance total",
      value: totalBalance,
      previousValue: totalBalance,
      icon: "wallet",
      color: "#6366f1",
      gradient: "from-indigo-500/10 to-violet-500/5",
    },
    {
      id: "available",
      title: "Dinero disponible",
      value: totalBalance,
      previousValue: totalBalance,
      icon: "banknote",
      color: "#06b6d4",
      gradient: "from-cyan-500/10 to-blue-500/5",
    },
    {
      id: "expenses",
      title: "Gastos del mes",
      value: expenses,
      previousValue: prevExpensesVal,
      icon: "trending-down",
      color: "#ef4444",
      gradient: "from-red-500/10 to-orange-500/5",
    },
    {
      id: "income",
      title: "Ingresos del mes",
      value: income,
      previousValue: prevIncomeVal,
      icon: "trending-up",
      color: "#10b981",
      gradient: "from-emerald-500/10 to-green-500/5",
    },
    {
      id: "savings",
      title: "Ahorros",
      value: totalSaved || savings,
      previousValue: 0,
      icon: "piggy-bank",
      color: "#8b5cf6",
      gradient: "from-violet-500/10 to-purple-500/5",
    },
    {
      id: "debt",
      title: "Deuda total",
      value: totalDebt,
      previousValue: totalDebt,
      icon: "credit-card",
      color: "#f59e0b",
      gradient: "from-amber-500/10 to-yellow-500/5",
    },
  ];

  const categories = await prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true, color: true, type: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const expenseByCategory: ChartDataPoint[] = expenseGroups.map((group) => {
    const category = categoryMap.get(group.categoryId);
    return {
      name: category?.name ?? "Sin categoría",
      value: toNumber(group._sum.amount),
      color: category?.color,
    };
  });

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const monthlyEvolution: MonthlyDataPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, now.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const txInMonth = monthlyTx.filter(
      (tx) => tx.date.getMonth() === m && tx.date.getFullYear() === y
    );
    const inc = txInMonth
      .filter((tx) => tx.type === "INCOME")
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);
    const exp = txInMonth
      .filter((tx) => tx.type === "EXPENSE")
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);
    monthlyEvolution.push({
      month: monthNames[m],
      income: inc,
      expenses: exp,
      savings: Math.max(inc - exp, 0),
    });
  }

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const cashFlowData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
    const dayTx = weekTx.filter(
      (tx) =>
        tx.date.getFullYear() === date.getFullYear() &&
        tx.date.getMonth() === date.getMonth() &&
        tx.date.getDate() === date.getDate()
    );
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

  const monthLabel = now.toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  const fabAccounts = await prisma.account.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const enrichedCards = await enrichCreditCardsWithPayments(cards);

  return {
    stats,
    expenseByCategory,
    monthlyEvolution,
    cashFlowData,
    budgets,
    creditCards: enrichedCards,
    monthLabel,
    fabAccounts,
    fabCategories: categories.map(({ id, name, type }) => ({ id, name, type })),
  };
}

export async function getReportsData() {
  const dashboard = await getDashboardData();
  return {
    monthlyEvolution: dashboard.monthlyEvolution,
    expenseByCategory: dashboard.expenseByCategory,
  };
}

export async function getCalendarData() {
  const userId = await getDefaultUserId();
  const [reminders, cards, budgets] = await Promise.all([
    getReminders(),
    getCreditCards(),
    getBudgets(),
  ]);

  return { reminders, cards, budgets, userId };
}
