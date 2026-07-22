import type {
  Account,
  Budget,
  Category,
  CreditCard,
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
} from "@/types";

type TransactionWithRelations = Transaction & {
  category: Category;
  account: Account;
};

export function mapTransaction(tx: TransactionWithRelations): TransactionUI {
  return {
    id: tx.id,
    date: tx.date.toISOString(),
    amount: toNumber(tx.amount),
    type: tx.type,
    category: tx.category.name,
    categoryColor: tx.category.color,
    account: tx.account.name,
    paymentMethod: paymentMethodLabels[tx.paymentMethod],
    description: tx.description ?? "",
    tags: tx.tags,
    installments: tx.installments,
    creditCardId: tx.creditCardId ?? undefined,
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
