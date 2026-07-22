import type {
  Account,
  AccountReceivable,
  Budget,
  Business,
  BusinessCustomer,
  BusinessProduct,
  BusinessSale,
  Category,
  CreditCard,
  InventoryItem,
  ReceivablePayment,
  Reminder,
  SaleInstallment,
  SavingsGoal,
  Transaction,
} from "@prisma/client";
import { toNumber } from "@/lib/decimal";
import {
  accountTypeIcons,
  accountTypeLabels,
  paymentMethodLabels,
} from "@/lib/labels";
import type {
  AccountData,
  BudgetData,
  CreditCardData,
  ReminderData,
  SavingsGoalData,
  Transaction as TransactionUI,
  AccountReceivableData,
  ReceivablePaymentData,
  BusinessData,
  BusinessProductData,
  BusinessCustomerData,
  BusinessSaleData,
  SaleInstallmentData,
  OverdueInstallmentData,
} from "@/types";

type TransactionWithRelations = Transaction & {
  category: Category;
  account: Account | null;
  creditCard: CreditCard | null;
};

export function mapTransaction(tx: TransactionWithRelations): TransactionUI {
  const fundSource = tx.creditCard
    ? `Tarjeta · ${tx.creditCard.name}`
    : tx.account?.name ?? "Sin origen";

  return {
    id: tx.id,
    date: tx.date.toISOString(),
    amount: toNumber(tx.amount),
    type: tx.type,
    category: tx.category.name,
    categoryColor: tx.category.color,
    account: tx.account?.name ?? "—",
    paymentMethod: paymentMethodLabels[tx.paymentMethod],
    description: tx.description ?? "",
    tags: tx.tags,
    installments: tx.installments,
    creditCardId: tx.creditCardId ?? undefined,
    fundSource,
  };
}

export function mapAccount(account: Account): AccountData {
  return {
    id: account.id,
    name: account.name,
    type: accountTypeLabels[account.type],
    balance: toNumber(account.balance),
    color: account.color,
    icon: account.icon ?? accountTypeIcons[account.type],
  };
}

export function mapCreditCard(card: CreditCard): CreditCardData {
  return {
    id: card.id,
    bank: card.bank,
    name: card.name,
    lastFourDigits: card.lastFourDigits,
    creditLimit: toNumber(card.creditLimit),
    usedBalance: toNumber(card.usedBalance),
    interestRate: toNumber(card.interestRate),
    cutOffDate: card.cutOffDate,
    paymentDueDate: card.paymentDueDate,
    color: card.color,
  };
}

export function mapBudget(
  budget: Budget & { category: Category },
  spent: number
): BudgetData {
  return {
    id: budget.id,
    category: budget.category.name,
    categoryColor: budget.category.color,
    budget: toNumber(budget.amount),
    spent,
    month: budget.month,
    year: budget.year,
  };
}

export function mapSavingsGoal(goal: SavingsGoal): SavingsGoalData {
  return {
    id: goal.id,
    name: goal.name,
    targetAmount: toNumber(goal.targetAmount),
    savedAmount: toNumber(goal.savedAmount),
    targetDate: goal.targetDate?.toISOString(),
    color: goal.color,
  };
}

export function mapReminder(reminder: Reminder): ReminderData {
  return {
    id: reminder.id,
    title: reminder.title,
    description: reminder.description ?? undefined,
    type: reminder.type,
    dueDate: reminder.dueDate.toISOString(),
    isRead: reminder.isRead,
  };
}

type ReceivableWithRelations = AccountReceivable & {
  sourceAccount: Account;
  payments: (ReceivablePayment & { destinationAccount: Account })[];
};

export function mapReceivablePayment(
  payment: ReceivablePayment & { destinationAccount: Account }
): ReceivablePaymentData {
  return {
    id: payment.id,
    amount: toNumber(payment.amount),
    paymentDate: payment.paymentDate.toISOString(),
    destinationAccount: payment.destinationAccount.name,
    notes: payment.notes ?? undefined,
  };
}

export function mapAccountReceivable(
  receivable: ReceivableWithRelations
): AccountReceivableData {
  const principal = toNumber(receivable.principalAmount);
  const outstanding = toNumber(receivable.outstandingBalance);
  const collected = Math.max(principal - outstanding, 0);
  const progressPercent =
    principal > 0 ? Math.min((collected / principal) * 100, 100) : 0;

  return {
    id: receivable.id,
    debtorName: receivable.debtorName,
    principalAmount: principal,
    outstandingBalance: outstanding,
    interestRate: toNumber(receivable.interestRate),
    loanDate: receivable.loanDate.toISOString(),
    status: receivable.status,
    sourceAccount: receivable.sourceAccount.name,
    sourceAccountId: receivable.sourceAccountId,
    notes: receivable.notes ?? undefined,
    collectedAmount: collected,
    progressPercent,
    payments: receivable.payments.map(mapReceivablePayment),
  };
}

export function mapBusiness(business: Business): BusinessData {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    businessType: business.businessType,
    status: business.status,
    currency: business.currency,
    description: business.description ?? undefined,
  };
}

type ProductWithInventory = BusinessProduct & {
  inventoryItems: InventoryItem[];
};

export function mapBusinessProduct(product: ProductWithInventory): BusinessProductData {
  const item = product.inventoryItems[0];
  const stock = item ? toNumber(item.quantity) : 0;
  const unitCost = item ? toNumber(item.unitCost) : 0;
  return {
    id: product.id,
    name: product.name,
    sku: product.sku ?? undefined,
    salePrice: toNumber(product.salePrice),
    unit: product.unit,
    stock,
    unitCost,
    inventoryValue: stock * unitCost,
    isInventoryTracked: product.isInventoryTracked,
  };
}

export function mapBusinessCustomer(customer: BusinessCustomer): BusinessCustomerData {
  return {
    id: customer.id,
    name: customer.name,
    documentId: customer.documentId ?? undefined,
    phone: customer.phone ?? undefined,
    riskLevel: customer.riskLevel,
    totalOutstanding: toNumber(customer.totalOutstanding),
    overdueDaysMax: customer.overdueDaysMax,
  };
}

function mapSaleInstallment(inst: SaleInstallment): SaleInstallmentData {
  return {
    id: inst.id,
    installmentNo: inst.installmentNo,
    dueDate: inst.dueDate.toISOString(),
    expectedAmount: toNumber(inst.expectedAmount),
    paidAmount: toNumber(inst.paidAmount),
    status: inst.status,
    overdueDays: inst.overdueDays,
  };
}

type SaleWithRelations = BusinessSale & {
  customer: BusinessCustomer | null;
  installments: SaleInstallment[];
};

export function mapBusinessSale(sale: SaleWithRelations): BusinessSaleData {
  return {
    id: sale.id,
    saleNumber: sale.saleNumber,
    saleDate: sale.saleDate.toISOString(),
    customerName: sale.customer?.name,
    customerPhone: sale.customer?.phone ?? undefined,
    totalAmount: toNumber(sale.totalAmount),
    cashReceived: toNumber(sale.cashReceived),
    paymentTerms: sale.paymentTerms,
    installments: sale.installments.map(mapSaleInstallment),
  };
}

type OverdueWithRelations = SaleInstallment & {
  sale: BusinessSale & { customer: BusinessCustomer | null };
};

export function mapOverdueInstallment(
  inst: OverdueWithRelations
): OverdueInstallmentData {
  return {
    ...mapSaleInstallment(inst),
    saleNumber: inst.sale.saleNumber,
    customerName: inst.sale.customer?.name,
  };
}
