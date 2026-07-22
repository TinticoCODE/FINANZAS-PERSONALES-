export type TransactionType = "INCOME" | "EXPENSE";

export type StatCardData = {
  id: string;
  title: string;
  value: number;
  previousValue: number;
  icon: string;
  color: string;
  gradient: string;
};

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  categoryColor: string;
  account: string;
  paymentMethod: string;
  description: string;
  tags: string[];
  installments?: number;
  creditCardId?: string;
  fundSource: string;
};

export type CreditCardData = {
  id: string;
  bank: string;
  name: string;
  lastFourDigits: string;
  creditLimit: number;
  usedBalance: number;
  interestRate: number;
  cutOffDate: number;
  paymentDueDate: number;
  color: string;
  paymentToAvoidInterest?: number;
  singleInstallmentDue?: number;
  deferredInstallmentsDue?: number;
  minPayment?: number;
};

export type BudgetData = {
  id: string;
  category: string;
  categoryColor: string;
  budget: number;
  spent: number;
  month: number;
  year: number;
};

export type AccountData = {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon: string;
};

export type SavingsGoalData = {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string;
  color: string;
};

export type ReminderData = {
  id: string;
  title: string;
  description?: string;
  type: string;
  dueDate: string;
  isRead: boolean;
};

export type ReceivablePaymentData = {
  id: string;
  amount: number;
  paymentDate: string;
  destinationAccount: string;
  notes?: string;
};

export type AccountReceivableData = {
  id: string;
  debtorName: string;
  principalAmount: number;
  outstandingBalance: number;
  interestRate: number;
  loanDate: string;
  status: string;
  sourceAccount: string;
  sourceAccountId: string;
  notes?: string;
  collectedAmount: number;
  progressPercent: number;
  payments: ReceivablePaymentData[];
};

export type LoansSummaryData = {
  totalOutstanding: number;
  totalPrincipalLent: number;
  totalCollected: number;
  activeLoans: number;
  paidLoans: number;
};

export type ChartDataPoint = {
  name: string;
  value: number;
  color?: string;
};

export type MonthlyDataPoint = {
  month: string;
  income: number;
  expenses: number;
  savings: number;
};
