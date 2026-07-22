import type {
  Account,
  AccountReceivable,
  Budget,
  Category,
  CreditCard,
  ReceivablePayment,
  Reminder,
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
