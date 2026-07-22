import type { BusinessType, LedgerAccountType } from "@prisma/client";

export type ChartAccountSeed = {
  code: string;
  name: string;
  type: LedgerAccountType;
};

const baseAccounts: ChartAccountSeed[] = [
  { code: "1100", name: "Caja del negocio", type: "ASSET" },
  { code: "1200", name: "Cuentas por cobrar", type: "ASSET" },
  { code: "1300", name: "Inventario", type: "ASSET" },
  { code: "1310", name: "Producción en proceso", type: "ASSET" },
  { code: "2100", name: "Cuentas por pagar", type: "LIABILITY" },
  { code: "3100", name: "Capital del dueño", type: "EQUITY" },
  { code: "3200", name: "Utilidades retenidas", type: "EQUITY" },
  { code: "4100", name: "Ventas", type: "REVENUE" },
  { code: "5100", name: "Costo de ventas (COGS)", type: "EXPENSE" },
  { code: "5200", name: "Gastos operativos", type: "EXPENSE" },
  { code: "5210", name: "Transporte y logística", type: "EXPENSE" },
  { code: "5220", name: "Marketing", type: "EXPENSE" },
];

export function getChartOfAccounts(businessType: BusinessType): ChartAccountSeed[] {
  if (businessType === "SERVICE") {
    return baseAccounts.filter((a) => a.code !== "1300" && a.code !== "1310" && a.code !== "5100");
  }
  if (businessType === "MANUFACTURING") {
    return baseAccounts;
  }
  return baseAccounts.filter((a) => a.code !== "1310");
}

export const defaultExpenseCategories = [
  { name: "Arriendo", color: "#6366f1" },
  { name: "Transporte", color: "#f59e0b" },
  { name: "Servicios", color: "#10b981" },
  { name: "Marketing", color: "#ec4899" },
  { name: "Nómina", color: "#8b5cf6" },
  { name: "Otros", color: "#64748b" },
];

export function slugifyBusinessName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "negocio";
}
