import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import type { CustomerRiskLevel } from "@prisma/client";

function computeRiskLevel(
  maxOverdue: number,
  outstanding: number
): CustomerRiskLevel {
  if (maxOverdue >= 60 || outstanding > 5_000_000) return "HIGH";
  if (maxOverdue >= 30 || maxOverdue > 0) return "MEDIUM";
  return "LOW";
}

export async function syncOverdueInstallments(businessId?: string) {
  const businessCount = await prisma.business.count({
    where: businessId ? { id: businessId } : undefined,
  });
  if (businessCount === 0) {
    return { updated: 0, skipped: true as const };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pending = await prisma.saleInstallment.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL", "CURRENT"] },
      dueDate: { lt: today },
      ...(businessId ? { sale: { businessId } } : {}),
    },
    include: { sale: { select: { customerId: true, businessId: true } } },
  });

  const overdueInstallments = pending.filter(
    (inst) => toNumber(inst.paidAmount) < toNumber(inst.expectedAmount)
  );

  if (overdueInstallments.length === 0) {
    return { updated: 0, skipped: true as const };
  }

  for (const inst of overdueInstallments) {
    const paid = toNumber(inst.paidAmount);
    const overdueDays = Math.floor(
      (today.getTime() - inst.dueDate.getTime()) / 86_400_000
    );

    await prisma.saleInstallment.update({
      where: { id: inst.id },
      data: {
        status: paid > 0 ? "PARTIAL" : "OVERDUE",
        overdueDays,
      },
    });
  }

  const customers = await prisma.businessCustomer.findMany({
    where: businessId ? { businessId } : {},
    include: {
      sales: {
        include: {
          installments: {
            where: { status: { in: ["OVERDUE", "PARTIAL", "PENDING"] } },
          },
        },
      },
    },
  });

  for (const customer of customers) {
    const installments = customer.sales.flatMap((s) => s.installments);
    const maxOverdue = installments.reduce(
      (max, i) => Math.max(max, i.overdueDays),
      0
    );
    const outstanding = installments.reduce(
      (sum, i) => sum + toNumber(i.expectedAmount) - toNumber(i.paidAmount),
      0
    );

    await prisma.businessCustomer.update({
      where: { id: customer.id },
      data: {
        riskLevel: computeRiskLevel(maxOverdue, outstanding),
        overdueDaysMax: maxOverdue,
        totalOutstanding: outstanding,
      },
    });
  }

  return { updated: overdueInstallments.length };
}
