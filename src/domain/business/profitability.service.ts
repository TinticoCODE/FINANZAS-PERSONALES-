import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";

export type ProfitabilityReport = {
  grossRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPct: number;
  ownerInvestment: number;
  ownerWithdrawals: number;
  roiPct: number;
  inventoryValue: number;
};

async function getInventoryValuation(businessId: string): Promise<number> {
  const items = await prisma.inventoryItem.findMany({
    where: { businessId },
    select: { quantity: true, unitCost: true },
  });
  return items.reduce(
    (sum, i) => sum + toNumber(i.quantity) * toNumber(i.unitCost),
    0
  );
}

export async function getProfitability(
  businessId: string,
  from: Date,
  to: Date
): Promise<ProfitabilityReport> {
  const lines = await prisma.businessJournalLine.findMany({
    where: {
      ledgerAccount: { businessId },
      journalEntry: { entryDate: { gte: from, lte: to } },
    },
    include: { ledgerAccount: { select: { code: true } } },
  });

  const sumCredits = (code: string) =>
    lines
      .filter((l) => l.ledgerAccount.code === code)
      .reduce((s, l) => s + toNumber(l.credit), 0);

  const sumDebits = (code: string) =>
    lines
      .filter((l) => l.ledgerAccount.code === code)
      .reduce((s, l) => s + toNumber(l.debit), 0);

  const sumDebitsPrefix = (prefix: string) =>
    lines
      .filter((l) => l.ledgerAccount.code.startsWith(prefix))
      .reduce((s, l) => s + toNumber(l.debit), 0);

  const grossRevenue = sumCredits("4100");
  const cogs = sumDebits("5100");
  const grossProfit = grossRevenue - cogs;
  const operatingExpenses = sumDebitsPrefix("52");
  const netProfit = grossProfit - operatingExpenses;

  const [investments, withdrawals] = await Promise.all([
    prisma.capitalTransfer.aggregate({
      where: { businessId, type: "OWNER_INVESTMENT" },
      _sum: { amount: true },
    }),
    prisma.capitalTransfer.aggregate({
      where: { businessId, type: "OWNER_WITHDRAWAL" },
      _sum: { amount: true },
    }),
  ]);

  const ownerInvestment = toNumber(investments._sum.amount);
  const ownerWithdrawals = toNumber(withdrawals._sum.amount);
  const inventoryValue = await getInventoryValuation(businessId);

  return {
    grossRevenue,
    cogs,
    grossProfit,
    grossMarginPct: grossRevenue ? (grossProfit / grossRevenue) * 100 : 0,
    operatingExpenses,
    netProfit,
    netMarginPct: grossRevenue ? (netProfit / grossRevenue) * 100 : 0,
    ownerInvestment,
    ownerWithdrawals,
    roiPct: ownerInvestment ? (netProfit / ownerInvestment) * 100 : 0,
    inventoryValue,
  };
}
