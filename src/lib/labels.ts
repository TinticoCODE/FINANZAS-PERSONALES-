import type { AccountType, PaymentMethod } from "@prisma/client";

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

export const transactionTypeLabels = {
  INCOME: "Ingreso",
  EXPENSE: "Gasto",
} as const;

export const interestTypeLabels = {
  FLAT: "Fijo (único)",
  MONTHLY: "Mensual",
  ANNUAL: "Anual",
} as const;

export const receivableStatusLabels = {
  ACTIVE: "Activo",
  PAID: "Pagado",
  DEFAULTED: "En mora",
  CANCELLED: "Cancelado",
} as const;

export const paymentMethodFormLabels = paymentMethodLabels;

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

export const businessTypeLabels = {
  RETAIL: "Retail / Reventa",
  MANUFACTURING: "Manufactura",
  SERVICE: "Servicios",
} as const;

export const customerRiskLabels = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto",
  BLOCKED: "Bloqueado",
} as const;

export const installmentStatusLabels = {
  PENDING: "Pendiente",
  CURRENT: "Al día",
  OVERDUE: "En mora",
  PAID: "Pagada",
  PARTIAL: "Parcial",
  CANCELLED: "Cancelada",
} as const;

export const salePaymentTermsLabels = {
  CASH: "Contado",
  CREDIT_INSTALLMENTS: "Crédito",
  MIXED: "Mixto",
} as const;

export const recurrenceFrequencyLabels = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
  YEARLY: "Anual",
} as const;

export const dayOfWeekLabels = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;
