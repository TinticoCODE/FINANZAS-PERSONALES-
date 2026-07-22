import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import { getDefaultUserId, getUserTimezone } from "@/lib/user";
import { getCurrentLocalMonth, monthRangeUtc } from "@/domain/billing/timezone";
import { getBusinessCashFlow } from "@/domain/business/cash-flow.service";
import { getProfitability } from "@/domain/business/profitability.service";
import { syncOverdueInstallments } from "@/domain/business/installment.service";
import { getLedgerBalance } from "@/domain/business/journal.service";
import {
  mapBusiness,
  mapBusinessCustomer,
  mapBusinessProduct,
  mapBusinessSale,
  mapOverdueInstallment,
  mapPendingInstallment,
} from "@/lib/mappers";
import type {
  BusinessDashboardData,
  BusinessListItem,
  BusinessKpiData,
} from "@/types";

export async function getBusinessesList(): Promise<BusinessListItem[]> {
  const userId = await getDefaultUserId();
  const businesses = await prisma.business.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    businesses.map(async (b) => {
      const [cashFlow, ownerCapital] = await Promise.all([
        getBusinessCashFlow(b.id),
        getLedgerBalance(prisma, b.id, "3100"),
      ]);
      return {
        ...mapBusiness(b),
        cashOnHand: cashFlow.cashOnHand,
        accountsReceivable: cashFlow.accountsReceivable,
        ownerCapital,
      };
    })
  );

  return enriched;
}

export async function getBusinessBySlug(slug: string) {
  const userId = await getDefaultUserId();
  return prisma.business.findFirst({
    where: { slug, userId },
  });
}

export async function getBusinessDashboard(
  slug: string
): Promise<BusinessDashboardData | null> {
  const userId = await getDefaultUserId();
  const business = await prisma.business.findFirst({
    where: { slug, userId },
    include: {
      products: {
        where: { isActive: true },
        include: { inventoryItems: true },
        orderBy: { name: "asc" },
      },
      customers: { orderBy: { name: "asc" } },
      expenseCategories: { orderBy: { name: "asc" } },
      sales: {
        orderBy: { saleDate: "desc" },
        take: 10,
        include: {
          customer: true,
          installments: { orderBy: { installmentNo: "asc" } },
        },
      },
    },
  });

  if (!business) return null;

  await syncOverdueInstallments(business.id);

  const timezone = await getUserTimezone();
  const { year, month } = getCurrentLocalMonth(timezone);
  const { start, end } = monthRangeUtc(year, month, timezone);

  const [cashFlow, profitability, ownerCapital, overdueInstallments, pendingInstallments, accounts] =
    await Promise.all([
      getBusinessCashFlow(business.id),
      getProfitability(business.id, start, end),
      getLedgerBalance(prisma, business.id, "3100"),
      prisma.saleInstallment.findMany({
        where: {
          sale: { businessId: business.id },
          status: { in: ["OVERDUE", "PARTIAL"] },
        },
        include: {
          sale: { include: { customer: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 20,
      }),
      prisma.saleInstallment.findMany({
        where: {
          sale: { businessId: business.id },
          status: { in: ["PENDING", "CURRENT", "PARTIAL", "OVERDUE"] },
        },
        include: {
          sale: { include: { customer: true } },
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.account.findMany({
        where: { userId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const kpis: BusinessKpiData[] = [
    {
      id: "capital",
      title: "Capital invertido",
      value: ownerCapital,
      previousValue: ownerCapital,
      icon: "wallet",
      color: "#6366f1",
      gradient: "from-indigo-500/10 to-violet-500/5",
      subtitle: `ROI ${profitability.roiPct.toFixed(1)}%`,
    },
    {
      id: "inventory",
      title: "Inventario valorado",
      value: profitability.inventoryValue,
      previousValue: profitability.inventoryValue,
      icon: "piggy-bank",
      color: "#10b981",
      gradient: "from-emerald-500/10 to-teal-500/5",
      subtitle: `${business.products.length} productos`,
    },
    {
      id: "receivables",
      title: "Cuentas por cobrar",
      value: cashFlow.accountsReceivable,
      previousValue: cashFlow.accountsReceivable,
      icon: "banknote",
      color: "#f59e0b",
      gradient: "from-amber-500/10 to-orange-500/5",
      subtitle: `${overdueInstallments.length} en mora`,
    },
  ];

  return {
    business: mapBusiness(business),
    kpis,
    cashFlow,
    profitability,
    products: business.products.map(mapBusinessProduct),
    customers: business.customers.map(mapBusinessCustomer),
    expenseCategories: business.expenseCategories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
    })),
    recentSales: business.sales.map(mapBusinessSale),
    overdueInstallments: overdueInstallments.map(mapOverdueInstallment),
    pendingInstallments: pendingInstallments
      .filter((i) => Number(i.paidAmount) < Number(i.expectedAmount))
      .map(mapPendingInstallment),
    personalAccounts: accounts,
  };
}

export async function getBusinessAccountsForTransfer() {
  const userId = await getDefaultUserId();
  return prisma.account.findMany({
    where: { userId, isActive: true },
    select: { id: true, name: true, balance: true },
    orderBy: { name: "asc" },
  });
}
