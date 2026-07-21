import type { AccountType, PaymentMethod, TransactionType } from "@prisma/client";

export const accountTypeLabels: Record<AccountType, string> = {
  CASH: "Efectivo",
  CHECKING: "Cuenta bancaria",
  SAVINGS: "Ahorros",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  PAYPAL: "PayPal",
  OTHER: "Otra",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  DEBIT: "Débito",
  CREDIT: "Crédito",
  TRANSFER: "Transferencia",
  OTHER: "Otro",
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  INCOME: "Ingreso",
  EXPENSE: "Gasto",
};

export const accountTypeIcons: Record<AccountType, string> = {
  CASH: "banknote",
  CHECKING: "building-2",
  SAVINGS: "wallet",
  NEQUI: "smartphone",
  DAVIPLATA: "smartphone",
  PAYPAL: "globe",
  OTHER: "wallet",
};

export const defaultAccountColors = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

export const defaultCategoryColors = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#64748b",
  "#ef4444",
];
