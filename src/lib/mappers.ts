import type {
  Account,
  Budget,
  Business,
  BusinessCustomer,
  BusinessProduct,
  BusinessSale,
  Category,
  CreditCard,
  InventoryItem,
  Loan,
  LoanPayment,
  RecurringTransaction,
  Reminder,
  SaleInstallment,
  SavingsGoal,
  Transaction,
} from "@prisma/client";
import { addMonths } from "date-fns";
import {
  calculateExpectedReturn,
  computeOutstandingBalance,
  computeProgressPercent,
  computeTotalPaid,
  isLoanOverdue,
  computeDaysUntilDue,
} from "@/domain/loans/loan-calculations";
import { toNumber } from "@/lib/decimal";
import { todayIsoInTimezone } from "@/utils/dates";
import { DEFAULT_TIMEZONE } from "@/domain/billing/timezone";
import {
  accountTypeIcons,
  accountTypeLabels,
  paymentMethodLabels,
  recurrenceFrequencyLabels,
} from "@/lib/labels";
import type {
  AccountData,
  BudgetData,
  CreditCardData,
  ReminderData,
  SavingsGoalData,
  Transaction as TransactionUI,
  AccountReceivableData,
  LoanData,
  LoanPaymentData,
  ReceivablePaymentData,
  BusinessData,
  BusinessProductData,
  BusinessCustomerData,
  BusinessSaleData,
  SaleInstallmentData,
  OverdueInstallmentData,
  PendingInstallmentData,
  RecurringTransactionData,
} from "@/types";

type TransactionWithRelations = Transaction & {
  category: Category;
  account: Account | null;
  creditCard: CreditCard | null;
};

export function mapTransaction(tx: TransactionWithRelations): TransactionUI {
  const fundSource = tx.creditCard
    ? `Tarjeta · ${tx.creditCard.name}`
    : tx.paymentMethod === "CASH"
      ? "Efectivo"
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
    isInstallments: tx.isInstallments,
    installmentAmount: tx.installmentAmount
      ? toNumber(tx.installmentAmount)
      : undefined,
    hasZeroInterest: tx.hasZeroInterest,
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

type RecurringWithRelations = RecurringTransaction & {
  category: Category;
  account: Account | null;
  creditCard: CreditCard | null;
};

export function mapRecurringTransaction(
  item: RecurringWithRelations
): RecurringTransactionData {
  const fundSource = item.creditCard
    ? `Tarjeta · ${item.creditCard.name}`
    : item.paymentMethod === "CASH"
      ? "Efectivo"
      : item.account?.name ?? "Sin origen";

  return {
    id: item.id,
    type: item.type,
    amount: toNumber(item.amount),
    description: item.description ?? undefined,
    category: item.category.name,
    categoryColor: item.category.color,
    categoryId: item.categoryId,
    accountId: item.accountId ?? undefined,
    creditCardId: item.creditCardId ?? undefined,
    fundSource,
    paymentMethod: paymentMethodLabels[item.paymentMethod],
    frequency: recurrenceFrequencyLabels[item.frequency],
    frequencyRaw: item.frequency,
    dayOfMonth: item.dayOfMonth ?? undefined,
    dayOfWeek: item.dayOfWeek ?? undefined,
    monthOfYear: item.monthOfYear ?? undefined,
    installments: item.installments,
    nextRunAt: item.nextRunAt.toISOString(),
    lastRunAt: item.lastRunAt?.toISOString(),
    isActive: item.isActive,
  };
}

type LoanWithRelations = Loan & {
  sourceAccount: Account;
  payments: (LoanPayment & { destinationAccount: Account })[];
};

export function mapLoanPayment(
  payment: LoanPayment & { destinationAccount: Account }
): LoanPaymentData {
  const amount = toNumber(payment.amount);
  const principalPaid = toNumber(payment.principalPaid);
  const interestPaid = toNumber(payment.interestPaid);
  const hasBreakdown = principalPaid > 0 || interestPaid > 0;

  return {
    id: payment.id,
    amount,
    principalPaid: hasBreakdown ? principalPaid : amount,
    interestPaid: hasBreakdown ? interestPaid : 0,
    paymentDate: payment.paymentDate.toISOString(),
    destinationAccount: payment.destinationAccount.name,
    notes: payment.notes ?? undefined,
  };
}

export function mapLoan(loan: LoanWithRelations, timezone = DEFAULT_TIMEZONE): LoanData {
  const principal = toNumber(loan.principalAmount);
  const interestRate = toNumber(loan.interestRate);
  const storedExpectedReturn = toNumber(loan.expectedReturnAmount);
  const isLegacyLoan = storedExpectedReturn === 0;
  const effectiveDueDate = isLegacyLoan
    ? addMonths(loan.loanDate, 1)
    : loan.dueDate <= loan.loanDate
      ? addMonths(loan.loanDate, 1)
      : loan.dueDate;
  const expectedReturnAmount = isLegacyLoan
    ? principal
    : storedExpectedReturn > 0
      ? storedExpectedReturn
      : calculateExpectedReturn(
          principal,
          interestRate,
          loan.interestType,
          loan.loanDate,
          effectiveDueDate
        );

  const mappedPayments = loan.payments.map(mapLoanPayment);
  const { totalPaid, principalPaid, interestPaid } = computeTotalPaid(mappedPayments);
  const outstandingBalance = computeOutstandingBalance(expectedReturnAmount, totalPaid);
  const progressPercent = computeProgressPercent(expectedReturnAmount, totalPaid);
  const todayIso = todayIsoInTimezone(timezone);
  const dueDateIso = effectiveDueDate.toISOString();
  const isOverdue = isLoanOverdue(loan.status, dueDateIso, todayIso);
  const daysUntilDue = computeDaysUntilDue(dueDateIso, todayIso);
  const totalInterest = Math.max(expectedReturnAmount - principal, 0);

  return {
    id: loan.id,
    debtorName: loan.debtorName,
    principalAmount: principal,
    outstandingBalance,
    interestRate,
    interestType: loan.interestType,
    expectedReturnAmount,
    totalInterest,
    loanDate: loan.loanDate.toISOString(),
    dueDate: dueDateIso,
    status:
      outstandingBalance <= 0 && totalPaid > 0
        ? "PAID"
        : loan.status,
    sourceAccount: loan.sourceAccount?.name ?? "Cuenta eliminada",
    sourceAccountId: loan.sourceAccountId,
    notes: loan.notes ?? undefined,
    collectedAmount: totalPaid,
    principalCollected: principalPaid,
    interestCollected: interestPaid,
    progressPercent,
    daysUntilDue,
    isOverdue,
    payments: mappedPayments,
  };
}

/** @deprecated Use mapLoan */
export function mapAccountReceivable(loan: LoanWithRelations): AccountReceivableData {
  return mapLoan(loan);
}

/** @deprecated Use mapLoanPayment */
export function mapReceivablePayment(
  payment: LoanPayment & { destinationAccount: Account }
): ReceivablePaymentData {
  return mapLoanPayment(payment);
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
    supplierName: product.supplierName ?? undefined,
    supplierPhone: product.supplierPhone ?? undefined,
    supplierWhatsApp: product.supplierWhatsApp ?? undefined,
    supplierEmail: product.supplierEmail ?? undefined,
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

export function mapPendingInstallment(
  inst: OverdueWithRelations
): PendingInstallmentData {
  return {
    ...mapSaleInstallment(inst),
    saleNumber: inst.sale.saleNumber,
    customerName: inst.sale.customer?.name,
    customerPhone: inst.sale.customer?.phone ?? undefined,
  };
}
