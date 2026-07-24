import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import { getLedgerBalance } from "./journal.service";
import { computeBusinessCashBalance } from "./business-cash-balance";

export async function getBusinessCashFlow(businessId: string) {
  const [cashSummary, accountsReceivable, overdue] = await Promise.all([
    computeBusinessCashBalance(prisma, businessId),
    getLedgerBalance(prisma, businessId, "1200"),
    prisma.saleInstallment.findMany({
      where: {
        sale: { businessId },
        status: { in: ["OVERDUE", "PARTIAL"] },
      },
      select: { expectedAmount: true, paidAmount: true },
    }),
  ]);

  const overdueOutstanding = overdue.reduce(
    (sum, i) => sum + toNumber(i.expectedAmount) - toNumber(i.paidAmount),
    0
  );

  const cashOnHand = cashSummary.ledgerCash;

  return {
    cashOnHand,
    capitalInjected: cashSummary.capitalInjected,
    cashCollections: cashSummary.cashCollections,
    supplierPayments: cashSummary.supplierPayments,
    operatingExpenses: cashSummary.operatingExpenses,
    ownerWithdrawals: cashSummary.ownerWithdrawals,
    computedCash: cashSummary.computedCash,
    accountsPayable: cashSummary.accountsPayable,
    isCashConsistent: cashSummary.isConsistent,
    accountsReceivable,
    totalLiquidPosition: cashOnHand + accountsReceivable,
    overdueReceivable: overdueOutstanding,
    collectionRate:
      accountsReceivable > 0
        ? 1 - overdueOutstanding / accountsReceivable
        : 1,
  };
}
