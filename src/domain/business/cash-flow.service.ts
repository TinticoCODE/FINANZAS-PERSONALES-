import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import { getLedgerBalance } from "./journal.service";

export async function getBusinessCashFlow(businessId: string) {
  const cashOnHand = await prisma.businessLedgerAccount
    .findUnique({
      where: { businessId_code: { businessId, code: "1100" } },
      include: { lines: { select: { debit: true, credit: true } } },
    })
    .then((acct) =>
      acct
        ? acct.lines.reduce(
            (s, l) => s + toNumber(l.debit) - toNumber(l.credit),
            0
          )
        : 0
    );

  const accountsReceivable = await getLedgerBalance(
    prisma,
    businessId,
    "1200"
  );

  const overdue = await prisma.saleInstallment.findMany({
    where: {
      sale: { businessId },
      status: { in: ["OVERDUE", "PARTIAL"] },
    },
    select: { expectedAmount: true, paidAmount: true },
  });

  const overdueOutstanding = overdue.reduce(
    (sum, i) => sum + toNumber(i.expectedAmount) - toNumber(i.paidAmount),
    0
  );

  return {
    cashOnHand,
    accountsReceivable,
    totalLiquidPosition: cashOnHand + accountsReceivable,
    overdueReceivable: overdueOutstanding,
    collectionRate:
      accountsReceivable > 0
        ? 1 - overdueOutstanding / accountsReceivable
        : 1,
  };
}
